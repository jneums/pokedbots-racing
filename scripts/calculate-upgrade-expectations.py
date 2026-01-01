#!/usr/bin/env python3
"""
Calculate expected attempts, time, and cost to achieve 9 successful upgrades
with the current V2 upgrade system.

System mechanics:
- Success rate: 85% (attempt 1) → 15% (attempt 15) → 1% (attempt 15+)
- Formula: 85 - (attemptNumber * 5.6) (capped at 1%)
- Pity system: +5% per consecutive fail (max +25%)
- 50% refund on failure
- 12 hours per attempt
- Cost formula: 0.5 + (currentStat/40)² × premiumMultiplier
"""

import math


# Success rate calculation
def calculate_base_success_rate(attempt_number):
    """Calculate base success rate without pity."""
    if attempt_number <= 15:
        base_rate = 85.0 - (attempt_number * 5.6)
        return max(1.0, base_rate)
    else:
        return 1.0


def calculate_pity_bonus(consecutive_fails):
    """Calculate pity bonus: +5% per fail, max +25%."""
    if consecutive_fails == 0:
        return 0.0
    return min(consecutive_fails * 5.0, 25.0)


def calculate_success_rate(attempt_number, consecutive_fails):
    """Calculate total success rate with pity."""
    base_rate = calculate_base_success_rate(attempt_number)
    pity_bonus = calculate_pity_bonus(consecutive_fails)
    return min(base_rate + pity_bonus, 100.0)


# Cost calculation (for a bot starting at rating 40)
def calculate_upgrade_cost(current_stat, rating=40):
    """
    Calculate upgrade cost in ICP.
    Assumes rating 40 bot (Elite tier, premium ~1.0x).
    """
    base_icp = 0.5 + (current_stat / 40.0) ** 2.0
    # Rating 40 = premium ~1.0x (approximate)
    # For Rating 40-49 range, premium is roughly 1.0x - 1.5x
    # We'll use 1.0x for simplicity
    premium_multiplier = 1.0
    return base_icp * premium_multiplier


def simulate_upgrades_to_target(target_successes=9, starting_stat=40):
    """
    Calculate EXPECTED attempts using proper probability math.
    For each success needed, calculate expected attempts based on success rate.
    Returns dict with statistics.
    """
    total_expected_attempts = 0.0
    total_cost_icp = 0.0
    current_stat = starting_stat

    attempt_log = []

    for success_num in range(target_successes):
        # For this success, we need to model expected attempts accounting for failures
        # Expected attempts to get one success = 1 / success_rate
        # But we need to account for pity building up

        # Start with no pity
        consecutive_fails = 0
        success_rate = calculate_success_rate(success_num, consecutive_fails)
        cost = calculate_upgrade_cost(current_stat)

        # Calculate expected attempts for this success
        # This is a geometric distribution problem
        expected_attempts_for_this_success = 0.0
        expected_cost_for_this_success = 0.0
        cumulative_prob = 0.0

        for attempt in range(
            1, 100
        ):  # Cap at 100 attempts (should be way more than enough)
            # Probability of succeeding on exactly this attempt
            # = (fail ^ (attempt-1)) * success
            fail_rate = 1.0 - (success_rate / 100.0)

            # Recalculate pity for each potential attempt
            pity_for_attempt = min((attempt - 1), 5)  # Fails so far, capped at 5
            actual_success_rate = calculate_success_rate(success_num, pity_for_attempt)
            actual_success_prob = actual_success_rate / 100.0

            # Probability of failing (attempt-1) times, then succeeding
            prob_this_attempt = (fail_rate ** (attempt - 1)) * actual_success_prob

            cumulative_prob += prob_this_attempt
            expected_attempts_for_this_success += attempt * prob_this_attempt

            # Cost accounting for 50% refund on failures
            cost_this_scenario = cost * (
                (attempt - 1) * 0.5 + 1.0
            )  # Failures get 50% back, success pays full
            expected_cost_for_this_success += cost_this_scenario * prob_this_attempt

            # Early exit if we've covered 99.9% of probability space
            if cumulative_prob > 0.999:
                break

        total_expected_attempts += expected_attempts_for_this_success
        total_cost_icp += expected_cost_for_this_success

        attempt_log.append(
            {
                "success_number": success_num + 1,
                "current_stat": current_stat,
                "base_success_rate": success_rate,
                "expected_attempts": expected_attempts_for_this_success,
                "expected_cost": expected_cost_for_this_success,
            }
        )

        current_stat += 1

    # Calculate time (12 hours per attempt)
    total_hours = total_expected_attempts * 12
    total_days = total_hours / 24

    return {
        "target_successes": target_successes,
        "starting_stat": starting_stat,
        "final_stat": current_stat,
        "total_attempts": round(total_expected_attempts),
        "total_hours": total_hours,
        "total_days": total_days,
        "total_cost_icp": total_cost_icp,
        "attempt_log": attempt_log,
    }


def monte_carlo_simulation(target_successes=9, starting_stat=40, num_simulations=10000):
    """
    Run Monte Carlo simulation to get realistic distribution of outcomes.
    """
    import random

    results = []

    for _ in range(num_simulations):
        attempts = 0
        successes = 0
        consecutive_fails = 0
        total_cost = 0.0
        current_stat = starting_stat

        while successes < target_successes:
            attempts += 1

            # Calculate success rate
            success_rate = calculate_success_rate(successes, consecutive_fails)

            # Calculate cost
            cost = calculate_upgrade_cost(current_stat)

            # Roll for success
            roll = random.random() * 100
            is_success = roll < success_rate

            if is_success:
                # Success
                total_cost += cost
                successes += 1
                current_stat += 1
                consecutive_fails = 0
            else:
                # Failure - 50% refund
                total_cost += cost * 0.5
                consecutive_fails += 1

        results.append(
            {
                "attempts": attempts,
                "cost": total_cost,
                "hours": attempts * 12,
            }
        )

    return results


def print_results():
    """Print comprehensive analysis."""
    print("=" * 80)
    print("UPGRADE SYSTEM V2 - EXPECTED VALUES ANALYSIS")
    print("=" * 80)
    print()

    # Scenario: Rating 40 bot trying to reach Rating 49 (9 successful upgrades)
    print("📊 SCENARIO: Upgrading a single stat from 40 → 49 (9 successful upgrades)")
    print("   Assumes Rating 40 bot (Elite tier, ~1.0x premium multiplier)")
    print()

    # Show success rate progression
    print("SUCCESS RATE BY ATTEMPT NUMBER:")
    print("-" * 80)
    print(f"{'Attempt':<10} {'Base Rate':<12} {'With +25% Pity':<18} {'Notes'}")
    print("-" * 80)

    for i in range(1, 16):
        base = calculate_base_success_rate(i - 1)
        with_pity = calculate_success_rate(i - 1, 5)
        notes = ""
        if i == 1:
            notes = "First upgrade"
        elif i == 15:
            notes = "Last high-rate upgrade"

        print(f"{i:<10} {base:.1f}%{' ' * 7} {with_pity:.1f}%{' ' * 13} {notes}")

    print(f"{'16+':<10} {'1.0%':<12} {'26.0%':<18} Brutal soft cap")
    print()

    # Expected value analysis
    print("=" * 80)
    print("EXPECTED VALUE ANALYSIS (Mathematical)")
    print("=" * 80)
    print()

    result = simulate_upgrades_to_target(9, 40)

    print(f"Starting Stat:         {result['starting_stat']}")
    print(f"Target Successes:      {result['target_successes']}")
    print(f"Final Stat:            {result['final_stat']}")
    print(f"Expected Attempts:     {result['total_attempts']}")
    print(
        f"Expected Time:         {result['total_hours']:.0f} hours ({result['total_days']:.1f} days)"
    )
    print(f"Expected Cost:         {result['total_cost_icp']:.2f} ICP")
    print()

    # Show attempt breakdown
    print("SUCCESS-BY-SUCCESS BREAKDOWN:")
    print("-" * 80)
    print(
        f"{'Success #':<12} {'Stat':<8} {'Base Rate':<12} {'Exp. Attempts':<16} {'Exp. Cost'}"
    )
    print("-" * 80)

    for log in result["attempt_log"]:
        print(
            f"{log['success_number']:<12} {log['current_stat']:<8} "
            f"{log['base_success_rate']:.1f}%{' ' * 7} {log['expected_attempts']:.2f}{' ' * 11} "
            f"{log['expected_cost']:.3f} ICP"
        )

    print()

    # Monte Carlo simulation
    print("=" * 80)
    print("MONTE CARLO SIMULATION (10,000 runs)")
    print("=" * 80)
    print()
    print("Running simulation...")

    mc_results = monte_carlo_simulation(9, 40, 10000)

    attempts = [r["attempts"] for r in mc_results]
    costs = [r["cost"] for r in mc_results]
    hours = [r["hours"] for r in mc_results]

    # Calculate statistics
    avg_attempts = sum(attempts) / len(attempts)
    median_attempts = sorted(attempts)[len(attempts) // 2]
    min_attempts = min(attempts)
    max_attempts = max(attempts)

    avg_cost = sum(costs) / len(costs)
    median_cost = sorted(costs)[len(costs) // 2]
    min_cost = min(costs)
    max_cost = max(costs)

    avg_hours = sum(hours) / len(hours)
    avg_days = avg_hours / 24

    # Percentiles
    sorted_attempts = sorted(attempts)
    p25_attempts = sorted_attempts[int(len(attempts) * 0.25)]
    p75_attempts = sorted_attempts[int(len(attempts) * 0.75)]
    p90_attempts = sorted_attempts[int(len(attempts) * 0.90)]

    sorted_costs = sorted(costs)
    p25_cost = sorted_costs[int(len(costs) * 0.25)]
    p75_cost = sorted_costs[int(len(costs) * 0.75)]
    p90_cost = sorted_costs[int(len(costs) * 0.90)]

    print(f"ATTEMPTS:")
    print(f"  Average:       {avg_attempts:.1f}")
    print(f"  Median:        {median_attempts}")
    print(f"  Min:           {min_attempts}")
    print(f"  Max:           {max_attempts}")
    print(f"  25th %ile:     {p25_attempts}")
    print(f"  75th %ile:     {p75_attempts}")
    print(f"  90th %ile:     {p90_attempts}")
    print()

    print(f"COST (ICP):")
    print(f"  Average:       {avg_cost:.2f}")
    print(f"  Median:        {median_cost:.2f}")
    print(f"  Min:           {min_cost:.2f}")
    print(f"  Max:           {max_cost:.2f}")
    print(f"  25th %ile:     {p25_cost:.2f}")
    print(f"  75th %ile:     {p75_cost:.2f}")
    print(f"  90th %ile:     {p90_cost:.2f}")
    print()

    print(f"TIME:")
    print(f"  Average:       {avg_hours:.0f} hours ({avg_days:.1f} days)")
    print(f"  With back-to-back upgrades (no delays)")
    print()

    # Distribution visualization
    print("ATTEMPTS DISTRIBUTION:")
    print("-" * 80)

    from collections import Counter

    attempt_counts = Counter(attempts)
    max_count = max(attempt_counts.values())

    for attempt in range(min_attempts, min(max_attempts + 1, 30)):
        count = attempt_counts.get(attempt, 0)
        bar_length = int((count / max_count) * 50)
        percentage = (count / len(attempts)) * 100
        bar = "█" * bar_length
        print(f"{attempt:3d} attempts | {bar:<50} {percentage:5.1f}%")

    if max_attempts > 30:
        print(f"... (some runs took up to {max_attempts} attempts)")

    print()

    # Key findings
    print("=" * 80)
    print("🎯 KEY FINDINGS")
    print("=" * 80)
    print()
    print(f"To achieve 9 successful upgrades (40 → 49 in one stat):")
    print()
    print(
        f"  • Average: {avg_attempts:.0f} attempts = {avg_days:.1f} days = {avg_cost:.2f} ICP"
    )
    print(
        f"  • Median:  {median_attempts} attempts = {median_attempts * 12 / 24:.1f} days = {median_cost:.2f} ICP"
    )
    print(
        f"  • 75% of players will finish within {p75_attempts} attempts ({p75_attempts * 12 / 24:.1f} days, {p75_cost:.2f} ICP)"
    )
    print(
        f"  • 10% of unlucky players need {p90_attempts}+ attempts ({p90_attempts * 12 / 24:.1f}+ days, {p90_cost:.2f}+ ICP)"
    )
    print()
    print("⚠️  CURRENT SYSTEM ASSESSMENT:")
    print()
    print(f"  • Taking a bot from Rating 40 → 49 requires upgrading ALL 4 stats")
    print(f"  • 4 stats × 9 upgrades = 36 total successful upgrades needed")
    print(
        f"  • 4 stats × {avg_attempts:.0f} attempts = ~{avg_attempts * 4:.0f} total attempts"
    )
    print(f"  • 4 stats × {avg_cost:.2f} ICP = ~{avg_cost * 4:.2f} ICP total cost")
    print(
        f"  • Total time: ~{avg_days * 4:.0f} days ({avg_days * 4 / 30:.1f} months) with perfect scheduling"
    )
    print()
    print("💡 CONCLUSION:")
    print()
    print(
        f"  The current system (85% → 1% over 15 attempts) makes it extremely difficult"
    )
    print(
        f"  and expensive to reach Rating 49 from Rating 40. The soft cap at attempt 16"
    )
    print(f"  (1% success rate) creates a brutal grind that may discourage players.")
    print()


if __name__ == "__main__":
    print_results()
