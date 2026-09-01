#!/usr/bin/env python3
"""
Combat Balance Analyzer for PokedBots Brawl
Tests combat balance with real NFT bot stats in random matchups
"""

import json
import subprocess
import pandas as pd
import numpy as np
from pathlib import Path
from typing import Dict, List, Tuple
import sys
import random

# Configuration
SIMULATIONS_PER_SIZE = 200  # Much larger sample for high confidence
TEAM_SIZES = [2, 3, 5]  # 2v2, 3v3, 5v5 (exclude 1v1 - healers can't win solo)
OUTPUT_DIR = Path(__file__).parent / "balance-results"
OUTPUT_DIR.mkdir(exist_ok=True)

# Load bot data
BOT_DATA_PATH = Path(__file__).parent.parent / "data" / "class-assignments-raw.json"
with open(BOT_DATA_PATH) as f:
    raw_bots = json.load(f)
    # Convert to format expected by combat engine (use modifiedStats which includes class bonuses)
    ALL_BOTS = [
        {
            "tokenId": bot["tokenId"],
            "faction": bot["faction"],
            "class": bot["class"],
            "stats": bot["modifiedStats"],  # Use modifiedStats (includes class bonuses)
            "rating": sum(bot["modifiedStats"].values()) // 4,  # Average stat (level)
        }
        for bot in raw_bots
    ]

# Group bots by rating tier for fair matchmaking
RATING_TIERS = {}
for bot in ALL_BOTS:
    rating = bot["rating"]
    # Create 5-point rating tiers (15-19, 20-24, etc.)
    tier = (rating // 5) * 5
    if tier not in RATING_TIERS:
        RATING_TIERS[tier] = []
    RATING_TIERS[tier].append(bot)

print(
    f"📦 Loaded {len(ALL_BOTS)} bots from class-assignments-raw.json (using modifiedStats)"
)
print(
    f"📊 Rating range: {min(b['rating'] for b in ALL_BOTS)} - {max(b['rating'] for b in ALL_BOTS)}"
)
print(f"📊 Rating tiers: {sorted(RATING_TIERS.keys())}")


def create_random_team(size: int) -> List[Dict]:
    """Create a random team of given size by sampling from same rating tier"""
    # Pick a random rating tier that has enough bots
    valid_tiers = [tier for tier, bots in RATING_TIERS.items() if len(bots) >= size]
    if not valid_tiers:
        # Fallback to any bots if no tier has enough
        return random.sample(ALL_BOTS, size)

    tier = random.choice(valid_tiers)
    return random.sample(RATING_TIERS[tier], size)
    team = random.sample(ALL_BOTS, size)
    return team


class CombatSimulator:
    """Interface to run combat simulations via Node.js"""

    def __init__(self):
        self.script_path = Path(__file__).parent / "run-combat-simulation.js"

    def simulate_fight(self, party_team: List[Dict], enemy_team: List[Dict]) -> Dict:
        """Run a single combat simulation with bot lists"""
        # Convert bot objects to format expected by combat engine
        party = [
            {"faction": bot["faction"], "class": bot["class"], "stats": bot["stats"]}
            for bot in party_team
        ]
        enemy = [
            {"faction": bot["faction"], "class": bot["class"], "stats": bot["stats"]}
            for bot in enemy_team
        ]

        config = {"party": party, "enemy": enemy}

        # Call Node.js script to run simulation (using tsx for TypeScript)
        # Redirect stderr to /dev/null to suppress debug logs
        result = subprocess.run(
            ["npx", "tsx", str(self.script_path)],
            input=json.dumps(config),
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            text=True,
        )

        if result.returncode != 0:
            print(f"Simulation failed: {result.stderr}")
            return None

        # Extract JSON from output (skip debug logs)
        # The JSON is on the last line
        lines = result.stdout.strip().split("\n")
        json_line = lines[-1] if lines else ""

        if not json_line.strip():
            print(f"Empty output from simulation")
            return None

        try:
            return json.loads(json_line)
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            print(f"Last line: {json_line[:200]}")
            return None


class BalanceAnalyzer:
    """Analyzes combat simulation results and identifies balance issues"""

    def __init__(self):
        self.results = []

    def add_result(
        self,
        team_size: int,
        sim_num: int,
        party_team: List[Dict],
        enemy_team: List[Dict],
        result: Dict,
    ):
        """Add a simulation result"""
        if not result:
            return

        # Extract key metrics
        party_won = result["winningTeam"] == "party"

        # Get stats
        party_stats = result.get("partyStats", [])
        enemy_stats = result.get("encounterStats", [])

        # Track individual bot performance
        for i, bot in enumerate(party_team):
            bot_type = f"{bot['faction']}_{bot['class']}"
            bot_stat = party_stats[i] if i < len(party_stats) else {}

            self.results.append(
                {
                    "team_size": team_size,
                    "sim_num": sim_num,
                    "bot_type": bot_type,
                    "faction": bot["faction"],
                    "class": bot["class"],
                    "token_id": bot["tokenId"],
                    "rating": bot["rating"],
                    "side": "party",
                    "won": party_won,
                    "duration_ticks": result["totalTicks"],
                    "damage_dealt": bot_stat.get("damageDealt", 0),
                    "healing_done": bot_stat.get("healingDone", 0),
                    "damage_taken": bot_stat.get("damageTaken", 0),
                    "died": bot_stat.get("died", False),
                }
            )

        # Track enemy bot performance
        for i, bot in enumerate(enemy_team):
            bot_type = f"{bot['faction']}_{bot['class']}"
            bot_stat = enemy_stats[i] if i < len(enemy_stats) else {}

            self.results.append(
                {
                    "team_size": team_size,
                    "sim_num": sim_num,
                    "bot_type": bot_type,
                    "faction": bot["faction"],
                    "class": bot["class"],
                    "token_id": bot["tokenId"],
                    "rating": bot["rating"],
                    "side": "enemy",
                    "won": not party_won,
                    "duration_ticks": result["totalTicks"],
                    "damage_dealt": bot_stat.get("damageDealt", 0),
                    "healing_done": bot_stat.get("healingDone", 0),
                    "damage_taken": bot_stat.get("damageTaken", 0),
                    "died": bot_stat.get("died", False),
                }
            )

    def analyze(self) -> pd.DataFrame:
        """Analyze all results and return DataFrame"""
        df = pd.DataFrame(self.results)
        return df

    def generate_report(self, df: pd.DataFrame):
        """Generate balance report"""
        print("\n" + "=" * 60)
        print("COMBAT BALANCE ANALYSIS REPORT")
        print("=" * 60)

        # Overall stats
        total_bots = len(df)
        avg_rating = df["rating"].mean()
        rating_std = df["rating"].std()
        print(f"\nTotal bot instances tested: {total_bots}")
        print(f"Average bot rating: {avg_rating:.2f} ± {rating_std:.2f}")
        print(f"Rating range: {df['rating'].min()} - {df['rating'].max()}")

        # Win rates by team size
        print("\n--- WIN RATES BY TEAM SIZE ---")
        win_rates = (
            df.groupby("team_size")
            .agg({"won": lambda x: x.sum() / len(x) * 100})
            .round(2)
        )
        win_rates.columns = ["Win Rate (%)"]
        print(win_rates)

        # Average fight duration by team size
        print("\n--- AVERAGE FIGHT DURATION BY TEAM SIZE ---")
        durations = (
            df.groupby("team_size")["duration_ticks"].agg(["mean", "std"]).round(2)
        )
        durations.columns = ["Mean Ticks", "Std Dev"]
        print(durations)

        # Bot type (faction + class) performance
        print("\n--- TOP 10 BEST PERFORMING BOT TYPES (Faction_Class) ---")
        bot_type_stats = (
            df.groupby("bot_type")
            .agg(
                {
                    "won": lambda x: x.sum() / len(x) * 100,
                    "bot_type": "count",
                    "damage_dealt": "mean",
                    "rating": "mean",
                    "died": lambda x: (1 - x.sum() / len(x)) * 100,  # Survival rate
                }
            )
            .rename(
                columns={
                    "bot_type": "games",
                    "won": "win_rate",
                    "died": "survival_rate",
                    "rating": "avg_rating",
                }
            )
            .round(2)
        )
        bot_type_stats = bot_type_stats[
            bot_type_stats["games"] >= 3
        ]  # At least 3 games
        top_10 = bot_type_stats.sort_values("win_rate", ascending=False).head(10)
        print(top_10.to_string())

        # Bottom 10 bot types
        print("\n--- BOTTOM 10 WORST PERFORMING BOT TYPES (Faction_Class) ---")
        bottom_10 = bot_type_stats.sort_values("win_rate", ascending=True).head(10)
        print(bottom_10.to_string())

        # Class performance summary
        print("\n--- CLASS PERFORMANCE SUMMARY ---")
        class_stats = (
            df.groupby("class")
            .agg(
                {
                    "won": lambda x: x.sum() / len(x) * 100,
                    "class": "count",
                    "damage_dealt": "mean",
                    "healing_done": "mean",
                    "died": lambda x: (1 - x.sum() / len(x)) * 100,
                }
            )
            .rename(
                columns={"class": "games", "won": "win_rate", "died": "survival_rate"}
            )
            .round(2)
        )
        print(class_stats.to_string())

        # Faction performance summary
        print("\n--- FACTION PERFORMANCE SUMMARY ---")
        faction_stats = (
            df.groupby("faction")
            .agg(
                {
                    "won": lambda x: x.sum() / len(x) * 100,
                    "faction": "count",
                    "damage_dealt": "mean",
                }
            )
            .rename(columns={"faction": "games", "won": "win_rate"})
            .sort_values("win_rate", ascending=False)
            .round(2)
        )
        print(faction_stats.to_string())

        # Balance issues detection
        print("\n--- BALANCE ISSUES DETECTED ---")
        issues = []

        for bot_type, stats in bot_type_stats.iterrows():
            if stats["games"] < 5:
                continue  # Need more data

            win_rate = stats["win_rate"]
            if win_rate > 70:
                issues.append(
                    f"⚠️  {bot_type}: TOO STRONG ({win_rate:.1f}% win rate, {stats['games']:.0f} games)"
                )
            elif win_rate < 30:
                issues.append(
                    f"⚠️  {bot_type}: TOO WEAK ({win_rate:.1f}% win rate, {stats['games']:.0f} games)"
                )

        if issues:
            for issue in issues[:20]:  # Show top 20 issues
                print(issue)
        else:
            print("✅ No major balance issues detected (all bot types 30-70% win rate)")

        # Save detailed results
        output_file = OUTPUT_DIR / "balance-results.csv"
        df.to_csv(output_file, index=False)
        print(f"\n✅ Detailed results saved to: {output_file}")

        # Save bot type summary
        bot_type_file = OUTPUT_DIR / "bot-type-summary.csv"
        bot_type_stats.to_csv(bot_type_file)
        print(f"✅ Bot type summary saved to: {bot_type_file}")

        # Save summary
        summary = {
            "win_rates_by_size": win_rates.to_dict(),
            "durations": durations.to_dict(),
            "class_performance": class_stats.to_dict(),
            "faction_performance": faction_stats.to_dict(),
            "top_10_bot_types": top_10.to_dict(),
            "bottom_10_bot_types": bottom_10.to_dict(),
            "issues": issues[:20],
        }
        summary_file = OUTPUT_DIR / "balance-summary.json"
        with open(summary_file, "w") as f:
            json.dump(summary, f, indent=2)
        print(f"✅ Summary saved to: {summary_file}")


def main():
    print("🎮 PokedBots Brawl - Combat Balance Analyzer (Random Matchups)")
    print(f"Testing team sizes: {TEAM_SIZES}")
    print(f"Running {SIMULATIONS_PER_SIZE} simulations per size...")

    simulator = CombatSimulator()
    analyzer = BalanceAnalyzer()

    # Run simulations for all team sizes
    total_sims = len(TEAM_SIZES) * SIMULATIONS_PER_SIZE
    current_sim = 0

    for team_size in TEAM_SIZES:
        print(f"\n--- Testing {team_size}v{team_size} ---")

        for sim_num in range(SIMULATIONS_PER_SIZE):
            current_sim += 1

            # Create random teams
            party_team = create_random_team(team_size)
            enemy_team = create_random_team(team_size)

            party_tokens = [bot["tokenId"] for bot in party_team]
            enemy_tokens = [bot["tokenId"] for bot in enemy_team]

            print(
                f"  Sim {sim_num+1}/{SIMULATIONS_PER_SIZE} - Party: {party_tokens} vs Enemy: {enemy_tokens} ({current_sim}/{total_sims} total)",
                end="\r",
            )

            result = simulator.simulate_fight(party_team, enemy_team)
            analyzer.add_result(team_size, sim_num, party_team, enemy_team, result)

    print("\n\n✅ All simulations complete!")

    # Analyze results
    df = analyzer.analyze()
    analyzer.generate_report(df)


if __name__ == "__main__":
    main()
