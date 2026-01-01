#!/usr/bin/env python3
"""
Test the momentum system to understand acceleration's impact.
"""

import math


def calculate_segment_time(segment, stats, seed, previous_difficulty):
    """Calculate time for a single segment."""
    speed = stats["speed"]
    power_core = stats["powerCore"]
    stability = stats["stability"]
    acceleration = stats["acceleration"]

    # Base time for segment
    segment_length = segment["length"]
    base_speed = math.sqrt(speed) * 7.5

    # Terrain modifier
    terrain = segment["terrain"]
    if terrain == "ScrapHeaps":
        terrain_mod = 1.0 + ((100.0 - stability) / 150.0)
    elif terrain == "WastelandSand":
        terrain_mod = 1.0 + ((100.0 - power_core) / 200.0)
    elif terrain == "MetalRoads":
        terrain_mod = 1.0 + ((100.0 - acceleration) / 160.0)
    else:
        terrain_mod = 1.0

    # Angle modifier
    angle = segment["angle"]
    if angle > 0:
        angle_mod = 1.0 + (angle * (100.0 - power_core) / 3000.0)
    else:
        angle_mod = 1.0

    # Momentum system: acceleration affects recovery after difficult sections
    if previous_difficulty > 1.0:
        momentum_loss = (previous_difficulty - 1.0) * 0.15  # Up to 15% slower
    else:
        momentum_loss = 0.0

    acceleration_recovery = acceleration / 140.0  # 0.0 to 0.71 at 100 accel
    momentum_mod = 1.0 + (momentum_loss * (1.0 - acceleration_recovery))

    # Segment difficulty
    difficulty = segment["difficulty"]
    if difficulty > 1.0:
        stability_factor = 1.0 + ((100.0 - stability) / 300.0)
        difficulty_mod = difficulty * stability_factor
    else:
        difficulty_mod = difficulty

    # Randomness (use fixed seed for comparison)
    segment_seed = seed % 1000
    random_mod = 0.90 + (segment_seed / 5000.0)

    # Calculate segment time
    effective_speed = base_speed / (
        terrain_mod * angle_mod * difficulty_mod * momentum_mod
    )
    segment_time = (segment_length / effective_speed) * random_mod

    return max(0.1, segment_time / 10.0), momentum_mod, momentum_loss


# Test track with consecutive difficult segments
TECHNICAL_TRACK = [
    {
        "length": 500,
        "angle": 5,
        "terrain": "ScrapHeaps",
        "difficulty": 1.0,
    },  # Easy start
    {
        "length": 400,
        "angle": 12,
        "terrain": "ScrapHeaps",
        "difficulty": 1.2,
    },  # Technical
    {
        "length": 300,
        "angle": 18,
        "terrain": "ScrapHeaps",
        "difficulty": 1.25,
    },  # Very technical
    {
        "length": 350,
        "angle": -8,
        "terrain": "ScrapHeaps",
        "difficulty": 1.15,
    },  # Technical descent
    {
        "length": 250,
        "angle": 0,
        "terrain": "ScrapHeaps",
        "difficulty": 1.3,
    },  # Most technical
    {
        "length": 400,
        "angle": 0,
        "terrain": "MetalRoads",
        "difficulty": 0.85,
    },  # Fast section (recovery!)
]

print("=" * 80)
print("MOMENTUM SYSTEM TEST - Acceleration Impact")
print("=" * 80)
print()

# Test with low vs high acceleration
test_cases = [
    (
        "Low Acceleration (20)",
        {"speed": 50, "powerCore": 50, "acceleration": 20, "stability": 50},
    ),
    (
        "High Acceleration (80)",
        {"speed": 50, "powerCore": 50, "acceleration": 80, "stability": 50},
    ),
]

for name, stats in test_cases:
    print(f"\n{name}:")
    print("-" * 80)
    print(
        f"{'Seg':<4} {'Length':<8} {'Terrain':<15} {'Diff':<6} {'PrevDiff':<10} {'MomentumLoss':<13} {'MomentumMod':<12} {'Time':<8}"
    )
    print("-" * 80)

    total_time = 0.0
    previous_difficulty = 1.0

    for i, segment in enumerate(TECHNICAL_TRACK):
        time, momentum_mod, momentum_loss = calculate_segment_time(
            segment, stats, 12345 + i, previous_difficulty
        )

        print(
            f"{i+1:<4} {segment['length']:<8} {segment['terrain']:<15} {segment['difficulty']:<6.2f} "
            f"{previous_difficulty:<10.2f} {momentum_loss:<13.4f} {momentum_mod:<12.4f} {time:<8.3f}s"
        )

        total_time += time
        previous_difficulty = segment["difficulty"]

    print("-" * 80)
    print(f"Total Time: {total_time:.3f}s")

print("\n" + "=" * 80)
print("ANALYSIS:")
print("=" * 80)

# Calculate full race times
low_accel_stats = {"speed": 50, "powerCore": 50, "acceleration": 20, "stability": 50}
high_accel_stats = {"speed": 50, "powerCore": 50, "acceleration": 80, "stability": 50}

low_time = 0.0
high_time = 0.0
previous_difficulty = 1.0

for i, segment in enumerate(TECHNICAL_TRACK):
    low_seg_time, _, _ = calculate_segment_time(
        segment, low_accel_stats, 12345 + i, previous_difficulty
    )
    high_seg_time, _, _ = calculate_segment_time(
        segment, high_accel_stats, 12345 + i, previous_difficulty
    )

    low_time += low_seg_time
    high_time += high_seg_time
    previous_difficulty = segment["difficulty"]

time_saved = low_time - high_time
improvement = (time_saved / low_time) * 100.0

print(
    f"""
Low Acceleration (20):  {low_time:.3f}s
High Acceleration (80): {high_time:.3f}s

Time Saved with +60 Acceleration: {time_saved:.3f}s ({improvement:.2f}% improvement)
Value per point: {time_saved / 60.0:.5f}s/point

KEY INSIGHT:
The momentum system is MOST impactful on tracks with:
- Consecutive high-difficulty segments (difficulty > 1.0)
- Followed by easier segments where you need to recover speed

On this technical track, acceleration saves {time_saved:.3f}s over 6 segments.
That's {(time_saved / 6.0):.4f}s per segment on average.

The last segment (Fast MetalRoads after 4 technical segments) shows the biggest benefit:
- You enter with momentum_loss from difficulty 1.3 segment
- High acceleration = better recovery = faster through the easy section
"""
)
