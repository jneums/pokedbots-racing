#!/usr/bin/env python3
"""
Analyze individual segment types to see which stats they naturally favor.
This lets us tune formulas so different segment characteristics favor different stats.
"""

import math
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Tuple

# Set matplotlib to use non-interactive backend
plt.switch_backend("Agg")

# Individual segment types to test
SEGMENT_TYPES = [
    # Length variations
    {"name": "Very Short (200m)", "length": 200, "angle": 0, "difficulty": 1.0},
    {"name": "Short (400m)", "length": 400, "angle": 0, "difficulty": 1.0},
    {"name": "Medium (800m)", "length": 800, "angle": 0, "difficulty": 1.0},
    {"name": "Long (1200m)", "length": 1200, "angle": 0, "difficulty": 1.0},
    {"name": "Very Long (2000m)", "length": 2000, "angle": 0, "difficulty": 1.0},
    # Angle variations (power tests)
    {"name": "Flat (0°)", "length": 800, "angle": 0, "difficulty": 1.0},
    {"name": "Slight Uphill (3°)", "length": 800, "angle": 3, "difficulty": 1.0},
    {"name": "Moderate Uphill (7°)", "length": 800, "angle": 7, "difficulty": 1.0},
    {"name": "Steep Uphill (12°)", "length": 800, "angle": 12, "difficulty": 1.0},
    {"name": "Very Steep (18°)", "length": 800, "angle": 18, "difficulty": 1.0},
    {"name": "Downhill (-5°)", "length": 800, "angle": -5, "difficulty": 1.0},
    # Difficulty variations (stability tests)
    {"name": "Easy (0.8)", "length": 800, "angle": 0, "difficulty": 0.8},
    {"name": "Normal (1.0)", "length": 800, "angle": 0, "difficulty": 1.0},
    {"name": "Technical (1.2)", "length": 800, "angle": 0, "difficulty": 1.2},
    {"name": "Very Technical (1.5)", "length": 800, "angle": 0, "difficulty": 1.5},
    {"name": "Extreme (2.0)", "length": 800, "angle": 0, "difficulty": 2.0},
    # Combined characteristics
    {"name": "Short Technical", "length": 300, "angle": 0, "difficulty": 1.5},
    {"name": "Long Uphill", "length": 1500, "angle": 8, "difficulty": 1.0},
    {"name": "Short Steep", "length": 400, "angle": 15, "difficulty": 1.0},
]


def calculate_segment_time(
    segment: Dict, stats: Dict, previous_difficulty: float = 1.0, seed: int = 500
) -> float:
    """Calculate time for a single segment."""
    speed = stats["speed"]
    power_core = stats["powerCore"]
    stability = stats["stability"]
    acceleration = stats["acceleration"]

    # Universal components - NO ACCELERATION in base speed
    speed_universal = math.sqrt(speed) * 1.0  # Reduced from 1.5

    # Speed bonus on downhill
    speed_bonus = 0.0
    if segment["angle"] < 0:
        speed_bonus = math.sqrt(speed) * 1.0

    total_speed = speed_universal + speed_bonus

    # Universal penalties - MUCH STRONGER
    power_universal = 1.0 + ((100.0 - power_core) / 80.0)  # Increased from 175
    stability_universal = 1.0 + ((100.0 - stability) / 100.0)  # Increased from 400

    # Situational modifiers - MUCH STRONGER
    power_situational = 1.0
    if segment["angle"] > 5:
        steepness = segment["angle"] / 20.0
        power_situational = (
            1.0 + ((100.0 - power_core) / 50.0) * steepness
        )  # Increased from 250
    elif segment["angle"] > 0:
        power_situational = 1.0 + ((100.0 - power_core) / 150.0)  # Increased from 400

    # Momentum recovery
    momentum_loss = (
        (previous_difficulty - 1.0) * 0.40 if previous_difficulty > 1.0 else 0.0
    )
    acceleration_recovery = acceleration / 140.0
    momentum_mod = 1.0 + (momentum_loss * (1.0 - acceleration_recovery))

    # Stability penalty based on difficulty - MUCH STRONGER
    stability_situational = 1.0
    if segment["difficulty"] > 1.0:
        stability_situational = 1.0 + ((100.0 - stability) / 60.0) * (
            segment["difficulty"] - 1.0
        )  # Increased from 200

    # Combine
    total_power_mod = power_universal * power_situational
    total_stability_mod = stability_universal * stability_situational

    # Randomness
    random_mod = 0.90 + ((seed % 1000) / 5000.0)

    # Calculate time
    base_time = segment["length"] / (total_speed + 1.0)
    modified_time = base_time * total_power_mod * momentum_mod * total_stability_mod
    final_time = modified_time * random_mod * (segment["difficulty"] ** 1.5)

    return final_time


def analyze_segment_type(segment: Dict, base_stats: Dict, trials: int = 100) -> Dict:
    """Analyze which stats matter most for this segment type."""
    results = {}

    # No momentum for individual segment tests
    prev_difficulty = 1.0

    for stat_name in ["speed", "powerCore", "acceleration", "stability"]:
        time_savings = []

        # Test increasing this stat by 10 points
        for trial in range(trials):
            seed = trial * 1000

            # Baseline time
            baseline_time = calculate_segment_time(
                segment, base_stats, prev_difficulty, seed
            )

            # Time with increased stat
            modified_stats = base_stats.copy()
            modified_stats[stat_name] += 10
            modified_time = calculate_segment_time(
                segment, modified_stats, prev_difficulty, seed
            )

            time_saved = baseline_time - modified_time
            time_savings.append(time_saved)

        avg_time_saved = sum(time_savings) / len(time_savings)
        time_saved_per_point = avg_time_saved / 10.0
        results[stat_name] = time_saved_per_point

    return results


def main():
    print("=== Individual Segment Type Analysis ===\n")

    baseline_stats = {"speed": 30, "powerCore": 30, "acceleration": 30, "stability": 30}

    print(f"Baseline Stats: {baseline_stats}")
    print("Testing individual segment types...\n")

    all_results = []

    for segment_type in SEGMENT_TYPES:
        print(f"Testing: {segment_type['name']}...")
        results = analyze_segment_type(segment_type, baseline_stats)

        for stat, value in results.items():
            all_results.append(
                {
                    "segment_type": segment_type["name"],
                    "length": segment_type["length"],
                    "angle": segment_type["angle"],
                    "difficulty": segment_type["difficulty"],
                    "stat": stat,
                    "time_saved_per_point": value,
                }
            )

    # Create DataFrame
    df = pd.DataFrame(all_results)

    # Save to CSV
    csv_filename = "segment_type_analysis.csv"
    df.to_csv(csv_filename, index=False)
    print(f"\n✓ Results saved to {csv_filename}")

    # Print summary
    print("\n=== Results by Segment Type ===")
    pivot = df.pivot_table(
        values="time_saved_per_point",
        index="segment_type",
        columns="stat",
        aggfunc="mean",
    )

    # Add primary stat and dominance
    for idx in pivot.index:
        row = pivot.loc[idx]
        primary = row.idxmax()
        dominance = row.max() / row.nlargest(2).iloc[1] if len(row) > 1 else 1.0
        print(f"\n{idx}:")
        print(f"  {row.to_dict()}")
        print(f"  Primary: {primary} ({dominance:.2f}x dominant)")

    print("\n" + str(pivot.round(3)))

    # Generate visualization
    print("\nGenerating visualization...")

    fig, axes = plt.subplots(3, 1, figsize=(14, 16))
    fig.suptitle(
        "Segment Type Analysis - Which Stats Matter Where?",
        fontsize=16,
        fontweight="bold",
    )

    # 1. Length effects
    ax1 = axes[0]
    length_data = df[
        df["segment_type"].str.contains("m\\)")
        & df["segment_type"].str.contains("Short|Medium|Long")
    ]
    length_pivot = length_data.pivot_table(
        values="time_saved_per_point",
        index="segment_type",
        columns="stat",
        aggfunc="mean",
    )
    length_pivot.plot(kind="bar", ax=ax1)
    ax1.set_title("Segment Length Effects", fontsize=12, fontweight="bold")
    ax1.set_ylabel("Seconds Saved Per Point")
    ax1.set_xlabel("")
    ax1.legend(title="Stat")
    ax1.grid(axis="y", alpha=0.3)

    # 2. Angle effects
    ax2 = axes[1]
    angle_data = df[df["segment_type"].str.contains("hill|Flat|°")]
    angle_pivot = angle_data.pivot_table(
        values="time_saved_per_point",
        index="segment_type",
        columns="stat",
        aggfunc="mean",
    )
    angle_pivot.plot(kind="bar", ax=ax2)
    ax2.set_title("Angle/Grade Effects", fontsize=12, fontweight="bold")
    ax2.set_ylabel("Seconds Saved Per Point")
    ax2.set_xlabel("")
    ax2.legend(title="Stat")
    ax2.grid(axis="y", alpha=0.3)

    # 3. Difficulty effects
    ax3 = axes[2]
    diff_data = df[df["segment_type"].str.contains("Easy|Normal|Technical|Extreme")]
    diff_pivot = diff_data.pivot_table(
        values="time_saved_per_point",
        index="segment_type",
        columns="stat",
        aggfunc="mean",
    )
    diff_pivot.plot(kind="bar", ax=ax3)
    ax3.set_title("Difficulty Effects", fontsize=12, fontweight="bold")
    ax3.set_ylabel("Seconds Saved Per Point")
    ax3.set_xlabel("")
    ax3.legend(title="Stat")
    ax3.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    plt.savefig("segment_type_analysis.png", dpi=300, bbox_inches="tight")
    print("✓ Saved segment_type_analysis.png")

    print("\n=== Analysis Complete ===")


if __name__ == "__main__":
    main()
