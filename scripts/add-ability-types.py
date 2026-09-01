#!/usr/bin/env python3
"""Add missing abilityType properties to all faction abilities."""

import re

# Mapping of ability IDs to their AbilityType
ABILITY_MAPPINGS = {
    # Bulwarks
    "ultimate_bulwark_main": "PERFECT_DEFENSE",
    "blackhole_bulwark_main": "GRAVITATIONAL_PULL",
    "master_bulwark_main": "TACTICAL_FORMATION",
    "bee_bulwark_main": "HIVE_MIND",
    "food_bulwark_main": "FEAST_AURA",
    "murder_bulwark_main": "BLOOD_SHIELD",
    # Strikers
    "ultimate_striker_main": "WEAK_POINT",
    "blackhole_striker_main": "CRUSHING_SINGULARITY",
    "master_striker_main": "COORDINATED_STRIKE",
    "bee_striker_main": "OVERWHELMING_NUMBERS",
    "food_striker_main": "FLAVOR_BURST",
    "murder_striker_main": "ASSASSINATE",
    "box_striker_main": "SURPRISE_ATTACK",
    "animal_striker_main": "HUNTERS_MARK",
    "industrial_striker_main": "CRUSH",
    # Fixers
    "dead_fixer_main": "SACRIFICIAL_PACT",
    "murder_fixer_main": "TRANSFUSION",
    "master_fixer_main": "TRIAGE_PROTOCOL",
    "animal_fixer_main": "REGENERATION",
    "food_fixer_main": "FLAVOR_BURST",
    "industrial_fixer_main": "SPOT_WELD",
    # Tacticians
    "ultimate_tactician_main": "OPTIMIZATION",
    "dead_tactician_main": "DEATHS_HERALD",
    "master_tactician_main": "BATTLE_PLAN",
    "bee_tactician_main": "COORDINATION",
    "food_tactician_main": "INTOXICATE",
    "box_tactician_main": "LOCKBOX",
    "murder_tactician_main": "EXPOSE_WEAKNESS",
    "animal_tactician_main": "COORDINATION",
    "industrial_tactician_main": "OVERCHARGE",
    "game_tactician_main": "COORDINATED_STRIKE",
}

file_path = "../packages/apps/website/src/lib/combat-engine.ts"

with open(file_path, "r") as f:
    content = f.read()

# For each ability, find its mainAbility definition and add abilityType if missing
for ability_id, ability_type in ABILITY_MAPPINGS.items():
    # Pattern to match mainAbility line
    pattern = (
        rf"(mainAbility: \{{ id: '{ability_id}', name: '[^']+', description: '[^']+', )"
    )

    # Check if this ability already has abilityType
    if re.search(
        rf"id: '{ability_id}'.*?abilityType: AbilityType\.", content, re.DOTALL
    ):
        print(f"✓ {ability_id} already has abilityType")
        continue

    # Find and add abilityType
    def add_ability_type(match):
        return f"{match.group(1)}abilityType: AbilityType.{ability_type}, "

    new_content = re.sub(pattern, add_ability_type, content)

    if new_content != content:
        print(f"✓ Added abilityType.{ability_type} to {ability_id}")
        content = new_content
    else:
        print(f"✗ Could not find {ability_id}")

# Write back
with open(file_path, "w") as f:
    f.write(content)

print("\n✅ Done! Updated combat-engine.ts")
