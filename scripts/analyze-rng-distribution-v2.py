#!/usr/bin/env python3
"""
Analyze RNG distribution comparison: Before vs After MurmurHash3 fix
"""

import matplotlib

matplotlib.use("Agg")  # Use non-interactive backend
import matplotlib.pyplot as plt
import numpy as np

# ============ BEFORE FIX (Old LCG Hash) ============
old_histogram = [
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

old_summary = {
    "minRoll": 1,
    "avgRoll": 48.804,
    "below50": 522,
    "below75": 763,
    "below90": 920,
    "maxRoll": 97,
    "totalRolls": 1000,
}

# ============ AFTER FIX (MurmurHash3 + XOR) ============
new_histogram = [
    (0, 115),  # 0-9
    (1, 102),  # 10-19
    (2, 109),  # 20-29
    (3, 77),  # 30-39
    (4, 91),  # 40-49
    (5, 106),  # 50-59
    (6, 103),  # 60-69
    (7, 90),  # 70-79
    (8, 93),  # 80-89
    (9, 114),  # 90-99
]

new_summary = {
    "minRoll": 0,
    "avgRoll": 49.145,
    "below50": 494,
    "below75": 742,
    "below90": 886,
    "maxRoll": 99,
    "totalRolls": 1000,
}

# Sample rolls to show pattern difference
old_rolls_sample = [
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
new_rolls_sample = [
    80,
    96,
    92,
    93,
    20,
    15,
    80,
    99,
    76,
    0,
    30,
    0,
    65,
    0,
    66,
    38,
    81,
    29,
    22,
    24,
    21,
    62,
    96,
    32,
    82,
    73,
    79,
    50,
    5,
    89,
    94,
    51,
    88,
    99,
    15,
    63,
    45,
    43,
    29,
    64,
    19,
    76,
    2,
    28,
    18,
    57,
    27,
    62,
    98,
    26,
]

# Create figure with multiple subplots
fig, axes = plt.subplots(2, 3, figsize=(16, 10))

# ===== Row 1: BEFORE FIX =====
# 1. Old Histogram
ax1 = axes[0, 0]
buckets = [f"{b*10}-{b*10+9}" for b, _ in old_histogram]
old_counts = [c for _, c in old_histogram]
bars = ax1.bar(buckets, old_counts, color="coral", edgecolor="black", alpha=0.8)
ax1.axhline(y=100, color="green", linestyle="--", linewidth=2, label="Ideal (100)")
ax1.set_xlabel("Roll Range")
ax1.set_ylabel("Count")
ax1.set_title("BEFORE: Old LCG Hash Distribution", fontweight="bold", color="red")
ax1.legend()
ax1.set_ylim(0, 140)
for bar, count in zip(bars, old_counts):
    color = "red" if abs(count - 100) > 15 else "black"
    ax1.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 2,
        str(count),
        ha="center",
        va="bottom",
        fontsize=9,
        color=color,
        fontweight="bold" if color == "red" else "normal",
    )

# 2. Old Odd/Even bias
ax2 = axes[0, 1]
old_odd_count = sum(old_counts[b] for b in [0, 2, 4, 6, 8])
old_even_count = sum(old_counts[b] for b in [1, 3, 5, 7, 9])
ax2.bar(
    ["Odd Tens\n(0-9, 20-29, etc)", "Even Tens\n(10-19, 30-39, etc)"],
    [old_odd_count, old_even_count],
    color=["coral", "lightcoral"],
    edgecolor="black",
)
ax2.axhline(y=500, color="green", linestyle="--", linewidth=2, label="Ideal (500)")
ax2.set_ylabel("Count")
ax2.set_title("BEFORE: Odd vs Even Bucket Bias", fontweight="bold", color="red")
ax2.legend()
ax2.text(
    0,
    old_odd_count + 15,
    f"{old_odd_count}\n(60%)",
    ha="center",
    fontsize=11,
    fontweight="bold",
    color="red",
)
ax2.text(
    1,
    old_even_count + 15,
    f"{old_even_count}\n(40%)",
    ha="center",
    fontsize=11,
    fontweight="bold",
    color="red",
)
ax2.set_ylim(0, 700)

# 3. Old Roll sequence
ax3 = axes[0, 2]
ax3.plot(
    range(len(old_rolls_sample)),
    old_rolls_sample,
    "o-",
    markersize=4,
    linewidth=1,
    color="coral",
)
ax3.axhline(y=50, color="gray", linestyle="--", alpha=0.5)
ax3.set_xlabel("Sequence Index")
ax3.set_ylabel("Roll Value")
ax3.set_title(
    "BEFORE: Roll Sequence (Repeating Pattern!)", fontweight="bold", color="red"
)
ax3.set_ylim(0, 100)
ax3.annotate(
    "Cycling pattern:\n73→21→69→17→65→13...\nOnly odd numbers!",
    xy=(25, 75),
    fontsize=9,
    color="red",
    bbox=dict(boxstyle="round", facecolor="yellow", alpha=0.8),
)

# ===== Row 2: AFTER FIX =====
# 4. New Histogram
ax4 = axes[1, 0]
new_counts = [c for _, c in new_histogram]
bars = ax4.bar(buckets, new_counts, color="steelblue", edgecolor="black", alpha=0.8)
ax4.axhline(y=100, color="green", linestyle="--", linewidth=2, label="Ideal (100)")
ax4.set_xlabel("Roll Range")
ax4.set_ylabel("Count")
ax4.set_title("AFTER: MurmurHash3 + XOR Distribution", fontweight="bold", color="green")
ax4.legend()
ax4.set_ylim(0, 140)
for bar, count in zip(bars, new_counts):
    color = "green" if abs(count - 100) <= 15 else "orange"
    ax4.text(
        bar.get_x() + bar.get_width() / 2,
        bar.get_height() + 2,
        str(count),
        ha="center",
        va="bottom",
        fontsize=9,
        color=color,
        fontweight="bold",
    )

# 5. New Odd/Even balance
ax5 = axes[1, 1]
new_odd_count = sum(new_counts[b] for b in [0, 2, 4, 6, 8])
new_even_count = sum(new_counts[b] for b in [1, 3, 5, 7, 9])
ax5.bar(
    ["Odd Tens\n(0-9, 20-29, etc)", "Even Tens\n(10-19, 30-39, etc)"],
    [new_odd_count, new_even_count],
    color=["steelblue", "lightsteelblue"],
    edgecolor="black",
)
ax5.axhline(y=500, color="green", linestyle="--", linewidth=2, label="Ideal (500)")
ax5.set_ylabel("Count")
ax5.set_title("AFTER: Odd vs Even Bucket Balance", fontweight="bold", color="green")
ax5.legend()
ax5.text(
    0,
    new_odd_count + 15,
    f"{new_odd_count}\n({new_odd_count/10:.0f}%)",
    ha="center",
    fontsize=11,
    fontweight="bold",
    color="green",
)
ax5.text(
    1,
    new_even_count + 15,
    f"{new_even_count}\n({new_even_count/10:.0f}%)",
    ha="center",
    fontsize=11,
    fontweight="bold",
    color="green",
)
ax5.set_ylim(0, 700)

# 6. New Roll sequence
ax6 = axes[1, 2]
ax6.plot(
    range(len(new_rolls_sample)),
    new_rolls_sample,
    "o-",
    markersize=4,
    linewidth=1,
    color="steelblue",
)
ax6.axhline(y=50, color="gray", linestyle="--", alpha=0.5)
ax6.set_xlabel("Sequence Index")
ax6.set_ylabel("Roll Value")
ax6.set_title(
    "AFTER: Roll Sequence (True Randomness!)", fontweight="bold", color="green"
)
ax6.set_ylim(0, 100)
ax6.annotate(
    "No pattern!\nValues: 0-99\nBoth odd & even",
    xy=(25, 75),
    fontsize=9,
    color="green",
    bbox=dict(boxstyle="round", facecolor="lightgreen", alpha=0.8),
)

plt.tight_layout()
plt.suptitle(
    "RNG Distribution Fix: Before vs After MurmurHash3",
    fontsize=16,
    fontweight="bold",
    y=1.02,
)

plt.savefig(
    "/home/jesse/pokedbots-racing/scripts/rng-comparison.png",
    dpi=150,
    bbox_inches="tight",
)
print("\n✅ Chart saved to: scripts/rng-comparison.png")

# Print comparison summary
print("\n" + "=" * 70)
print("RNG DISTRIBUTION COMPARISON")
print("=" * 70)

print("\n📊 BUCKET DISTRIBUTION (should be ~100 each for uniform):")
print(f"{'Bucket':<10} {'BEFORE':<15} {'AFTER':<15} {'Change':<15}")
print("-" * 55)
for i in range(10):
    old = old_counts[i]
    new = new_counts[i]
    change = new - old
    old_dev = abs(old - 100)
    new_dev = abs(new - 100)
    improvement = "✅" if new_dev < old_dev else "➡️" if new_dev == old_dev else "⚠️"
    print(f"{i*10}-{i*10+9:<6} {old:<15} {new:<15} {change:+d} {improvement}")

print("\n📈 CUMULATIVE STATS:")
print(f"{'Metric':<20} {'BEFORE':<12} {'AFTER':<12} {'Expected':<12} {'Status'}")
print("-" * 70)
metrics = [
    ("Average", old_summary["avgRoll"], new_summary["avgRoll"], 49.5),
    ("Below 50%", old_summary["below50"], new_summary["below50"], 500),
    ("Below 75%", old_summary["below75"], new_summary["below75"], 750),
    ("Below 90%", old_summary["below90"], new_summary["below90"], 900),
]
for name, old, new, expected in metrics:
    old_err = abs(old - expected)
    new_err = abs(new - expected)
    status = (
        "✅ IMPROVED"
        if new_err < old_err
        else "➡️ Same" if new_err == old_err else "⚠️ Worse"
    )
    print(f"{name:<20} {old:<12.1f} {new:<12.1f} {expected:<12.1f} {status}")

print("\n🔧 ODD/EVEN BUCKET BALANCE (should be 50/50):")
print(
    f"  BEFORE: {old_odd_count} ({old_odd_count/10:.0f}%) / {old_even_count} ({old_even_count/10:.0f}%) - ❌ 60/40 BIAS"
)
print(
    f"  AFTER:  {new_odd_count} ({new_odd_count/10:.0f}%) / {new_even_count} ({new_even_count/10:.0f}%) - ✅ BALANCED"
)

print("\n🎲 MIN/MAX RANGE:")
print(
    f"  BEFORE: {old_summary['minRoll']} - {old_summary['maxRoll']} (missing 0, 98, 99)"
)
print(
    f"  AFTER:  {new_summary['minRoll']} - {new_summary['maxRoll']} (full 0-99 range)"
)

print("\n" + "=" * 70)
print("✅ RNG FIX SUCCESSFUL! Distribution is now much more uniform.")
print("=" * 70)
