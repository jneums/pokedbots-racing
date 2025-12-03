#!/usr/bin/env python3
"""
Debug seed generation to find the determinism bug
"""


def test_seed_generation():
    """Test if seeds actually change between races"""

    print("🔍 SEED GENERATION DEBUG")
    print("=" * 80)

    # Test Case 1: Same race config, different start times
    print("\nTest 1: Same race_id, different start_times")
    print("-" * 80)

    race_id = 1000
    participant_index = 0

    for i in range(5):
        start_time = i * 3_600_000_000_000  # Different times

        # Simulate seed calculation
        race_time_seed = abs(start_time // 1_000_000_000)
        combined_seed = race_id + race_time_seed
        seed = combined_seed * 1000 + participant_index

        # Calculate modifiers
        race_chaos_seed = (race_id * 7919) % 1000
        race_chaos = 0.90 + (float(race_chaos_seed) / 5000.0)

        bot_random_seed = (seed * 2971) % 1000
        bot_random = 0.85 + (float(bot_random_seed) / 3333.0)

        position_seed = (seed * 4993) % 100
        position_bonus = 0.97 + (float(position_seed) / 3333.0)

        total_variance = race_chaos * bot_random * position_bonus

        print(f"  Race {i}: start_time={start_time}")
        print(
            f"    race_time_seed={race_time_seed}, combined_seed={combined_seed}, final_seed={seed}"
        )
        print(
            f"    race_chaos={race_chaos:.4f}, bot_random={bot_random:.4f}, position={position_bonus:.4f}"
        )
        print(
            f"    TOTAL VARIANCE: {total_variance:.4f} ({(total_variance-1)*100:+.1f}%)"
        )
        print()

    # Test Case 2: Check if race_chaos changes with race_id
    print("\nTest 2: Different race_ids (race_chaos should vary)")
    print("-" * 80)

    for race_id in [1000, 2000, 3000, 4000, 5000]:
        race_chaos_seed = (race_id * 7919) % 1000
        race_chaos = 0.90 + (float(race_chaos_seed) / 5000.0)
        print(
            f"  race_id={race_id}: chaos_seed={race_chaos_seed}, race_chaos={race_chaos:.4f}"
        )

    # Test Case 3: Bot position variance
    print("\nTest 3: Same race, different bot positions")
    print("-" * 80)

    race_id = 1000
    start_time = 0
    race_time_seed = abs(start_time // 1_000_000_000)
    combined_seed = race_id + race_time_seed

    for participant_index in range(4):
        seed = combined_seed * 1000 + participant_index

        bot_random_seed = (seed * 2971) % 1000
        bot_random = 0.85 + (float(bot_random_seed) / 3333.0)

        position_seed = (seed * 4993) % 100
        position_bonus = 0.97 + (float(position_seed) / 3333.0)

        print(f"  Bot {participant_index}: seed={seed}")
        print(f"    bot_random={bot_random:.4f}, position_bonus={position_bonus:.4f}")

    # Test Case 4: THE BUG - What happens with same total stats?
    print("\nTest 4: Two bots with identical total stats in same race")
    print("-" * 80)

    race_id = 1000
    distance = 15
    terrain = "WastelandSand"
    start_time = 0

    # Bot 1: 48+54+41+44 = 187
    bot1_stats = {"speed": 48, "powerCore": 54, "acceleration": 41, "stability": 44}
    # Bot 2: 42+60+40+45 = 187 (same total, different distribution)
    bot2_stats = {"speed": 42, "powerCore": 60, "acceleration": 40, "stability": 45}

    race_time_seed = abs(start_time // 1_000_000_000)
    combined_seed = race_id + race_time_seed

    for idx, (name, stats) in enumerate([("Bot1", bot1_stats), ("Bot2", bot2_stats)]):
        seed = combined_seed * 1000 + idx

        # Base time
        speed = float(stats["speed"])
        base_time = distance * (100.0 / speed) * 30.0

        # Terrain (WastelandSand uses powerCore)
        power_core = float(stats["powerCore"])
        terrain_mod = 1.0 + ((100.0 - power_core) / 200.0)

        # Distance (15km = medium, uses all stats)
        distance_mod = 1.0 - (
            (speed + power_core + stats["acceleration"] + stats["stability"] - 160.0)
            / 700.0
        )

        # Random mods
        race_chaos_seed = (race_id * 7919) % 1000
        race_chaos = 0.90 + (float(race_chaos_seed) / 5000.0)

        bot_random_seed = (seed * 2971) % 1000
        bot_random = 0.85 + (float(bot_random_seed) / 3333.0)

        position_seed = (seed * 4993) % 100
        position_bonus = 0.97 + (float(position_seed) / 3333.0)

        final_time = (
            base_time
            * terrain_mod
            * distance_mod
            * race_chaos
            * bot_random
            * position_bonus
        )

        print(f"\n  {name} (Total: {sum(stats.values())})")
        print(
            f"    Stats: S:{stats['speed']} P:{stats['powerCore']} A:{stats['acceleration']} St:{stats['stability']}"
        )
        print(f"    base_time={base_time:.2f}")
        print(
            f"    terrain_mod={terrain_mod:.4f} (WastelandSand, powerCore={power_core})"
        )
        print(f"    distance_mod={distance_mod:.4f}")
        print(
            f"    race_chaos={race_chaos:.4f}, bot_random={bot_random:.4f}, position={position_bonus:.4f}"
        )
        print(f"    FINAL TIME: {final_time:.2f}s")

    print("\n" + "=" * 80)
    print("🔍 Key Finding:")
    print("   - race_chaos is SAME for all bots in a race (depends only on race_id)")
    print("   - bot_random varies by position index, not by bot stats")
    print("   - With same race_id and start_time=0, Bot1 ALWAYS has same random mods")
    print("   - The 'randomness' is deterministic and reproducible!")


if __name__ == "__main__":
    test_seed_generation()
