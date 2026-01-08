#!/usr/bin/env python3
"""
Analyze track profile effects in isolation by testing all profiles on the same neutral terrain.
This removes terrain noise to see what distance/profile characteristics actually do.
"""

import math
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from typing import Dict, Tuple
import random

# Set matplotlib to use non-interactive backend
plt.switch_backend("Agg")

# Test profiles with NEUTRAL terrain (no terrain bonuses)
PROFILES_TO_TEST = [
    {"name": "Sprint", "distance": 4, "laps": 2, "segments_per_lap": 4},
    {"name": "Flat", "distance": 8, "laps": 2, "segments_per_lap": 5},
    {"name": "Technical", "distance": 7, "laps": 2, "segments_per_lap": 6},
    {"name": "Mountain", "distance": 10, "laps": 2, "segments_per_lap": 5},
    {"name": "Rolling", "distance": 12, "laps": 3, "segments_per_lap": 4},
    {"name": "Endurance", "distance": 17, "laps": 3, "segments_per_lap": 6},
]


# Create neutral track segments (no terrain bonuses)
def create_neutral_segments(profile: Dict) -> list:
    """Create segments with no terrain to isolate profile effects."""
    segments = []
    segments_per_lap = profile["segments_per_lap"]
    total_distance = profile["distance"]
    distance_per_lap = (total_distance / profile["laps"]) * 1000  # in meters
    avg_segment_length = distance_per_lap / segments_per_lap

    if profile["name"] == "Sprint":
        # Short, fast segments
        for i in range(segments_per_lap):
            segments.append(
                {
                    "length": int(avg_segment_length * (0.9 + i * 0.05)),
                    "terrain": None,  # No terrain
                    "angle": 0,
                    "difficulty": 0.85,
                }
            )
    elif profile["name"] == "Flat":
        # Mostly flat, consistent segments
        for i in range(segments_per_lap):
            segments.append(
                {
                    "length": int(avg_segment_length),
                    "terrain": None,
                    "angle": -1 if i == 2 else 0,  # One slight downhill
                    "difficulty": 0.88,
                }
            )
    elif profile["name"] == "Technical":
        # Higher difficulty, varied segments
        for i in range(segments_per_lap):
            segments.append(
                {
                    "length": int(avg_segment_length * (0.85 + (i % 3) * 0.15)),
                    "terrain": None,
                    "angle": 0,
                    "difficulty": 1.05 + (i % 3) * 0.1,
                }
            )
    elif profile["name"] == "Mountain":
        # Big elevation changes
        for i in range(segments_per_lap):
            if i < 2:
                angle = 8 + i * 2  # Uphill
            elif i == 2:
                angle = 12  # Steep uphill
            else:
                angle = -10 + (i - 3) * 3  # Downhill
            segments.append(
                {
                    "length": int(avg_segment_length),
                    "terrain": None,
                    "angle": angle,
                    "difficulty": 1.0 + abs(angle) / 20,
                }
            )
    elif profile["name"] == "Rolling":
        # Moderate ups and downs
        for i in range(segments_per_lap):
            angle = 4 if i % 2 == 0 else -3
            segments.append(
                {
                    "length": int(avg_segment_length),
                    "terrain": None,
                    "angle": angle,
                    "difficulty": 0.95 + abs(angle) / 30,
                }
            )
    elif profile["name"] == "Endurance":
        # Long segments, mixed challenges
        for i in range(segments_per_lap):
            angle = [0, 5, -3, 7, -5, 0][i]
            segments.append(
                {
                    "length": int(avg_segment_length * (0.9 + (i % 3) * 0.1)),
                    "terrain": None,
                    "angle": angle,
                    "difficulty": 1.0 + abs(angle) / 25,
                }
            )

    return segments


def calculate_segment_time(
    segment: Dict,
    stats: Dict,
    previous_difficulty: float,
    race_distance_km: int,
    seed: int,
) -> Tuple[float, float]:
    """
    Calculate time for a single segment.
    Exact port from RaceVisualizer.tsx with TERRAIN EFFECTS REMOVED.
    """
    speed = stats["speed"]
    power_core = stats["powerCore"]
    stability = stats["stability"]
    acceleration = stats["acceleration"]

    # === PART 1: UNIVERSAL STAT COMPONENTS ===

    speed_universal = math.sqrt(speed) * 1.5
    accel_contribution = math.sqrt(acceleration) * 0.9

    # Acceleration gets bonus on short segments
    accel_burst_bonus = 0.0
    if segment["length"] < 600:
        accel_burst_bonus = math.sqrt(acceleration) * 0.3

    # Acceleration bonus on technical segments
    if segment["difficulty"] > 1.15:
        accel_burst_bonus += math.sqrt(acceleration) * 0.4

    # NO TERRAIN BONUSES - testing profiles in isolation
    speed_bonus = 0.0
    if segment["angle"] < 0:
        # Downhill still gives speed bonus (not terrain-specific)
        speed_bonus = math.sqrt(speed) * 1.0

    speed_synergy_mod = 1.0
    synergistic_speed = (
        speed_universal + accel_contribution + accel_burst_bonus + speed_bonus
    ) * speed_synergy_mod

    # === PART 3: UNIVERSAL PENALTIES ===

    power_universal = 1.0 + ((100.0 - power_core) / 175.0)
    stability_universal = 1.0 + ((100.0 - stability) / 400.0)

    # === PART 4: SITUATIONAL MODIFIERS (NO TERRAIN) ===

    # Power: Only angle-based penalties (no terrain)
    power_situational = 1.0
    if segment["angle"] > 5:
        steepness = segment["angle"] / 20.0
        power_situational = 1.0 + ((100.0 - power_core) / 250.0) * steepness
    elif segment["angle"] > 0:
        power_situational = 1.0 + ((100.0 - power_core) / 400.0)

    # Momentum recovery (no terrain effects)
    momentum_loss = (
        (previous_difficulty - 1.0) * 0.40 if previous_difficulty > 1.0 else 0.0
    )
    acceleration_recovery = acceleration / 140.0
    momentum_mod = 1.0 + (momentum_loss * (1.0 - acceleration_recovery))

    # Stability: Only difficulty-based penalties (no terrain)
    stability_situational = 1.0
    if segment["difficulty"] > 1.0:
        stability_situational = 1.0 + ((100.0 - stability) / 200.0) * (
            segment["difficulty"] - 1.0
        )

    # === PART 5: DISTANCE-BASED SCALING ===

    # Sprints (<7km) - Acceleration contribution boosted, speed base reduced
    speed_distance_mod = 1.0
    accel_distance_mod = 1.0
    power_distance_mod = 1.0
    stability_distance_mod = 1.0

    if race_distance_km < 7:
        # Sprints: acceleration way more important, speed less important
        speed_distance_mod = 0.5  # Reduce speed contribution more
        accel_distance_mod = 3.0  # Even bigger acceleration boost
    elif race_distance_km > 15:
        # Endurance: power/stability way more important, acceleration less important
        accel_distance_mod = 0.3  # Reduce acceleration contribution more
        power_distance_mod = 2.5  # Bigger power penalty effect
        stability_distance_mod = 2.5  # Bigger stability penalty effect

    # === PART 6: COMBINE ALL MODIFIERS ===

    # Apply distance mods to individual components
    adjusted_speed = speed_universal * speed_distance_mod + speed_bonus
    adjusted_accel = (accel_contribution + accel_burst_bonus) * accel_distance_mod

    total_speed = adjusted_speed + adjusted_accel

    # For penalties, higher multiplier = worse penalty (higher time)
    # Convert from "1.0 + penalty" to "1.0 + (penalty * multiplier)"
    power_penalty_amount = power_universal - 1.0
    stability_penalty_amount = stability_universal - 1.0

    total_power_mod = (
        1.0 + power_penalty_amount * power_distance_mod
    ) * power_situational
    total_momentum_mod = momentum_mod
    total_stability_mod = (
        1.0 + stability_penalty_amount * stability_distance_mod
    ) * stability_situational

    # Randomness
    random_mod = 0.90 + ((seed % 1000) / 5000.0)

    # Calculate segment time
    base_time = segment["length"] / (total_speed + 1.0)
    modified_time = (
        base_time * total_power_mod * total_momentum_mod * total_stability_mod
    )
    final_time = modified_time * random_mod * (segment["difficulty"] ** 1.5)

    return final_time, segment["difficulty"]


def simulate_race(profile: Dict, stats: Dict, seed: int) -> float:
    """Simulate a full race and return total time."""
    segments = create_neutral_segments(profile)
    total_time = 0.0
    previous_difficulty = 1.0

    for lap in range(profile["laps"]):
        for segment in segments:
            segment_time, difficulty = calculate_segment_time(
                segment,
                stats,
                previous_difficulty,
                profile["distance"],
                seed + lap * 100 + segments.index(segment),
            )
            total_time += segment_time
            previous_difficulty = difficulty

    return total_time


def analyze_stat_value(
    profile: Dict, base_stats: Dict, stat_name: str, trials: int = 50
) -> Dict:
    """Analyze how valuable increasing a stat is for this profile."""
    results = []

    for increase in range(1, 11):  # Test 1-10 point increases
        time_diffs = []

        for trial in range(trials):
            seed = trial * 1000

            # Baseline time
            baseline_time = simulate_race(profile, base_stats, seed)

            # Time with increased stat
            modified_stats = base_stats.copy()
            modified_stats[stat_name] += increase
            modified_time = simulate_race(profile, modified_stats, seed)

            time_saved = baseline_time - modified_time
            time_diffs.append(time_saved)

        avg_time_saved = sum(time_diffs) / len(time_diffs)
        time_saved_per_point = avg_time_saved / increase

        results.append(
            {
                "increase": increase,
                "time_saved_total": avg_time_saved,
                "time_saved_per_point": time_saved_per_point,
            }
        )

    # Return average time saved per point across all increases
    avg_per_point = sum(r["time_saved_per_point"] for r in results) / len(results)
    return {
        "stat": stat_name,
        "time_saved_per_point_mean": avg_per_point,
        "results": results,
    }


def main():
    print("=== Profile Effect Analysis (Terrain-Neutral) ===\n")

    # Baseline stats (middle of the road)
    baseline_stats = {"speed": 30, "powerCore": 30, "acceleration": 30, "stability": 30}

    print(f"Baseline Stats: {baseline_stats}")
    print("Running simulations across all profiles...")
    print("This may take a minute...\n")

    all_results = []

    for profile in PROFILES_TO_TEST:
        print(f"Testing {profile['name']} profile...")

        for stat in ["speed", "powerCore", "acceleration", "stability"]:
            result = analyze_stat_value(profile, baseline_stats, stat, trials=50)
            all_results.append(
                {
                    "profile": profile["name"],
                    "distance": profile["distance"],
                    "stat": stat,
                    "time_saved_per_point_mean": result["time_saved_per_point_mean"],
                }
            )

    # Create DataFrame
    df = pd.DataFrame(all_results)

    # Save to CSV
    csv_filename = "profile_effects_analysis.csv"
    df.to_csv(csv_filename, index=False)
    print(f"\n✓ Results saved to {csv_filename}")

    # Summary by profile
    print("\n=== Summary by Profile ===")
    profile_summary = df.pivot_table(
        values="time_saved_per_point_mean",
        index="profile",
        columns="stat",
        aggfunc="mean",
    )
    print(profile_summary.round(2))

    # Find primary stat for each profile
    print("\n=== Primary Stat by Profile ===")
    for profile_name in profile_summary.index:
        row = profile_summary.loc[profile_name]
        primary_stat = row.idxmax()
        primary_value = row.max()
        secondary_value = row.nlargest(2).iloc[1]
        dominance = primary_value / secondary_value if secondary_value > 0 else 1.0
        print(
            f"{profile_name}: {primary_stat.upper()} ({primary_value:.2f} sec/point, {dominance:.2f}x dominant)"
        )

    # Generate visualizations
    print("\nGenerating visualizations...")

    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    fig.suptitle(
        "Profile Effect Analysis (Terrain-Neutral)", fontsize=16, fontweight="bold"
    )

    for idx, profile_name in enumerate(sorted(df["profile"].unique())):
        row = idx // 3
        col = idx % 3
        ax = axes[row, col]

        profile_data = df[df["profile"] == profile_name]
        pivot = profile_data.pivot_table(
            values="time_saved_per_point_mean", index="stat", aggfunc="mean"
        )

        pivot.plot(kind="bar", ax=ax, legend=False)
        ax.set_title(f"{profile_name}", fontsize=12, fontweight="bold")
        ax.set_ylabel("Seconds Saved Per Point")
        ax.set_xlabel("")
        ax.tick_params(axis="x", rotation=45)
        ax.grid(axis="y", alpha=0.3)

    plt.tight_layout()
    plt.savefig("profile_effects_analysis.png", dpi=300, bbox_inches="tight")
    print("✓ Saved profile_effects_analysis.png")

    print("\n=== Analysis Complete ===")
    print(f"Files generated:")
    print(f"  - {csv_filename}")
    print(f"  - profile_effects_analysis.png")


if __name__ == "__main__":
    main()
