#!/usr/bin/env python3
"""
Test close matchups to determine optimal variance levels
"""

import json
import os
import statistics
from typing import List, Dict
from dataclasses import dataclass
from collections import defaultdict


# Copy necessary classes and functions
@dataclass
class RacingStats:
    speed: int
    powerCore: int
    acceleration: int
    stability: int


@dataclass
class Bot:
    id: str
    stats: RacingStats
    faction: str = ""


@dataclass
class RaceConfig:
    race_id: int
    distance: int
    terrain: str
    start_time: int = 0


def load_real_bots(limit: int = None) -> List[Bot]:
    """Load real PokedBot stats from precomputed-stats.json"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "..", "data", "precomputed-stats.json")

    with open(data_path, "r") as f:
        data = json.load(f)

    bots = []
    for bot_data in data["stats"]:
        if limit and len(bots) >= limit:
            break

        bot = Bot(
            id=f"PokedBot #{bot_data['tokenId']}",
            stats=RacingStats(
                speed=bot_data["speed"],
                powerCore=bot_data["powerCore"],
                acceleration=bot_data["acceleration"],
                stability=bot_data["stability"],
            ),
            faction=bot_data["faction"],
        )
        bots.append(bot)

    return bots


def calculate_race_time(race: RaceConfig, bot: Bot, participant_index: int) -> float:
    """Exact port of Motoko calculateRaceTime function"""
    distance = float(race.distance)
    stats = bot.stats

    speed = float(stats.speed)
    power_core = float(stats.powerCore)
    stability = float(stats.stability)
    acceleration = float(stats.acceleration)

    base_time = distance * (100.0 / speed) * 30.0

    if race.terrain == "ScrapHeaps":
        terrain_mod = 1.0 + ((100.0 - stability) / 150.0)
    elif race.terrain == "WastelandSand":
        terrain_mod = 1.0 + ((100.0 - power_core) / 200.0)
    elif race.terrain == "MetalRoads":
        terrain_mod = 1.0 + ((100.0 - acceleration) / 250.0)
    else:
        terrain_mod = 1.0

    if race.distance < 10:
        distance_mod = 1.0 - ((acceleration + speed - 60.0) / 350.0)
    elif race.distance > 20:
        distance_mod = 1.0 - ((power_core + stability - 60.0) / 350.0)
    else:
        distance_mod = 1.0 - (
            (speed + power_core + acceleration + stability - 160.0) / 700.0
        )

    race_time_seed = abs(race.start_time // 1_000_000_000)
    combined_seed = race.race_id + race_time_seed
    seed = combined_seed * 1000 + participant_index

    # Better pseudo-random using multiple hash-like operations
    race_seed = (race.race_id * 31337 + 12345) % 100000
    stat_mix = (
        stats.speed * 7
        + stats.powerCore * 11
        + stats.acceleration * 13
        + stats.stability * 17
    ) % 10000
    mixed_seed = (seed * 2654435761 + race_seed + stat_mix) % 1000000

    # Race-specific chaos factor (±15%)
    race_chaos_value = (mixed_seed // 7) % 1000
    race_chaos = 0.85 + (float(race_chaos_value) / 3333.0)  # 0.85 to 1.15

    # Per-bot randomness (±20%)
    bot_random_value = (mixed_seed // 11) % 1000
    bot_random = 0.80 + (float(bot_random_value) / 2500.0)  # 0.80 to 1.20

    # Position-based variance (±10%)
    position_value = (mixed_seed // 13) % 1000
    position_bonus = 0.90 + (float(position_value) / 5000.0)  # 0.90 to 1.10

    stat_synergy = 1.0
    if (
        (speed > 80 and acceleration > 80)
        or (power_core > 80 and stability > 80)
        or (speed > 75 and power_core > 75 and acceleration > 75 and stability > 75)
    ):
        stat_synergy = 0.95
    elif (speed < 40 and power_core < 40) or (acceleration < 40 and stability < 40):
        stat_synergy = 1.08

    final_time = (
        base_time
        * terrain_mod
        * distance_mod
        * race_chaos
        * bot_random
        * position_bonus
        * stat_synergy
    )

    return max(1.0, final_time)


def simulate_race(race: RaceConfig, bots: List[Bot]):
    """Simulate a race and return sorted results"""
    results = []
    for i, bot in enumerate(bots):
        time = calculate_race_time(race, bot, i)
        results.append((bot, time))

    results.sort(key=lambda x: x[1])
    return results


def find_close_bots(all_bots, tolerance=10):
    """Find bots with similar total stats"""
    bots_by_total = defaultdict(list)

    for bot in all_bots:
        total = sum(
            [
                bot.stats.speed,
                bot.stats.powerCore,
                bot.stats.acceleration,
                bot.stats.stability,
            ]
        )
        bots_by_total[total].append(bot)

    # Find stat tiers with multiple bots
    close_matchups = []
    for total, bots in sorted(bots_by_total.items(), reverse=True):
        if len(bots) >= 4:
            close_matchups.append((total, bots[:6]))  # Take up to 6 bots per tier

    return close_matchups[:5]  # Top 5 tiers


def analyze_close_races(bots, num_races=100):
    """Analyze races between similarly-matched bots"""
    position_variance = defaultdict(list)

    for race_id in range(num_races):
        terrain = ["ScrapHeaps", "WastelandSand", "MetalRoads"][race_id % 3]
        distance = [5, 15, 25][race_id % 3]
        start_time = race_id * 3_600_000_000_000

        race = RaceConfig(
            race_id=race_id, distance=distance, terrain=terrain, start_time=start_time
        )

        results = simulate_race(race, bots)

        for position, (bot, time) in enumerate(results, 1):
            position_variance[bot.id].append(position)

    return position_variance


def main():
    print("🎯 CLOSE MATCHUP ANALYSIS")
    print("=" * 80)

    all_bots = load_real_bots()
    print(f"Loaded {len(all_bots)} bots\n")

    close_matchups = find_close_bots(all_bots)

    for total_stats, bots in close_matchups:
        print(f"\n📊 STAT TIER: {total_stats} Total Stats")
        print("-" * 80)

        test_bots = bots[:4]  # Test with 4 bots

        for bot in test_bots:
            print(
                f"   {bot.id:20} S:{bot.stats.speed:2} P:{bot.stats.powerCore:2} "
                f"A:{bot.stats.acceleration:2} St:{bot.stats.stability:2}"
            )

        print(f"\nRunning 100 races...")
        position_variance = analyze_close_races(test_bots, num_races=100)

        print(f"\nPosition Distribution (out of 100 races):")
        for bot_id in position_variance:
            positions = position_variance[bot_id]
            avg_position = statistics.mean(positions)
            std_dev = statistics.stdev(positions)

            # Count positions
            pos_counts = defaultdict(int)
            for pos in positions:
                pos_counts[pos] += 1

            dist_str = " | ".join(
                [f"#{p}: {pos_counts[p]:2}" for p in sorted(pos_counts.keys())]
            )
            print(
                f"   {bot_id:20} Avg: {avg_position:.2f} (σ={std_dev:.2f}) | {dist_str}"
            )

        # Calculate how many different winners
        winners = [
            positions[list(position_variance.keys())[i]][0]
            for i in range(len(test_bots))
            for positions in [position_variance]
        ]
        # This is getting complicated, let's simplify

        first_place_counts = defaultdict(int)
        for bot_id, positions in position_variance.items():
            first_places = sum(1 for p in positions if p == 1)
            first_place_counts[bot_id] = first_places

        print(f"\n🏆 Wins Distribution:")
        for bot_id, wins in sorted(first_place_counts.items(), key=lambda x: -x[1]):
            print(f"   {bot_id:20} {wins:3} wins ({wins}%)")

        unique_winners = sum(1 for wins in first_place_counts.values() if wins > 0)
        print(f"\n   → {unique_winners}/{len(test_bots)} bots won at least once")

        if unique_winners == 1:
            print(f"   ⚠️  PROBLEM: Same bot always wins (100% deterministic)")
        elif unique_winners == len(test_bots):
            print(f"   ✅ GOOD: All bots can win")

    print("\n" + "=" * 80)
    print("✅ Analysis Complete!")


if __name__ == "__main__":
    main()
