#!/usr/bin/env python3
"""
Export PokedBots stats in a nicely formatted JSON file.
"""

import json
from pathlib import Path

# Load the raw stats.json file
input_file = Path(__file__).parent.parent / "data" / "stats.json"
with open(input_file, "r") as f:
    data = json.load(f)

# Parse schema and bots
schema_raw = data[0]
bots_raw = data[1]

# Build trait schema
traits_schema = {}
trait_names = []
for trait_data in schema_raw:
    trait_id = trait_data[0]
    trait_name = trait_data[1]
    trait_values = {v[0]: v[1] for v in trait_data[2]}
    traits_schema[trait_id] = {"name": trait_name, "values": trait_values}
    trait_names.append(trait_name)

# Decode all bots
bots = []
for bot_entry in bots_raw:
    bot_id = bot_entry[0]
    bot_traits_raw = bot_entry[1]

    # Decode traits
    bot = {"id": bot_id, "traits": {}}

    for trait_id, value_id in bot_traits_raw:
        trait_info = traits_schema[trait_id]
        trait_name = trait_info["name"]
        trait_value = trait_info["values"][value_id]
        bot["traits"][trait_name] = trait_value

    bots.append(bot)

# Create the output structure
output = {
    "metadata": {
        "total_bots": len(bots),
        "collection": "PokedBots Racing",
        "description": "Complete stats and traits for all 10,000 PokedBots NFTs",
    },
    "trait_schema": {
        trait_id: {
            "name": info["name"],
            "total_variations": len(info["values"]),
            "variations": info["values"],
        }
        for trait_id, info in traits_schema.items()
    },
    "bots": bots,
}

# Write to formatted JSON file
output_file = Path(__file__).parent.parent / "pokedbots_formatted_stats.json"
with open(output_file, "w") as f:
    json.dump(output, f, indent=2)

print(f"✅ Successfully exported {len(bots)} bots to: {output_file}")
print(f"📊 File size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
print(f"🎨 Total traits: {len(trait_names)}")
print(f"📝 Trait categories: {', '.join(trait_names)}")
