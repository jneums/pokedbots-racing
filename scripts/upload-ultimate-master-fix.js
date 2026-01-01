#!/usr/bin/env node

/**
 * Quick script to fix Ultimate Master faction entries
 * Only uploads bots with "Ultimate-master" faction
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { HttpAgent, Actor } = require('@icp-sdk/core/agent');
const { Ed25519KeyIdentity } = require('@icp-sdk/core/identity');
const { Secp256k1KeyIdentity } = require('@icp-sdk/core/identity/secp256k1');
const { execSync } = require('child_process');
const pemfile = require('pem-file');

const STATS_FILE = path.join(__dirname, '../data/precomputed-stats.json');
const NETWORK = 'ic';

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
    if (rawKey.length !== 118) {
      throw new Error(`Invalid Secp256k1 key format: expecting byte length 118 but got ${rawKey.length}`);
    }
    const secretKeySlice = rawKey.subarray(7, 39);
    const secretKeyUint8Array = new Uint8Array(secretKeySlice);
    return Secp256k1KeyIdentity.fromSecretKey(secretKeyUint8Array);
  }
  
  if (rawKey.length !== 85) {
    throw new Error(`Invalid Ed25519 key format: expecting byte length 85 but got ${rawKey.length}`);
  }
  const secretKey = rawKey.subarray(16, 48);
  const secretKeyUint8Array = new Uint8Array(secretKey);
  return Ed25519KeyIdentity.fromSecretKey(secretKeyUint8Array);
}

function getCurrentIdentityName() {
  return execSync('dfx identity whoami').toString().trim();
}

function getCanisterInfo() {
  const rootCanisterIdsPath = path.join(__dirname, '../canister_ids.json');
  const canisterIds = JSON.parse(fs.readFileSync(rootCanisterIdsPath, 'utf8'));
  const canisterId = canisterIds.pokedbots_racing.ic;
  
  const didPath = '../.dfx/ic/canisters/pokedbots_racing/service.did.js';
  const { idlFactory } = require(didPath);
  
  return { canisterId, idlFactory };
}

async function main() {
  console.log('Loading precomputed stats...');
  const data = JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
  const stats = data.stats || data; // Handle both {stats: [...]} and [...] formats
  
  // Filter only Ultimate-master faction entries
  const ultimateMasterEntries = stats.filter(s => s.faction === 'Ultimate-master');
  
  console.log(`Found ${ultimateMasterEntries.length} Ultimate Master bots to fix`);
  
  if (ultimateMasterEntries.length === 0) {
    console.log('No Ultimate Master entries found!');
    return;
  }
  
  // Create agent and actor
  const identityName = getCurrentIdentityName();
  console.log(`Using identity: ${identityName}`);
  
  const identity = loadDfxIdentity(identityName);
  const host = 'https://ic0.app';
  
  const agent = new HttpAgent({ identity, host });
  
  const { canisterId, idlFactory } = getCanisterInfo();
  console.log(`Canister ID: ${canisterId}`);
  
  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId,
  });
  
  // Prepare batch
  const batch = ultimateMasterEntries.map(s => [
    BigInt(s.tokenId),
    {
      speed: BigInt(s.speed),
      powerCore: BigInt(s.powerCore),
      acceleration: BigInt(s.acceleration),
      stability: BigInt(s.stability),
      faction: s.faction,
    },
  ]);
  
  console.log(`Uploading ${batch.length} Ultimate Master entries...`);
  console.log('Sample entry:', batch[0]);
  
  await actor.upload_base_stats_batch(batch);
  
  console.log('✅ Upload complete!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
