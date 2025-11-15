#!/usr/bin/env node

/**
 * Script to upload NFT metadata to the canister in chunks
 * This handles large JSON files by splitting them into manageable batches
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { HttpAgent, Actor } = require('@icp-sdk/core/agent');
const { Ed25519KeyIdentity } = require('@icp-sdk/core/identity');
const { Secp256k1KeyIdentity } = require('@icp-sdk/core/identity/secp256k1');
const { execSync } = require('child_process');
const pemfile = require('pem-file');

// Configuration
const CHUNK_SIZE = 25; // Number of NFTs to upload per batch
const STATS_FILE = path.join(__dirname, '../src/stats.json');
const NETWORK = process.env.DFX_NETWORK || 'local';

/**
 * Load DFX identity from filesystem
 */
function loadDfxIdentity(identityName) {
  const homeDir = os.homedir();
  const identityDir = path.join(homeDir, '.config', 'dfx', 'identity', identityName);
  const pemPath = path.join(identityDir, 'identity.pem');
  
  if (!fs.existsSync(pemPath)) {
    throw new Error(`Could not find identity.pem in ${identityDir}`);
  }
  
  const pemContent = fs.readFileSync(pemPath, 'utf-8');
  const pemBuffer = Buffer.from(pemContent);
  const rawKey = pemfile.decode(pemBuffer);
  
  if (pemContent.includes('EC PRIVATE KEY')) {
    // Secp256k1 key
    if (rawKey.length !== 118) {
      throw new Error(`Invalid Secp256k1 key format: expecting byte length 118 but got ${rawKey.length}`);
    }
    const secretKeySlice = rawKey.subarray(7, 39);
    const secretKeyUint8Array = new Uint8Array(secretKeySlice);
    return Secp256k1KeyIdentity.fromSecretKey(secretKeyUint8Array);
  }
  
  // Ed25519 key
  if (rawKey.length !== 85) {
    throw new Error(`Invalid Ed25519 key format: expecting byte length 85 but got ${rawKey.length}`);
  }
  const secretKey = rawKey.subarray(16, 48);
  const secretKeyUint8Array = new Uint8Array(secretKey);
  return Ed25519KeyIdentity.fromSecretKey(secretKeyUint8Array);
}

/**
 * Get current DFX identity name
 */
function getCurrentIdentityName() {
  return execSync('dfx identity whoami').toString().trim();
}

// Get canister ID and idlFactory
function getCanisterInfo() {
  const canisterIdsPath = path.join(__dirname, '../.dfx/local/canister_ids.json');
  const canisterIds = JSON.parse(fs.readFileSync(canisterIdsPath, 'utf8'));
  const canisterId = process.env.CANISTER_ID || canisterIds.my_mcp_server.local;
  
  // Import the idlFactory from the generated service file
  const { idlFactory } = require('../.dfx/local/canisters/my_mcp_server/service.did.js');
  
  return { canisterId, idlFactory };
}

// Create agent based on network with DFX identity
async function createAgentForNetwork() {
  const isLocal = NETWORK === 'local';
  const host = isLocal ? 'http://127.0.0.1:4943' : 'https://ic0.app';
  
  // Load the current DFX identity
  const identityName = getCurrentIdentityName();
  console.log(`Using DFX identity: ${identityName}`);
  const identity = loadDfxIdentity(identityName);
  
  const agent = new HttpAgent({ host, identity });
  
  // Fetch root key for local development
  if (isLocal) {
    await agent.fetchRootKey();
  }
  
  return agent;
}

// Parse the stats.json file and convert to the expected format
function parseStatsFile(filePath) {
  console.log('Reading stats file...');
  const rawData = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(rawData);
  
  if (!Array.isArray(data) || data.length < 2) {
    throw new Error('Expected stats.json to be an array with trait schema and bot data');
  }
  
  // First element is the trait schema: [[trait_id, trait_name, [[value_id, value_name], ...]], ...]
  const traitSchema = data[0];
  
  // Build lookup maps for trait names and values
  const traitNames = new Map();
  const traitValues = new Map();
  
  for (const [traitId, traitName, values] of traitSchema) {
    traitNames.set(traitId, traitName);
    const valueMap = new Map();
    for (const [valueId, valueName] of values) {
      valueMap.set(valueId, valueName);
    }
    traitValues.set(traitId, valueMap);
  }
  
  console.log(`Loaded schema with ${traitNames.size} traits`);
  console.log(`Trait names: ${Array.from(traitNames.values()).join(', ')}`);
  
  // Second element is an array of all bots: [[bot_id, [[trait_id, value_id], ...]], ...]
  const bots = data[1];
  console.log(`Loaded ${bots.length} bots from stats file`);
  
  return { traitNames, traitValues, bots };
}

// Convert to the format expected by the canister (raw integer arrays)
function convertToCanisterFormat(parsedData) {
  const { bots } = parsedData;
  
  return bots.map(([botId, traits]) => {
    // Convert [[trait_id, value_id], ...] to [value_id, value_id, ...]
    // Just extract the value IDs in order
    const stats = traits.map(([_, valueId]) => BigInt(valueId));
    
    return [typeof botId === 'bigint' ? botId : BigInt(botId), stats];
  });
}

// Convert schema to canister format
function convertSchemaToCanisterFormat(parsedData) {
  const { traitNames, traitValues } = parsedData;
  
  const schema = [];
  for (const [traitId, traitName] of traitNames.entries()) {
    const values = [];
    const valueMap = traitValues.get(traitId);
    if (valueMap) {
      for (const [valueId, valueName] of valueMap.entries()) {
        values.push({
          id: BigInt(valueId),
          name: String(valueName).toLowerCase()
        });
      }
    }
    
    schema.push({
      id: BigInt(traitId),
      name: String(traitName).toLowerCase(),
      values: values
    });
  }
  
  return schema;
}

// Split data into chunks
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

// Upload a single chunk
async function uploadChunk(actor, chunk, chunkIndex, totalChunks) {
  console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks} (${chunk.length} NFTs)...`);
  
  try {
    await actor.upload_nft_stats_batch(chunk);
    console.log(`✓ Chunk ${chunkIndex + 1}/${totalChunks} uploaded successfully`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to upload chunk ${chunkIndex + 1}:`, error.message);
    return false;
  }
}

// Main upload function
async function uploadMetadata() {
  try {
    console.log('=== NFT Metadata Upload Script ===\n');
    
    // Get canister info
    const { canisterId, idlFactory } = getCanisterInfo();
    console.log(`Using canister ID: ${canisterId}\n`);
    
    // Load and parse data
    const parsedData = parseStatsFile(STATS_FILE);
    
    // Create agent and actor
    console.log(`Connecting to canister on ${NETWORK} network...`);
    const agent = await createAgentForNetwork();
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });
    
    // First, upload the schema
    console.log('\n--- Uploading Trait Schema ---');
    const schema = convertSchemaToCanisterFormat(parsedData);
    console.log(`Schema has ${schema.length} traits`);
    try {
      const schemaResult = await actor.upload_trait_schema(schema);
      console.log('✓ Schema uploaded successfully\n');
    } catch (error) {
      console.error('✗ Failed to upload schema:', error.message);
      process.exit(1);
    }
    
    // Now upload the bot stats
    console.log('--- Uploading Bot Stats ---');
    const canisterData = convertToCanisterFormat(parsedData);
    
    // Create chunks
    const chunks = chunkArray(canisterData, CHUNK_SIZE);
    console.log(`Split data into ${chunks.length} chunks of ~${CHUNK_SIZE} NFTs each\n`);
    
    // Upload chunks sequentially
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < chunks.length; i++) {
      const success = await uploadChunk(actor, chunks[i], i, chunks.length);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      
      // Add a small delay between chunks to avoid overwhelming the canister
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    // Summary
    console.log('\n=== Upload Summary ===');
    console.log(`Total NFTs: ${parsedData.bots.length}`);
    console.log(`Successful chunks: ${successCount}/${chunks.length}`);
    console.log(`Failed chunks: ${failCount}/${chunks.length}`);
    
    if (failCount === 0) {
      console.log('\n✓ All metadata uploaded successfully!');
      
      // Verify upload
      console.log('\nVerifying upload...');
      const totalCount = await actor.get_total_nft_count();
      console.log(`Total NFTs in canister: ${totalCount}`);
    } else {
      console.log('\n⚠ Some chunks failed to upload. Please review errors above.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n✗ Upload failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  uploadMetadata().catch(console.error);
}

module.exports = { uploadMetadata, parseStatsFile, convertToCanisterFormat };
