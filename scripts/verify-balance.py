#!/usr/bin/env python3
"""
Comprehensive balance verification script
Tests both rating advantage and bot-type diversity
"""

import pandas as pd
import numpy as np


def verify_rating_advantage():
    """Check if rating advantage achieves target win rates"""
    df = pd.read_csv("scripts/balance-results/balance-results.csv")

    team_data = (
        df.groupby(["team_size", "sim_num", "side"])
        .agg({"rating": "mean", "won": "first"})
        .reset_index()
    )

    matches = team_data.pivot_table(
        index=["team_size", "sim_num"], columns="side", values=["rating", "won"]
    ).reset_index()

    matches.columns = [
        "team_size",
        "sim_num",
        "party_rating",
        "enemy_rating",
        "party_won",
        "enemy_won",
    ]
    matches["higher_rating"] = np.maximum(
        matches["party_rating"], matches["enemy_rating"]
    )
    matches["lower_rating"] = np.minimum(
        matches["party_rating"], matches["enemy_rating"]
    )
    matches["rating_diff"] = matches["higher_rating"] - matches["lower_rating"]
    matches["higher_won"] = np.where(
        matches["party_rating"] > matches["enemy_rating"],
        matches["party_won"],
        matches["enemy_won"],
    )

    print("🎯 RATING ADVANTAGE VERIFICATION")
    print("=" * 70)

    results = []
    for lower, upper, target in [(0, 10, 65), (10, 20, 80), (20, 30, 90)]:
        subset = matches[
            (matches["rating_diff"] >= lower) & (matches["rating_diff"] < upper)
        ]
        if len(subset) > 10:
            wr = subset["higher_won"].mean() * 100
            diff = abs(wr - target)
            status = "✅" if diff < 10 else ("⚠️" if diff < 15 else "❌")
            results.append((status, lower, upper, wr, target, len(subset)))
            print(
                f"{status} {lower:2d}-{upper:2d} levels: {wr:5.1f}% [target: {target}%] (n={len(subset)})"
            )

    all_good = all(r[0] == "✅" for r in results)
    return all_good, results


def verify_bot_type_diversity():
    """Check if bot-type diversity is maintained"""
    bot_summary = pd.read_csv("scripts/balance-results/bot-type-summary.csv")

    total = len(bot_summary)
    healthy = len(
        bot_summary[(bot_summary["win_rate"] >= 35) & (bot_summary["win_rate"] <= 70)]
    )
    pct = 100 * healthy / total

    print("\n📊 BOT-TYPE DIVERSITY VERIFICATION")
    print("=" * 70)
    print(f"Healthy bot types: {healthy}/{total} ({pct:.1f}%)")
    print(f"Target: ≥40% in healthy range (35-70%)")

    status = "✅" if pct >= 40 else ("⚠️" if pct >= 30 else "❌")
    print(f'{status} Bot-type diversity: {"PASS" if pct >= 40 else "NEEDS WORK"}')

    # Show outliers
    outliers = bot_summary[
        (bot_summary["win_rate"] < 35) | (bot_summary["win_rate"] > 70)
    ]
    print(f"\nOutliers: {len(outliers)} bot types")
    if len(outliers) <= 25:
        print("  Too weak (<35%):")
        weak = outliers[outliers["win_rate"] < 35].sort_values("win_rate")
        for _, row in weak.head(10).iterrows():
            print(
                f'    {row["bot_type"]:25s} {row["win_rate"]:5.1f}% (n={int(row["games"]):3d}, avg_rating={row["avg_rating"]:.0f})'
            )

        print("  Too strong (>70%):")
        strong = outliers[outliers["win_rate"] > 70].sort_values(
            "win_rate", ascending=False
        )
        for _, row in strong.head(10).iterrows():
            print(
                f'    {row["bot_type"]:25s} {row["win_rate"]:5.1f}% (n={int(row["games"]):3d}, avg_rating={row["avg_rating"]:.0f})'
            )

    return pct >= 40, pct


def verify_class_balance():
    """Check if classes are reasonably balanced"""
    df = pd.read_csv("scripts/balance-results/balance-results.csv")

    class_stats = (
        df.groupby("class").agg({"won": "mean", "bot_type": "count"}).reset_index()
    )
    class_stats.columns = ["class", "win_rate", "count"]
    class_stats["win_rate"] = class_stats["win_rate"] * 100

    print("\n⚔️  CLASS BALANCE VERIFICATION")
    print("=" * 70)

    all_good = True
    for _, row in class_stats.iterrows():
        wr = row["win_rate"]
        status = "✅" if 40 <= wr <= 60 else ("⚠️" if 35 <= wr <= 65 else "❌")
        if status != "✅":
            all_good = False
        print(f'{status} {row["class"]:10s}: {wr:5.1f}% (n={int(row["count"])})')

    print(f"\nTarget: All classes 40-60% (acceptable: 35-65%)")
    print(
        f'{"✅ PASS" if all_good else "⚠️ ACCEPTABLE" if all(40 <= row.win_rate <= 60 or 35 <= row.win_rate <= 65 for _, row in class_stats.iterrows()) else "❌ FAIL"}'
    )

    return all_good


def verify_monotonic_scaling():
    """Check if rating advantage increases monotonically"""
    df = pd.read_csv("scripts/balance-results/balance-results.csv")

    team_data = (
        df.groupby(["team_size", "sim_num", "side"])
        .agg({"rating": "mean", "won": "first"})
        .reset_index()
    )

    matches = team_data.pivot_table(
        index=["team_size", "sim_num"], columns="side", values=["rating", "won"]
    ).reset_index()

    matches.columns = [
        "team_size",
        "sim_num",
        "party_rating",
        "enemy_rating",
        "party_won",
        "enemy_won",
    ]
    matches["higher_rating"] = np.maximum(
        matches["party_rating"], matches["enemy_rating"]
    )
    matches["lower_rating"] = np.minimum(
        matches["party_rating"], matches["enemy_rating"]
    )
    matches["rating_diff"] = matches["higher_rating"] - matches["lower_rating"]
    matches["higher_won"] = np.where(
        matches["party_rating"] > matches["enemy_rating"],
        matches["party_won"],
        matches["enemy_won"],
    )

    print("\n📈 MONOTONIC SCALING VERIFICATION")
    print("=" * 70)

    win_rates = []
    for lower, upper in [(0, 5), (5, 10), (10, 15), (15, 20), (20, 25), (25, 30)]:
        subset = matches[
            (matches["rating_diff"] >= lower) & (matches["rating_diff"] < upper)
        ]
        if len(subset) > 5:
            wr = subset["higher_won"].mean() * 100
            win_rates.append((lower, upper, wr, len(subset)))
            print(f"{lower:2d}-{upper:2d} levels: {wr:5.1f}% (n={len(subset):3d})")

    # Check if mostly increasing (allow small dips due to variance)
    dips = 0
    for i in range(1, len(win_rates)):
        if win_rates[i][2] < win_rates[i - 1][2] - 5:  # Allow 5% variance
            dips += 1

    status = "✅" if dips == 0 else ("⚠️" if dips <= 1 else "❌")
    print(
        f'\n{status} Monotonic scaling: {"PASS" if dips == 0 else f"{dips} significant dips"}'
    )

    return dips <= 1


def main():
    print("\n" + "=" * 70)
    print("POKEDBOTS BRAWL - BALANCE VERIFICATION REPORT")
    print("=" * 70 + "\n")

    try:
        rating_good, rating_results = verify_rating_advantage()
        diversity_good, diversity_pct = verify_bot_type_diversity()
        class_good = verify_class_balance()
        monotonic_good = verify_monotonic_scaling()

        print("\n" + "=" * 70)
        print("FINAL VERDICT")
        print("=" * 70)

        all_pass = rating_good and diversity_good and class_good and monotonic_good

        if all_pass:
            print("✅ ALL CHECKS PASSED - Balance is production-ready!")
        else:
            print("⚠️  SOME CHECKS NEED ATTENTION:")
            if not rating_good:
                print("  - Rating advantage targets not all met")
            if not diversity_good:
                print(f"  - Bot-type diversity at {diversity_pct:.1f}% (target: ≥40%)")
            if not class_good:
                print("  - Class balance needs adjustment")
            if not monotonic_good:
                print("  - Rating scaling not fully monotonic")

        print("\n💡 RECOMMENDATIONS:")
        if diversity_pct < 40:
            print("  - Bot-type diversity is low due to rating dominance")
            print("  - This is expected in NFT games (rarity matters)")
            print("  - Consider tier-based matchmaking to increase diversity")

        if not rating_good:
            print("  - Rating advantage slightly too strong at low levels")
            print("  - Could reduce stat scaling multipliers by ~10%")

        print("\n📊 SYSTEM STATUS:")
        print(
            f'  Rating advantage: {"✅ Working" if rating_good else "⚠️ Needs tuning"}'
        )
        print(
            f'  Bot diversity: {"✅ Good" if diversity_pct >= 40 else f"⚠️ Limited ({diversity_pct:.0f}%)"}'
        )
        print(f'  Class balance: {"✅ Balanced" if class_good else "⚠️ Some imbalance"}')
        print(f'  Scaling: {"✅ Monotonic" if monotonic_good else "⚠️ Minor variance"}')

    except FileNotFoundError as e:
        print(f"❌ Error: Could not find balance results files")
        print(f"   Run: python scripts/combat-balance-analyzer.py")
        print(f"   {e}")
        return 1

    return 0 if all_pass else 1


if __name__ == "__main__":
    exit(main())
