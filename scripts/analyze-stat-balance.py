#!/usr/bin/env python3
"""
Analyze stat balance across different track types.
Uses the EXACT simulation logic from RaceVisualizer.tsx to ensure accuracy.
"""

import math
import csv
from typing import Dict, List, Tuple
import matplotlib

matplotlib.use("Agg")  # Use non-GUI backend
import matplotlib.pyplot as plt
import pandas as pd
import seaborn as sns

# Track configurations from simulator
TRACKS = [
    {
        "id": 1,
        "name": "Scrap Mountain Circuit",
        "terrain": "ScrapHeaps",
        "distance": 10,
        "profile": "mountain",
    },
    {
        "id": 2,
        "name": "Highway of the Dead",
        "terrain": "MetalRoads",
        "distance": 7,
        "profile": "flat",
    },
    {
        "id": 3,
        "name": "Wasteland Gauntlet",
        "terrain": "WastelandSand",
        "distance": 13,
        "profile": "rolling",
    },
    {
        "id": 4,
        "name": "Junkyard Sprint",
        "terrain": "ScrapHeaps",
        "distance": 4,
        "profile": "sprint",
    },
    {
        "id": 5,
        "name": "Metal Mesa Circuit",
        "terrain": "MetalRoads",
        "distance": 7,
        "profile": "technical",
    },
    {
        "id": 6,
        "name": "Dune Runner",
        "terrain": "WastelandSand",
        "distance": 17,
        "profile": "endurance",
    },
    {
        "id": 7,
        "name": "Rust Belt Rally",
        "terrain": "MetalRoads",
        "distance": 9,
        "profile": "flat",
    },
    {
        "id": 8,
        "name": "Debris Field Dash",
        "terrain": "ScrapHeaps",
        "distance": 7,
        "profile": "technical",
    },
    {
        "id": 9,
        "name": "Velocity Viaduct",
        "terrain": "MetalRoads",
        "distance": 5,
        "profile": "sprint",
    },
    {
        "id": 10,
        "name": "Sandstorm Circuit",
        "terrain": "WastelandSand",
        "distance": 11,
        "profile": "rolling",
    },
]

# Track templates - exact match from RaceVisualizer.tsx
TRACK_TEMPLATES = {
    1: {  # Scrap Mountain Circuit
        "segments": [
            {"length": 500, "terrain": "ScrapHeaps", "angle": 5, "difficulty": 1.0},
            {"length": 400, "terrain": "ScrapHeaps", "angle": 12, "difficulty": 1.1},
            {"length": 300, "terrain": "ScrapHeaps", "angle": 18, "difficulty": 1.15},
            {"length": 350, "terrain": "ScrapHeaps", "angle": -8, "difficulty": 1.05},
            {"length": 250, "terrain": "ScrapHeaps", "angle": 0, "difficulty": 1.2},
            {"length": 400, "terrain": "ScrapHeaps", "angle": 15, "difficulty": 1.12},
            {"length": 300, "terrain": "ScrapHeaps", "angle": -5, "difficulty": 1.08},
            {"length": 200, "terrain": "ScrapHeaps", "angle": 0, "difficulty": 1.15},
            {"length": 350, "terrain": "ScrapHeaps", "angle": 8, "difficulty": 1.1},
            {"length": 450, "terrain": "ScrapHeaps", "angle": 22, "difficulty": 1.25},
            {"length": 500, "terrain": "ScrapHeaps", "angle": -12, "difficulty": 1.0},
            {"length": 400, "terrain": "ScrapHeaps", "angle": -18, "difficulty": 0.95},
            {"length": 350, "terrain": "ScrapHeaps", "angle": -15, "difficulty": 1.0},
            {"length": 300, "terrain": "ScrapHeaps", "angle": -7, "difficulty": 1.1},
            {"length": 250, "terrain": "ScrapHeaps", "angle": -15, "difficulty": 1.05},
        ],
        "laps": 2,
    },
    2: {  # Highway of the Dead
        "segments": [
            {"length": 800, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.85},
            {"length": 700, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.9},
            {"length": 600, "terrain": "MetalRoads", "angle": -3, "difficulty": 0.82},
            {"length": 500, "terrain": "MetalRoads", "angle": -5, "difficulty": 0.8},
            {"length": 400, "terrain": "ScrapHeaps", "angle": 3, "difficulty": 1.15},
            {"length": 500, "terrain": "ScrapHeaps", "angle": 5, "difficulty": 1.2},
            {"length": 600, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.88},
            {"length": 700, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.9},
            {"length": 500, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.92},
            {"length": 450, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.95},
            {"length": 550, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.85},
            {"length": 400, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.9},
        ],
        "laps": 1,
    },
    3: {  # Wasteland Gauntlet
        "segments": [
            {"length": 1000, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.1},
            {"length": 800, "terrain": "WastelandSand", "angle": 3, "difficulty": 1.15},
            {"length": 700, "terrain": "WastelandSand", "angle": 8, "difficulty": 1.22},
            {
                "length": 900,
                "terrain": "WastelandSand",
                "angle": 12,
                "difficulty": 1.25,
            },
            {
                "length": 600,
                "terrain": "WastelandSand",
                "angle": -5,
                "difficulty": 1.12,
            },
            {"length": 800, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.18},
            {"length": 700, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.15},
            {
                "length": 650,
                "terrain": "WastelandSand",
                "angle": -4,
                "difficulty": 1.08,
            },
            {
                "length": 750,
                "terrain": "WastelandSand",
                "angle": -8,
                "difficulty": 1.05,
            },
            {"length": 900, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.2},
            {"length": 800, "terrain": "WastelandSand", "angle": 5, "difficulty": 1.22},
            {"length": 700, "terrain": "WastelandSand", "angle": 8, "difficulty": 1.25},
            {
                "length": 600,
                "terrain": "WastelandSand",
                "angle": -10,
                "difficulty": 1.1,
            },
            {
                "length": 500,
                "terrain": "WastelandSand",
                "angle": -5,
                "difficulty": 1.08,
            },
            {"length": 900, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.12},
            {"length": 700, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.1},
            {
                "length": 600,
                "terrain": "WastelandSand",
                "angle": -4,
                "difficulty": 1.05,
            },
        ],
        "laps": 1,
    },
    4: {  # Junkyard Sprint
        "segments": [
            {"length": 200, "terrain": "ScrapHeaps", "angle": 0, "difficulty": 1.05},
            {"length": 150, "terrain": "ScrapHeaps", "angle": 5, "difficulty": 1.1},
            {"length": 180, "terrain": "ScrapHeaps", "angle": 8, "difficulty": 1.15},
            {"length": 160, "terrain": "ScrapHeaps", "angle": 12, "difficulty": 1.2},
            {"length": 140, "terrain": "ScrapHeaps", "angle": -6, "difficulty": 1.12},
            {"length": 170, "terrain": "ScrapHeaps", "angle": -10, "difficulty": 1.08},
            {"length": 150, "terrain": "ScrapHeaps", "angle": -5, "difficulty": 1.1},
            {"length": 180, "terrain": "ScrapHeaps", "angle": 0, "difficulty": 1.15},
            {"length": 160, "terrain": "ScrapHeaps", "angle": -4, "difficulty": 1.05},
        ],
        "laps": 3,
    },
    5: {  # Metal Mesa Loop
        "segments": [
            {"length": 400, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.92},
            {"length": 350, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.95},
            {"length": 300, "terrain": "MetalRoads", "angle": 3, "difficulty": 0.98},
            {"length": 250, "terrain": "ScrapHeaps", "angle": 8, "difficulty": 1.12},
            {"length": 300, "terrain": "ScrapHeaps", "angle": 12, "difficulty": 1.18},
            {"length": 250, "terrain": "ScrapHeaps", "angle": 15, "difficulty": 1.22},
            {"length": 300, "terrain": "MetalRoads", "angle": -8, "difficulty": 0.88},
            {"length": 350, "terrain": "MetalRoads", "angle": -10, "difficulty": 0.85},
            {
                "length": 400,
                "terrain": "WastelandSand",
                "angle": -5,
                "difficulty": 1.08,
            },
            {"length": 350, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.12},
            {"length": 300, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.1},
            {
                "length": 250,
                "terrain": "WastelandSand",
                "angle": -15,
                "difficulty": 1.05,
            },
        ],
        "laps": 2,
    },
    6: {  # Dune Runner
        "segments": [
            {
                "length": 1200,
                "terrain": "WastelandSand",
                "angle": 5,
                "difficulty": 1.18,
            },
            {
                "length": 1100,
                "terrain": "WastelandSand",
                "angle": 8,
                "difficulty": 1.22,
            },
            {
                "length": 1000,
                "terrain": "WastelandSand",
                "angle": 12,
                "difficulty": 1.28,
            },
            {
                "length": 1300,
                "terrain": "WastelandSand",
                "angle": 15,
                "difficulty": 1.32,
            },
            {
                "length": 1200,
                "terrain": "WastelandSand",
                "angle": 10,
                "difficulty": 1.25,
            },
            {"length": 1100, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.2},
            {
                "length": 1000,
                "terrain": "WastelandSand",
                "angle": -8,
                "difficulty": 1.15,
            },
            {
                "length": 900,
                "terrain": "WastelandSand",
                "angle": -12,
                "difficulty": 1.1,
            },
            {
                "length": 1200,
                "terrain": "WastelandSand",
                "angle": 0,
                "difficulty": 1.22,
            },
            {
                "length": 1100,
                "terrain": "WastelandSand",
                "angle": 6,
                "difficulty": 1.25,
            },
            {
                "length": 1000,
                "terrain": "WastelandSand",
                "angle": 10,
                "difficulty": 1.28,
            },
            {"length": 900, "terrain": "WastelandSand", "angle": 8, "difficulty": 1.2},
            {
                "length": 1300,
                "terrain": "WastelandSand",
                "angle": 0,
                "difficulty": 1.18,
            },
            {
                "length": 1200,
                "terrain": "WastelandSand",
                "angle": -15,
                "difficulty": 1.12,
            },
            {
                "length": 1000,
                "terrain": "WastelandSand",
                "angle": -39,
                "difficulty": 1.08,
            },
        ],
        "laps": 1,
    },
    7: {  # Rust Belt Rally
        "segments": [
            {"length": 900, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.82},
            {"length": 850, "terrain": "MetalRoads", "angle": -2, "difficulty": 0.78},
            {"length": 800, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.8},
            {"length": 750, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.85},
            {"length": 700, "terrain": "MetalRoads", "angle": -4, "difficulty": 0.76},
            {"length": 650, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.88},
            {"length": 600, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.9},
            {"length": 550, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.85},
            {"length": 900, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.82},
            {"length": 850, "terrain": "MetalRoads", "angle": 3, "difficulty": 0.8},
            {"length": 800, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.78},
            {"length": 850, "terrain": "MetalRoads", "angle": 3, "difficulty": 0.83},
        ],
        "laps": 1,
    },
    8: {  # Debris Field Dash
        "segments": [
            {"length": 300, "terrain": "ScrapHeaps", "angle": 8, "difficulty": 1.22},
            {"length": 350, "terrain": "ScrapHeaps", "angle": 12, "difficulty": 1.28},
            {"length": 280, "terrain": "ScrapHeaps", "angle": 18, "difficulty": 1.35},
            {"length": 320, "terrain": "ScrapHeaps", "angle": -10, "difficulty": 1.18},
            {"length": 400, "terrain": "ScrapHeaps", "angle": 0, "difficulty": 1.25},
            {"length": 350, "terrain": "ScrapHeaps", "angle": 15, "difficulty": 1.3},
            {"length": 300, "terrain": "ScrapHeaps", "angle": 20, "difficulty": 1.38},
            {"length": 280, "terrain": "ScrapHeaps", "angle": -15, "difficulty": 1.2},
            {"length": 320, "terrain": "ScrapHeaps", "angle": -8, "difficulty": 1.15},
            {"length": 350, "terrain": "ScrapHeaps", "angle": 0, "difficulty": 1.28},
            {"length": 300, "terrain": "ScrapHeaps", "angle": -40, "difficulty": 1.25},
        ],
        "laps": 2,
    },
    9: {  # Velocity Viaduct
        "segments": [
            {"length": 300, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.8},
            {"length": 250, "terrain": "MetalRoads", "angle": 0, "difficulty": 0.78},
            {"length": 280, "terrain": "MetalRoads", "angle": -5, "difficulty": 0.75},
            {"length": 220, "terrain": "MetalRoads", "angle": -8, "difficulty": 0.72},
            {"length": 200, "terrain": "MetalRoads", "angle": 5, "difficulty": 0.85},
            {"length": 250, "terrain": "MetalRoads", "angle": 8, "difficulty": 0.82},
        ],
        "laps": 3,
    },
    10: {  # Sandstorm Circuit
        "segments": [
            {"length": 600, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.15},
            {"length": 550, "terrain": "WastelandSand", "angle": 5, "difficulty": 1.2},
            {
                "length": 500,
                "terrain": "WastelandSand",
                "angle": 10,
                "difficulty": 1.25,
            },
            {
                "length": 450,
                "terrain": "WastelandSand",
                "angle": 12,
                "difficulty": 1.28,
            },
            {"length": 500, "terrain": "WastelandSand", "angle": 8, "difficulty": 1.22},
            {"length": 550, "terrain": "WastelandSand", "angle": 0, "difficulty": 1.18},
            {
                "length": 600,
                "terrain": "WastelandSand",
                "angle": -6,
                "difficulty": 1.12,
            },
            {
                "length": 550,
                "terrain": "WastelandSand",
                "angle": -10,
                "difficulty": 1.08,
            },
            {"length": 500, "terrain": "WastelandSand", "angle": -8, "difficulty": 1.1},
            {
                "length": 600,
                "terrain": "WastelandSand",
                "angle": -11,
                "difficulty": 1.15,
            },
        ],
        "laps": 2,
    },
}


def calculate_segment_time(
    segment: Dict,
    stats: Dict,
    previous_difficulty: float,
    race_distance_km: int,
    seed: int,
) -> Tuple[float, float]:
    """
    Calculate time for a single segment.
    Exact port from RaceVisualizer.tsx calculateSegmentTimeEstimate()
    """
    speed = stats["speed"]
    power_core = stats["powerCore"]
    stability = stats["stability"]
    acceleration = stats["acceleration"]

    # === PART 1: BASE SPEED (No acceleration - it's for momentum only) ===

    # Speed: Universal importance across all terrains
    speed_universal = math.sqrt(speed) * 1.0  # Greatly reduced to let penalties matter

    # Terrain-specific speed bonuses
    speed_bonus = 0.0
    if segment["terrain"] == "MetalRoads":
        # Base speed bonus for all MetalRoads
        speed_bonus = math.sqrt(speed) * 10.0
        # Extra bonus for downhill
        if segment["angle"] < 0:
            speed_bonus += math.sqrt(speed) * 2.0
    elif segment["angle"] < 0:
        # Downhill bonus on other terrains
        speed_bonus = math.sqrt(speed) * 1.0

    total_speed = speed_universal + speed_bonus

    # === PART 2: UNIVERSAL PENALTIES (Much stronger) ===

    power_universal = 1.0 + ((100.0 - power_core) / 80.0)  # Much stronger
    stability_universal = 1.0 + ((100.0 - stability) / 100.0)  # Much stronger

    # === PART 4: SITUATIONAL MODIFIERS ===

    # Power situational
    power_situational = 1.0
    if segment["terrain"] == "WastelandSand":
        power_situational = 1.0 + ((100.0 - power_core) / 55.0)  # Terrain-specific
    elif segment["angle"] > 5:
        steepness = segment["angle"] / 20.0
        power_situational = (
            1.0 + ((100.0 - power_core) / 50.0) * steepness
        )  # Much stronger
    elif segment["angle"] > 0:
        power_situational = 1.0 + ((100.0 - power_core) / 150.0)  # Much stronger

    # Acceleration - momentum recovery (the glue between difficulty changes)
    momentum_mod = 1.0
    if previous_difficulty != segment["difficulty"]:
        difficulty_change = abs(segment["difficulty"] - previous_difficulty)
        # High acceleration = low penalty (recovers quickly from transitions)
        # Low acceleration = high penalty (struggles to adapt)
        # Much stronger penalty (2) because it only triggers on transitions
        momentum_mod = 1.0 + (difficulty_change * (100.0 - acceleration) / 2.0)

    # Stability situational
    stability_situational = 1.0
    if segment["terrain"] == "ScrapHeaps":
        stability_situational = 1.0 + ((100.0 - stability) / 32.0)  # Terrain-specific
    elif segment["terrain"] == "MetalRoads":
        stability_situational = 1.0 + ((100.0 - stability) / 2000.0)  # Almost nothing
    elif segment["difficulty"] > 1.0:
        stability_situational = 1.0 + ((100.0 - stability) / 60.0) * (
            segment["difficulty"] - 1.0
        )  # Much stronger

    # === PART 5: DISTANCE-BASED STAT SCALING ===

    # Short sprints - Acceleration gets advantage (quick bursts matter more than top speed)
    sprint_factor = 1.0
    if race_distance_km < 10:
        accel_weight = 1.0 - (
            (acceleration - 50.0) / 200.0
        )  # Reduced from 150: 1.25x to 0.75x (high accel = lower factor = faster time)
        speed_weight = 1.0 + (
            (speed - 50.0) / 300.0
        )  # Reduced from 200: High speed gets small penalty: 0.83x to 1.17x
        sprint_factor = accel_weight * speed_weight  # Multiply instead of divide

    trek_factor = 1.0
    if race_distance_km > 20:
        power_weight = 0.60 + (
            (power_core - 50.0) / 110.0
        )  # Increased penalty from 0.65 and 125
    # === PART 6: COMBINE ALL MODIFIERS ===

    total_power_mod = power_universal * power_situational
    momentum_mod_final = momentum_mod  # Only from acceleration, applied separately
    total_stability_mod = stability_universal * stability_situational

    # Randomness
    segment_seed = seed % 1000
    random_mod = 0.90 + (segment_seed / 5000.0)

    # Calculate segment time
    segment_length = segment["length"]
    base_time = segment_length / total_speed
    effective_time = (
        base_time * total_power_mod * momentum_mod_final * total_stability_mod
    )
    segment_time = effective_time * random_mod

    # 10x speed multiplier
    final_time = max(0.1, segment_time / 10.0)

    return final_time, segment["difficulty"]


def simulate_race(track_id: int, stats: Dict, seed_base: int) -> float:
    """Simulate a complete race and return total time."""
    if track_id not in TRACK_TEMPLATES:
        # Use a default track for unsupported IDs
        track_id = 1

    track_template = TRACK_TEMPLATES[track_id]
    segments = track_template["segments"]
    laps = track_template["laps"]

    track_config = next(t for t in TRACKS if t["id"] == track_id)
    distance_km = track_config["distance"]

    total_time = 0.0
    previous_difficulty = 1.0

    # Simulate all laps
    for lap in range(laps):
        for seg_idx, segment in enumerate(segments):
            global_segment_idx = lap * len(segments) + seg_idx
            seed = seed_base + global_segment_idx
            segment_time, difficulty = calculate_segment_time(
                segment, stats, previous_difficulty, distance_km, seed
            )
            total_time += segment_time
            previous_difficulty = difficulty

    return total_time

    return total_time


def analyze_stat_value(
    stat_name: str, base_stats: Dict, track: Dict, num_trials: int = 50
) -> Dict:
    """Analyze the value of a single stat point across multiple trials."""
    results = []

    for trial in range(num_trials):
        seed = trial * 1000 + track["id"]

        # Baseline time
        baseline_time = simulate_race(track["id"], base_stats, seed)

        # Test adding points to the stat
        time_savings = []
        for points in range(1, 11):  # Test adding 1-10 points
            test_stats = base_stats.copy()
            test_stats[stat_name] = min(100, base_stats[stat_name] + points)
            improved_time = simulate_race(track["id"], test_stats, seed)
            time_saved = baseline_time - improved_time
            time_savings.append(time_saved / points)  # Time saved per point

        # Average time saved per point across the 10-point range
        avg_time_saved = sum(time_savings) / len(time_savings)
        results.append(avg_time_saved)

    return {
        "mean": sum(results) / len(results),
        "min": min(results),
        "max": max(results),
        "std": (
            sum((x - sum(results) / len(results)) ** 2 for x in results) / len(results)
        )
        ** 0.5,
    }


def main():
    """Run the analysis."""
    print("=== Stat Balance Analysis (Using Exact RaceVisualizer.tsx Logic) ===\n")

    # Baseline bot with lower stats to test incremental improvements
    BASE_STATS = {
        "speed": 30,
        "powerCore": 30,
        "acceleration": 30,
        "stability": 30,
    }

    print(f"Baseline Stats: {BASE_STATS}\n")
    print("Running simulations across all tracks and stat combinations...")
    print("This may take a minute...\n")

    # Results storage
    all_results = []

    # Test only tracks we have templates for
    test_tracks = [t for t in TRACKS if t["id"] in TRACK_TEMPLATES]

    # Test each stat on each track
    for track in test_tracks:
        print(f"Testing {track['name']}...")

        for stat_name in ["speed", "powerCore", "acceleration", "stability"]:
            result = analyze_stat_value(stat_name, BASE_STATS, track, num_trials=50)

            all_results.append(
                {
                    "track_id": track["id"],
                    "track_name": track["name"],
                    "terrain": track["terrain"],
                    "profile": track["profile"],
                    "distance": track["distance"],
                    "stat": stat_name,
                    "time_saved_per_point_mean": result["mean"],
                    "time_saved_per_point_std": result["std"],
                    "time_saved_per_point_min": result["min"],
                    "time_saved_per_point_max": result["max"],
                }
            )

    # Save to CSV
    csv_filename = "stat_balance_analysis.csv"
    with open(csv_filename, "w", newline="") as f:
        if all_results:
            writer = csv.DictWriter(f, fieldnames=all_results[0].keys())
            writer.writeheader()
            writer.writerows(all_results)

    print(f"\n✓ Results saved to {csv_filename}")

    # Create DataFrame for analysis
    df = pd.DataFrame(all_results)

    # Print summary statistics
    print("\n=== Summary by Stat (seconds saved per stat point) ===")
    summary = df.groupby("stat")["time_saved_per_point_mean"].agg(
        ["mean", "std", "min", "max"]
    )
    print(summary)

    print("\n=== Summary by Terrain ===")
    terrain_summary = (
        df.groupby(["terrain", "stat"])["time_saved_per_point_mean"].mean().unstack()
    )
    print(terrain_summary)

    print("\n=== Summary by Profile Type ===")
    profile_summary = (
        df.groupby(["profile", "stat"])["time_saved_per_point_mean"].mean().unstack()
    )
    print(profile_summary)

    # Generate visualizations
    print("\nGenerating visualizations...")

    # Set style
    sns.set_style("whitegrid")
    plt.rcParams["figure.figsize"] = (14, 10)

    # Create a 2x2 subplot figure
    fig, axes = plt.subplots(2, 2, figsize=(16, 12))
    fig.suptitle(
        "Stat Balance Analysis Across Track Types", fontsize=16, fontweight="bold"
    )

    # 1. Overall stat comparison
    ax1 = axes[0, 0]
    stat_means = (
        df.groupby("stat")["time_saved_per_point_mean"]
        .mean()
        .sort_values(ascending=False)
    )
    colors = ["#e74c3c" if x == stat_means.max() else "#3498db" for x in stat_means]
    stat_means.plot(kind="bar", ax=ax1, color=colors)
    ax1.set_title(
        "Average Time Saved Per Stat Point (Overall)", fontsize=12, fontweight="bold"
    )
    ax1.set_xlabel("Stat")
    ax1.set_ylabel("Seconds Saved Per Point")
    ax1.tick_params(axis="x", rotation=45)
    ax1.grid(axis="y", alpha=0.3)

    # Add value labels on bars
    for i, v in enumerate(stat_means):
        ax1.text(i, v + 0.001, f"{v:.4f}", ha="center", va="bottom", fontsize=9)

    # 2. Stat value by terrain
    ax2 = axes[0, 1]
    terrain_pivot = df.pivot_table(
        values="time_saved_per_point_mean",
        index="stat",
        columns="terrain",
        aggfunc="mean",
    )
    terrain_pivot.plot(kind="bar", ax=ax2)
    ax2.set_title(
        "Time Saved Per Stat Point by Terrain", fontsize=12, fontweight="bold"
    )
    ax2.set_xlabel("Stat")
    ax2.set_ylabel("Seconds Saved Per Point")
    ax2.tick_params(axis="x", rotation=45)
    ax2.legend(title="Terrain")
    ax2.grid(axis="y", alpha=0.3)

    # 3. Stat value by profile
    ax3 = axes[1, 0]
    profile_pivot = df.pivot_table(
        values="time_saved_per_point_mean",
        index="stat",
        columns="profile",
        aggfunc="mean",
    )
    profile_pivot.plot(kind="bar", ax=ax3)
    ax3.set_title(
        "Time Saved Per Stat Point by Track Profile", fontsize=12, fontweight="bold"
    )
    ax3.set_xlabel("Stat")
    ax3.set_ylabel("Seconds Saved Per Point")
    ax3.tick_params(axis="x", rotation=45)
    ax3.legend(title="Profile", bbox_to_anchor=(1.05, 1), loc="upper left")
    ax3.grid(axis="y", alpha=0.3)

    # 4. Heatmap of stat effectiveness
    ax4 = axes[1, 1]
    heatmap_data = df.pivot_table(
        values="time_saved_per_point_mean",
        index="stat",
        columns="track_name",
        aggfunc="mean",
    )
    sns.heatmap(
        heatmap_data,
        annot=True,
        fmt=".4f",
        cmap="YlOrRd",
        ax=ax4,
        cbar_kws={"label": "Seconds Saved"},
    )
    ax4.set_title("Stat Effectiveness Heatmap by Track", fontsize=12, fontweight="bold")
    ax4.set_xlabel("Track")
    ax4.set_ylabel("Stat")
    ax4.tick_params(axis="x", rotation=45, labelsize=8)

    plt.tight_layout()
    plt.savefig("stat_balance_analysis.png", dpi=300, bbox_inches="tight")
    print("✓ Saved stat_balance_analysis.png")

    # Additional detailed plot: Box plots showing variance
    fig2, axes2 = plt.subplots(1, 2, figsize=(16, 6))
    fig2.suptitle(
        "Stat Value Distribution Across Track Types", fontsize=16, fontweight="bold"
    )

    # Box plot by stat
    ax1 = axes2[0]
    df.boxplot(column="time_saved_per_point_mean", by="stat", ax=ax1)
    ax1.set_title("Distribution of Time Saved by Stat")
    ax1.set_xlabel("Stat")
    ax1.set_ylabel("Seconds Saved Per Point")
    plt.sca(ax1)
    plt.xticks(rotation=45)

    # Box plot by terrain
    ax2 = axes2[1]
    terrain_order = ["ScrapHeaps", "WastelandSand", "MetalRoads"]
    df_sorted = df.sort_values(
        "terrain", key=lambda x: x.map({t: i for i, t in enumerate(terrain_order)})
    )
    df_sorted.boxplot(column="time_saved_per_point_mean", by="terrain", ax=ax2)
    ax2.set_title("Distribution of Time Saved by Terrain")
    ax2.set_xlabel("Terrain")
    ax2.set_ylabel("Seconds Saved Per Point")

    plt.tight_layout()
    plt.savefig("stat_balance_distribution.png", dpi=300, bbox_inches="tight")
    print("✓ Saved stat_balance_distribution.png")

    # Check for balance issues
    print("\n=== Balance Analysis ===")
    overall_mean = df.groupby("stat")["time_saved_per_point_mean"].mean()
    max_stat = overall_mean.idxmax()
    min_stat = overall_mean.idxmin()
    ratio = overall_mean.max() / overall_mean.min()

    print(f"Most valuable stat: {max_stat} ({overall_mean[max_stat]:.4f} sec/point)")
    print(f"Least valuable stat: {min_stat} ({overall_mean[min_stat]:.4f} sec/point)")
    print(f"Value ratio (max/min): {ratio:.2f}x")

    if ratio > 1.5:
        print(
            f"\n⚠️  WARNING: {max_stat} appears significantly stronger than {min_stat}"
        )
        print(f"   Consider rebalancing to bring stats closer together.")
    elif ratio > 1.2:
        print(f"\n⚠️  NOTICE: {max_stat} is moderately stronger than {min_stat}")
        print(f"   Stats are relatively balanced but minor adjustments could help.")
    else:
        print(f"\n✓ Stats appear well balanced (ratio < 1.2x)")

    print("\n=== Analysis Complete ===")
    print(f"Files generated:")
    print(f"  - {csv_filename}")
    print(f"  - stat_balance_analysis.png")
    print(f"  - stat_balance_distribution.png")


if __name__ == "__main__":
    main()
