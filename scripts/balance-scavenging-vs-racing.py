#!/usr/bin/env python3
"""
Balance scavenging income to match racing income.
Find equilibrium where both activities are equally rewarding.
"""

print("=" * 80)
print("RACING VS SCAVENGING INCOME BALANCE")
print("=" * 80)

# Racing income benchmarks
print("\n📊 RACING INCOME BENCHMARKS:")
print("\n" + "-" * 80)

racing_scenarios = {
    "Elite Bot (Good Player)": {
        "races_per_day": 3,
        "class": "Elite",
        "entry_fee": 0.25,
        "avg_prize": 0.80,  # ~40% top-3 rate
        "top3_rate": 0.40,
        "maintenance_per_race": 0.029,
    },
    "Raider Bot (Average Player)": {
        "races_per_day": 3,
        "class": "Raider",
        "entry_fee": 0.10,
        "avg_prize": 0.30,
        "top3_rate": 0.35,
        "maintenance_per_race": 0.029,
    },
    "Scavenger Bot (New Player)": {
        "races_per_day": 2,
        "class": "Scavenger",
        "entry_fee": 0.05,
        "avg_prize": 0.15,
        "top3_rate": 0.30,
        "maintenance_per_race": 0.029,
    },
}

print(f"{'Scenario':<30} {'Races/Day':<12} {'Weekly Net':<15} {'Time/Day'}")
print("-" * 80)

racing_incomes = {}
for name, params in racing_scenarios.items():
    races_week = params["races_per_day"] * 7
    prize_income = races_week * params["avg_prize"] * params["top3_rate"]
    entry_costs = races_week * params["entry_fee"]
    maintenance = races_week * params["maintenance_per_race"]
    net = prize_income - entry_costs - maintenance

    racing_incomes[name] = net
    time_per_day = params["races_per_day"] * 15  # 15 min per race

    print(
        f"{name:<30} {params['races_per_day']:<12} {net:>13.2f} ICP  {time_per_day} min"
    )

print("\n💡 TARGET: Match these income levels for comparable time investment")

# Current scavenging
print("\n\n" + "=" * 80)
print("CURRENT SCAVENGING INCOME")
print("=" * 80)

current_scav = {
    "24h WastelandExpedition": {
        "duration": 24,
        "parts_min": 100,
        "parts_max": 200,
        "zone_mult": 2.0,  # DeadMachineFields
        "battery": 80,
        "battery_mult": 1.5,
        "missions_per_week": 7,
    },
    "12h DeepSalvage": {
        "duration": 12,
        "parts_min": 40,
        "parts_max": 80,
        "zone_mult": 1.4,  # AbandonedSettlements
        "battery": 40,
        "battery_mult": 1.2,
        "missions_per_week": 14,
    },
    "6h ShortExpedition": {
        "duration": 6,
        "parts_min": 15,
        "parts_max": 35,
        "zone_mult": 1.0,  # ScrapHeaps
        "battery": 20,
        "battery_mult": 1.0,
        "missions_per_week": 28,
    },
}

PARTS_TO_ICP = 0.01

print(
    f"\n{'Mission':<25} {'Parts/Week':<15} {'ICP Value':<12} {'Battery Cost':<15} {'Net/Week'}"
)
print("-" * 90)

for name, params in current_scav.items():
    avg_parts = (params["parts_min"] + params["parts_max"]) / 2
    parts_week = avg_parts * params["zone_mult"] * params["missions_per_week"]
    icp_value = parts_week * PARTS_TO_ICP

    battery_week = (
        params["battery"] * params["battery_mult"] * params["missions_per_week"]
    )
    recharge_cost = (battery_week / 75) * 0.1

    net = icp_value - recharge_cost

    print(
        f"{name:<25} {parts_week:>13.0f}  {icp_value:>10.2f} ICP  {recharge_cost:>13.2f} ICP  {net:>10.2f} ICP"
    )

print("\n⚠️  PROBLEM: 24h missions earn 20 ICP/week - far exceeds even elite racing!")

# Balanced scavenging
print("\n\n" + "=" * 80)
print("PROPOSED BALANCED SCAVENGING")
print("=" * 80)

print(
    """
DESIGN PHILOSOPHY:
• Scavenging should match racing income for equivalent time investment
• 24h mission (2 clicks/day) ≈ Scavenger race income (~2-4 ICP/week)
• 12h missions (4 clicks/day) ≈ Raider race income (~4-6 ICP/week)  
• 6h missions (8 clicks/day) ≈ Elite race income (~6-8 ICP/week)

TIME INVESTMENT COMPARISON:
• Racing 3x/day: ~45 min/day (active gameplay)
• 24h scavenging: ~2 min/day (2 clicks)
• 12h scavenging: ~4 min/day (4 clicks)
• 6h scavenging: ~8 min/day (8 clicks)

PASSIVE INCOME BONUS:
• Since scavenging requires minimal time, it should earn LESS per bot
• But you can run multiple bots simultaneously
• Trade-off: Less per bot, but more scalable
"""
)

print("\n📊 BALANCED PARAMETERS:")
print("-" * 80)

balanced_scav = {
    "24h WastelandExpedition": {
        "duration": 24,
        "parts_range": "50-90",  # Was 100-200
        "parts_avg": 70,
        "zone_mults": {
            "ScrapHeaps": 1.0,
            "AbandonedSettlements": 1.2,
            "DeadMachineFields": 1.4,  # Was 2.0
        },
        "battery": 80,
        "battery_mults": {
            "ScrapHeaps": 1.0,
            "AbandonedSettlements": 1.2,
            "DeadMachineFields": 1.5,
        },
        "missions_per_week": 7,
    },
    "12h DeepSalvage": {
        "duration": 12,
        "parts_range": "25-50",  # Was 40-80
        "parts_avg": 37.5,
        "zone_mults": {
            "ScrapHeaps": 1.0,
            "AbandonedSettlements": 1.15,  # Was 1.4
            "DeadMachineFields": 1.3,  # Was 1.4
        },
        "battery": 40,
        "battery_mults": {
            "ScrapHeaps": 1.0,
            "AbandonedSettlements": 1.2,
            "DeadMachineFields": 1.5,
        },
        "missions_per_week": 14,
    },
    "6h ShortExpedition": {
        "duration": 6,
        "parts_range": "12-22",  # Was 15-35
        "parts_avg": 17,
        "zone_mults": {
            "ScrapHeaps": 1.0,
            "AbandonedSettlements": 1.1,  # Was 1.4
            "DeadMachineFields": 1.2,  # Was 2.0
        },
        "battery": 20,
        "battery_mults": {
            "ScrapHeaps": 1.0,
            "AbandonedSettlements": 1.2,
            "DeadMachineFields": 1.5,
        },
        "missions_per_week": 28,
    },
}

print(
    f"\n{'Mission Type':<25} {'Zone':<25} {'Parts/Week':<12} {'ICP/Week':<12} {'vs Racing'}"
)
print("-" * 95)

for mission, params in balanced_scav.items():
    for zone, mult in params["zone_mults"].items():
        parts_week = params["parts_avg"] * mult * params["missions_per_week"]
        battery_week = (
            params["battery"]
            * params["battery_mults"][zone]
            * params["missions_per_week"]
        )
        recharge_cost = (battery_week / 75) * 0.1
        net = parts_week * PARTS_TO_ICP - recharge_cost

        # Compare to racing
        if "Wasteland" in mission:
            comparison = "Scavenger"
            racing_net = racing_incomes["Scavenger Bot (New Player)"]
        elif "Deep" in mission:
            comparison = "Raider"
            racing_net = racing_incomes["Raider Bot (Average Player)"]
        else:
            comparison = "Elite"
            racing_net = racing_incomes["Elite Bot (Good Player)"]

        ratio = (net / racing_net * 100) if racing_net > 0 else 0

        print(
            f"{mission:<25} {zone:<25} {parts_week:>10.0f}  {net:>10.2f}  {ratio:>6.1f}% of {comparison}"
        )

print("\n\n" + "=" * 80)
print("INCOME COMPARISON TABLE")
print("=" * 80)

print(f"\n{'Activity':<40} {'Time/Day':<15} {'ICP/Week':<12} {'ICP/Hour'}")
print("-" * 80)

# Racing
print("\n🏁 RACING:")
print(
    f"{'Elite (3 races/day, 40% win rate)':<40} {'45 min':<15} {racing_incomes['Elite Bot (Good Player)']:>10.2f}  {racing_incomes['Elite Bot (Good Player)'] / 5.25:>8.4f}"
)
print(
    f"{'Raider (3 races/day, 35% win rate)':<40} {'45 min':<15} {racing_incomes['Raider Bot (Average Player)']:>10.2f}  {racing_incomes['Raider Bot (Average Player)'] / 5.25:>8.4f}"
)
print(
    f"{'Scavenger (2 races/day, 30% win rate)':<40} {'30 min':<15} {racing_incomes['Scavenger Bot (New Player)']:>10.2f}  {racing_incomes['Scavenger Bot (New Player)'] / 3.5:>8.4f}"
)

# Balanced scavenging
print("\n⛏️  SCAVENGING (BALANCED):")

scav_calcs = {
    "24h DeadMachineFields (dangerous)": {
        "parts": 70 * 1.4 * 7,
        "battery": 80 * 1.5 * 7,
        "time_min": 2,
    },
    "12h AbandonedSettlements (moderate)": {
        "parts": 37.5 * 1.15 * 14,
        "battery": 40 * 1.2 * 14,
        "time_min": 4,
    },
    "6h ScrapHeaps (safe, high frequency)": {
        "parts": 17 * 1.0 * 28,
        "battery": 20 * 1.0 * 28,
        "time_min": 8,
    },
}

for name, calc in scav_calcs.items():
    icp = calc["parts"] * PARTS_TO_ICP - (calc["battery"] / 75) * 0.1
    time_hours = calc["time_min"] / 60 * 7  # per week
    icp_per_hour = icp / time_hours if time_hours > 0 else 0
    print(
        f"{name:<40} {calc['time_min']} min{'':<11} {icp:>10.2f}  {icp_per_hour:>8.4f}"
    )

print("\n\n" + "=" * 80)
print("MULTI-BOT STRATEGIES")
print("=" * 80)

print(
    """
RACING CONSTRAINTS:
• Max 4 race events per day
• Each bot can race 2-4 times per day realistically
• Active time required per race (~15 min)
• Skill-based income (win rate matters)

SCAVENGING CONSTRAINTS:
• Can run multiple bots simultaneously
• Passive income (just set mission)
• No skill requirement (deterministic)
• Limited only by bot count

BALANCED EXAMPLE:
"""
)

print(f"\n{'Strategy':<40} {'Bots':<8} {'Time/Day':<15} {'ICP/Week'}")
print("-" * 75)

# Racing strategies
elite_3races = racing_incomes["Elite Bot (Good Player)"]
print(
    f"{'2 Elite Bots Racing (3x/day each)':<40} {'2':<8} {'90 min':<15} {elite_3races * 2:>10.2f}"
)

raider_3races = racing_incomes["Raider Bot (Average Player)"]
print(
    f"{'3 Raider Bots Racing (3x/day each)':<40} {'3':<8} {'135 min':<15} {raider_3races * 3:>10.2f}"
)

# Balanced scavenging strategies
scav_12h = 37.5 * 1.15 * 14 * PARTS_TO_ICP - (40 * 1.2 * 14 / 75) * 0.1
scav_24h = 70 * 1.4 * 7 * PARTS_TO_ICP - (80 * 1.5 * 7 / 75) * 0.1

print(f"{'5 Bots on 12h Scavenging':<40} {'5':<8} {'20 min':<15} {scav_12h * 5:>10.2f}")
print(f"{'5 Bots on 24h Scavenging':<40} {'5':<8} {'10 min':<15} {scav_24h * 5:>10.2f}")

# Mixed
mixed_racing = elite_3races * 2
mixed_scav = scav_12h * 3
print(
    f"{'2 Elite Racing + 3 Scavenging (12h)':<40} {'5':<8} {'100 min':<15} {mixed_racing + mixed_scav:>10.2f}"
)

print("\n✅ BALANCED: All strategies earn 15-30 ICP/week range")
print("   Racing requires more skill/time, scavenging is passive/scalable")

print("\n\n" + "=" * 80)
print("IMPLEMENTATION CHANGES NEEDED")
print("=" * 80)

print(
    """
📝 UPDATE MISSION PARAMETERS:

WastelandExpedition (24h):
  parts_min: 100 → 50    (-50%)
  parts_max: 200 → 90    (-55%)
  
DeepSalvage (12h):
  parts_min: 40 → 25     (-38%)
  parts_max: 80 → 50     (-38%)
  
ShortExpedition (6h):
  parts_min: 15 → 12     (-20%)
  parts_max: 35 → 22     (-37%)

Zone Multipliers:
  DeadMachineFields:     2.0x → 1.4x parts  (-30%)
  AbandonedSettlements:  1.4x → 1.2x parts  (-14%)
  ScrapHeaps:            1.0x (unchanged)

RATIONALE:
• Maintains scavenging profitability (3-7 ICP/week per bot)
• Aligns with racing income (2-7 ICP/week per bot)
• Preserves zone risk/reward (dangerous zones still better)
• Allows multiple bots to scale passive income
• Creates meaningful choice between active racing vs passive scavenging

EXPECTED PLAYER RESPONSE:
• Pure scavengers: 54 → 18 ICP/week (5 bots, 12h missions)
• Mixed players: Better balance between activities
• Active racers: Competitive advantage restored
• New players: Both paths equally viable
"""
)
