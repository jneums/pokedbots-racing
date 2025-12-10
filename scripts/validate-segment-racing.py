#!/usr/bin/env python3
"""
Validate segment-based racing system by comparing against original race results.
Runs multiple simulations with different seeds and averages the results.
"""

import subprocess
import json
import sys
from collections import defaultdict
from statistics import mean, stdev


def run_dfx_command(method, args):
    """Run a dfx canister call command and return the result."""
    cmd = ["dfx", "canister", "call", "pokedbots_racing", method, args, "--ic"]

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            cwd="/home/jesse/pokedbots-racing",
        )
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        print(f"stderr: {e.stderr}")
        return None


def parse_candid_result(output):
    """Parse Candid output to extract race results."""
    # This is a simplified parser - you may need to adjust based on actual output format
    results = []

    # Extract position, nftId, and finalTime from each result record
    lines = output.split("\n")
    current_result = {}

    for line in lines:
        line = line.strip()

        if "tokenIndex =" in line or "nftId =" in line:
            # Extract the ID
            parts = line.split("=")
            if len(parts) >= 2:
                id_str = parts[1].strip().rstrip(";").strip('"')
                current_result["id"] = id_str

        elif "finalTime =" in line:
            # Extract the time
            parts = line.split("=")
            if len(parts) >= 2:
                time_str = parts[1].strip().rstrip(";")
                try:
                    current_result["time"] = float(time_str.split(":")[0].strip())
                except:
                    current_result["time"] = 999999.0

        elif "position =" in line:
            # Extract position
            parts = line.split("=")
            if len(parts) >= 2:
                pos_str = parts[1].strip().rstrip(";")
                try:
                    current_result["position"] = int(pos_str.split(":")[0].strip())
                except:
                    pass

            # When we hit position, the record is complete
            if "id" in current_result and "time" in current_result:
                results.append(current_result.copy())
                current_result = {}

    return results


def simulate_race(track_id, participants, seed):
    """Simulate a race with given parameters."""
    participants_str = "vec { " + "; ".join(str(p) for p in participants) + " }"
    args = f"({track_id}, {participants_str}, {seed})"

    output = run_dfx_command("debug_simulate_race", args)
    if not output:
        return None

    return parse_candid_result(output)


def get_completed_races(limit=3):
    """Fetch completed races from the canister."""
    args = f"({limit})"
    output = run_dfx_command("get_completed_races", args)

    if not output:
        return []

    # Parse the race information
    races = []
    lines = output.split("\n")

    current_race = {}
    current_results = []
    in_results = False

    for line in lines:
        line = line.strip()

        if "raceId =" in line:
            if current_race and "raceId" in current_race:
                current_race["original_results"] = current_results.copy()
                races.append(current_race.copy())
            current_race = {}
            current_results = []
            in_results = False

            parts = line.split("=")
            if len(parts) >= 2:
                try:
                    current_race["raceId"] = int(
                        parts[1].strip().rstrip(";").split(":")[0].strip()
                    )
                except:
                    pass

        elif "trackId =" in line:
            parts = line.split("=")
            if len(parts) >= 2:
                try:
                    current_race["trackId"] = int(
                        parts[1].strip().rstrip(";").split(":")[0].strip()
                    )
                except:
                    pass

        elif "trackSeed =" in line:
            parts = line.split("=")
            if len(parts) >= 2:
                try:
                    current_race["trackSeed"] = int(
                        parts[1]
                        .strip()
                        .rstrip(";")
                        .split(":")[0]
                        .strip()
                        .replace("_", "")
                    )
                except:
                    pass

        elif "name =" in line and "raceId" in current_race:
            parts = line.split("=")
            if len(parts) >= 2:
                current_race["name"] = parts[1].strip().rstrip(";").strip('"')

        elif "results = opt vec {" in line:
            in_results = True

        elif in_results and "nftId =" in line:
            result = {}
            parts = line.split("=")
            if len(parts) >= 2:
                result["id"] = parts[1].strip().rstrip(";").strip('"')
                current_results.append(result)

        elif in_results and "finalTime =" in line and current_results:
            parts = line.split("=")
            if len(parts) >= 2:
                try:
                    current_results[-1]["time"] = float(
                        parts[1].strip().rstrip(";").split(":")[0].strip()
                    )
                except:
                    current_results[-1]["time"] = 999999.0

        elif in_results and "position =" in line and current_results:
            parts = line.split("=")
            if len(parts) >= 2:
                try:
                    current_results[-1]["position"] = int(
                        parts[1].strip().rstrip(";").split(":")[0].strip()
                    )
                except:
                    pass

    # Add the last race
    if current_race and "raceId" in current_race:
        current_race["original_results"] = current_results.copy()
        races.append(current_race)

    return races


def main():
    print("=" * 80)
    print("Segment-Based Racing Validation Script")
    print("=" * 80)
    print()

    # Fetch the last 3 completed races
    print("Fetching last 3 completed races...")
    races = get_completed_races(3)

    if not races:
        print("Error: Could not fetch races")
        sys.exit(1)

    print(f"Found {len(races)} races to validate")
    print()

    # For each race, run 10 simulations with different seeds
    # Use prime numbers to avoid modulo patterns
    num_seeds = 10
    seeds_to_test = [
        7919,
        15731,
        23857,
        31963,
        40009,
        50021,
        60013,
        70001,
        80021,
        90001,
    ]

    for race in races:
        race_id = race.get("raceId", "Unknown")
        race_name = race.get("name", "Unknown")
        track_id = race.get("trackId", 0)

        print("=" * 80)
        print(f"Race #{race_id}: {race_name}")
        print(f"Track ID: {track_id}")
        print("=" * 80)

        # Extract participants from original results
        original_results = race.get("original_results", [])
        if not original_results:
            print("No original results found, skipping...")
            continue

        participants = [r["id"] for r in original_results]
        print(f"Participants: {len(participants)} bots")
        print()

        # Print original results
        print("ORIGINAL RESULTS:")
        print(f"{'Pos':<5} {'Bot ID':<10} {'Time (s)':<15}")
        print("-" * 35)
        for r in sorted(original_results, key=lambda x: x.get("position", 999)):
            pos = r.get("position", "?")
            bot_id = r.get("id", "?")
            time = r.get("time", 0)
            time_str = f"{time:.2f}" if time < 999999 else "DNF"
            print(f"{pos:<5} {bot_id:<10} {time_str:<15}")
        print()

        # Run simulations with different seeds
        print(f"Running {num_seeds} simulations with different seeds...")
        all_simulations = []

        for i in range(num_seeds):
            seed = seeds_to_test[i]
            print(f"  Seed {seed}...", end="", flush=True)

            results = simulate_race(track_id, participants, seed)
            if results:
                all_simulations.append(results)
                # Debug: print first bot's time to verify variance
                if results and len(results) > 0:
                    print(f" ✓ (first bot: {results[0].get('time', 0):.2f}s)")
                else:
                    print(" ✓")
            else:
                print(" ✗")

        if not all_simulations:
            print("Error: No successful simulations")
            continue

        print()
        print(f"AVERAGED RESULTS (from {len(all_simulations)} simulations):")

        # Calculate average times and positions for each bot
        bot_stats = defaultdict(lambda: {"times": [], "positions": []})

        for sim in all_simulations:
            for result in sim:
                bot_id = result.get("id", "?")
                time = result.get("time", 999999.0)
                pos = result.get("position", 999)

                bot_stats[bot_id]["times"].append(time)
                bot_stats[bot_id]["positions"].append(pos)

        # Calculate averages and sort by average position
        averaged_results = []
        for bot_id, stats in bot_stats.items():
            avg_time = mean(stats["times"]) if stats["times"] else 999999.0
            avg_pos = mean(stats["positions"]) if stats["positions"] else 999
            time_std = stdev(stats["times"]) if len(stats["times"]) > 1 else 0
            pos_std = stdev(stats["positions"]) if len(stats["positions"]) > 1 else 0

            averaged_results.append(
                {
                    "id": bot_id,
                    "avg_time": avg_time,
                    "avg_position": avg_pos,
                    "time_std": time_std,
                    "pos_std": pos_std,
                }
            )

        averaged_results.sort(key=lambda x: x["avg_position"])

        print(f"{'Avg Pos':<10} {'Bot ID':<10} {'Avg Time (s)':<20} {'Pos StdDev':<12}")
        print("-" * 60)
        for r in averaged_results:
            bot_id = r["id"]
            avg_pos = r["avg_position"]
            avg_time = r["avg_time"]
            time_std = r["time_std"]
            pos_std = r["pos_std"]

            time_str = (
                f"{avg_time:.2f} ± {time_std:.2f}" if avg_time < 999999 else "DNF"
            )
            print(f"{avg_pos:<10.1f} {bot_id:<10} {time_str:<20} ±{pos_std:.2f}")

        print()

        # Compare with original
        print("COMPARISON WITH ORIGINAL:")
        original_by_id = {r["id"]: r for r in original_results}
        averaged_by_id = {r["id"]: r for r in averaged_results}

        position_correlation = []
        winner_match = False

        for bot_id in participants:
            orig = original_by_id.get(bot_id, {})
            avg = averaged_by_id.get(bot_id, {})

            orig_pos = orig.get("position", 999)
            avg_pos = avg.get("avg_position", 999)

            if orig_pos != 999 and avg_pos != 999:
                position_correlation.append(abs(orig_pos - avg_pos))

            # Check if winner matches
            if orig_pos == 1 and avg_pos <= 1.5:  # Allow some variance
                winner_match = True

        avg_position_diff = mean(position_correlation) if position_correlation else 0

        print(f"✓ Winner preserved: {'YES' if winner_match else 'NO'}")
        print(f"✓ Average position difference: {avg_position_diff:.2f} positions")
        print(f"✓ Simulations completed: {len(all_simulations)}/{num_seeds}")
        print()

    print("=" * 80)
    print("Validation Complete!")
    print("=" * 80)


if __name__ == "__main__":
    main()
