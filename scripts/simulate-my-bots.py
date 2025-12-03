#!/usr/bin/env python3
"""
Simulate Jesse's 3 PokedBots over many races
"""

import json
import os
import statistics
from typing import List, Dict
from dataclasses import dataclass
from collections import defaultdict


@dataclass
class RacingStats:
    speed: int
    powerCore: int
    acceleration: int
    stability: int


@dataclass
class Bot:
    id: str
    token_id: int
    stats: RacingStats
    faction: str = ""


@dataclass
class RaceConfig:
    race_id: int
    distance: int
    terrain: str
    start_time: int = 0


def load_real_bots() -> List[Bot]:
    """Load real PokedBot stats from precomputed-stats.json"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "..", "data", "precomputed-stats.json")

    with open(data_path, "r") as f:
        data = json.load(f)

    bots = []
    for bot_data in data["stats"]:
        bot = Bot(
            id=f"PokedBot #{bot_data['tokenId']}",
            token_id=bot_data["tokenId"],
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
    """Exact port of fixed Motoko calculateRaceTime function"""
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
    race_chaos = 0.85 + (float(race_chaos_value) / 3333.0)

    # Per-bot randomness (±20%)
    bot_random_value = (mixed_seed // 11) % 1000
    bot_random = 0.80 + (float(bot_random_value) / 2500.0)

    # Position-based variance (±10%)
    position_value = (mixed_seed // 13) % 1000
    position_bonus = 0.90 + (float(position_value) / 5000.0)

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


def main():
    print("🏁 JESSE'S POKEDBOTS RACING SIMULATION")
    print("=" * 80)

    # Load all bots
    all_bots = load_real_bots()
    print(f"Loaded {len(all_bots)} bots from collection\n")

    # Jesse's bots
    jesse_bot_ids = [737, 4079, 4343, 8631]
    jesse_bots = [b for b in all_bots if b.token_id in jesse_bot_ids]

    print("🤖 YOUR BOTS:")
    print("-" * 80)
    for bot in jesse_bots:
        total = sum(
            [
                bot.stats.speed,
                bot.stats.powerCore,
                bot.stats.acceleration,
                bot.stats.stability,
            ]
        )
        print(
            f"{bot.id:20} Total:{total:3} | S:{bot.stats.speed:2} P:{bot.stats.powerCore:2} A:{bot.stats.acceleration:2} St:{bot.stats.stability:2} | {bot.faction}"
        )

    # Run comprehensive simulation
    num_races = 1000
    terrains = ["ScrapHeaps", "WastelandSand", "MetalRoads"]
    distances = [5, 10, 15, 20, 25, 30]

    print(f"\n📊 RUNNING {num_races} RACE SIMULATIONS")
    print("-" * 80)

    # Track overall stats
    position_counts = defaultdict(lambda: defaultdict(int))
    wins_by_terrain = defaultdict(lambda: defaultdict(int))
    wins_by_distance = defaultdict(lambda: defaultdict(int))
    head_to_head = defaultdict(lambda: defaultdict(int))

    for race_id in range(num_races):
        terrain = terrains[race_id % len(terrains)]
        distance = distances[race_id % len(distances)]
        start_time = race_id * 3_600_000_000_000

        race = RaceConfig(
            race_id=race_id, distance=distance, terrain=terrain, start_time=start_time
        )

        results = simulate_race(race, jesse_bots)

        # Track positions
        for position, (bot, time) in enumerate(results, 1):
            position_counts[bot.token_id][position] += 1

            if position == 1:
                wins_by_terrain[bot.token_id][terrain] += 1
                wins_by_distance[bot.token_id][distance] += 1

        # Head-to-head tracking
        winner = results[0][0].token_id
        for _, (loser_bot, _) in enumerate(results[1:], 1):
            head_to_head[winner][loser_bot.token_id] += 1

    print("\n🏆 OVERALL RESULTS")
    print("-" * 80)

    for bot in jesse_bots:
        positions = position_counts[bot.token_id]
        total_positions = sum(positions.values())

        wins = positions[1]
        seconds = positions[2]
        thirds = positions[3]

        avg_position = (
            sum(pos * count for pos, count in positions.items()) / total_positions
        )
        win_rate = (wins / total_positions) * 100
        podium_rate = ((wins + seconds) / total_positions) * 100

        print(f"\n{bot.id}")
        print(
            f"  Wins: {wins:4} ({win_rate:5.1f}%) | 2nd: {seconds:4} | 3rd: {thirds:4} | Podium: {podium_rate:5.1f}%"
        )
        print(f"  Avg Position: {avg_position:.2f}")

    print("\n\n🌍 PERFORMANCE BY TERRAIN")
    print("-" * 80)

    for terrain in terrains:
        print(f"\n{terrain}:")
        terrain_wins = [
            (bot.token_id, wins_by_terrain[bot.token_id][terrain]) for bot in jesse_bots
        ]
        terrain_wins.sort(key=lambda x: -x[1])

        total_terrain_races = num_races // len(terrains)
        for token_id, wins in terrain_wins:
            bot = next(b for b in jesse_bots if b.token_id == token_id)
            win_rate = (wins / total_terrain_races) * 100
            print(f"  {bot.id:20} {wins:3} wins ({win_rate:5.1f}%)")

    print("\n\n📏 PERFORMANCE BY DISTANCE")
    print("-" * 80)

    for distance in distances:
        print(f"\n{distance}km:")
        distance_wins = [
            (bot.token_id, wins_by_distance[bot.token_id][distance])
            for bot in jesse_bots
        ]
        distance_wins.sort(key=lambda x: -x[1])

        total_distance_races = num_races // len(distances)
        for token_id, wins in distance_wins:
            bot = next(b for b in jesse_bots if b.token_id == token_id)
            win_rate = (wins / total_distance_races) * 100
            print(f"  {bot.id:20} {wins:3} wins ({win_rate:5.1f}%)")

    print("\n\n⚔️  HEAD-TO-HEAD RECORD")
    print("-" * 80)

    for bot1 in jesse_bots:
        print(f"\n{bot1.id} vs:")
        for bot2 in jesse_bots:
            if bot1.token_id != bot2.token_id:
                wins_against = head_to_head[bot1.token_id][bot2.token_id]
                losses_against = head_to_head[bot2.token_id][bot1.token_id]
                total_matchups = wins_against + losses_against
                win_rate = (
                    (wins_against / total_matchups * 100) if total_matchups > 0 else 0
                )
                print(
                    f"  {bot2.id:20} {wins_against:3}-{losses_against:3} ({win_rate:5.1f}%)"
                )

    print("\n\n💡 RECOMMENDATIONS")
    print("-" * 80)

    # Find best performer
    best_bot = max(jesse_bots, key=lambda b: position_counts[b.token_id][1])
    worst_bot = min(jesse_bots, key=lambda b: position_counts[b.token_id][1])

    print(f"\n✅ Best Overall: {best_bot.id}")
    print(f"   ({position_counts[best_bot.token_id][1]} wins in {num_races} races)")

    # Find terrain specialists
    for terrain in terrains:
        specialist = max(jesse_bots, key=lambda b: wins_by_terrain[b.token_id][terrain])
        specialist_wins = wins_by_terrain[specialist.token_id][terrain]
        print(f"\n🌍 {terrain} Specialist: {specialist.id}")
        print(f"   ({specialist_wins} wins on this terrain)")

    # Find distance specialists
    print("\n📏 Distance Specialists:")
    short_specialist = max(
        jesse_bots, key=lambda b: sum(wins_by_distance[b.token_id][d] for d in [5, 10])
    )
    long_specialist = max(
        jesse_bots, key=lambda b: sum(wins_by_distance[b.token_id][d] for d in [25, 30])
    )

    print(f"   Short Races (5-10km): {short_specialist.id}")
    print(f"   Long Races (25-30km): {long_specialist.id}")

    print("\n" + "=" * 80)
    print(f"✅ Simulation Complete! ({num_races} races analyzed)")


if __name__ == "__main__":
    main()
