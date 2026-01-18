#!/usr/bin/env python3
"""
Analyze RNG distribution from debug_test_rng_distribution output
"""

import matplotlib

matplotlib.use("Agg")  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

# Data from the canister call
histogram_data = [
    (0, 120),  # 0-9
    (1, 83),  # 10-19
    (2, 122),  # 20-29
    (3, 79),  # 30-39
    (4, 118),  # 40-49
    (5, 78),  # 50-59
    (6, 122),  # 60-69
    (7, 80),  # 70-79
    (8, 118),  # 80-89
    (9, 80),  # 90-99
]

summary = {
    "minRoll": 1,
    "avgRoll": 48.804,
    "below50": 522,
    "below75": 763,
    "below90": 920,
    "maxRoll": 97,
    "totalRolls": 1000,
}

# Sample of the rolls (showing the pattern)
rolls_sample = [
    73,
    73,
    21,
    21,
    69,
    69,
    17,
    65,
    65,
    13,
    13,
    61,
    9,
    9,
    57,
    57,
    5,
    5,
    53,
    1,
    1,
    49,
    49,
    97,
    45,
    45,
    93,
    93,
    41,
    41,
    89,
    37,
    37,
    85,
    85,
    33,
    81,
    81,
    29,
    29,
    77,
    77,
    25,
    73,
    73,
    21,
    21,
    69,
    17,
    17,
]

# Create figure with multiple subplots
fig, axes = plt.subplots(2, 2, figsize=(14, 10))

# 1. Histogram of buckets
ax1 = axes[0, 0]
buckets = [f"{b*10}-{b*10+9}" for b, _ in histogram_data]
counts = [c for _, c in histogram_data]
bars = ax1.bar(buckets, counts, color="steelblue", edgecolor="black")
ax1.axhline(y=100, color="red", linestyle="--", label="Expected (uniform)")
ax1.set_xlabel("Roll Range")
ax1.set_ylabel("Count")
ax1.set_title("RNG Distribution by Bucket (1000 rolls)")
ax1.legend()
ax1.set_ylim(0, 150)

# Add count labels on bars
for bar, count in zip(bars, counts):
    ax1.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 2,
        str(count),
        ha="center",
        va="bottom",
        fontsize=9,
    )

# 2. Odd vs Even analysis (from the pattern we see)
ax2 = axes[0, 1]
odd_buckets = [0, 2, 4, 6, 8]  # 0-9, 20-29, 40-49, 60-69, 80-89
even_buckets = [1, 3, 5, 7, 9]  # 10-19, 30-39, 50-59, 70-79, 90-99

odd_count = sum(counts[b] for b in odd_buckets)
even_count = sum(counts[b] for b in even_buckets)

ax2.bar(
    [
        "Odd tens\n(0-9, 20-29, 40-49,\n60-69, 80-89)",
        "Even tens\n(10-19, 30-39, 50-59,\n70-79, 90-99)",
    ],
    [odd_count, even_count],
    color=["coral", "lightgreen"],
    edgecolor="black",
)
ax2.axhline(y=500, color="red", linestyle="--", label="Expected (uniform)")
ax2.set_ylabel("Count")
ax2.set_title("Distribution: Odd-tens vs Even-tens buckets")
ax2.legend()
ax2.text(0, odd_count + 10, f"{odd_count}", ha="center", fontsize=12, fontweight="bold")
ax2.text(
    1, even_count + 10, f"{even_count}", ha="center", fontsize=12, fontweight="bold"
)

# 3. Summary stats comparison
ax3 = axes[1, 0]
expected = {"below50": 500, "below75": 750, "below90": 900}
actual = {
    "below50": summary["below50"],
    "below75": summary["below75"],
    "below90": summary["below90"],
}

x = np.arange(3)
width = 0.35
bars1 = ax3.bar(
    x - width / 2,
    [expected["below50"], expected["below75"], expected["below90"]],
    width,
    label="Expected",
    color="lightgray",
    edgecolor="black",
)
bars2 = ax3.bar(
    x + width / 2,
    [actual["below50"], actual["below75"], actual["below90"]],
    width,
    label="Actual",
    color="steelblue",
    edgecolor="black",
)

ax3.set_ylabel("Count")
ax3.set_title("Cumulative Distribution Check")
ax3.set_xticks(x)
ax3.set_xticklabels(["< 50\n(expect 50%)", "< 75\n(expect 75%)", "< 90\n(expect 90%)"])
ax3.legend()

for bar in bars1:
    ax3.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 5,
        f"{int(bar.get_height())}",
        ha="center",
        va="bottom",
        fontsize=9,
    )
for bar in bars2:
    ax3.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 5,
        f"{int(bar.get_height())}",
        ha="center",
        va="bottom",
        fontsize=9,
    )

# 4. Roll sequence analysis (showing the cycling pattern)
ax4 = axes[1, 1]
ax4.plot(range(len(rolls_sample)), rolls_sample, "o-", markersize=4, linewidth=1)
ax4.axhline(y=50, color="red", linestyle="--", alpha=0.5)
ax4.set_xlabel("Sequence Index")
ax4.set_ylabel("Roll Value")
ax4.set_title("Roll Sequence (first 50 rolls) - Notice the cycling pattern!")
ax4.set_ylim(0, 100)

# Add text annotation about the pattern
ax4.annotate(
    "⚠️ Values cycle through\nodd numbers only!",
    xy=(25, 50),
    fontsize=10,
    color="red",
    bbox=dict(boxstyle="round", facecolor="yellow", alpha=0.8),
)

plt.tight_layout()
plt.suptitle(
    "🎲 RNG Distribution Analysis - BIAS DETECTED! 🚨",
    fontsize=14,
    fontweight="bold",
    y=1.02,
)

plt.savefig(
    "/home/jesse/pokedbots-racing/scripts/rng-analysis.png",
    dpi=150,
    bbox_inches="tight",
)
print("\n✅ Chart saved to: scripts/rng-analysis.png")

# Print analysis
print("\n" + "=" * 60)
print("RNG DISTRIBUTION ANALYSIS")
print("=" * 60)
print(f"\nTotal rolls: {summary['totalRolls']}")
print(f"Min roll: {summary['minRoll']} | Max roll: {summary['maxRoll']}")
print(f"Average: {summary['avgRoll']:.2f} (expected: 49.5)")
print(f"\nCumulative distribution:")
print(
    f"  < 50: {summary['below50']}/1000 ({summary['below50']/10:.1f}%) - expected 50%"
)
print(
    f"  < 75: {summary['below75']}/1000 ({summary['below75']/10:.1f}%) - expected 75%"
)
print(
    f"  < 90: {summary['below90']}/1000 ({summary['below90']/10:.1f}%) - expected 90%"
)

print(f"\n⚠️  BIAS DETECTED:")
print(f"  Odd-tens buckets (0-9, 20-29, etc.): {odd_count} ({odd_count/10:.1f}%)")
print(f"  Even-tens buckets (10-19, 30-39, etc.): {even_count} ({even_count/10:.1f}%)")
print(f"\n  Expected: 500 each (50%)")
print(f"  The RNG appears to favor certain value ranges!")

print("\n🔍 PATTERN OBSERVED:")
print("  Looking at the raw rolls, values appear to cycle through")
print(
    "  a predictable sequence of odd numbers: 73, 21, 69, 17, 65, 13, 61, 9, 57, 5, 53, 1, 49, 97, 45, 93..."
)
print(
    "  This suggests the entropy counter + hash isn't providing sufficient randomness!"
)
