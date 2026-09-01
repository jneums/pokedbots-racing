#!/usr/bin/env python3
"""
Comprehensive rating advantage test across all thresholds
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

ALL_BOTS.sort(key=lambda b: b["rating"])

script_path = Path(__file__).parent / "run-combat-simulation.js"


def test_rating_advantage(rating_diff, games=50):
    """Test win rate for teams with rating_diff advantage"""
    # Find bot pools
    low_bots = [b for b in ALL_BOTS if 20 <= b["rating"] <= 30]
    high_bots = [
        b for b in ALL_BOTS if (20 + rating_diff) <= b["rating"] <= (30 + rating_diff)
    ]

    if len(low_bots) < 3 or len(high_bots) < 3:
        return None

    high_wins = 0
    for i in range(games):
        low_team = random.sample(low_bots, 3)
        high_team = random.sample(high_bots, 3)

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

    return 100 * high_wins / games


print("🎯 COMPREHENSIVE RATING ADVANTAGE TEST")
print("=" * 70)

thresholds = [(5, 60), (10, 70), (15, 80), (20, 90)]
results = []

for diff, target in thresholds:
    win_rate = test_rating_advantage(diff, games=50)
    if win_rate is not None:
        status = (
            "✅"
            if abs(win_rate - target) < 15
            else ("⚠️" if abs(win_rate - target) < 25 else "❌")
        )
        results.append((diff, win_rate, target, status))
        print(f"{status} +{diff:2d} levels: {win_rate:5.1f}% [target: {target}%]")

print("=" * 70)
if all(r[3] == "✅" for r in results):
    print("✅ ALL TARGETS ACHIEVED - Rating advantage balanced!")
elif all(r[3] in ["✅", "⚠️"] for r in results):
    print("⚠️ CLOSE - Minor tuning may be needed")
else:
    print("❌ NEEDS WORK - Rating advantage still imbalanced")
