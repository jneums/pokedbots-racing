---
title: MCP Tools Guide
description: Complete reference for the Model Context Protocol tools and AI agent integration
order: 6
---

# PokedBots Racing MCP Tools Guide 🤖🏁

*Complete Guide to Using the Model Context Protocol Server - November 16, 2025*

---

## Table of Contents
1. [What is This?](#what-is-this)
2. [Getting Started](#getting-started)
3. [Marketplace Tools](#marketplace-tools)
4. [Garage Tools](#garage-tools)
5. [Racing Tools](#racing-tools)
6. [Common Workflows](#common-workflows)
7. [Tips & Tricks](#tips--tricks)
8. [Troubleshooting](#troubleshooting)

---

## What is This?

**PokedBots Racing** is an NFT racing game built on the Internet Computer where you can:
- Buy unique PokedBot NFTs from the marketplace
- Store them in your personal garage
- Enter them in wasteland races
- Upgrade, repair, and maintain your bots
- Compete for prizes and build your bot's reputation

**The MCP (Model Context Protocol) Server** lets you interact with the game using natural language through AI assistants. Instead of clicking through a website, you can ask questions like:
- "Show me WildBots for sale under 50 ICP"
- "List my bots in the garage"
- "Enter bot #4247 in the next race"

---

## Getting Started

### Prerequisites
1. **Internet Computer Account** - You need ICP tokens to buy bots and enter races
2. **MCP-Compatible AI Client** - Like Claude Desktop or other MCP-enabled tools
3. **PokedBots NFTs** - Buy from the marketplace or own existing bots

### First Steps
1. **Browse the Marketplace** - See what bots are available
2. **Purchase Your First Bot** - Start with something affordable (20-50 ICP)
3. **Initialize Your Bot** - Register it for racing (free, one-time)
4. **Enter Your First Race** - Try a Scavenger class race to learn

---

## Marketplace Tools

### 🏪 browse_pokedbots
**What it does:** Search and filter bots for sale on the marketplace

**Common Uses:**
```
Show me all WildBots for sale
Find BattleBots under 30 ICP with 60+ rating
Show the highest-rated GodClass bots
List Master faction bots sorted by price
```

**Filters Available:**
- `faction` - Filter by: BattleBot, EntertainmentBot, WildBot, GodClass, Master
- `minRating` - Minimum overall rating (30-100)
- `maxPrice` - Maximum price in ICP
- `minWins` - Minimum race wins
- `minWinRate` - Minimum win percentage
- `sortBy` - Sort by: price, rating, winRate, wins
- `sortDesc` - Sort descending (highest first)

**Example Output:**
```
🤖 Token #1417
   💰 Price: 30.00 ICP
   ⚡ Base: 63/100 | 🏆 WildBot
   📊 Stats: SPD 64 | PWR 62 | ACC 61 | STB 65
   🏁 Record: No races yet
   🎯 Prefers: MetalRoads terrain, MediumHaul
   🖼️  Image: [thumbnail URL]
```

**Pro Tips:**
- Use `minRating=60` to filter out low-quality bots
- Combine `maxPrice` and `minRating` for value hunting
- `sortBy=rating` with `sortDesc=true` shows the best first
- Check the image thumbnail to see what your bot looks like!

---

### 💰 purchase_pokedbot
**What it does:** Buy a bot from the marketplace and send it to your garage

**How to Use:**
```
Purchase bot #1417
Buy token 4247
```

**What Happens:**
1. System checks you have enough ICP (price + fees)
2. Payment is transferred to the seller
3. Bot NFT is transferred from seller's garage to your garage subaccount
4. Bot is automatically unlisted from marketplace
5. Bot is now yours to initialize and race!

**Important:**
- **Fees:** Transaction includes small network fees (~0.0001 ICP)
- **No Refunds:** Sales are final - choose carefully!
- **Atomic Transfer:** Payment and NFT transfer happen simultaneously
- **Not Race-Ready:** Must initialize bot after purchase (see Garage Tools)

---

### 🚫 list_pokedbot
**What it does:** Put one of your bots up for sale on the marketplace

**How to Use:**
```
List bot #1417 for 50 ICP
Sell token 4247 for 100 ICP
```

**What Happens:**
1. Bot is marked as "for sale" at your specified price
2. Listed on the marketplace for anyone to browse
3. Bot stays in your garage until someone purchases it
4. You cannot race it while it's listed

**Important:**
- **Minimum Price:** 0.01 ICP
- **Still Yours:** Bot remains in your garage until sold
- **Cannot Race:** Listed bots are locked from racing
- **Can Unlist:** Use `unlist_pokedbot` to remove listing anytime

---

### 📤 unlist_pokedbot
**What it does:** Remove your bot from the marketplace

**How to Use:**
```
Unlist bot #1417
Remove token 4247 from marketplace
```

**What Happens:**
1. Bot is removed from marketplace listings
2. "For sale" status is cleared
3. Bot is now available for racing again

---

### 🎁 transfer_pokedbot
**What it does:** Gift or transfer a bot to another user's garage

**How to Use:**
```
Transfer bot #1417 to [account_id]
Send token 4247 to [account_id]
```

**What Happens:**
1. Bot is removed from your garage
2. Bot is sent to recipient's garage subaccount
3. Transfer is permanent - no undo!

**Important:**
- **No Payment:** This is a gift/transfer, not a sale
- **Verify Account:** Double-check the recipient account ID
- **Permanent:** Cannot be reversed
- **Cannot Transfer Listed Bots:** Must unlist first

---

## Garage Tools

Your **garage** is your personal collection of PokedBots. Think of it as your team headquarters.

### 🚗 list_my_pokedbots
**What it does:** Show all bots you own with their stats and status

**How to Use:**
```
Show my bots
List my garage
What bots do I own?
```

**Example Output:**
```
🤖 Token #1417 | WildBot
   📊 Rating: 63/100
   ⚡ Stats: SPD 64 | PWR 62 | ACC 61 | STB 65
   🔋 Condition: 100 | Battery: 100
   🏁 Record: 5 races, 2 wins (40% win rate)
   ✅ Status: Ready to race
   🖼️  Image: [thumbnail URL]
```

**Status Indicators:**
- ✅ **Ready to race** - Good to go!
- ⚠️ **Needs recharge** - Battery < 50 or Condition < 70
- 🔄 **Upgrading** - Currently in upgrade session
- 🏪 **Listed on marketplace** - For sale, cannot race

---

### 🔧 get_robot_details
**What it does:** Get comprehensive details about a specific bot

**How to Use:**
```
Show details for bot #1417
Get info on token 4247
```

**What You'll See:**
- Full stats breakdown (Speed, Power, Acceleration, Stability)
- Current condition and battery levels
- Complete race history with results
- Upgrade status and cooldown timers
- Faction bonuses applied
- Terrain preferences

**When to Use:**
- Before entering a race (check condition/battery)
- After a race (see updated stats)
- When planning upgrades
- To review racing history

---

### 🎮 initialize_pokedbot
**What it does:** Register your bot for racing (one-time, required before first race)

**How to Use:**
```
Initialize bot #1417
Register token 4247 for racing
Get my bot ready to race
```

**What Happens:**
1. Bot's NFT traits are analyzed
2. Racing stats are calculated based on traits + faction bonuses
3. Bot receives official wasteland racing license
4. Bot is now eligible to enter races

**Important:**
- **Free:** No cost, one-time only
- **Required:** Must initialize before entering any races
- **Cannot Reverse:** Permanent registration
- **Reveals Stats:** This is when you see final racing stats

**Why It's Needed:**
The initialization process reads your NFT's traits (body parts, colors, special attributes) and converts them into racing stats with faction bonuses applied. It's like taking your bot to the DMV!

---

### 🔄 recharge_robot
**What it does:** Restore condition and battery to get back to racing

**Cost:** 10 ICP + 0.0001 ICP network fee  
**Restores:**
- +20 Condition
- +10 Battery

**Cooldown:** 6 hours (cannot recharge same bot twice in 6 hours)

**How to Use:**
```
Recharge bot #1417
Restore token 4247
```

**When to Use:**
- Battery is below 50 (warning threshold)
- Condition is below 70 (warning threshold)
- Before important races you can't afford to lose
- When you want to race multiple times quickly

**Pro Tips:**
- Recharge before battery hits 40 (races drain 10 battery each)
- Condition affects performance - keep it above 70
- Plan recharges around race schedules (6-hour cooldown)

---

### 🔨 repair_robot
**What it does:** Restore condition (cheaper than recharge, no battery boost)

**Cost:** 5 ICP + 0.0001 ICP network fee  
**Restores:**
- +10 Condition (only)

**Cooldown:** 12 hours

**How to Use:**
```
Repair bot #1417
Fix token 4247
```

**When to Use:**
- Condition is low but battery is fine
- Budget racing (cheaper than recharge)
- Not racing immediately (12-hour cooldown is okay)

**Repair vs Recharge:**
| Action | Cost | Condition | Battery | Cooldown |
|--------|------|-----------|---------|----------|
| Repair | 5 ICP | +10 | 0 | 12 hours |
| Recharge | 10 ICP | +20 | +10 | 6 hours |

---

### ⬆️ upgrade_robot
**What it does:** Permanently improve one of your bot's stats

**Cost:** 20 ICP + 0.0001 ICP network fee  
**Duration:** 12 hours (upgrade session)  
**Boost:** Adds points to chosen stat

**Upgrade Types:**
- **Velocity** - Increases Speed
- **PowerCore** - Increases Power Core
- **Thruster** - Increases Acceleration
- **Gyro** - Increases Stability

**How to Use:**
```
Upgrade bot #1417 with Velocity
Add PowerCore upgrade to token 4247
Improve acceleration on my bot
```

**What Happens:**
1. You pay 20 ICP
2. Bot enters 12-hour upgrade session (cannot race during this time)
3. After 12 hours, stat is permanently increased
4. Bot is ready to race with improved stats

**Strategy Tips:**
- **Speed Upgrade (Velocity):** For sprint races and MetalRoads
- **Power Upgrade (PowerCore):** For long endurance races
- **Acceleration Upgrade (Thruster):** For race starts and obstacle courses
- **Stability Upgrade (Gyro):** For WastelandSand and rough terrain

**Planning Upgrades:**
- Check your bot's weakest stat first
- Or double down on strengths (make fast bots even faster)
- Don't upgrade during race events (12-hour lockout)
- Upgrades stack - you can upgrade multiple times

---

## Racing Tools

### 🏁 list_races
**What it does:** Browse upcoming races with filters

**How to Use:**
```
Show all upcoming races
Find Scavenger class races
Show Elite races on WastelandSand
List races with prize pools over 50 ICP
```

**Filters Available:**
- `race_class` - Scavenger, Raider, Elite, SilentKlan
- `terrain` - MetalRoads, WastelandSand, ScrapHeaps
- `status` - open, full, closed
- `min_distance` / `max_distance` - Race distance in km
- `has_spots` - true (only races with open spots)
- `token_index` - Your bot's token (shows only eligible races)
- `sortBy` - prize_pool, start_time, entry_fee, distance

**Example Output:**
```
🏁 Race #42 - Scavenger Class
   🏆 Prize Pool: 10.5 ICP (7 entries)
   💰 Entry Fee: 0.15 ICP
   📏 Distance: 8.2 km (MediumHaul)
   🌍 Terrain: MetalRoads
   👥 Spots: 7/12 filled
   ⏰ Starts: 2 hours from now
   📊 Entry Status: OPEN
```

**Race Classes:**
- **Scavenger** - Entry-level races, lowest fees, beginner-friendly
- **Raider** - Mid-tier races, moderate fees and prizes
- **Elite** - High-stakes races, large prize pools, tough competition
- **SilentKlan** - Ultra-exclusive races, requires 10+ race wins

**Pro Tips:**
- Use `token_index` filter to see only races your bot qualifies for
- `sortBy=prize_pool` with `sortDesc=true` shows biggest prizes first
- Check `has_spots=true` to avoid full races
- Look at entry fee vs prize pool for value assessment

---

### 🎟️ enter_race
**What it does:** Enter your bot in a specific race

**How to Use:**
```
Enter bot #1417 in race 42
Join race 55 with token 4247
```

**Requirements:**
- Bot must be initialized
- Condition ≥ 70
- Battery ≥ 50
- Enough ICP for entry fee
- Bot matches race class requirements
- Race spots still available

**What Happens:**
1. Entry fee is paid (ICRC-2 approval + transfer)
2. Bot is registered for the race
3. Battery is reduced by 10 (race energy cost)
4. Bot is locked until race completes

**Entry Fee Structure:**
- **Scavenger:** 0.05-0.5 ICP (Daily: 0.05, Weekly: 0.2, Monthly: 0.5)
- **Raider:** 0.1-1 ICP (Daily: 0.1, Weekly: 0.4, Monthly: 1.0)
- **Elite:** 0.25-2.5 ICP (Daily: 0.25, Weekly: 1.0, Monthly: 2.5)
- **SilentKlan:** 0.5-5 ICP (Daily: 0.5, Weekly: 2.0, Monthly: 5.0)

**What Affects Your Performance:**
- Your bot's stats (Speed, Power, Acceleration, Stability)
- Terrain match (MetalRoads vs WastelandSand vs ScrapHeaps)
- Distance type (ShortSprint vs MediumHaul vs LongTrek)
- Current condition (lower = worse performance)
- Faction bonuses (always active)

**After Race:**
- Winners split prize pool
- All bots gain experience
- Stats are updated in race history
- Battery is depleted (need to recharge for next race)

---

### 💎 sponsor_race
**What it does:** Add ICP to a race's prize pool (optional, for supporters)

**How to Use:**
```
Sponsor race 42 with 5 ICP
Add 10 ICP to race 55 prize pool with message "Good luck racers!"
```

**What Happens:**
1. Your ICP is added to the race prize pool
2. Your sponsorship is publicly displayed
3. Optional message appears on race listing
4. Winners receive larger prizes

**Why Sponsor:**
- Support the racing community
- Promote your garage/brand
- Encourage participation in races
- Build reputation as a supporter

**Requirements:**
- **Minimum:** 0.1 ICP
- **Race Status:** Must be Upcoming (not completed)
- **Message:** Optional, max 100 characters

---

## Common Workflows

### 🎯 Workflow 1: Buying Your First Bot

1. **Browse the marketplace:**
   ```
   Show me bots under 30 ICP with 60+ rating
   ```

2. **Review options and pick one:**
   ```
   Show details for bot #1417
   ```

3. **Purchase:**
   ```
   Purchase bot #1417
   ```

4. **Check your garage:**
   ```
   Show my bots
   ```

5. **Initialize for racing:**
   ```
   Initialize bot #1417
   ```

6. **You're ready to race!**

---

### 🏁 Workflow 2: Entering Your First Race

1. **Check bot status:**
   ```
   Show details for bot #1417
   ```

2. **Find suitable races:**
   ```
   Show Scavenger races with my bot #1417
   ```

3. **Review race details:**
   Look for:
   - Entry fee you can afford
   - Terrain matching your bot's preference
   - Distance appropriate for your stats

4. **Enter the race:**
   ```
   Enter bot #1417 in race 42
   ```

5. **Wait for results:**
   - Race will complete at scheduled time
   - Check bot details to see updated race history

---

### 🔧 Workflow 3: Maintaining Your Bot

**Before a race:**
```
Show details for bot #1417
```
Check:
- Condition ≥ 70? ✅
- Battery ≥ 50? ✅

**If low:**
```
Recharge bot #1417
```

**After multiple races:**
```
Show my bot's race history
```
Review performance and consider upgrades

**Planning an upgrade:**
```
Upgrade bot #1417 with Velocity
```
Wait 12 hours, then race with improved speed!

---

### 💼 Workflow 4: Trading Bots

**Selling a bot:**
1. Make sure bot is in garage (not racing or upgrading)
2. List it:
   ```
   List bot #1417 for 50 ICP
   ```
3. Bot stays in your garage but appears on marketplace
4. Wait for someone to purchase (payment + transfer happens automatically)

**Changing price (need to relist):**
1. Remove listing:
   ```
   Unlist bot #1417
   ```
2. List at new price:
   ```
   List bot #1417 for 40 ICP
   ```
3. Bot remains in your garage throughout

**Gifting a bot:**
```
Transfer bot #1417 to [recipient_account_id]
```

---

## Tips & Tricks

### 💡 Marketplace Shopping

**Finding Value:**
- Look for bots with ratings 10-15 points higher than their price tier
- Example: 65-rated bot for 30 ICP is better value than 60-rated for 40 ICP
- Use the formula: `rating ÷ price = value score` (higher is better)

**Faction Strategy:**
- **BattleBot (38%):** Most common, reliable, good starter
- **WildBot (28%):** Stability masters, great for rough terrain
- **EntertainmentBot (24%):** Speed/acceleration, fun for sprints
- **Master (7%):** Rare, +12 SPD/PWR bonuses, competitive edge
- **GodClass (3%):** Rarest, +15 all stats, ultimate prestige

**Stat Priorities by Race Type:**
- **Sprint (<5km):** Speed + Acceleration
- **Medium (5-15km):** Balanced stats
- **Endurance (>15km):** Power + Stability
- **Rough terrain:** Stability + Acceleration

---

### 🏁 Racing Strategy

**Race Class Progression:**
1. Start with **Scavenger** races (low entry, learn mechanics)
2. Move to **Raider** once you have 3-5 wins
3. Try **Elite** when you have upgraded bots
4. Unlock **SilentKlan** after 10 total wins

**Terrain Matching:**
- MetalRoads → BattleBot or high-speed bots
- WastelandSand → WildBot or high-stability bots
- ScrapHeaps → Balanced bots with good acceleration

**Battery Management:**
- Each race drains 10 battery
- Can race 5 times before needing recharge (starting from 100)
- Recharge costs 10 ICP but restores 20 condition too
- Plan race schedules around 6-hour recharge cooldown

---

### 💰 Budget Management

**Costs to Consider:**
- Bot purchase: 6-599 ICP (budget 20-50 ICP for starters)
- Race entry fees: 0.05-5 ICP depending on class and event type
- Recharges: 10 ICP per recharge (needed every ~5 races)
- Repairs: 5 ICP (cheaper than recharge if battery is fine)
- Upgrades: 20 ICP per upgrade (permanent improvement)

**Budget Racing (Low Cost):**
- Buy bot: 20-30 ICP
- Enter Scavenger races: 0.5-1.5 ICP
- Repair instead of recharge: 5 ICP
- Race 3-5 times before investing in upgrades

**Competitive Racing (Moderate Cost):**
- Buy bot: 50-100 ICP
- Enter Raider races: 2-10 ICP
- Recharge regularly: 10 ICP
- Upgrade 2-3 stats: 40-60 ICP total

---

### 🎮 Advanced Tactics

**Specialization:**
- Pick a terrain and optimize for it
- Example: WastelandSand specialist with WildBot + Stability upgrades
- Dominate one race type rather than being mediocre at all

**Portfolio Strategy:**
- Own 2-3 bots with different specializations
- Sprint specialist (high Speed/Acceleration)
- Endurance specialist (high Power/Stability)  
- All-rounder (balanced stats)

**Upgrade Strategy:**
- **Fix Weaknesses:** Bring low stats up to competitive levels
- **Double Down:** Make strong stats even stronger
- **Terrain-Specific:** Upgrade Stability for rough terrain bots

---

## Troubleshooting

### ❌ "Cannot enter race - condition too low"
**Problem:** Bot condition is below 70  
**Solution:** Recharge (10 ICP) or Repair (5 ICP) your bot

---

### ❌ "Cannot enter race - battery too low"
**Problem:** Bot battery is below 50  
**Solution:** Recharge your bot (10 ICP, adds +10 battery and +20 condition)

---

### ❌ "Bot not initialized"
**Problem:** You're trying to race but haven't registered bot yet  
**Solution:** Use `initialize_pokedbot` (free, one-time)

---

### ❌ "Race is full"
**Problem:** All spots in the race are taken  
**Solution:** Find another race using `list_races` with `has_spots=true`

---

### ❌ "Bot is currently upgrading"
**Problem:** Bot is in 12-hour upgrade session  
**Solution:** Wait for upgrade to complete (check `get_robot_details` for timer)

---

### ❌ "Bot is listed on marketplace"
**Problem:** Cannot race bots that are for sale  
**Solution:** Use `unlist_pokedbot` to remove from marketplace

---

### ❌ "Insufficient ICP balance"
**Problem:** Not enough ICP for entry fee or service  
**Solution:** Add more ICP to your account or choose cheaper option

---

### ❌ "Bot doesn't meet race requirements"
**Problem:** Your bot's class doesn't match the race  
**Solution:** Check race class and your bot's eligibility. SilentKlan requires 10+ wins.

---

## Quick Reference

### Tool Categories

**Marketplace:**
- `browse_pokedbots` - Search for bots
- `purchase_pokedbot` - Buy a bot
- `list_pokedbot` - Sell your bot
- `unlist_pokedbot` - Remove listing
- `transfer_pokedbot` - Gift a bot

**Garage:**
- `list_my_pokedbots` - Show your collection
- `get_robot_details` - Detailed bot info
- `initialize_pokedbot` - Register for racing
- `recharge_robot` - Restore condition + battery
- `repair_robot` - Restore condition only
- `upgrade_robot` - Permanently improve stats

**Racing:**
- `list_races` - Browse upcoming races
- `enter_race` - Join a race
- `sponsor_race` - Add to prize pool

---

### Stat Ranges

All stats range from 30-100 after rebalancing:
- **30-45:** Below average
- **46-55:** Average
- **56-65:** Above average (competitive)
- **66-75:** Excellent
- **76-100:** Elite (rare)

---

### Faction Bonuses

| Faction | Bonuses | % of Bots |
|---------|---------|-----------|
| BattleBot | +8 PWR, +6 STB, +3 SPD/ACC | 38% |
| EntertainmentBot | +7 ACC, +5 SPD, +2 PWR/STB | 24% |
| WildBot | +9 STB, +6 ACC, +2 SPD/PWR | 28% |
| Master | +12 SPD/PWR, +8 ACC/STB | 7% |
| GodClass | +15 ALL | 3% |

---

## Next Steps

1. **Read the [Beginner's Racing Guide](beginner-racing-guide.md)** for bot recommendations
2. **Check the [WildBot Shopping Guide](wildbot-shopping-guide.md)** for value picks
3. **Review the [Elite Faction Showcase](elite-faction-showcase.md)** for high-end bots
4. **Start racing and have fun!** 🏁

---

*Have questions? The PokedBots Racing community is here to help. Good luck in the wasteland!* 🤖⚡
