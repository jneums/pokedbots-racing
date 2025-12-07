#!/usr/bin/env python3
"""
Fair tier analysis for Blackhole bot #4829
Compare against bots in similar stat range (170-190 total)
"""

import json
import os
import statistics
from typing import List, Dict, Tuple
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

    @property
    def total_stats(self) -> int:
        return (
            self.stats.speed
            + self.stats.powerCore
            + self.stats.acceleration
            + self.stats.stability
        )


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
            id=f"#{bot_data['tokenId']}",
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

    race_seed = (race.race_id * 31337 + 12345) % 100000
    stat_mix = (
        stats.speed * 7
        + stats.powerCore * 11
        + stats.acceleration * 13
        + stats.stability * 17
    ) % 10000
    mixed_seed = (seed * 2654435761 + race_seed + stat_mix) % 1000000

    race_chaos_value = (mixed_seed // 7) % 1000
    race_chaos = 0.85 + (float(race_chaos_value) / 3333.0)

    bot_random_value = (mixed_seed // 11) % 1000
    bot_random = 0.80 + (float(bot_random_value) / 2500.0)

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


def simulate_race(race: RaceConfig, bots: List[Bot]) -> List[Tuple[Bot, float]]:
    """Simulate a race and return sorted results"""
    results = []
    for i, bot in enumerate(bots):
        time = calculate_race_time(race, bot, i)
        results.append((bot, time))

    results.sort(key=lambda x: x[1])
    return results


def main():
    print("🌌 BLACKHOLE BOT #4829 - FAIR TIER ANALYSIS")
    print("=" * 90)

    # Load all bots
    all_bots = load_real_bots()
    target_bot = next(b for b in all_bots if b.token_id == 4829)

    print(f"Target Bot: {target_bot.id}")
    print(f"Total Stats: {target_bot.total_stats}")
    print(
        f"Stats: Speed {target_bot.stats.speed}, Power {target_bot.stats.powerCore}, "
        f"Accel {target_bot.stats.acceleration}, Stability {target_bot.stats.stability}"
    )
    print(f"Faction: {target_bot.faction}\n")

    # Find bots in similar tier (170-190 total stats)
    tier_min, tier_max = 170, 190
    tier_bots = [
        b
        for b in all_bots
        if tier_min <= b.total_stats <= tier_max and b.token_id != target_bot.token_id
    ]

    print(f"Found {len(tier_bots)} bots in tier {tier_min}-{tier_max} total stats\n")

    # Analyze tier composition
    faction_counts = defaultdict(int)
    for bot in tier_bots:
        faction_counts[bot.faction] += 1

    print("Tier Composition by Faction:")
    for faction, count in sorted(faction_counts.items(), key=lambda x: -x[1])[:10]:
        print(f"  {faction:20} {count:4} bots ({count/len(tier_bots)*100:5.1f}%)")

    # Find interesting opponents
    # 1. Bots with similar total but different stat distribution
    similar_total = sorted(
        [b for b in tier_bots if abs(b.total_stats - target_bot.total_stats) <= 3],
        key=lambda b: abs(b.total_stats - target_bot.total_stats),
    )[:20]

    # 2. Other high acceleration bots in this tier
    high_accel_tier = sorted(
        [b for b in tier_bots if b.stats.acceleration >= 45],
        key=lambda b: b.stats.acceleration,
        reverse=True,
    )[:15]

    # 3. Speed specialists in this tier
    speed_specialists = sorted(
        [b for b in tier_bots if b.stats.speed >= 45],
        key=lambda b: b.stats.speed,
        reverse=True,
    )[:15]

    # 4. Balanced bots in this tier
    balanced_tier = sorted(
        [
            b
            for b in tier_bots
            if min(
                b.stats.speed,
                b.stats.powerCore,
                b.stats.acceleration,
                b.stats.stability,
            )
            >= 40
        ],
        key=lambda b: b.total_stats,
        reverse=True,
    )[:15]

    # 5. Random sample from tier
    import random

    random.seed(42)
    random_sample = random.sample(tier_bots, min(30, len(tier_bots)))

    print(f"\n" + "=" * 90)
    print("SIMULATION 1: VS SIMILAR TOTAL STATS (±3)")
    print("=" * 90)

    run_simulation(target_bot, similar_total[:15], num_races=1000)

    print(f"\n" + "=" * 90)
    print("SIMULATION 2: VS HIGH ACCELERATION BOTS IN TIER")
    print("=" * 90)

    print(f"\nTop acceleration bots in {tier_min}-{tier_max} tier:")
    for i, bot in enumerate(high_accel_tier[:10], 1):
        print(
            f"  {i:2}. {bot.id:8} A:{bot.stats.acceleration:2} Total:{bot.total_stats:3} "
            f"[S:{bot.stats.speed:2} P:{bot.stats.powerCore:2} St:{bot.stats.stability:2}] {bot.faction}"
        )

    run_simulation(target_bot, high_accel_tier, num_races=1000)

    print(f"\n" + "=" * 90)
    print("SIMULATION 3: VS SPEED SPECIALISTS IN TIER")
    print("=" * 90)

    run_simulation(target_bot, speed_specialists, num_races=1000)

    print(f"\n" + "=" * 90)
    print("SIMULATION 4: VS BALANCED BOTS IN TIER")
    print("=" * 90)

    run_simulation(target_bot, balanced_tier, num_races=1000)

    print(f"\n" + "=" * 90)
    print("SIMULATION 5: VS RANDOM SAMPLE FROM TIER")
    print("=" * 90)

    run_simulation(target_bot, random_sample, num_races=1000)

    # Overall tier ranking
    print(f"\n" + "=" * 90)
    print("OVERALL TIER RANKING")
    print("=" * 90)

    print(f"\nRunning comprehensive tier championship with {len(tier_bots)} bots...")

    # Run subset of tier for ranking (too expensive to run all)
    ranking_sample = random.sample(tier_bots, min(50, len(tier_bots)))
    if target_bot not in ranking_sample:
        ranking_sample.append(target_bot)

    overall_wins = defaultdict(int)
    overall_races = defaultdict(int)

    terrains = ["ScrapHeaps", "WastelandSand", "MetalRoads"]
    distances = [5, 10, 15, 20, 25, 30]

    for race_id in range(500):
        terrain = terrains[race_id % len(terrains)]
        distance = distances[race_id % len(distances)]
        start_time = race_id * 3_600_000_000_000

        # Random subset of 8 bots per race
        racers = random.sample(ranking_sample, min(8, len(ranking_sample)))

        race = RaceConfig(
            race_id=race_id, distance=distance, terrain=terrain, start_time=start_time
        )

        results = simulate_race(race, racers)

        for position, (bot, time) in enumerate(results, 1):
            overall_races[bot.token_id] += 1
            if position == 1:
                overall_wins[bot.token_id] += 1

    # Calculate rankings
    rankings = []
    for bot in ranking_sample:
        races = overall_races[bot.token_id]
        wins = overall_wins[bot.token_id]
        win_rate = (wins / races * 100) if races > 0 else 0
        rankings.append((bot, wins, races, win_rate))

    rankings.sort(key=lambda x: x[3], reverse=True)

    print(f"\nTop 20 bots in tier (by win rate in {500} races):")
    print(
        f"{'Rank':<6}{'Bot':<10}{'Wins':<8}{'Races':<8}{'Win%':<8}{'Total':<8}{'Accel':<8}{'Faction'}"
    )
    print("-" * 90)

    target_rank = None
    for rank, (bot, wins, races, win_rate) in enumerate(rankings[:30], 1):
        marker = " ⭐" if bot.token_id == target_bot.token_id else ""
        print(
            f"{rank:<6}{bot.id:<10}{wins:<8}{races:<8}{win_rate:5.1f}%  {bot.total_stats:<8}"
            f"{bot.stats.acceleration:<8}{bot.faction[:15]}{marker}"
        )

        if bot.token_id == target_bot.token_id:
            target_rank = rank

    if target_rank:
        percentile = (1 - (target_rank / len(rankings))) * 100
        print(
            f"\n{target_bot.id} ranks #{target_rank} out of {len(rankings)} bots ({percentile:.1f} percentile)"
        )

    # Find best 1v1 matchups
    print(f"\n" + "=" * 90)
    print("BEST AND WORST MATCHUPS")
    print("=" * 90)

    matchup_results = []
    test_opponents = random.sample(tier_bots, min(30, len(tier_bots)))

    for opponent in test_opponents:
        wins_bot = 0
        total = 100

        for race_id in range(total):
            terrain = terrains[race_id % len(terrains)]
            distance = distances[race_id % len(distances)]
            start_time = race_id * 3_600_000_000_000

            race = RaceConfig(
                race_id=race_id,
                distance=distance,
                terrain=terrain,
                start_time=start_time,
            )

            results = simulate_race(race, [target_bot, opponent])
            if results[0][0].token_id == target_bot.token_id:
                wins_bot += 1

        win_rate = wins_bot / total * 100
        matchup_results.append((opponent, win_rate, wins_bot, total))

    matchup_results.sort(key=lambda x: x[1], reverse=True)

    print(f"\nBest Matchups for {target_bot.id}:")
    print(
        f"{'Opponent':<10}{'Win%':<10}{'Record':<12}{'Opp Total':<12}{'Opp Accel':<12}{'Faction'}"
    )
    print("-" * 90)
    for opponent, win_rate, wins, total in matchup_results[:10]:
        print(
            f"{opponent.id:<10}{win_rate:5.1f}%    {wins:3}-{total-wins:3}      "
            f"{opponent.total_stats:<12}{opponent.stats.acceleration:<12}{opponent.faction[:15]}"
        )

    print(f"\nWorst Matchups for {target_bot.id}:")
    for opponent, win_rate, wins, total in matchup_results[-10:]:
        print(
            f"{opponent.id:<10}{win_rate:5.1f}%    {wins:3}-{total-wins:3}      "
            f"{opponent.total_stats:<12}{opponent.stats.acceleration:<12}{opponent.faction[:15]}"
        )


def run_simulation(target_bot: Bot, opponents: List[Bot], num_races: int = 500):
    """Run simulation and print results"""

    terrains = ["ScrapHeaps", "WastelandSand", "MetalRoads"]
    distances = [5, 10, 15, 20, 25, 30]

    overall_wins = defaultdict(int)
    wins_by_terrain = defaultdict(lambda: defaultdict(int))
    wins_by_distance = defaultdict(lambda: defaultdict(int))
    position_counts = defaultdict(lambda: defaultdict(int))

    for race_id in range(num_races):
        terrain = terrains[race_id % len(terrains)]
        distance = distances[race_id % len(distances)]
        start_time = race_id * 3_600_000_000_000

        race = RaceConfig(
            race_id=race_id, distance=distance, terrain=terrain, start_time=start_time
        )

        all_racers = [target_bot] + opponents
        results = simulate_race(race, all_racers)

        winner = results[0][0]
        overall_wins[winner.token_id] += 1
        wins_by_terrain[winner.token_id][terrain] += 1
        wins_by_distance[winner.token_id][distance] += 1

        for position, (bot, time) in enumerate(results, 1):
            position_counts[bot.token_id][position] += 1

    # Results
    bot_wins = overall_wins[target_bot.token_id]
    win_rate = (bot_wins / num_races) * 100

    positions = position_counts[target_bot.token_id]
    avg_position = sum(pos * count for pos, count in positions.items()) / sum(
        positions.values()
    )

    print(f"\n📊 RESULTS for {target_bot.id}:")
    print(f"  Win Rate: {bot_wins}/{num_races} ({win_rate:.1f}%)")
    print(f"  Average Finish: {avg_position:.2f}")
    print(
        f"  Podiums: {positions.get(1,0)+positions.get(2,0)+positions.get(3,0)} "
        f"(1st: {positions.get(1,0)}, 2nd: {positions.get(2,0)}, 3rd: {positions.get(3,0)})"
    )

    print(f"\n  By Terrain:")
    for terrain in terrains:
        terrain_races = num_races // len(terrains)
        terrain_wins = wins_by_terrain[target_bot.token_id][terrain]
        rate = (terrain_wins / terrain_races) * 100
        print(f"    {terrain:20} {terrain_wins:3}/{terrain_races:3} ({rate:5.1f}%)")

    print(f"\n  By Distance:")
    for distance in distances:
        dist_races = num_races // len(distances)
        dist_wins = wins_by_distance[target_bot.token_id][distance]
        rate = (dist_wins / dist_races) * 100
        print(f"    {distance:2}km: {dist_wins:3}/{dist_races:3} ({rate:5.1f}%)")

    # Top competitors
    print(f"\n  Top 5 competitors in this field:")
    top_competitors = sorted(overall_wins.items(), key=lambda x: x[1], reverse=True)[:5]
    for rank, (token_id, wins) in enumerate(top_competitors, 1):
        bot = next(
            (b for b in [target_bot] + opponents if b.token_id == token_id), None
        )
        if bot:
            rate = (wins / num_races) * 100
            marker = " ⭐" if token_id == target_bot.token_id else ""
            print(
                f"    {rank}. {bot.id:8} {wins:3} wins ({rate:5.1f}%) | "
                f"Total:{bot.total_stats:3} A:{bot.stats.acceleration:2}{marker}"
            )


if __name__ == "__main__":
    main()
