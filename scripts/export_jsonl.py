#!/usr/bin/env python3
"""
Export PokedBots stats as JSONL (one bot per line).
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
for trait_data in schema_raw:
    trait_id = trait_data[0]
    trait_name = trait_data[1]
    trait_values = {v[0]: v[1] for v in trait_data[2]}
    traits_schema[trait_id] = {"name": trait_name, "values": trait_values}


# Convert trait names to snake_case
def to_snake_case(name):
    """Convert trait name to snake_case."""
    return name.lower().replace(" ", "_").replace("-", "_")


# Write JSONL file
output_file = Path(__file__).parent.parent / "pokedbots_stats.jsonl"
with open(output_file, "w") as f:
    for bot_entry in bots_raw:
        bot_id = bot_entry[0]
        bot_traits_raw = bot_entry[1]

        # Build bot object with snake_case keys
        bot = {"id": bot_id}

        for trait_id, value_id in bot_traits_raw:
            trait_info = traits_schema[trait_id]
            trait_name_snake = to_snake_case(trait_info["name"])
            trait_value = trait_info["values"][value_id]
            bot[trait_name_snake] = trait_value

        # Write as single line JSON
        f.write(json.dumps(bot) + "\n")

print(f"✅ Successfully exported {len(bots_raw)} bots to: {output_file}")
print(f"📊 File size: {output_file.stat().st_size / 1024 / 1024:.2f} MB")
print(f"\n📝 Sample bot (first line):")

# Show first bot as example
with open(output_file, "r") as f:
    first_bot = json.loads(f.readline())
    print(json.dumps(first_bot, indent=2))
