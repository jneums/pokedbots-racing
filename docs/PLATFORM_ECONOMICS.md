---
title: Platform Economics & Sustainability
description: Comprehensive analysis of platform revenue streams, cost structure, break-even points, and long-term financial sustainability
category: Platform Operations
audience: Platform Operators, Investors, Financial Analysts
last_updated: 2025-11-21
status: Active
related_docs:
  - IMPLEMENTATION_GUIDE.md
  - RACING_CALENDAR_DESIGN.md
  - full-system-demo-and-recommendations.md
---

# PokedBots Racing - Platform Economics & Sustainability

## Overview

This document analyzes the platform's economic model, revenue streams, cost structure, and long-term sustainability. It's designed for platform operators and investors to understand the business model.

---

## Revenue Streams

### 1. Race Entry Tax (5%)
The platform takes 5% of all race entry fees before distributing the prize pool.

**Example:**
- 8 racers × 0.2 ICP entry = 1.6 ICP total
- Platform tax: 1.6 × 5% = **0.08 ICP**
- Prize pool: 1.6 - 0.08 = 1.52 ICP

### 2. Upgrade Fees
Players pay ICP for bot upgrades when not using scrap parts.

**Pricing:**
- 1 part = 3.33 ICP (production) / 0.033 ICP (testing)
- Progressive costs: 3→5→8→12→18→25 parts per upgrade
- Upgrade costs: 10 ICP → 17 ICP → 27 ICP → 40 ICP → 60 ICP

**Revenue per bot:**
- Average player: 2-3 upgrades = **30-50 ICP** over bot lifetime
- Competitive player: 4-5 upgrades = **90-150 ICP**

### 3. Maintenance Services
- **Recharge:** 0.1 ICP (restores +20 condition, +10 battery, 6hr cooldown)
- **Repair:** 0.05 ICP (restores +10 condition only, 12hr cooldown)

**Usage patterns:**
- Casual racer: 4 recharges/month = **0.4 ICP/month**
- Active racer: 8-12 recharges/month = **0.8-1.2 ICP/month**

**Revenue estimate (50 active players):**
- Average: 50 players × 6 recharges/month × 0.1 = **30 ICP/month**

---

## Cost Structure

### Platform Bonuses (Phase 1 - Treasury Funded)

**Daily Sprint Bonuses:**
- 4 events/day × 2 bonus classes (Scavenger/Raider) = 8 races
- 8 × 0.5 ICP = **4 ICP/day** = **120 ICP/month**

**Weekly League Bonuses:**
- 4 events/month × 2 bonus classes = 8 races
- 8 × 2 ICP = **16 ICP/month**

**Monthly Cup Bonuses:**
- 1 event/month × 2 races (Elite/SilentKlan)
- 2 × 5 ICP = **10 ICP/month**

**Total Bonus Cost: 146 ICP/month**

### Infrastructure Costs
- IC canister cycles (compute/storage)
- Timer execution costs
- Data storage (race results, leaderboards)
- **Estimated: 5-20 ICP/month** depending on usage

### Total Monthly Costs: ~150-170 ICP

---

## Revenue Analysis

### Current Scheduled Race Volume

**Daily Races:**
- 4 Daily Sprint events × 3 classes = 12 races/day
- 1 Weekly League/week × 4 classes = 0.57 races/day
- 1 Monthly Cup/month = 0.07 races/day
- **Total: ~12.6 races/day**

**Assuming 8 racers per race:**

**Daily Tax Revenue:**
- 4 Scavenger (0.05): 1.6 ICP entries → 0.08 ICP tax
- 4 Raider (0.1): 3.2 ICP → 0.16 ICP tax
- 4 Elite (0.25): 8 ICP → 0.40 ICP tax
- Weekly races distributed: ~0.15 ICP tax
- **Daily: ~0.8 ICP** = **24 ICP/month**

**Monthly Upgrade Revenue (assuming 50 active players):**
- 25% buy 1 upgrade = 12 players × 10 ICP = **120 ICP**
- 10% buy 2-3 upgrades = 5 players × 30 ICP = **150 ICP**
- **Total: ~270 ICP/month**

**Monthly Maintenance Revenue:**
- 50 players × avg 6 recharges × 0.1 ICP = **30 ICP/month**

### Current Economics Summary

**At Launch Volume (50 active players, 12 races/day):**
- Race tax revenue: 24 ICP/month
- Upgrade revenue: 270 ICP/month
- Maintenance revenue: 30 ICP/month
- **Total Revenue: ~324 ICP/month**

**Costs:**
- Platform bonuses: 146 ICP/month
- Infrastructure: 10 ICP/month
- **Total Costs: ~156 ICP/month**

**Net: +168 ICP/month profit** ✅

---

## Sustainability Scenarios

### Scenario 1: Launch Phase (Months 1-3)
- **Players:** 20-50 active
- **Races/day:** 10-15
- **Revenue:** Race tax + upgrades + maintenance
- **Strategy:** Accept -100 to -150 ICP/month treasury subsidy as player acquisition cost
- **Bonuses:** Full Phase 1 bonuses to encourage participation

### Scenario 2: Growth Phase (Months 4-6)
- **Players:** 50-150 active
- **Races/day:** 20-40
- **Revenue:** Tax revenue increases, upgrade volume grows
- **Strategy:** Reduce bonuses by 25-50% as prize pools grow organically
- **Target:** Break-even to +50 ICP/month profit

### Scenario 3: Mature Platform (Months 7+)
- **Players:** 150+ active
- **Races/day:** 50-100+
- **Revenue:** Self-sustaining from race tax, upgrades, maintenance
- **Strategy:** Eliminate or minimize bonuses, introduce marketplace fees
- **Target:** +200-500 ICP/month profit for seasonal prizes, development

---

## Break-Even Analysis

### By Race Volume

**To cover 146 ICP/month in bonuses from tax revenue alone:**
- Need: 146 ICP/month = ~5 ICP/day in tax
- At 5% tax rate: 100 ICP/day in entry fees
- At avg 0.5 ICP entry: **200 entries/day**
- At 8 racers/race: **25 races/day**

**Conclusion:** Need ~2x current race frequency to break even on race tax alone.

### By Player Count

**To generate 146 ICP/month from upgrades alone:**
- Average player spends 30 ICP on upgrades over 3 months = 10 ICP/month
- Need: 146 / 10 = **~15 paying players**
- At 30% conversion: **~50 active players total**

**Conclusion:** Platform is sustainable at 50+ active players even with bonuses.

---

## Phase Transition Plan

### Phase 1: Treasury Subsidized (Current)
- **Duration:** Launch to 50+ active players
- **Daily Sprint bonus:** 0.5 ICP (Scavenger/Raider)
- **Weekly League bonus:** 2 ICP (Scavenger/Raider)
- **Monthly Cup bonus:** 5 ICP (Elite/SilentKlan)
- **Cost:** 146 ICP/month
- **Target:** Onboard players, build engagement

### Phase 2: Reduced Subsidies
- **Trigger:** 100+ active players OR break-even achieved
- **Daily Sprint bonus:** 0.25 ICP (50% reduction)
- **Weekly League bonus:** 1 ICP (50% reduction)
- **Monthly Cup bonus:** 2.5 ICP (50% reduction)
- **Cost:** 73 ICP/month
- **Target:** Maintain growth while reducing costs

### Phase 3: Market-Driven
- **Trigger:** 200+ active players OR consistent profitability
- **Daily Sprint bonus:** 0 ICP (Scavenger only gets 0.1 ICP)
- **Weekly League bonus:** 0 ICP (eliminate)
- **Monthly Cup bonus:** Special events only
- **Cost:** 10-20 ICP/month (special events)
- **Target:** Self-sustaining competitive economy

---

## Risk Analysis

### Revenue Risks
1. **Low player adoption:** Fewer than 50 active players makes treasury subsidy expensive
2. **Price sensitivity:** Testing prices (0.1x) don't reflect production revenue
3. **Upgrade resistance:** Players might not value upgrades at 10-60 ICP

### Cost Risks
1. **Bonus dependency:** Players expect bonuses, hard to remove
2. **Race frequency:** More races = more bonus costs
3. **Infrastructure scaling:** Canister costs increase with usage

### Mitigation Strategies
1. **Gradual price increases:** Start at testing prices, increase over time
2. **Scrap system:** Let players earn free upgrades through NFT scrapping
3. **Dynamic bonuses:** Adjust based on actual player count/revenue
4. **Marketplace fees:** Add revenue stream from secondary trading

---

## Long-Term Sustainability

### Year 1 Goals
- Reach 200+ active players
- Achieve break-even or better
- Transition to Phase 2 bonuses
- Establish consistent race participation (30+ races/day)

### Revenue Targets
- **Conservative:** 500 ICP/month (covers costs + development)
- **Moderate:** 1,000 ICP/month (enables seasonal prizes)
- **Optimistic:** 2,000+ ICP/month (fund major features)

### Success Metrics
- Daily active racers: 50+
- Races per day: 30+
- Average revenue per user: 15-30 ICP/month
- Player retention: 40%+ month-over-month
- Treasury growth: Positive after month 6

---

## Conclusion

**The platform economics are viable with:**
1. **Phase 1 treasury subsidy** of 100-150 ICP/month for player acquisition
2. **50+ active players** to reach break-even from upgrades/maintenance alone
3. **Gradual bonus reduction** as player base grows
4. **Production pricing** for upgrades/maintenance to generate sustainable revenue

**The class-based fee structure** ensures high-tier races (Elite/SilentKlan) are self-sustaining, while beginner bonuses onboard new players cost-effectively.

**Path to profitability:** Accept 3-6 months of subsidy, grow to 100+ players, transition to Phase 2, achieve self-sustainability by month 6-9.
