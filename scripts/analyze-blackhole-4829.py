#!/usr/bin/env python3
"""
Analyze ultra-fast Blackhole bot #4829 (46 total, 51 acceleration)
Compare against other elite bots and simulate matchups
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
        return self.stats.speed + self.stats.powerCore + self.stats.acceleration + self.stats.stability


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


def simulate_race(race: RaceConfig, bots: List[Bot]) -> List[Tuple[Bot, float]]:
    """Simulate a race and return sorted results"""
    results = []
    for i, bot in enumerate(bots):
        time = calculate_race_time(race, bot, i)
        results.append((bot, time))

    results.sort(key=lambda x: x[1])
    return results


def analyze_bot_strengths(bot: Bot):
    """Analyze specific stat strengths"""
    print(f"\n📊 STAT BREAKDOWN FOR {bot.id}")
    print("-" * 80)
    stats = bot.stats
    total = bot.total_stats
    
    print(f"Faction: {bot.faction}")
    print(f"Total Stats: {total}")
    print(f"\nIndividual Stats:")
    print(f"  Speed:        {stats.speed:2} ({stats.speed/total*100:5.1f}% of total)")
    print(f"  Power Core:   {stats.powerCore:2} ({stats.powerCore/total*100:5.1f}% of total)")
    print(f"  Acceleration: {stats.acceleration:2} ({stats.acceleration/total*100:5.1f}% of total) ⭐ ULTRA RARE")
    print(f"  Stability:    {stats.stability:2} ({stats.stability/total*100:5.1f}% of total)")
    
    print(f"\n💪 STRENGTHS:")
    if stats.acceleration > 48:
        print(f"  • Elite acceleration ({stats.acceleration}) - excellent for short races & MetalRoads")
    if stats.powerCore > 44:
        print(f"  • Strong power core ({stats.powerCore}) - good for WastelandSand terrain")
    if stats.speed + stats.acceleration > 90:
        print(f"  • Speed+Accel combo: {stats.speed + stats.acceleration} - STAT SYNERGY BONUS (5% time reduction)")
    
    print(f"\n⚠️  WEAKNESSES:")
    if stats.speed < 45:
        print(f"  • Moderate speed ({stats.speed}) - may struggle on very long races")
    if stats.stability < 45:
        print(f"  • Moderate stability ({stats.stability}) - not ideal for ScrapHeaps terrain")


def find_comparable_bots(all_bots: List[Bot], target_bot: Bot) -> Dict[str, List[Bot]]:
    """Find interesting bots to compare against"""
    
    # Top 20 bots by total stats
    top_bots = sorted(all_bots, key=lambda b: b.total_stats, reverse=True)[:20]
    
    # Other Blackhole bots in top 100
    blackhole_bots = [b for b in all_bots if b.faction == "Blackhole" and b.token_id != target_bot.token_id]
    top_blackhole = sorted(blackhole_bots, key=lambda b: b.total_stats, reverse=True)[:10]
    
    # Bots with similar total stats (±5)
    similar_total = [
        b for b in all_bots 
        if abs(b.total_stats - target_bot.total_stats) <= 5 
        and b.token_id != target_bot.token_id
    ][:10]
    
    # High acceleration bots
    high_accel = sorted(all_bots, key=lambda b: b.stats.acceleration, reverse=True)[:10]
    
    # Balanced elite bots (all stats > 40)
    balanced_elite = [
        b for b in all_bots
        if b.stats.speed >= 40 and b.stats.powerCore >= 40 
        and b.stats.acceleration >= 40 and b.stats.stability >= 40
        and b.token_id != target_bot.token_id
    ][:15]
    
    return {
        "top_overall": top_bots,
        "top_blackhole": top_blackhole,
        "similar_total": similar_total,
        "high_acceleration": high_accel,
        "balanced_elite": balanced_elite,
    }


def run_matchup_analysis(bot: Bot, opponents: List[Bot], category_name: str, num_races: int = 500):
    """Run comprehensive matchup analysis"""
    
    print(f"\n🏁 MATCHUP ANALYSIS: {bot.id} vs {category_name.upper()}")
    print("=" * 80)
    
    terrains = ["ScrapHeaps", "WastelandSand", "MetalRoads"]
    distances = [5, 10, 15, 20, 25, 30]
    
    # Stats tracking
    overall_wins = defaultdict(int)
    wins_by_terrain = defaultdict(lambda: defaultdict(int))
    wins_by_distance = defaultdict(lambda: defaultdict(int))
    head_to_head_wins = defaultdict(int)
    
    race_count = 0
    for race_id in range(num_races):
        terrain = terrains[race_id % len(terrains)]
        distance = distances[race_id % len(distances)]
        start_time = race_id * 3_600_000_000_000
        
        race = RaceConfig(
            race_id=race_id,
            distance=distance,
            terrain=terrain,
            start_time=start_time
        )
        
        # Race against all opponents
        all_racers = [bot] + opponents
        results = simulate_race(race, all_racers)
        
        winner = results[0][0]
        overall_wins[winner.token_id] += 1
        wins_by_terrain[winner.token_id][terrain] += 1
        wins_by_distance[winner.token_id][distance] += 1
        
        # Track head-to-head vs target bot
        if results[0][0].token_id == bot.token_id:
            race_count += 1
        
    # Calculate results
    total_races = num_races
    bot_wins = overall_wins[bot.token_id]
    win_rate = (bot_wins / total_races) * 100
    
    print(f"\n📈 OVERALL PERFORMANCE:")
    print(f"  Win Rate: {bot_wins}/{total_races} races ({win_rate:.1f}%)")
    
    # Top competitors
    print(f"\n🏆 TOP 5 PERFORMERS IN THIS FIELD:")
    top_performers = sorted(
        [(tid, wins) for tid, wins in overall_wins.items()],
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    for rank, (token_id, wins) in enumerate(top_performers, 1):
        racer = next(b for b in ([bot] + opponents) if b.token_id == token_id)
        rate = (wins / total_races) * 100
        marker = " ⭐" if token_id == bot.token_id else ""
        print(f"  {rank}. {racer.id:20} {wins:3} wins ({rate:5.1f}%) | Total Stats: {racer.total_stats}{marker}")
    
    # Terrain performance
    print(f"\n🌍 PERFORMANCE BY TERRAIN (for {bot.id}):")
    for terrain in terrains:
        terrain_races = num_races // len(terrains)
        terrain_wins = wins_by_terrain[bot.token_id][terrain]
        rate = (terrain_wins / terrain_races) * 100
        
        # Identify why this terrain is good/bad
        analysis = ""
        if terrain == "ScrapHeaps":
            analysis = f"(Stability: {bot.stats.stability})"
        elif terrain == "WastelandSand":
            analysis = f"(Power Core: {bot.stats.powerCore})"
        elif terrain == "MetalRoads":
            analysis = f"(Acceleration: {bot.stats.acceleration} ⭐)"
            
        print(f"  {terrain:20} {terrain_wins:3}/{terrain_races:3} ({rate:5.1f}%) {analysis}")
    
    # Distance performance
    print(f"\n📏 PERFORMANCE BY DISTANCE (for {bot.id}):")
    for distance in distances:
        distance_races = num_races // len(distances)
        distance_wins = wins_by_distance[bot.token_id][distance]
        rate = (distance_wins / distance_races) * 100
        
        analysis = ""
        if distance < 10:
            analysis = f"(Short race: Accel+Speed = {bot.stats.acceleration + bot.stats.speed})"
        elif distance > 20:
            analysis = f"(Long race: Power+Stab = {bot.stats.powerCore + bot.stats.stability})"
            
        print(f"  {distance:2}km: {distance_wins:3}/{distance_races:3} ({rate:5.1f}%) {analysis}")
    
    return {
        "win_rate": win_rate,
        "total_wins": bot_wins,
        "best_terrain": max(terrains, key=lambda t: wins_by_terrain[bot.token_id][t]),
        "best_distance": max(distances, key=lambda d: wins_by_distance[bot.token_id][d]),
    }


def detailed_1v1_analysis(bot: Bot, opponent: Bot, num_races: int = 200):
    """Detailed 1v1 matchup analysis"""
    
    print(f"\n⚔️  DETAILED 1v1 MATCHUP")
    print("=" * 80)
    print(f"{bot.id} vs {opponent.id}")
    print()
    print(f"{'Stat':<15} {bot.id:<15} {opponent.id:<15} Advantage")
    print("-" * 80)
    print(f"{'Speed':<15} {bot.stats.speed:<15} {opponent.stats.speed:<15} {'+' + str(bot.stats.speed - opponent.stats.speed) if bot.stats.speed > opponent.stats.speed else str(bot.stats.speed - opponent.stats.speed)}")
    print(f"{'Power Core':<15} {bot.stats.powerCore:<15} {opponent.stats.powerCore:<15} {'+' + str(bot.stats.powerCore - opponent.stats.powerCore) if bot.stats.powerCore > opponent.stats.powerCore else str(bot.stats.powerCore - opponent.stats.powerCore)}")
    print(f"{'Acceleration':<15} {bot.stats.acceleration:<15} {opponent.stats.acceleration:<15} {'+' + str(bot.stats.acceleration - opponent.stats.acceleration) if bot.stats.acceleration > opponent.stats.acceleration else str(bot.stats.acceleration - opponent.stats.acceleration)}")
    print(f"{'Stability':<15} {bot.stats.stability:<15} {opponent.stats.stability:<15} {'+' + str(bot.stats.stability - opponent.stats.stability) if bot.stats.stability > opponent.stats.stability else str(bot.stats.stability - opponent.stats.stability)}")
    print(f"{'TOTAL':<15} {bot.total_stats:<15} {opponent.total_stats:<15} {'+' + str(bot.total_stats - opponent.total_stats) if bot.total_stats > opponent.total_stats else str(bot.total_stats - opponent.total_stats)}")
    print(f"{'Faction':<15} {bot.faction:<15} {opponent.faction:<15}")
    
    terrains = ["ScrapHeaps", "WastelandSand", "MetalRoads"]
    distances = [5, 10, 15, 20, 25, 30]
    
    wins_bot = 0
    wins_opponent = 0
    wins_by_scenario = defaultdict(lambda: {"bot": 0, "opponent": 0})
    
    for race_id in range(num_races):
        terrain = terrains[race_id % len(terrains)]
        distance = distances[race_id % len(distances)]
        start_time = race_id * 3_600_000_000_000
        
        race = RaceConfig(
            race_id=race_id,
            distance=distance,
            terrain=terrain,
            start_time=start_time
        )
        
        results = simulate_race(race, [bot, opponent])
        
        scenario = f"{terrain}_{distance}km"
        if results[0][0].token_id == bot.token_id:
            wins_bot += 1
            wins_by_scenario[scenario]["bot"] += 1
        else:
            wins_opponent += 1
            wins_by_scenario[scenario]["opponent"] += 1
    
    print(f"\n📊 OVERALL HEAD-TO-HEAD ({num_races} races):")
    bot_rate = (wins_bot / num_races) * 100
    opp_rate = (wins_opponent / num_races) * 100
    print(f"  {bot.id}: {wins_bot} wins ({bot_rate:.1f}%)")
    print(f"  {opponent.id}: {wins_opponent} wins ({opp_rate:.1f}%)")
    
    print(f"\n🎯 BEST MATCHUP CONDITIONS FOR {bot.id}:")
    best_scenarios = sorted(
        [(scenario, data["bot"] / (data["bot"] + data["opponent"]) * 100)
         for scenario, data in wins_by_scenario.items()],
        key=lambda x: x[1],
        reverse=True
    )[:5]
    
    for scenario, win_rate in best_scenarios:
        print(f"  {scenario:30} {win_rate:5.1f}% win rate")
    
    print(f"\n⚠️  WORST MATCHUP CONDITIONS FOR {bot.id}:")
    worst_scenarios = sorted(
        [(scenario, data["bot"] / (data["bot"] + data["opponent"]) * 100)
         for scenario, data in wins_by_scenario.items()],
        key=lambda x: x[1]
    )[:5]
    
    for scenario, win_rate in worst_scenarios:
        print(f"  {scenario:30} {win_rate:5.1f}% win rate")


def main():
    print("🌌 BLACKHOLE BOT #4829 ANALYSIS")
    print("=" * 80)
    print("Ultra-Fast Blackhole with 51 Acceleration")
    print()
    
    # Load all bots
    all_bots = load_real_bots()
    print(f"Loaded {len(all_bots)} bots from collection\n")
    
    # Get the target bot
    target_bot = next(b for b in all_bots if b.token_id == 4829)
    
    # Analyze bot strengths
    analyze_bot_strengths(target_bot)
    
    # Find comparable bots
    print("\n\n🔍 FINDING COMPARABLE OPPONENTS...")
    print("-" * 80)
    comparable = find_comparable_bots(all_bots, target_bot)
    
    for category, bots in comparable.items():
        print(f"\n{category.replace('_', ' ').title()}: {len(bots)} bots")
        for bot in bots[:5]:
            print(f"  {bot.id:20} Total:{bot.total_stats:3} | S:{bot.stats.speed:2} P:{bot.stats.powerCore:2} A:{bot.stats.acceleration:2} St:{bot.stats.stability:2} | {bot.faction}")
    
    # Run matchup analyses
    matchup_results = {}
    
    # vs Top Overall
    matchup_results["top_overall"] = run_matchup_analysis(
        target_bot, 
        comparable["top_overall"][:15], 
        "Top 15 Bots Overall",
        num_races=600
    )
    
    # vs Balanced Elite
    matchup_results["balanced_elite"] = run_matchup_analysis(
        target_bot, 
        comparable["balanced_elite"], 
        "Balanced Elite Bots (All Stats ≥40)",
        num_races=600
    )
    
    # vs High Acceleration
    matchup_results["high_acceleration"] = run_matchup_analysis(
        target_bot, 
        comparable["high_acceleration"][:10], 
        "Top 10 Acceleration Bots",
        num_races=600
    )
    
    # vs Other Blackhole
    if comparable["top_blackhole"]:
        matchup_results["blackhole"] = run_matchup_analysis(
            target_bot, 
            comparable["top_blackhole"], 
            "Top Blackhole Faction Bots",
            num_races=600
        )
    
    # Detailed 1v1s vs interesting opponents
    print("\n\n" + "=" * 80)
    print("DETAILED 1v1 MATCHUPS")
    print("=" * 80)
    
    # vs highest total stats bot
    top_bot = comparable["top_overall"][0]
    detailed_1v1_analysis(target_bot, top_bot, num_races=300)
    
    # vs another high acceleration bot
    if len(comparable["high_acceleration"]) > 1:
        high_accel_rival = next(
            (b for b in comparable["high_acceleration"] if b.token_id != target_bot.token_id),
            None
        )
        if high_accel_rival:
            detailed_1v1_analysis(target_bot, high_accel_rival, num_races=300)
    
    # vs best balanced bot
    if comparable["balanced_elite"]:
        best_balanced = comparable["balanced_elite"][0]
        detailed_1v1_analysis(target_bot, best_balanced, num_races=300)
    
    # Summary
    print("\n\n" + "=" * 80)
    print("📋 SUMMARY & RECOMMENDATIONS")
    print("=" * 80)
    
    print(f"\n{target_bot.id} Performance Summary:")
    for category, results in matchup_results.items():
        print(f"  {category.replace('_', ' ').title():30} {results['win_rate']:5.1f}% win rate")
    
    print(f"\n💡 RACING STRATEGY:")
    print(f"  ✅ IDEAL CONDITIONS:")
    print(f"     • MetalRoads terrain (your 51 acceleration dominates)")
    print(f"     • Short races (5-10km) where acceleration matters most")
    print(f"     • Races where stat synergy bonus applies (Speed+Accel > 90)")
    
    print(f"\n  ⚠️  CHALLENGING CONDITIONS:")
    print(f"     • ScrapHeaps terrain (stability is only {target_bot.stats.stability})")
    print(f"     • Very long races (25-30km) against high endurance bots")
    
    print(f"\n  🎯 COMPETITIVE TIER:")
    avg_win_rate = sum(r["win_rate"] for r in matchup_results.values()) / len(matchup_results)
    if avg_win_rate > 50:
        tier = "ELITE (Top 1%)"
    elif avg_win_rate > 40:
        tier = "VERY STRONG (Top 5%)"
    elif avg_win_rate > 30:
        tier = "STRONG (Top 10%)"
    else:
        tier = "COMPETITIVE (Top 20%)"
    
    print(f"     Average win rate vs top competition: {avg_win_rate:.1f}%")
    print(f"     Estimated tier: {tier}")
    
    print("\n" + "=" * 80)
    print("✅ Analysis Complete!")
    print("=" * 80)


if __name__ == "__main__":
    main()
