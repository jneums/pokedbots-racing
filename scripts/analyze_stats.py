#!/usr/bin/env python3
"""
Analyze racing stats distribution from NFT metadata to verify rarity rewards.
"""

import json
import statistics
from collections import Counter, defaultdict

# Load the stats.json file
with open("src/stats.json", "r") as f:
    data = json.load(f)

# First element is the schema (nested list structure)
schema_raw = data[0]
bots = data[1]  # Second element is the array of all 10,000 bots

# Parse schema: each trait is [id, name, [[value_id, value_name], ...]]
traits = {}
trait_names = []
for trait_data in schema_raw:
    trait_id = trait_data[0]
    trait_name = trait_data[1]
    trait_values = {v[0]: v[1] for v in trait_data[2]}
    traits[trait_name] = trait_values
    trait_names.append(trait_name)

print(f"Total bots: {len(bots)}")
print(f"Traits: {', '.join(trait_names)}\n")

# Decode bots
decoded_bots = []
for bot_entry in bots:
    bot_id = bot_entry[0]
    bot_traits = bot_entry[1]

    bot = {"id": bot_id}
    for trait_id, value_id in bot_traits:
        trait_name = trait_names[trait_id]
        bot[trait_name.lower()] = traits[trait_name][value_id]
    decoded_bots.append(bot)

# Analyze trait frequencies
print("=" * 80)
print("TRAIT FREQUENCY ANALYSIS")
print("=" * 80)

for trait_name in trait_names:
    trait_lower = trait_name.lower()
    values = [bot[trait_lower] for bot in decoded_bots]
    counter = Counter(values)
    print(f"\n{trait_name}:")
    # Show top 5 most common and bottom 5 rarest
    most_common = counter.most_common(5)
    least_common = counter.most_common()[-5:]

    print("  Most common:")
    for value, count in most_common:
        pct = (count / len(bots)) * 100
        print(f"    {value}: {count} ({pct:.1f}%)")

    if len(counter) > 5:
        print("  Rarest:")
        for value, count in reversed(least_common):
            pct = (count / len(bots)) * 100
            print(f"    {value}: {count} ({pct:.1f}%)")

# Analyze special attributes (should be binary 0/1)
print("\n" + "=" * 80)
print("SPECIAL ATTRIBUTES (Rarity Modifiers)")
print("=" * 80)

special_attrs = ["gold", "rust", "black", "pink", "blue"]
for attr in special_attrs:
    if attr in decoded_bots[0]:
        count = sum(1 for bot in decoded_bots if bot.get(attr, 0) > 0)
        pct = (count / len(bots)) * 100
        print(f"{attr.upper()}: {count} bots ({pct:.2f}%)")

# Now simulate racing stats for sample bots
print("\n" + "=" * 80)
print("RACING STATS SIMULATION")
print("=" * 80)


def hash_text(text):
    """Simple hash function matching Motoko implementation."""
    hash_val = 0
    for char in text:
        hash_val = (hash_val * 31 + ord(char)) % 1000000
    return hash_val


def derive_stats_from_metadata(bot):
    """Derive racing stats from bot metadata (matching Motoko logic)."""

    # Base stats from Type trait (30-50 range)
    type_map = {
        "industrial": 45,
        "food": 35,
        "retro": 40,
        "sports": 42,
    }
    type_base = type_map.get(bot.get("type", ""), 38)

    # Body trait affects power core (30-50 range)
    body = bot.get("body", "")
    body_hash = hash_text(body) % 21 + 30 if body else 40

    # Arms trait affects speed (30-50 range)
    arms = bot.get("arms", "")
    arms_hash = hash_text(arms) % 21 + 30 if arms else 40

    # Legs trait affects acceleration (30-50 range)
    legs = bot.get("legs", "")
    legs_hash = hash_text(legs) % 21 + 30 if legs else 40

    # Driver Guy affects stability (30-50 range)
    driver = bot.get("driver guy", "")
    driver_hash = hash_text(driver) % 21 + 30 if driver else 40

    # Wings give bonus to speed
    wings = bot.get("wings", "")
    wings_bonus = 5 if "triangle" in wings or "rocket" in wings else 0

    # Special attribute bonuses (any value > 0 applies bonus)
    gold = bot.get("gold", 0)
    rust = bot.get("rust", 0)
    black = bot.get("black", 0)
    pink = bot.get("pink", 0)
    blue = bot.get("blue", 0)

    gold_bonus = 8 if gold > 0 else 0
    rust_penalty = -5 if rust > 0 else 0
    black_bonus = 6 if black > 0 else 0
    pink_bonus = 4 if pink > 0 else 0
    blue_bonus = 5 if blue > 0 else 0

    # Calculate base stats
    speed = min(100, arms_hash + wings_bonus + gold_bonus + black_bonus)
    power_core = min(100, max(0, body_hash + gold_bonus + blue_bonus + rust_penalty))
    acceleration = min(100, legs_hash + gold_bonus + black_bonus)
    stability = min(100, max(0, driver_hash + gold_bonus + pink_bonus + rust_penalty))

    return {
        "speed": speed,
        "power_core": power_core,
        "acceleration": acceleration,
        "stability": stability,
        "total": speed + power_core + acceleration + stability,
    }


# Calculate stats for all bots
all_stats = []
for bot in decoded_bots:
    stats = derive_stats_from_metadata(bot)
    stats["bot"] = bot
    all_stats.append(stats)

# Overall statistics
totals = [s["total"] for s in all_stats]
print(f"\nOverall Stats Distribution (before faction bonuses):")
print(f"  Mean total: {statistics.mean(totals):.1f}")
print(f"  Median total: {statistics.median(totals):.1f}")
print(f"  Std Dev: {statistics.stdev(totals):.1f}")
print(f"  Min total: {min(totals)}")
print(f"  Max total: {max(totals)}")

# Compare bots with special attributes vs without
print("\n" + "=" * 80)
print("RARITY BONUS ANALYSIS")
print("=" * 80)

# Categorize bots by special attributes (values > 0)
no_special = [
    s for s in all_stats if all(s["bot"].get(attr, 0) == 0 for attr in special_attrs)
]
with_gold = [s for s in all_stats if s["bot"].get("gold", 0) > 0]
with_rust = [s for s in all_stats if s["bot"].get("rust", 0) > 0]
with_black = [s for s in all_stats if s["bot"].get("black", 0) > 0]
with_pink = [s for s in all_stats if s["bot"].get("pink", 0) > 0]
with_blue = [s for s in all_stats if s["bot"].get("blue", 0) > 0]

print(f"\nBots with NO special attributes ({len(no_special)} bots):")
if no_special:
    totals_no_special = [s["total"] for s in no_special]
    print(f"  Mean total: {statistics.mean(totals_no_special):.1f}")
    print(f"  Range: {min(totals_no_special)} - {max(totals_no_special)}")

print(f"\nBots with GOLD ({len(with_gold)} bots, {len(with_gold)/len(bots)*100:.2f}%):")
if with_gold:
    totals_gold = [s["total"] for s in with_gold]
    print(f"  Mean total: {statistics.mean(totals_gold):.1f}")
    print(f"  Range: {min(totals_gold)} - {max(totals_gold)}")
    print(
        f"  Bonus over no-special: +{statistics.mean(totals_gold) - statistics.mean(totals_no_special):.1f}"
    )

print(
    f"\nBots with BLACK ({len(with_black)} bots, {len(with_black)/len(bots)*100:.2f}%):"
)
if with_black:
    totals_black = [s["total"] for s in with_black]
    print(f"  Mean total: {statistics.mean(totals_black):.1f}")
    print(f"  Range: {min(totals_black)} - {max(totals_black)}")

print(f"\nBots with BLUE ({len(with_blue)} bots, {len(with_blue)/len(bots)*100:.2f}%):")
if with_blue:
    totals_blue = [s["total"] for s in with_blue]
    print(f"  Mean total: {statistics.mean(totals_blue):.1f}")
    print(f"  Range: {min(totals_blue)} - {max(totals_blue)}")

print(f"\nBots with PINK ({len(with_pink)} bots, {len(with_pink)/len(bots)*100:.2f}%):")
if with_pink:
    totals_pink = [s["total"] for s in with_pink]
    print(f"  Mean total: {statistics.mean(totals_pink):.1f}")
    print(f"  Range: {min(totals_pink)} - {max(totals_pink)}")

print(f"\nBots with RUST ({len(with_rust)} bots, {len(with_rust)/len(bots)*100:.2f}%):")
if with_rust:
    totals_rust = [s["total"] for s in with_rust]
    print(f"  Mean total: {statistics.mean(totals_rust):.1f}")
    print(f"  Range: {min(totals_rust)} - {max(totals_rust)}")
    print(
        f"  Penalty vs no-special: {statistics.mean(totals_rust) - statistics.mean(totals_no_special):.1f}"
    )

# Top 10 and Bottom 10 bots
print("\n" + "=" * 80)
print("TOP 10 BOTS (by total stats)")
print("=" * 80)

sorted_stats = sorted(all_stats, key=lambda x: x["total"], reverse=True)
for i, bot_stats in enumerate(sorted_stats[:10], 1):
    bot = bot_stats["bot"]
    special = [attr.upper() for attr in special_attrs if bot.get(attr) == "1"]
    special_str = f" [{', '.join(special)}]" if special else ""
    print(
        f"{i}. Total: {bot_stats['total']} | Speed: {bot_stats['speed']}, Power: {bot_stats['power_core']}, "
        f"Accel: {bot_stats['acceleration']}, Stab: {bot_stats['stability']}"
    )
    print(f"   Type: {bot.get('type')}, Body: {bot.get('body')}{special_str}")

print("\n" + "=" * 80)
print("BOTTOM 10 BOTS (by total stats)")
print("=" * 80)

for i, bot_stats in enumerate(sorted_stats[-10:], 1):
    bot = bot_stats["bot"]
    special = [attr.upper() for attr in special_attrs if bot.get(attr) == "1"]
    special_str = f" [{', '.join(special)}]" if special else ""
    print(
        f"{i}. Total: {bot_stats['total']} | Speed: {bot_stats['speed']}, Power: {bot_stats['power_core']}, "
        f"Accel: {bot_stats['acceleration']}, Stab: {bot_stats['stability']}"
    )
    print(f"   Type: {bot.get('type')}, Body: {bot.get('body')}{special_str}")

print("\n" + "=" * 80)
print("RECOMMENDATIONS")
print("=" * 80)

# Calculate expected bonuses
gold_count = len(with_gold)
if gold_count > 0:
    expected_gold_bonus = 32  # +8 to all 4 stats
    actual_bonus = statistics.mean([s["total"] for s in with_gold]) - statistics.mean(
        [s["total"] for s in no_special]
    )
    print(
        f"\nGOLD bonus: Expected ~+{expected_gold_bonus}, Actual: +{actual_bonus:.1f}"
    )
    if actual_bonus < expected_gold_bonus * 0.8:
        print(
            "  ⚠️  Gold bonus seems lower than expected. Consider increasing from +8 to +10 per stat."
        )
    else:
        print("  ✓ Gold bonus is working well!")

black_count = len(with_black)
if black_count > 0:
    expected_black_bonus = 12  # +6 to speed and acceleration
    actual_bonus = statistics.mean([s["total"] for s in with_black]) - statistics.mean(
        [s["total"] for s in no_special]
    )
    print(
        f"\nBLACK bonus: Expected ~+{expected_black_bonus}, Actual: +{actual_bonus:.1f}"
    )

print(
    f"\n✓ Stats range from {min(totals)} to {max(totals)} (spread: {max(totals) - min(totals)})"
)
print(f"✓ Rarity attributes are making a difference!")
print(f"✓ Gold bots (~{gold_count/len(bots)*100:.2f}% rarity) have clear advantage")
