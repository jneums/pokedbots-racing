# Event Catalog - PokedBots Racing

A comprehensive list of event types possible with the event registration system.

---

## Current Events (Converted to New System)

### 1. Weekly League Championship
**Current System:** Creates 5 races (one per division), players pick races  
**New System:** Players register for event, system creates balanced heats

```motoko
{
  eventType: #WeeklyLeague;
  name: "Weekly League Championship";
  description: "The wasteland's premier weekly competition. All divisions welcome - platform subsidies ensure profit for winners.";
  
  scheduledTime: sunday_8pm_utc;
  registrationOpens: friday_8pm_utc;  // 48h before
  registrationCloses: sunday_730pm_utc;  // 30min before
  
  metadata: {
    entryFee: 80_000_000;  // 0.8 ICP base (Junker)
    maxRegistrationsPerClass: 50;
    minEntries: 4;
    prizePoolBonus: 200_000_000;  // 2 ICP platform bonus
    pointsMultiplier: 2.0;
    divisions: [#Scrap, #Junker, #Raider, #Elite, #SilentKlan];
  };
  
  raceCreationMode: #Automatic({
    terrains: [#ScrapHeaps, #WastelandSand, #MetalRoads];
    distanceRange: { min: 15; max: 30 };
    racesPerClass: null;
    heatAllocation: #SnakeDraft;  // Balanced competition
  });
  
  cancellationDeadlines: {
    fullRefund: friday_8pm_utc;
    halfRefund: saturday_8pm_utc;
    quarterRefund: sunday_8am_utc;
  };
}
```

**Changes:**
- Players register once for entire event (not individual races)
- System creates optimal number of heats based on registrations
- Blind registration prevents dodging
- Snake draft ensures balanced heats

---

### 2. Daily Sprint Challenge
**Current System:** 4 times daily, quick races  
**New System:** Streamlined registration, faster fills

```motoko
{
  eventType: #DailySprint;
  name: "Daily Sprint Challenge";
  description: "Fast-paced wasteland action. Quick races, quick profits!";
  
  scheduledTime: every_6_hours;  // 00:00, 06:00, 12:00, 18:00 UTC
  registrationOpens: immediately;  // Opens when created
  registrationCloses: 15min_before_start;
  
  metadata: {
    entryFee: 20_000_000;  // 0.2 ICP base
    maxRegistrationsPerClass: 30;
    minEntries: 2;
    prizePoolBonus: 50_000_000;  // 0.5 ICP bonus
    pointsMultiplier: 1.0;
    divisions: [#Scrap, #Junker, #Raider, #Elite, #SilentKlan];
  };
  
  raceCreationMode: #Automatic({
    terrains: [#ScrapHeaps, #WastelandSand, #MetalRoads];
    distanceRange: { min: 5; max: 10 };
    racesPerClass: null;
    heatAllocation: #Random;  // Quick chaos
  });
  
  cancellationDeadlines: {
    fullRefund: 2h_before_close;
    halfRefund: 1h_before_close;
    quarterRefund: 30min_before_close;
  };
}
```

**Changes:**
- Simpler registration flow
- Random allocation for variety
- Shorter distances (5-10km)
- Lower stakes, higher frequency

---

### 3. Monthly Championship Cup
**Current System:** Planned, not implemented  
**New System:** Multi-stage elite tournament

```motoko
{
  eventType: #MonthlyCup;
  name: "Monthly Championship Cup";
  description: "The wasteland's most prestigious tournament. Elite and Silent Klan only.";
  
  scheduledTime: first_saturday_8pm_utc;
  registrationOpens: 7_days_before;
  registrationCloses: 24h_before;
  
  metadata: {
    entryFee: 200_000_000;  // 2.0 ICP base
    maxRegistrationsPerClass: 64;
    minEntries: 16;
    prizePoolBonus: 500_000_000;  // 5 ICP bonus
    pointsMultiplier: 3.0;
    divisions: [#Elite, #SilentKlan];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      // Round 1: Qualifying (all registered)
      {
        stageName: ?"Round 1: Qualifying";
        raceClass: #Elite;
        terrain: #MetalRoads;
        distance: 25;
        trackId: ?100;
        startOffset: 0;
      },
      // Round 2: Top 32 advance
      {
        stageName: ?"Round 2: Elite 32";
        raceClass: #Elite;
        terrain: #ScrapHeaps;
        distance: 30;
        trackId: ?101;
        startOffset: 3_600_000_000_000;  // +1 hour
      },
      // Finals: Top 8
      {
        stageName: ?"Championship Finals";
        raceClass: #Elite;
        terrain: #WastelandSand;
        distance: 35;
        trackId: ?102;
        startOffset: 7_200_000_000_000;  // +2 hours
      }
    ];
    heatAllocation: #SkillTiered;  // Top performers together
  });
  
  cancellationDeadlines: {
    fullRefund: 72h_before_close;
    halfRefund: 48h_before_close;
    quarterRefund: 24h_before_close;
  };
}
```

**New Features:**
- Multi-stage progression
- Specific tracks for consistency
- Manual race definition for theatrical presentation
- High stakes, prestige focus

---

## New Event Types (Enabled by System)

### 4. Weekend Warrior Tournament
**3-day progressive tournament**

```motoko
{
  eventType: #SpecialEvent("Weekend Warrior");
  name: "Weekend Warrior Tournament";
  description: "Friday to Sunday progression. Survive all three stages for glory!";
  
  scheduledTime: friday_8pm_utc;
  registrationOpens: wednesday_8pm_utc;
  registrationCloses: friday_6pm_utc;
  
  metadata: {
    entryFee: 100_000_000;  // 1.0 ICP
    maxRegistrationsPerClass: 100;
    minEntries: 8;
    prizePoolBonus: 300_000_000;
    pointsMultiplier: 2.5;
    divisions: [#Junker, #Raider, #Elite];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      // Friday: Sprint (warmup)
      {
        stageName: ?"Friday Sprint";
        raceClass: #Elite;
        terrain: #MetalRoads;
        distance: 15;
        trackId: ?200;
        startOffset: 0;
      },
      // Saturday: Endurance
      {
        stageName: ?"Saturday Endurance";
        raceClass: #Elite;
        terrain: #WastelandSand;
        distance: 30;
        trackId: ?201;
        startOffset: 86_400_000_000_000;  // +24h
      },
      // Sunday: Championship
      {
        stageName: ?"Sunday Championship";
        raceClass: #Elite;
        terrain: #ScrapHeaps;
        distance: 25;
        trackId: ?202;
        startOffset: 172_800_000_000_000;  // +48h
      }
    ];
    heatAllocation: #SnakeDraft;
  });
}
```

**Key Features:**
- Multi-day commitment
- Progressive difficulty
- Registered players enter all three races automatically
- Aggregate scoring possible

---

### 5. Terrain Master Series
**Specialized single-terrain championship**

```motoko
{
  eventType: #SpecialEvent("Sand Master Cup");
  name: "Sand Master Championship";
  description: "Only the best sand racers survive. All races on treacherous dunes.";
  
  scheduledTime: saturday_2pm_utc;
  registrationOpens: thursday_2pm_utc;
  registrationCloses: saturday_1pm_utc;
  
  metadata: {
    entryFee: 60_000_000;  // 0.6 ICP
    maxRegistrationsPerClass: 40;
    minEntries: 8;
    prizePoolBonus: 150_000_000;
    pointsMultiplier: 1.5;
    divisions: [#Junker, #Raider, #Elite];
  };
  
  raceCreationMode: #Automatic({
    terrains: [#WastelandSand];  // ONLY sand
    distanceRange: { min: 15; max: 35 };
    racesPerClass: null;
    heatAllocation: #SkillTiered;
  });
}
```

**Variants:**
- **Metal Roads Master** - Highway racing only
- **Scrap Heap Master** - Technical obstacle course only
- Rewards terrain specialists

---

### 6. Elite Showcase
**Top-tier exhibition racing**

```motoko
{
  eventType: #SpecialEvent("Elite Showcase");
  name: "Elite Racing Showcase";
  description: "Watch the best racers compete. Top ELO players only.";
  
  scheduledTime: sunday_6pm_utc;
  registrationOpens: friday_6pm_utc;
  registrationCloses: sunday_5pm_utc;
  
  metadata: {
    entryFee: 150_000_000;  // 1.5 ICP
    maxRegistrationsPerClass: 24;
    minEntries: 8;
    prizePoolBonus: 400_000_000;
    pointsMultiplier: 2.0;
    divisions: [#Elite, #SilentKlan];
  };
  
  raceCreationMode: #Automatic({
    terrains: [#MetalRoads, #WastelandSand];
    distanceRange: { min: 25; max: 40 };
    racesPerClass: null;
    heatAllocation: #SkillTiered;  // Top performers in first heats
  });
  
  // Additional filter: Require minimum ELO to register
  registrationFilter: {
    minElo: 1500;
  };
}
```

**Key Features:**
- High-skill requirement
- Premium prize pool
- Skill-tiered heats for competitive racing
- Great for spectators

---

### 7. Beginner Bootcamp
**Welcoming event for new racers**

```motoko
{
  eventType: #SpecialEvent("Beginner Bootcamp");
  name: "Wasteland Beginner Bootcamp";
  description: "New to racing? Start here! Low stakes, fair competition.";
  
  scheduledTime: saturday_10am_utc;
  registrationOpens: thursday_10am_utc;
  registrationCloses: saturday_9am_utc;
  
  metadata: {
    entryFee: 10_000_000;  // 0.1 ICP
    maxRegistrationsPerClass: 50;
    minEntries: 4;
    prizePoolBonus: 100_000_000;  // 1 ICP bonus (very generous)
    pointsMultiplier: 1.0;
    divisions: [#Scrap, #Junker];
  };
  
  raceCreationMode: #Automatic({
    terrains: [#MetalRoads];  // Easiest terrain
    distanceRange: { min: 5; max: 15 };  // Shorter races
    racesPerClass: null;
    heatAllocation: #TopBottom;  // Separate skill levels
  });
  
  // Filter: Only bots with <10 races
  registrationFilter: {
    maxRacesEntered: 10;
  };
}
```

**Key Features:**
- Low entry fee
- Generous platform bonus
- TopBottom allocation protects newer players
- Restricted to beginners

---

### 8. Faction Wars
**Faction vs faction team competition**

```motoko
{
  eventType: #SpecialEvent("Faction Wars");
  name: "Faction Wars: Blackhole vs Ultimate";
  description: "Two factions enter. One faction leaves victorious!";
  
  scheduledTime: sunday_4pm_utc;
  registrationOpens: thursday_4pm_utc;
  registrationCloses: sunday_3pm_utc;
  
  metadata: {
    entryFee: 50_000_000;  // 0.5 ICP
    maxRegistrationsPerClass: 60;  // 30 per faction
    minEntries: 10;  // 5 per faction
    prizePoolBonus: 200_000_000;
    pointsMultiplier: 1.5;
    divisions: [#Junker, #Raider, #Elite];
  };
  
  raceCreationMode: #Automatic({
    terrains: [#ScrapHeaps, #WastelandSand, #MetalRoads];
    distanceRange: { min: 15; max: 25 };
    racesPerClass: null;
    heatAllocation: #Random;  // Mix factions in each race
  });
  
  // Restrict to specific factions
  registrationFilter: {
    allowedFactions: [#Blackhole, #Ultimate];
  };
  
  // Aggregate faction scores
  scoringMode: #TeamAggregate;
}
```

**Key Features:**
- Team-based competition
- Faction restrictions
- Aggregate scoring across all races
- Winning faction gets bonus prizes

---

### 9. Distance Challenge
**Progressive distance series**

```motoko
{
  eventType: #SpecialEvent("Distance Challenge");
  name: "Ultimate Distance Challenge";
  description: "Three races, increasing distances. Can you survive them all?";
  
  scheduledTime: saturday_noon_utc;
  registrationOpens: thursday_noon_utc;
  registrationCloses: saturday_11am_utc;
  
  metadata: {
    entryFee: 80_000_000;  // 0.8 ICP
    maxRegistrationsPerClass: 40;
    minEntries: 8;
    prizePoolBonus: 250_000_000;
    pointsMultiplier: 2.0;
    divisions: [#Raider, #Elite];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      // Stage 1: Sprint (15km)
      {
        stageName: ?"Stage 1: Sprint";
        raceClass: #Elite;
        terrain: #MetalRoads;
        distance: 15;
        trackId: ?300;
        startOffset: 0;
      },
      // Stage 2: Marathon (30km)
      {
        stageName: ?"Stage 2: Marathon";
        raceClass: #Elite;
        terrain: #WastelandSand;
        distance: 30;
        trackId: ?301;
        startOffset: 7_200_000_000_000;  // +2h
      },
      // Stage 3: Ultra (50km)
      {
        stageName: ?"Stage 3: Ultra Distance";
        raceClass: #Elite;
        terrain: #ScrapHeaps;
        distance: 50;
        trackId: ?302;
        startOffset: 14_400_000_000_000;  // +4h
      }
    ];
    heatAllocation: #SnakeDraft;
  });
}
```

**Key Features:**
- Progressive difficulty testing endurance
- Same-day multi-stage
- Aggregate points across all three races
- High condition/battery management needed

---

### 10. Rush Hour Rumble
**Quick-fire evening series**

```motoko
{
  eventType: #SpecialEvent("Rush Hour");
  name: "Friday Rush Hour Rumble";
  description: "5 quick races in 2 hours. Maximum chaos!";
  
  scheduledTime: friday_7pm_utc;
  registrationOpens: friday_noon_utc;
  registrationCloses: friday_645pm_utc;
  
  metadata: {
    entryFee: 30_000_000;  // 0.3 ICP
    maxRegistrationsPerClass: 50;
    minEntries: 8;
    prizePoolBonus: 100_000_000;
    pointsMultiplier: 1.2;
    divisions: [#Junker, #Raider, #Elite];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      { stageName: ?"Race 1"; raceClass: #Elite; terrain: #MetalRoads; 
        distance: 10; trackId: ?400; startOffset: 0 },
      { stageName: ?"Race 2"; raceClass: #Elite; terrain: #ScrapHeaps; 
        distance: 8; trackId: ?401; startOffset: 1_200_000_000_000 },  // +20min
      { stageName: ?"Race 3"; raceClass: #Elite; terrain: #WastelandSand; 
        distance: 12; trackId: ?402; startOffset: 2_400_000_000_000 },  // +40min
      { stageName: ?"Race 4"; raceClass: #Elite; terrain: #MetalRoads; 
        distance: 15; trackId: ?403; startOffset: 3_600_000_000_000 },  // +60min
      { stageName: ?"Finals"; raceClass: #Elite; terrain: #ScrapHeaps; 
        distance: 20; trackId: ?404; startOffset: 5_400_000_000_000 },  // +90min
    ];
    heatAllocation: #Random;  // Chaos mode
  });
}
```

**Key Features:**
- 5 races in 90 minutes
- Fast-paced entertainment
- Tests bot maintenance management
- Aggregate scoring for overall winner

---

### 11. Track Attack Series
**Same track, multiple attempts**

```motoko
{
  eventType: #SpecialEvent("Track Attack");
  name: "Scrap Tower Time Attack";
  description: "Same track, 3 attempts. Best time wins!";
  
  scheduledTime: sunday_3pm_utc;
  registrationOpens: friday_3pm_utc;
  registrationCloses: sunday_230pm_utc;
  
  metadata: {
    entryFee: 40_000_000;  // 0.4 ICP
    maxRegistrationsPerClass: 32;
    minEntries: 8;
    prizePoolBonus: 120_000_000;
    pointsMultiplier: 1.5;
    divisions: [#Raider, #Elite];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      // Attempt 1
      {
        stageName: ?"Attempt 1";
        raceClass: #Elite;
        terrain: #ScrapHeaps;
        distance: 20;
        trackId: ?500;  // SAME TRACK
        startOffset: 0;
      },
      // Attempt 2
      {
        stageName: ?"Attempt 2";
        raceClass: #Elite;
        terrain: #ScrapHeaps;
        distance: 20;
        trackId: ?500;  // SAME TRACK
        startOffset: 1_800_000_000_000;  // +30min
      },
      // Attempt 3
      {
        stageName: ?"Final Attempt";
        raceClass: #Elite;
        terrain: #ScrapHeaps;
        distance: 20;
        trackId: ?500;  // SAME TRACK
        startOffset: 3_600_000_000_000;  // +60min
      }
    ];
    heatAllocation: #SnakeDraft;
  });
  
  scoringMode: #BestTime;  // Only best time counts
}
```

**Key Features:**
- Time trial format
- Track memorization advantage
- Multiple attempts
- Best single result counts

---

### 12. Mixed Terrain Marathon
**Ultimate endurance test**

```motoko
{
  eventType: #SpecialEvent("Marathon");
  name: "Wasteland Ultra Marathon";
  description: "One race. All terrains. 60km of pure survival.";
  
  scheduledTime: saturday_noon_utc;
  registrationOpens: monday_noon_utc;
  registrationCloses: saturday_10am_utc;
  
  metadata: {
    entryFee: 200_000_000;  // 2.0 ICP
    maxRegistrationsPerClass: 20;
    minEntries: 5;
    prizePoolBonus: 600_000_000;  // 6 ICP bonus!
    pointsMultiplier: 3.0;
    divisions: [#Elite, #SilentKlan];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      {
        stageName: ?"Ultra Marathon";
        raceClass: #Elite;
        terrain: #WastelandSand;  // Primary terrain
        distance: 60;  // EXTREME
        trackId: ?600;
        startOffset: 0;
      }
    ];
    heatAllocation: #SkillTiered;
  });
}
```

**Key Features:**
- Single ultra-long race
- High stakes
- Tests bot endurance limits
- Premium rewards

---

### 13. Midnight Madness
**Late night chaos event**

```motoko
{
  eventType: #SpecialEvent("Midnight Madness");
  name: "Saturday Midnight Madness";
  description: "Late night racing. Anything goes!";
  
  scheduledTime: sunday_midnight_utc;
  registrationOpens: saturday_6pm_utc;
  registrationCloses: saturday_1130pm_utc;
  
  metadata: {
    entryFee: 25_000_000;  // 0.25 ICP
    maxRegistrationsPerClass: 40;
    minEntries: 4;
    prizePoolBonus: 75_000_000;
    pointsMultiplier: 1.0;
    divisions: [#Scrap, #Junker, #Raider, #Elite, #SilentKlan];
  };
  
  raceCreationMode: #Automatic({
    terrains: [#ScrapHeaps, #WastelandSand, #MetalRoads];
    distanceRange: { min: 8; max: 25 };  // Random
    racesPerClass: null;
    heatAllocation: #Random;  // Pure chaos
  });
}
```

**Key Features:**
- Late night timing for global audience
- Random everything
- Low pressure, fun focus
- Quick registration window

---

### 14. Title Defense Series
**Champions-only event**

```motoko
{
  eventType: #SpecialEvent("Champions Cup");
  name: "Champions Defense Cup";
  description: "Only previous event winners allowed. Defend your title!";
  
  scheduledTime: last_sunday_of_month_8pm;
  registrationOpens: 7_days_before;
  registrationCloses: 1_day_before;
  
  metadata: {
    entryFee: 300_000_000;  // 3.0 ICP
    maxRegistrationsPerClass: 16;
    minEntries: 8;
    prizePoolBonus: 1_000_000_000;  // 10 ICP!
    pointsMultiplier: 5.0;
    divisions: [#Elite, #SilentKlan];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      {
        stageName: ?"Champions Showdown";
        raceClass: #Elite;
        terrain: #MetalRoads;
        distance: 40;
        trackId: ?700;
        startOffset: 0;
      }
    ];
    heatAllocation: #SkillTiered;
  });
  
  // Restrict to previous winners
  registrationFilter: {
    requiresAchievement: "EventWinner";
  };
}
```

**Key Features:**
- Prestige event
- Exclusive entry requirements
- Massive prizes
- Champions only

---

### 15. Class Climb Challenge
**Progressive bracket system**

```motoko
{
  eventType: #SpecialEvent("Class Climb");
  name: "Climb the Ladder Challenge";
  description: "Win to advance to next class. Reach Elite to win big!";
  
  scheduledTime: saturday_2pm_utc;
  registrationOpens: thursday_2pm_utc;
  registrationCloses: saturday_1pm_utc;
  
  metadata: {
    entryFee: 50_000_000;  // 0.5 ICP
    maxRegistrationsPerClass: 100;
    minEntries: 16;
    prizePoolBonus: 200_000_000;
    pointsMultiplier: 2.0;
    divisions: [#Scrap, #Junker, #Raider, #Elite];
  };
  
  raceCreationMode: #Manual({
    raceTemplates: [
      // Round 1: Everyone races in their class
      { stageName: ?"Scrap Division"; raceClass: #Scrap; terrain: #MetalRoads;
        distance: 15; trackId: ?800; startOffset: 0 },
      { stageName: ?"Junker Division"; raceClass: #Junker; terrain: #MetalRoads;
        distance: 20; trackId: ?801; startOffset: 0 },
      { stageName: ?"Raider Division"; raceClass: #Raider; terrain: #MetalRoads;
        distance: 25; trackId: ?802; startOffset: 0 },
      
      // Round 2: Winners advance up one class
      { stageName: ?"Advancement Round"; raceClass: #Raider; terrain: #ScrapHeaps;
        distance: 25; trackId: ?803; startOffset: 3_600_000_000_000 },
      
      // Finals: Elite race
      { stageName: ?"Elite Finals"; raceClass: #Elite; terrain: #WastelandSand;
        distance: 30; trackId: ?804; startOffset: 7_200_000_000_000 }
    ];
    heatAllocation: #SnakeDraft;
  });
  
  advancementRules: {
    round1: "Top 25% advance to next class";
    round2: "Top 16 advance to finals";
  };
}
```

**Key Features:**
- Progressive difficulty
- Winners move up in class
- Underdog opportunities
- Dynamic bracket advancement

---

## Summary Table

| Event Type | Duration | Entry Fee | Divisions | Mode | Heat Strategy | Best For |
|------------|----------|-----------|-----------|------|---------------|----------|
| Weekly League | 1 day | 0.8 ICP | All | Auto | Snake | Standard competition |
| Daily Sprint | <1 hour | 0.2 ICP | All | Auto | Random | Quick races |
| Monthly Cup | 3 hours | 2.0 ICP | Elite/SK | Manual | Skill Tiered | Championships |
| Weekend Warrior | 3 days | 1.0 ICP | J/R/E | Manual | Snake | Multi-day |
| Terrain Master | 1 day | 0.6 ICP | J/R/E | Auto | Skill Tiered | Specialists |
| Elite Showcase | 1 day | 1.5 ICP | E/SK | Auto | Skill Tiered | High skill |
| Beginner Bootcamp | 1 day | 0.1 ICP | S/J | Auto | Top/Bottom | New players |
| Faction Wars | 1 day | 0.5 ICP | J/R/E | Auto | Random | Team competition |
| Distance Challenge | 4 hours | 0.8 ICP | R/E | Manual | Snake | Endurance |
| Rush Hour | 2 hours | 0.3 ICP | J/R/E | Manual | Random | Fast-paced |
| Track Attack | 2 hours | 0.4 ICP | R/E | Manual | Snake | Time trial |
| Ultra Marathon | 1 race | 2.0 ICP | E/SK | Manual | Skill Tiered | Extreme endurance |
| Midnight Madness | 1 hour | 0.25 ICP | All | Auto | Random | Late night fun |
| Champions Cup | 1 race | 3.0 ICP | E/SK | Manual | Skill Tiered | Winners only |
| Class Climb | 3 hours | 0.5 ICP | S/J/R/E | Manual | Snake | Progressive |

---

## Event Creation Guidelines

### Automatic Mode - Use When:
- Want flexibility based on registration count
- Standard weekly/daily events
- Don't need specific race times
- Variety in terrain/distance is good

### Manual Mode - Use When:
- Need specific race schedule (multi-day, multi-stage)
- Want consistent tracks
- Creating tournament/championship format
- Theatrical presentation matters

### Heat Allocation Strategies:
- **Snake Draft**: Default for fair competition
- **Skill Tiered**: Showcasing elite talent, protecting beginners
- **Top/Bottom**: Extreme skill segregation
- **Random**: Fun chaos events

### Entry Fee Guidelines:
- **0.1-0.3 ICP**: Low stakes, beginners, frequent events
- **0.5-1.0 ICP**: Standard competitive racing
- **1.5-3.0 ICP**: Premium events, championships
- **3.0+ ICP**: Prestige events, exclusive tournaments

### Platform Bonuses:
- Match or exceed entry fees for newer players
- Scale with difficulty and prestige
- 2-5x entry fees for championships

---

**All events support:**
- Blind registration (prevents dodging)
- Progressive cancellation penalties
- Multi-class splitting
- In-app notifications
- Aggregate scoring options
