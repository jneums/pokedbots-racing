#!/usr/bin/env python3
"""
Validate that all trait values are properly categorized in the Motoko code.
Shows which values would fall through to the 'else' default categories.
"""

import json

# Load the data
with open("data/stats.json", "r") as f:
    data = json.load(f)

schema = data[0]
stats_array = data[1]

# Define keyword mappings from Racing.mo categorization functions
CATEGORIZATIONS = {
    "Arms": {
        "Legendary (70-85)": ["master gold", "golden king", "murder arms gold"],
        "High Speed (60-75)": ["rocket", "jet", "lazer", "rainbow"],
        "Medium-High (50-65)": [
            "power arms",
            "8 bit",
            "connector",
            "cable",
            "wire",
            "chainsaw",
            "claw",
            "snipper",
            "gripper",
            "long arms",
            "power lift",
            "mechanic",
        ],
        "Medium (40-50)": ["hands up", "double arms"],
        "Default (30-45)": [],  # hands down, fingers, bone
    },
    "Legs": {
        "Legendary (70-80)": ["master gold", "ultimate terminator"],
        "High Speed (60-75)": ["rocket", "super", "ultimate", "power walker"],
        "High Accel (60-80)": ["super fast", "super leg", "spiky", "bird claw", "frog"],
        "High Stability (55-70)": ["strong", "power", "chunky", "industrial"],
        "Medium (40-55)": [
            "midi",
            "bendy",
            "cable",
            "8 bit",
            "flat",
            "bone",
            "big",
            "cactus",
            "mech",
            "chocolate",
        ],
        "Low (30-45)": ["small", "burnt", "rust", "inflatable", "slender", "balloon"],
        "Default (35-45)": [],
    },
    "Wings": {
        "Legendary": ["master gold"],
        "High (60-75)": [
            "massive engine",
            "rocket",
            "jet",
            "triangle up",
            "power cell",
        ],
        "Medium (40-55)": [
            "8 bit",
            "bear",
            "horn",
            "decal",
            "antenna",
            "jointed",
            "large",
            "ear muff",
            "connector",
            "chain saw",
            "game face",
            "butterfly",
            "angel",
        ],
        "Low (30-45)": ["blank", "none", "inflatable", "lolly pop", "straw"],
        "Default (35-45)": [],
    },
    "Body": {
        "Light/Fast (60-75)": [
            "egg",
            "bubble",
            "balloon",
            "glass",
            "gummy",
            "bee",
            "bird",
            "donut",
            "smarties",
        ],
        "Heavy/Slow (30-45)": ["mega", "large", "tower", "beast", "massive"],
        "High Power (60-80)": [
            "mega",
            "large",
            "ultimate",
            "master",
            "super",
            "tower",
            "beast",
            "golden",
        ],
        "Stable (60-75)": [
            "battle box",
            "command box",
            "mega controller",
            "beast",
            "iron",
            "ultimate",
        ],
        "Unstable (30-45)": ["balloon", "bubble", "tower", "spiky egg", "one tooth"],
        "Medium (45-60)": [
            "game boy",
            "n 64",
            "ipod",
            "8 bit",
            "frog",
            "controller",
            "box",
            "iron",
            "copper",
            "rabbit",
            "round head",
            "pig",
            "cat",
            "pizza",
            "cheese",
            "waffle",
        ],
        "Default (45-50)": [],
    },
    "Driver Guy": {
        "High Stability (60-80)": [
            "metal goggles",
            "helmet",
            "visor",
            "ultimate",
            "master",
            "diamond eyes",
        ],
        "Medium-High (50-65)": ["headphones", "game boy", "pixel", "snes", "gamer"],
        "Medium (40-55)": [
            "blue",
            "green",
            "yellow",
            "purple",
            "tounge",
            "rabbit",
            "hair",
            "metal open",
            "red",
            "calculator",
            "gold colour",
            "circuits",
            "tri eye",
            "twin",
        ],
        "Low (30-45)": ["dead eyes", "eyes closed", "big eyes", "glitch"],
        "Default (45)": [],
    },
}


def check_matches(value_name, keywords):
    """Check if value_name matches any of the keywords."""
    lower_name = value_name.lower()
    return any(keyword in lower_name for keyword in keywords)


def categorize_value(value_name, trait_name):
    """Categorize a value and return which category it matches."""
    categories = CATEGORIZATIONS.get(trait_name, {})

    for category_name, keywords in categories.items():
        if category_name == "Default" or not keywords:
            continue
        if check_matches(value_name, keywords):
            return category_name

    return "⚠️  DEFAULT (uncategorized)"


# Check each trait
traits_to_check = [
    (1, "Body"),
    (2, "Driver Guy"),
    (3, "Arms"),
    (4, "Legs"),
    (5, "Wings"),
]

print("=" * 100)
print("TRAIT VALUE CATEGORIZATION VALIDATION")
print("=" * 100)

for trait_id, trait_name in traits_to_check:
    if trait_name not in CATEGORIZATIONS:
        continue

    trait_schema = schema[trait_id]
    print(f"\n{'=' * 100}")
    print(f"{trait_name.upper()} - {len(trait_schema[2])} unique values")
    print("=" * 100)

    # Count occurrences
    counts = {}
    for entry in stats_array:
        token_id, trait_values = entry
        trait_entry = next((tv for tv in trait_values if tv[0] == trait_id), None)
        if trait_entry:
            value_id = trait_entry[1]
            value_name = next(
                (v[1] for v in trait_schema[2] if v[0] == value_id),
                f"Unknown_{value_id}",
            )
            counts[value_name] = counts.get(value_name, 0) + 1

    # Categorize and show defaults
    category_stats = {}
    uncategorized = []

    for value_name, count in counts.items():
        category = categorize_value(value_name, trait_name)
        if category not in category_stats:
            category_stats[category] = {"count": 0, "values": []}
        category_stats[category]["count"] += count
        category_stats[category]["values"].append((value_name, count))

        if category == "⚠️  DEFAULT (uncategorized)":
            uncategorized.append((value_name, count))

    # Show summary
    print(f"\n📊 Category Distribution:")
    for category, stats in sorted(category_stats.items()):
        pct = (stats["count"] / 10000) * 100
        print(
            f"  {category}: {stats['count']} bots ({pct:.1f}%) across {len(stats['values'])} values"
        )

    # Show uncategorized values
    if uncategorized:
        print(
            f"\n⚠️  UNCATEGORIZED VALUES ({len(uncategorized)} values, {sum(c for _, c in uncategorized)} bots):"
        )
        for value_name, count in sorted(
            uncategorized, key=lambda x: x[1], reverse=True
        )[:20]:
            pct = (count / 10000) * 100
            print(f"    • {value_name}: {count} ({pct:.1f}%)")
        if len(uncategorized) > 20:
            remaining = sum(c for _, c in uncategorized[20:])
            print(
                f"    ... and {len(uncategorized) - 20} more values ({remaining} bots)"
            )
    else:
        print(f"\n✅ All values are categorized!")

print("\n" + "=" * 100)
print("VALIDATION COMPLETE")
print("=" * 100)
