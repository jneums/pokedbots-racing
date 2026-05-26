import { Ed25519KeyIdentity } from '@dfinity/identity';
import { HttpAgent, Actor } from '@dfinity/agent';
import { idlFactory } from './packages/libs/declarations/dist/generated/pokedbots_racing/index.js';

const CANISTER_ID = 'p6nop-vyaaa-aaaai-q4djq-cai';

async function main() {
  // 1. Generate ephemeral identity (no wallet, no ICP needed)
  const identity = Ed25519KeyIdentity.generate();
  const principal = identity.getPrincipal().toText();
  console.log('Generated Principal:', principal);

  // 2. Create agent
  const agent = await HttpAgent.create({ 
    host: 'https://icp0.io',
    identity 
  });

  // 3. Create actor
  const actor = Actor.createActor(idlFactory, { agent, canisterId: CANISTER_ID });

  // 4. Call create_my_api_key
  const apiKey = await actor.create_my_api_key('ai-agent', []);
  console.log('API Key:', apiKey);
  console.log('\nUse this key in MCP requests:');
  console.log(`  Authorization: Bearer ${apiKey}`);
  console.log(`  MCP URL: https://${CANISTER_ID}.icp0.io/mcp`);
}

main().catch(e => { console.error('Error:', e.message || e); process.exit(1); });
