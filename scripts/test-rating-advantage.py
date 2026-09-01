#!/usr/bin/env python3
"""
Quick test to verify rating advantage works after mitigation fix
"""

import json
import subprocess
from pathlib import Path
import random

# Load bot data
BOT_DATA_PATH = Path(__file__).parent.parent / "data" / "class-assignments-raw.json"
with open(BOT_DATA_PATH) as f:
    raw_bots = json.load(f)
    ALL_BOTS = [
        {
            "tokenId": bot["tokenId"],
            "faction": bot["faction"],
            "class": bot["class"],
            "stats": bot["modifiedStats"],
            "rating": sum(bot["modifiedStats"].values()) // 4,
        }
        for bot in raw_bots
    ]

# Sort by rating
ALL_BOTS.sort(key=lambda b: b["rating"])

# Get low and high rating bots
low_bots = [b for b in ALL_BOTS if 15 <= b["rating"] <= 25]
high_bots = [b for b in ALL_BOTS if 35 <= b["rating"] <= 45]

print(f"Found {len(low_bots)} low-rating bots (15-25)")
print(f"Found {len(high_bots)} high-rating bots (35-45)")
print(f"Rating difference: ~20 levels")

# Run 50 matchups
script_path = Path(__file__).parent / "run-combat-simulation.js"
high_wins = 0
total_games = 50

for i in range(total_games):
    # Random 3v3 matchups
    low_team = random.sample(low_bots, 3)
    high_team = random.sample(high_bots, 3)

    # High team is "party" (should win most)
    config = {
        "party": [
            {"faction": b["faction"], "class": b["class"], "stats": b["stats"]}
            for b in high_team
        ],
        "enemy": [
            {"faction": b["faction"], "class": b["class"], "stats": b["stats"]}
            for b in low_team
        ],
    }

    result = subprocess.run(
        ["npx", "tsx", str(script_path)],
        input=json.dumps(config),
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        text=True,
    )

    if result.returncode == 0:
        try:
            data = json.loads(result.stdout.strip().split("\n")[-1])
            if data.get("winningTeam") == "party":
                high_wins += 1
        except:
            pass

    if (i + 1) % 10 == 0:
        print(
            f"Progress: {i+1}/{total_games} games, high team winning {high_wins}/{i+1} ({100*high_wins/(i+1):.1f}%)"
        )

win_rate = 100 * high_wins / total_games
print(f"\n{'='*70}")
print(f"🎯 RATING ADVANTAGE TEST (+20 levels):")
print(f"{'='*70}")
print(f"High-rating team wins: {high_wins}/{total_games} ({win_rate:.1f}%)")
print(f"Target: ~90% win rate")
if win_rate >= 80:
    print("✅ FIXED - Rating advantage working!")
elif win_rate >= 60:
    print("⚠️ PARTIAL - Better but still needs tuning")
else:
    print("❌ STILL BROKEN - Rating advantage not working")
