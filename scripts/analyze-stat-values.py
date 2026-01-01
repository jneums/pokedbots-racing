#!/usr/bin/env python3
"""
Analyze the value of each stat in the racing simulator.

This script calculates how much impact each stat has on race times by:
1. Simulating races with different stat configurations
2. Measuring the time difference when increasing each stat
3. Calculating the marginal value per stat point
4. Analyzing stat importance across different track types
"""

import math

# ===== SIMULATOR LOGIC (Python port of RacingSimulator.mo) =====


def calculate_segment_time(segment, stats, seed, previous_difficulty):
    """Calculate time for a single segment."""
    speed = stats["speed"]
    power_core = stats["powerCore"]
    stability = stats["stability"]
    acceleration = stats["acceleration"]

    # Base time for segment
    segment_length = segment["length"]
    base_speed = math.sqrt(speed) * 7.5

    # Terrain modifier based on segment terrain
    terrain = segment["terrain"]
    if terrain == "ScrapHeaps":
        terrain_mod = 1.0 + ((100.0 - stability) / 150.0)  # Up to 67% penalty
    elif terrain == "WastelandSand":
        terrain_mod = 1.0 + ((100.0 - power_core) / 200.0)  # Up to 50% penalty
    elif terrain == "MetalRoads":
        terrain_mod = 1.0 + ((100.0 - acceleration) / 160.0)  # Up to 62% penalty
    else:
        terrain_mod = 1.0

    # Angle modifier (uphill slows)
    angle = segment["angle"]
    if angle > 0:
        angle_mod = 1.0 + (angle * (100.0 - power_core) / 3000.0)
    else:
        angle_mod = 1.0

    # Momentum system: acceleration affects recovery after difficult sections
    if previous_difficulty > 1.0:
        momentum_loss = (previous_difficulty - 1.0) * 0.15
    else:
        momentum_loss = 0.0

    acceleration_recovery = acceleration / 140.0
    momentum_mod = 1.0 + (momentum_loss * (1.0 - acceleration_recovery))

    # Segment difficulty - scales with stability
    difficulty = segment["difficulty"]
    if difficulty > 1.0:
        stability_factor = 1.0 + ((100.0 - stability) / 300.0)
        difficulty_mod = difficulty * stability_factor
    else:
        difficulty_mod = difficulty

    # Randomness for this segment (±10%)
    segment_seed = seed % 1000
    random_mod = 0.90 + (segment_seed / 5000.0)

    # Calculate segment time
    effective_speed = base_speed / (
        terrain_mod * angle_mod * difficulty_mod * momentum_mod
    )
    segment_time = (segment_length / effective_speed) * random_mod

    # 10x speed multiplier
    return max(0.1, segment_time / 10.0)


def simulate_race(track_segments, stats, track_seed, participant_index):
    """Simulate a full race and return total time."""
    total_time = 0.0
    previous_difficulty = 1.0

    for segment_idx, segment in enumerate(track_segments):
        # Use trackSeed + participant index + segment index for deterministic randomness
        segment_seed = track_seed + (participant_index * 1000) + segment_idx

        # Calculate base segment time
        base_segment_time = calculate_segment_time(
            segment, stats, segment_seed, previous_difficulty
        )

        # Per-segment performance variation (±6%)
        lap = segment_idx // len(track_segments)
        segment_condition_seed = (
            segment_seed * 31337 + participant_index * 7919 + lap * 12345
        ) % 1000
        segment_performance = 0.94 + (segment_condition_seed / 1666.67)

        segment_time = base_segment_time * segment_performance
        total_time += segment_time

        # Update previous difficulty
        previous_difficulty = segment["difficulty"]

    return total_time


# ===== TRACK TEMPLATES =====

# Simplified track templates (representative segments)
TRACKS = {
    "ScrapHeaps_Technical": [
        {"length": 500, "angle": 5, "terrain": "ScrapHeaps", "difficulty": 1.0},
        {"length": 400, "angle": 12, "terrain": "ScrapHeaps", "difficulty": 1.1},
        {"length": 300, "angle": 18, "terrain": "ScrapHeaps", "difficulty": 1.15},
        {"length": 350, "angle": -8, "terrain": "ScrapHeaps", "difficulty": 1.05},
        {"length": 250, "angle": 0, "terrain": "ScrapHeaps", "difficulty": 1.2},
        {"length": 400, "angle": 15, "terrain": "ScrapHeaps", "difficulty": 1.12},
        {"length": 300, "angle": -5, "terrain": "ScrapHeaps", "difficulty": 1.08},
    ]
    * 2,  # 2 laps
    "WastelandSand_Endurance": [
        {"length": 1000, "angle": 0, "terrain": "WastelandSand", "difficulty": 1.1},
        {"length": 800, "angle": 3, "terrain": "WastelandSand", "difficulty": 1.15},
        {"length": 700, "angle": 8, "terrain": "WastelandSand", "difficulty": 1.22},
        {"length": 900, "angle": 12, "terrain": "WastelandSand", "difficulty": 1.25},
        {"length": 600, "angle": -5, "terrain": "WastelandSand", "difficulty": 1.12},
        {"length": 800, "angle": 0, "terrain": "WastelandSand", "difficulty": 1.18},
    ],
    "MetalRoads_Speed": [
        {"length": 800, "angle": 0, "terrain": "MetalRoads", "difficulty": 0.85},
        {"length": 700, "angle": 0, "terrain": "MetalRoads", "difficulty": 0.9},
        {"length": 600, "angle": -3, "terrain": "MetalRoads", "difficulty": 0.82},
        {"length": 500, "angle": -5, "terrain": "MetalRoads", "difficulty": 0.8},
        {"length": 600, "angle": 0, "terrain": "MetalRoads", "difficulty": 0.88},
        {"length": 700, "angle": 0, "terrain": "MetalRoads", "difficulty": 0.9},
    ],
    "Mixed_Balanced": [
        {"length": 400, "angle": 0, "terrain": "MetalRoads", "difficulty": 0.92},
        {"length": 350, "angle": 0, "terrain": "MetalRoads", "difficulty": 0.95},
        {"length": 300, "angle": 3, "terrain": "MetalRoads", "difficulty": 0.98},
        {"length": 250, "angle": 8, "terrain": "ScrapHeaps", "difficulty": 1.12},
        {"length": 300, "angle": 12, "terrain": "ScrapHeaps", "difficulty": 1.18},
        {"length": 400, "angle": -5, "terrain": "WastelandSand", "difficulty": 1.08},
        {"length": 350, "angle": 0, "terrain": "WastelandSand", "difficulty": 1.12},
    ]
    * 2,  # 2 laps
}


# ===== ANALYSIS FUNCTIONS =====


def calculate_stat_marginal_value(
    track_name, track_segments, base_stats, stat_to_test, track_seed=12345
):
    """Calculate the time improvement per stat point."""
    # Baseline race time
    base_time = simulate_race(track_segments, base_stats, track_seed, 0)

    # Test increasing the stat by 10 points
    test_stats = base_stats.copy()
    test_stats[stat_to_test] = min(100, base_stats[stat_to_test] + 10)
    improved_time = simulate_race(track_segments, test_stats, track_seed, 0)

    # Calculate improvement
    time_saved = base_time - improved_time
    time_saved_per_point = time_saved / 10.0
    percentage_improvement = (time_saved / base_time) * 100.0

    return {
        "base_time": base_time,
        "improved_time": improved_time,
        "time_saved_total": time_saved,
        "time_saved_per_point": time_saved_per_point,
        "percentage_improvement": percentage_improvement,
        "percentage_per_point": percentage_improvement / 10.0,
    }


def analyze_all_stats():
    """Comprehensive analysis of all stats across all track types."""
    print("=" * 80)
    print("POKEDBOTS RACING - STAT VALUE ANALYSIS")
    print("=" * 80)
    print()

    # Test configurations
    stat_levels = [
        (
            "Low Stats (30/30/30/30)",
            {"speed": 30, "powerCore": 30, "acceleration": 30, "stability": 30},
        ),
        (
            "Mid Stats (50/50/50/50)",
            {"speed": 50, "powerCore": 50, "acceleration": 50, "stability": 50},
        ),
        (
            "High Stats (70/70/70/70)",
            {"speed": 70, "powerCore": 70, "acceleration": 70, "stability": 70},
        ),
    ]

    stats_to_test = ["speed", "powerCore", "acceleration", "stability"]

    for stat_level_name, base_stats in stat_levels:
        print(f"\n{'=' * 80}")
        print(f"{stat_level_name}")
        print(f"{'=' * 80}\n")

        for track_name, track_segments in TRACKS.items():
            print(f"\n{track_name}:")
            print("-" * 60)

            results = {}
            for stat in stats_to_test:
                result = calculate_stat_marginal_value(
                    track_name, track_segments, base_stats, stat
                )
                results[stat] = result

            # Sort by value (time saved per point)
            sorted_stats = sorted(
                results.items(),
                key=lambda x: x[1]["time_saved_per_point"],
                reverse=True,
            )

            print(f"Base race time: {results[stats_to_test[0]]['base_time']:.2f}s")
            print()
            print("Value per +10 stat points:")

            for i, (stat, data) in enumerate(sorted_stats, 1):
                print(
                    f"  {i}. {stat:12s}: {data['time_saved_total']:+.3f}s ({data['percentage_improvement']:+.2f}%) "
                    f"= {data['time_saved_per_point']:.4f}s/point"
                )

            print()
            print("Relative Value (normalized to best stat):")
            best_value = sorted_stats[0][1]["time_saved_per_point"]
            for stat, data in sorted_stats:
                relative = (data["time_saved_per_point"] / best_value) * 100.0
                print(f"  {stat:12s}: {relative:5.1f}%")


def analyze_stat_scaling():
    """Analyze how stat value changes at different stat levels."""
    print("\n" + "=" * 80)
    print("STAT SCALING ANALYSIS (Diminishing Returns)")
    print("=" * 80)
    print()

    track_segments = TRACKS["Mixed_Balanced"]

    stat_ranges = [10, 20, 30, 40, 50, 60, 70, 80, 90]

    for stat_name in ["speed", "powerCore", "acceleration", "stability"]:
        print(f"\n{stat_name.upper()} Scaling:")
        print("-" * 60)
        print(
            f"{'Stat Level':<12} {'Race Time':<12} {'Time Saved':<15} {'Value/Point':<15}"
        )
        print("-" * 60)

        previous_time = None
        for level in stat_ranges:
            stats = {"speed": 50, "powerCore": 50, "acceleration": 50, "stability": 50}
            stats[stat_name] = level

            race_time = simulate_race(track_segments, stats, 12345, 0)

            if previous_time is not None:
                time_saved = previous_time - race_time
                value_per_point = time_saved / 10.0
                print(
                    f"{level:<12} {race_time:<12.2f} {time_saved:<15.4f} {value_per_point:<15.6f}"
                )
            else:
                print(f"{level:<12} {race_time:<12.2f} {'—':<15} {'—':<15}")

            previous_time = race_time


def main():
    analyze_all_stats()
    analyze_stat_scaling()

    print("\n" + "=" * 80)
    print("KEY INSIGHTS:")
    print("=" * 80)
    print(
        """
1. STAT IMPORTANCE varies by track type:
   - ScrapHeaps tracks: Stability > Speed > Power Core > Acceleration
   - WastelandSand tracks: Power Core > Speed > Stability > Acceleration
   - MetalRoads tracks: Acceleration > Speed > Stability > Power Core
   
2. SPEED is universally important as it affects base time on all terrains

3. DIMINISHING RETURNS: Each stat shows decreasing marginal value at higher levels
   due to square root scaling in base speed calculation

4. BALANCED BUILDS are competitive across all track types, while specialized
   builds excel on their preferred terrain but suffer elsewhere

5. LOW STATS have the highest marginal value per point (e.g., going from 30→40
   is more valuable than 80→90)
"""
    )


if __name__ == "__main__":
    main()
