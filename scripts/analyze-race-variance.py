#!/usr/bin/env python3
"""
Race Simulation Analyzer
Emulates the Motoko RacingSimulator to analyze variance and outcomes
Uses real PokedBot stats from precomputed-stats.json
"""

import random
import statistics
from typing import List, Dict, Tuple
from dataclasses import dataclass
from collections import defaultdict
import json
import os


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


@dataclass
class RaceConfig:
    race_id: int
    distance: int  # km
    terrain: str  # ScrapHeaps, WastelandSand, MetalRoads
    start_time: int = 0  # Unix timestamp in nanoseconds


def calculate_race_time(race: RaceConfig, bot: Bot, participant_index: int) -> float:
    """
    Exact port of Motoko calculateRaceTime function
    """
    distance = float(race.distance)
    stats = bot.stats

    # Convert stats to floats
    speed = float(stats.speed)
    power_core = float(stats.powerCore)
    stability = float(stats.stability)
    acceleration = float(stats.acceleration)

    # Base time calculation (inverse of speed)
    base_time = distance * (100.0 / speed) * 30.0

    # Terrain modifier - MORE IMPACTFUL (20-50% variation)
    if race.terrain == "ScrapHeaps":
        terrain_mod = 1.0 + ((100.0 - stability) / 150.0)  # Up to +67%
    elif race.terrain == "WastelandSand":
        terrain_mod = 1.0 + ((100.0 - power_core) / 200.0)  # Up to +50%
    elif race.terrain == "MetalRoads":
        terrain_mod = 1.0 + ((100.0 - acceleration) / 250.0)  # Up to +40%
    else:
        terrain_mod = 1.0

    # Distance modifier - MORE PRONOUNCED STAT INTERACTIONS
    if race.distance < 10:
        # Short sprint: acceleration + speed dominate
        distance_mod = 1.0 - ((acceleration + speed - 60.0) / 350.0)
    elif race.distance > 20:
        # Long trek: powerCore + stability critical
        distance_mod = 1.0 - ((power_core + stability - 60.0) / 350.0)
    else:
        # Medium: all stats matter
        distance_mod = 1.0 - (
            (speed + power_core + acceleration + stability - 160.0) / 700.0
        )

    # Seed calculation (matching Motoko with start time)
    race_time_seed = abs(race.start_time // 1_000_000_000)  # Convert to seconds
    combined_seed = race.race_id + race_time_seed
    seed = combined_seed * 1000 + participant_index

    # Race-specific chaos factor
    race_chaos_seed = (race.race_id * 7919) % 1000
    race_chaos = 0.90 + (float(race_chaos_seed) / 5000.0)  # ±10%

    # Per-bot randomness - MUCH HIGHER (±15%)
    bot_random_seed = (seed * 2971) % 1000
    bot_random = 0.85 + (float(bot_random_seed) / 3333.0)  # ±15%

    # Position-based variance
    position_seed = (seed * 4993) % 100
    position_bonus = 0.97 + (float(position_seed) / 3333.0)  # ±3%

    # Stat interaction bonus (synergy between complementary stats)
    stat_synergy = 1.0
    if (
        (speed > 80 and acceleration > 80)  # Speed demons
        or (power_core > 80 and stability > 80)  # Endurance tanks
        or (speed > 75 and power_core > 75 and acceleration > 75 and stability > 75)
    ):  # Well-rounded
        stat_synergy = 0.95  # 5% bonus
    elif (speed < 40 and power_core < 40) or (  # Double weakness
        acceleration < 40 and stability < 40
    ):
        stat_synergy = 1.08  # 8% penalty

    # Final time with all modifiers
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


def simulate_race(race: RaceConfig, bots: List[Bot]) -> List[Tuple[Bot, float]]:
    """Simulate a race and return sorted results"""
    results = []
    for i, bot in enumerate(bots):
        time = calculate_race_time(race, bot, i)
        results.append((bot, time))

    # Sort by time
    results.sort(key=lambda x: x[1])
    return results


def analyze_bot_consistency(bot: Bot, num_races: int = 100) -> Dict:
    """Test how consistent a bot's performance is across multiple races"""
    times = []

    # Test across different race configurations
    for race_id in range(num_races):
        # Vary race configurations
        terrain = ["ScrapHeaps", "WastelandSand", "MetalRoads"][race_id % 3]
        distance = [5, 15, 25][race_id % 3]  # Short, Medium, Long
        start_time = race_id * 3_600_000_000_000  # Different times

        race = RaceConfig(
            race_id=race_id, distance=distance, terrain=terrain, start_time=start_time
        )
        time = calculate_race_time(race, bot, 0)
        times.append(time)

    return {
        "bot_id": bot.id,
        "stats": f"S:{bot.stats.speed} P:{bot.stats.powerCore} A:{bot.stats.acceleration} St:{bot.stats.stability}",
        "mean_time": statistics.mean(times),
        "std_dev": statistics.stdev(times),
        "min_time": min(times),
        "max_time": max(times),
        "variance_percent": (statistics.stdev(times) / statistics.mean(times)) * 100,
    }


def analyze_head_to_head(bot1: Bot, bot2: Bot, num_races: int = 100) -> Dict:
    """Analyze head-to-head matchups"""
    bot1_wins = 0
    bot2_wins = 0
    time_diffs = []

    for race_id in range(num_races):
        terrain = ["ScrapHeaps", "WastelandSand", "MetalRoads"][race_id % 3]
        distance = [5, 15, 25][race_id % 3]
        start_time = race_id * 3_600_000_000_000

        race = RaceConfig(
            race_id=race_id, distance=distance, terrain=terrain, start_time=start_time
        )
        results = simulate_race(race, [bot1, bot2])

        if results[0][0].id == bot1.id:
            bot1_wins += 1
        else:
            bot2_wins += 1

        time_diff = abs(results[0][1] - results[1][1])
        time_diffs.append(time_diff)

    return {
        "bot1": bot1.id,
        "bot2": bot2.id,
        "bot1_wins": bot1_wins,
        "bot2_wins": bot2_wins,
        "win_rate_bot1": bot1_wins / num_races,
        "avg_time_diff": statistics.mean(time_diffs),
        "close_races": sum(1 for d in time_diffs if d < 50),  # <50s difference
    }


def analyze_race_variance(
    race_config: RaceConfig, bots: List[Bot], num_simulations: int = 50
) -> Dict:
    """Run the same race multiple times with different start times (simulating different race instances)"""
    position_counts = defaultdict(lambda: defaultdict(int))

    for sim in range(num_simulations):
        # Different start time = different variance (key change!)
        race = RaceConfig(
            race_id=race_config.race_id,
            distance=race_config.distance,
            terrain=race_config.terrain,
            start_time=sim * 3_600_000_000_000,  # Each hour apart
        )
        results = simulate_race(race, bots)

        for position, (bot, time) in enumerate(results, 1):
            position_counts[bot.id][position] += 1

    return {
        "race_config": f"{race_config.terrain} {race_config.distance}km",
        "simulations": num_simulations,
        "position_distribution": dict(position_counts),
    }


def main():
    print("🏁 RACING SIMULATOR ANALYSIS")
    print("=" * 80)
    print("Loading real PokedBot data...")

    # Load real bots
    all_bots = load_real_bots()
    print(f"✅ Loaded {len(all_bots)} real PokedBots")

    # Select interesting bots for analysis
    # Find high-stat, low-stat, and balanced bots
    bots_by_overall = sorted(
        all_bots,
        key=lambda b: sum(
            [b.stats.speed, b.stats.powerCore, b.stats.acceleration, b.stats.stability]
        ),
        reverse=True,
    )

    # Get top performers, mid-tier, and low-tier
    test_bots = [
        bots_by_overall[0],  # Best overall
        bots_by_overall[len(bots_by_overall) // 4],  # Upper mid
        bots_by_overall[len(bots_by_overall) // 2],  # Middle
        bots_by_overall[3 * len(bots_by_overall) // 4],  # Lower mid
        bots_by_overall[-1],  # Worst overall
    ]

    # Also find specialists
    speed_demon = max(all_bots, key=lambda b: b.stats.speed)
    tank = max(all_bots, key=lambda b: b.stats.powerCore + b.stats.stability)

    print(f"\n🤖 TEST BOTS SELECTED:")
    for bot in test_bots:
        total = sum(
            [
                bot.stats.speed,
                bot.stats.powerCore,
                bot.stats.acceleration,
                bot.stats.stability,
            ]
        )
        print(
            f"   {bot.id:20} Total:{total:3} S:{bot.stats.speed:2} P:{bot.stats.powerCore:2} A:{bot.stats.acceleration:2} St:{bot.stats.stability:2} ({bot.faction})"
        )

    print(f"\n🏆 SPECIALISTS:")
    print(f"   Speed Demon: {speed_demon.id} (Speed: {speed_demon.stats.speed})")
    print(f"   Tank: {tank.id} (P+St: {tank.stats.powerCore + tank.stats.stability})")

    bots = test_bots

    print("\n📊 BOT CONSISTENCY ANALYSIS")
    print("-" * 80)
    print("Testing each bot across 100 different races (varying terrain/distance)")
    print()

    for bot in bots:
        analysis = analyze_bot_consistency(bot, num_races=100)
        total_stats = sum(
            [
                bot.stats.speed,
                bot.stats.powerCore,
                bot.stats.acceleration,
                bot.stats.stability,
            ]
        )
        print(f"🤖 {bot.id:25} Total:{total_stats:3}")
        print(
            f"   Mean: {analysis['mean_time']:.1f}s | StdDev: {analysis['std_dev']:.1f}s | Variance: {analysis['variance_percent']:.1f}%"
        )
        print(f"   Range: {analysis['min_time']:.1f}s - {analysis['max_time']:.1f}s")
        print()

    print("\n⚔️  HEAD-TO-HEAD ANALYSIS")
    print("-" * 80)

    matchups = [
        (bots[0], bots[1]),  # Speed vs Tank
        (bots[0], bots[2]),  # Speed vs Balanced
        (bots[1], bots[2]),  # Tank vs Balanced
        (bots[2], bots[3]),  # Balanced vs Average
        (bots[0], bots[4]),  # Speed vs GlassCannon
    ]

    for bot1, bot2 in matchups:
        h2h = analyze_head_to_head(bot1, bot2, num_races=100)
        print(f"{h2h['bot1']:15} vs {h2h['bot2']:15}")
        print(
            f"   Wins: {h2h['bot1_wins']:3} - {h2h['bot2_wins']:3} ({h2h['win_rate_bot1']*100:.1f}% - {(1-h2h['win_rate_bot1'])*100:.1f}%)"
        )
        print(
            f"   Avg Time Diff: {h2h['avg_time_diff']:.1f}s | Close Races (<50s): {h2h['close_races']}"
        )
        print()

    print("\n🎲 RACE VARIANCE ANALYSIS")
    print("-" * 80)
    print("Running same bots in same race config 50 times (different race instances)")
    print()

    test_races = [
        RaceConfig(race_id=1000, distance=5, terrain="ScrapHeaps", start_time=0),
        RaceConfig(race_id=2000, distance=15, terrain="WastelandSand", start_time=0),
        RaceConfig(race_id=3000, distance=25, terrain="MetalRoads", start_time=0),
    ]

    for race_config in test_races:
        analysis = analyze_race_variance(race_config, bots[:4], num_simulations=50)
        print(f"📍 {analysis['race_config']}")
        print("   Position Distribution (times finishing in each position):")

        for bot_id, positions in analysis["position_distribution"].items():
            dist_str = " | ".join(
                [f"#{pos}: {count:2}" for pos, count in sorted(positions.items())]
            )
            print(f"   {bot_id:15} {dist_str}")
        print()

    print("\n🏆 TERRAIN-SPECIFIC PERFORMANCE")
    print("-" * 80)

    for bot in bots[:3]:
        print(f"\n🤖 {bot.id}")
        for terrain in ["ScrapHeaps", "WastelandSand", "MetalRoads"]:
            times = []
            for dist in [5, 15, 25]:
                race = RaceConfig(
                    race_id=5000, distance=dist, terrain=terrain, start_time=0
                )
                time = calculate_race_time(race, bot, 0)
                times.append(time)

            avg_time = statistics.mean(times)
            print(
                f"   {terrain:20} Avg: {avg_time:7.1f}s (Range: {min(times):.1f}s - {max(times):.1f}s)"
            )

    print("\n" + "=" * 80)
    print("✅ Analysis Complete!")


if __name__ == "__main__":
    main()
