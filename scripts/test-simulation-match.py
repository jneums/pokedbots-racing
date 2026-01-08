#!/usr/bin/env python3
"""
Quick test to verify our Python simulation matches the TypeScript simulator.
"""

import math


def calculate_segment_time(
    segment, seed, stats, previous_difficulty=1.0, race_distance_km=10
):
    """Port of calculateSegmentTimeEstimate from RaceVisualizer.tsx"""
    speed = stats["speed"]
    power_core = stats["powerCore"]
    stability = stats["stability"]
    acceleration = stats["acceleration"]

    # === PART 1: UNIVERSAL STAT COMPONENTS (70% always active) ===
    speed_universal = math.sqrt(speed) * 5.25
    speed_bonus = 0.0
    if segment["angle"] == 0 and segment["terrain"] == "MetalRoads":
        speed_bonus = math.sqrt(speed) * 2.25
    elif segment["angle"] < 0:
        speed_bonus = math.sqrt(speed) * 1.125

    # === PART 2: STAT SYNERGIES ===
    speed_accel_ratio = (speed + acceleration) / 200.0
    speed_synergy_mod = 0.80 + (speed_accel_ratio * 0.20)
    synergistic_speed = (speed_universal + speed_bonus) * speed_synergy_mod

    power_stability_ratio = (power_core + stability) / 200.0
    power_synergy_mod = 0.85 + (power_stability_ratio * 0.15)

    # === PART 3: UNIVERSAL PENALTIES ===
    power_universal = 1.0 + ((100.0 - power_core) / 400.0)
    accel_universal = 1.0 + ((100.0 - acceleration) / 350.0)
    stability_universal = 1.0 + ((100.0 - stability) / 400.0)

    # === PART 4: SITUATIONAL MODIFIERS ===
    power_situational = 1.0
    if segment["terrain"] == "WastelandSand":
        power_situational = 1.0 + ((100.0 - power_core) / 200.0)
    elif segment["angle"] > 5:
        steepness = segment["angle"] / 20.0
        power_situational = 1.0 + ((100.0 - power_core) / 250.0) * steepness
    elif segment["angle"] > 0:
        power_situational = 1.0 + ((100.0 - power_core) / 400.0)

    accel_situational = 1.0
    if segment["terrain"] == "MetalRoads":
        accel_situational = 1.0 + ((100.0 - acceleration) / 160.0)

    momentum_loss = (
        (previous_difficulty - 1.0) * 0.20 if previous_difficulty > 1.0 else 0.0
    )
    acceleration_recovery = acceleration / 140.0
    momentum_mod = 1.0 + (momentum_loss * (1.0 - acceleration_recovery))

    stability_situational = 1.0
    if segment["terrain"] == "ScrapHeaps":
        stability_situational = 1.0 + ((100.0 - stability) / 150.0)

    if segment["difficulty"] > 1.0:
        difficulty_mod = segment["difficulty"] * (
            1.0 + ((100.0 - stability) / 300.0) * (segment["difficulty"] - 1.0)
        )
    else:
        difficulty_mod = segment["difficulty"]

    # === PART 5: DISTANCE-BASED STAT SCALING ===
    sprint_factor = 1.0
    if race_distance_km < 10:
        accel_weight = 1.0 + ((acceleration - 50.0) / 200.0)
        speed_weight = 1.0 - ((speed - 50.0) / 400.0)
        sprint_factor = accel_weight / speed_weight

    trek_factor = 1.0
    if race_distance_km > 20:
        power_weight = 0.80 + ((power_core - 50.0) / 200.0)
        stability_weight = 0.85 + ((stability - 50.0) / 250.0)
        trek_factor = (power_weight + stability_weight) / 2.0

    # === PART 6: COMBINE ALL MODIFIERS ===
    total_power_mod = (power_universal * power_situational) / power_synergy_mod
    total_accel_mod = accel_universal * accel_situational * momentum_mod
    total_stability_mod = stability_universal * stability_situational

    distance_adjusted_speed = synergistic_speed / (sprint_factor * trek_factor)

    segment_seed = seed % 1000
    random_mod = 0.90 + (segment_seed / 5000.0)

    segment_length = segment["length"]
    effective_speed = distance_adjusted_speed / (
        total_power_mod * total_accel_mod * total_stability_mod * difficulty_mod
    )
    segment_time = (segment_length / effective_speed) * random_mod

    final_time = max(0.1, segment_time / 10.0)

    return final_time, difficulty_mod


# Highway of the Dead track definition
HIGHWAY_SEGMENTS = [
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
]

stats = {"speed": 30, "powerCore": 30, "acceleration": 30, "stability": 30}

# Simulate full race
seed = 0
total_time = 0
previous_difficulty = 1.0
race_distance_km = 6.7

print("\n=== HIGHWAY OF THE DEAD - Full Race Simulation ===")
print(f"Stats: All stats at 30")
print(f"Race distance: {race_distance_km}km")
print("\nSegment times:")

for i, segment in enumerate(HIGHWAY_SEGMENTS):
    segment_time, difficulty = calculate_segment_time(
        segment, seed + i, stats, previous_difficulty, race_distance_km
    )
    total_time += segment_time
    previous_difficulty = difficulty
    print(f"  Segment {i+1}: {segment_time:.4f}s (cumulative: {total_time:.4f}s)")

print(f"\n=== RESULT ===")
print(f"Total race time: {total_time:.2f} seconds")
print(f"\nGo to the simulator, set all stats to 30, select 'Highway of the Dead'")
print(f"and check if this matches the final time shown (should be ~58.1s)!")
