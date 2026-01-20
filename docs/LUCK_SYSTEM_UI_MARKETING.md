# Luck System - UI/UX Design & Marketing

## Visual Design System

### Color Palette for Luck Elements

```css
/* Luck Tier Colors */
--luck-minor: #4ECDC4;      /* Teal - Common lucky moments */
--luck-major: #FFD700;       /* Gold - Significant breakthroughs */
--luck-legendary: #FF00FF;   /* Magenta - Legendary moments */

/* Cosmic Phenomenon Colors */
--cosmic-solar: #FFA500;     /* Orange - Solar Flare */
--cosmic-storm: #8B4513;     /* Brown - Rust Storm */
--cosmic-metal: #C0C0C0;     /* Silver - Metal Resonance */
--cosmic-gravity: #4169E1;   /* Royal Blue - Gravity Flux */
--cosmic-tornado: #32CD32;   /* Lime - Scrap Tornado */
--cosmic-dead: #800080;      /* Purple - Dead Zone */
--cosmic-golden: #FFD700;    /* Gold - Golden Hour */
--cosmic-ghost: #F0F8FF;     /* Alice Blue - Machine Ghost */
--cosmic-blood: #8B0000;     /* Dark Red - Blood Moon */
--cosmic-binary: #00FF00;    /* Green - Binary Surge */
--cosmic-chaos: #FF1493;     /* Deep Pink - Chaos Pulse */
--cosmic-momentum: #00CED1;  /* Dark Turquoise - Momentum Shift */
--cosmic-blackhole: #0D0221; /* Deep Purple-Black - Blackhole */

/* Affinity Levels */
--affinity-none: #666666;    /* Gray */
--affinity-low: #4A90E2;     /* Blue */
--affinity-medium: #50C878;  /* Green */
--affinity-high: #FFD700;    /* Gold */
--affinity-cosmic: #FF00FF;  /* Magenta - 80+ */
```

---

## UI Component Designs

### 1. Daily Phenomenon Banner

```jsx
<div className="cosmic-banner">
  {/* Full-width animated gradient background */}
  <div className="cosmic-bg animate-shimmer">
    <div className="container mx-auto px-4 py-6">
      <div className="flex items-center justify-between">
        
        {/* Left: Current Phenomenon */}
        <div className="flex items-center gap-4">
          <div className="cosmic-emoji text-6xl animate-pulse">
            ☀️
          </div>
          <div>
            <div className="text-sm text-gray-300 uppercase tracking-wide">
              Today's Cosmic Event
            </div>
            <h2 className="text-3xl font-bold text-yellow-400">
              Solar Flare
            </h2>
            <p className="text-gray-300 mt-1">
              Electromagnetic chaos energizes power cores
            </p>
          </div>
        </div>
        
        {/* Right: Affected Stats */}
        <div className="bg-black/30 px-6 py-4 rounded-lg border border-yellow-400/30">
          <div className="text-sm text-gray-300 mb-2">Favors Today:</div>
          <div className="flex gap-3">
            <div className="stat-badge">
              <span className="text-yellow-400">⚡</span> High Power Core
            </div>
            <div className="stat-badge">
              <span className="text-yellow-400">🎯</span> Even Token #s
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  {/* Bottom: 13-day calendar preview */}
  <div className="cosmic-calendar">
    <div className="flex justify-between px-4 py-2 bg-black/50">
      {/* Show 13 days with dots indicating phenomena */}
      {phenomena.map((p, i) => (
        <div 
          key={i}
          className={`calendar-dot ${i === currentDay ? 'active' : ''}`}
          title={p.name}
        >
          {p.emoji}
        </div>
      ))}
    </div>
  </div>
</div>
```

### 2. Bot Card Affinity Display

```jsx
<div className="bot-card">
  {/* Existing bot info */}
  <div className="bot-header">
    <h3>Bot #{tokenIndex}</h3>
    <div className="faction-badge">{faction}</div>
  </div>
  
  {/* Stats */}
  <div className="stats-grid">
    <StatBar label="Speed" value={stats.speed} max={100} />
    <StatBar label="Power" value={stats.powerCore} max={100} />
    <StatBar label="Accel" value={stats.acceleration} max={100} />
    <StatBar label="Stability" value={stats.stability} max={100} />
    <StatBar 
      label="Luck" 
      value={stats.luck} 
      max={100}
      className="luck-stat"
      icon="🍀"
    />
  </div>
  
  {/* Daily Affinity Section */}
  <div className="affinity-section mt-4 p-3 rounded-lg bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30">
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm text-gray-400">Today's Affinity</span>
      <span className="text-lg">{phenomenon.emoji}</span>
    </div>
    
    {/* Affinity Score with Visual Indicator */}
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="affinity-bar-bg h-2 bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`affinity-bar-fill h-full transition-all duration-500 ${getAffinityColor(affinity)}`}
            style={{ width: `${affinity}%` }}
          />
        </div>
      </div>
      <div className="affinity-score">
        <span className={`text-xl font-bold ${getAffinityTextColor(affinity)}`}>
          {affinity}
        </span>
        <span className="text-xs text-gray-400">/100</span>
      </div>
    </div>
    
    {/* Affinity Stars */}
    <div className="flex items-center justify-between mt-2">
      <div className="text-sm text-gray-400">
        {affinity >= 80 && "⭐⭐⭐ COSMIC ALIGNMENT!"}
        {affinity >= 60 && affinity < 80 && "⭐⭐ Strong Match"}
        {affinity >= 40 && affinity < 60 && "⭐ Decent Match"}
        {affinity < 40 && "○ Low Affinity"}
      </div>
      
      {affinity >= 60 && (
        <div className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded">
          +{Math.floor(affinity / 5)}% Luck Boost
        </div>
      )}
    </div>
    
    {/* Explanation */}
    {affinity >= 80 && (
      <div className="mt-2 text-xs text-gray-300 italic">
        Your bot is cosmically aligned with today's {phenomenon.name}!
        Expect legendary moments...
      </div>
    )}
  </div>
</div>
```

### 3. Race Entry Screen with Luck Preview

```jsx
<div className="race-entry-modal">
  <h2 className="text-2xl font-bold mb-4">Enter Race #{raceId}</h2>
  
  {/* Race Info */}
  <div className="race-info mb-6">
    <div>Distance: {distance}km</div>
    <div>Terrain: {terrain}</div>
    <div>Entry Fee: {entryFee} ICP</div>
  </div>
  
  {/* Bot Selection */}
  <div className="bot-selection mb-6">
    <label>Select Your Bot:</label>
    <select>
      {eligibleBots.map(bot => (
        <option key={bot.tokenIndex} value={bot.tokenIndex}>
          Bot #{bot.tokenIndex} - Rating {bot.rating}
        </option>
      ))}
    </select>
  </div>
  
  {/* TODAY'S LUCK PREVIEW */}
  <div className="luck-preview p-4 rounded-lg border-2 border-dashed border-yellow-400/50 bg-gradient-to-br from-purple-900/20 to-yellow-900/20">
    <div className="flex items-center gap-3 mb-3">
      <span className="text-3xl">{phenomenon.emoji}</span>
      <div>
        <div className="text-sm text-gray-400">Today's Cosmic Event</div>
        <div className="text-lg font-bold text-yellow-400">{phenomenon.name}</div>
      </div>
    </div>
    
    <div className="grid grid-cols-2 gap-4">
      {/* Your Bot's Affinity */}
      <div className="p-3 bg-black/30 rounded">
        <div className="text-xs text-gray-400 mb-1">Your Affinity</div>
        <div className={`text-2xl font-bold ${getAffinityTextColor(selectedBot.affinity)}`}>
          {selectedBot.affinity}/100
        </div>
        {selectedBot.affinity >= 80 && (
          <div className="text-xs text-yellow-400 mt-1">
            ⭐⭐⭐ COSMICALLY ALIGNED!
          </div>
        )}
      </div>
      
      {/* Predicted Boost */}
      <div className="p-3 bg-black/30 rounded">
        <div className="text-xs text-gray-400 mb-1">Expected Boost</div>
        <div className="text-2xl font-bold text-green-400">
          +{Math.floor(selectedBot.affinity / 5)}%
        </div>
        <div className="text-xs text-gray-300 mt-1">
          Luck proc chance
        </div>
      </div>
    </div>
    
    {/* Fortune Cookie Message */}
    {selectedBot.affinity >= 80 && (
      <div className="mt-3 p-2 bg-yellow-400/10 rounded border border-yellow-400/30">
        <div className="text-xs text-center text-yellow-400 italic">
          🔮 "The wasteland whispers your name today, Bot #{selectedBot.tokenIndex}..."
        </div>
      </div>
    )}
  </div>
  
  {/* Confirm Button */}
  <button className="btn-primary w-full mt-6">
    Enter Race (0.5 ICP)
  </button>
</div>
```

### 4. Race Results with Luck Highlights

```jsx
<div className="race-results">
  {/* Standard results table */}
  <table className="results-table">
    <thead>
      <tr>
        <th>Position</th>
        <th>Bot</th>
        <th>Time</th>
        <th>Prize</th>
        <th>🍀 Luck</th>
      </tr>
    </thead>
    <tbody>
      {results.map((result, i) => (
        <tr key={i}>
          <td>{result.position}</td>
          <td>Bot #{result.tokenIndex}</td>
          <td>{result.finalTime}s</td>
          <td>{result.prize} ICP</td>
          <td>
            {/* Luck proc summary */}
            {result.luckProcs > 0 && (
              <div className="flex gap-1">
                {result.legendaryProcs > 0 && (
                  <span className="luck-badge legendary" title="Legendary procs">
                    ⭐×{result.legendaryProcs}
                  </span>
                )}
                {result.majorProcs > 0 && (
                  <span className="luck-badge major" title="Major procs">
                    🌟×{result.majorProcs}
                  </span>
                )}
                {result.minorProcs > 0 && (
                  <span className="luck-badge minor" title="Minor procs">
                    ✨×{result.minorProcs}
                  </span>
                )}
              </div>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
  
  {/* Luck Highlight Section */}
  <div className="luck-highlights mt-6 p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 rounded-lg border border-purple-500/50">
    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
      <span>🎰</span> Lucky Moments
    </h3>
    
    {luckEvents.map((event, i) => (
      <div 
        key={i}
        className={`luck-event p-3 mb-2 rounded ${getLuckEventClass(event.type)}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {event.type === 'Legendary' && '⭐⭐⭐'}
              {event.type === 'Major' && '🌟'}
              {event.type === 'Minor' && '✨'}
            </span>
            <div>
              <div className="font-bold">
                Segment {event.segmentIndex}: Bot #{event.botId}
              </div>
              <div className="text-sm text-gray-300">
                {event.description}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-green-400">
              +{Math.floor((event.boost - 1) * 100)}%
            </div>
            <div className="text-xs text-gray-400">
              {event.duration} seg{event.duration > 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    ))}
    
    {/* Cosmic Blessing Callout */}
    {cosmicAlignedBots.length > 0 && (
      <div className="cosmic-blessing mt-4 p-3 bg-yellow-400/10 rounded border border-yellow-400/30">
        <div className="text-sm font-bold text-yellow-400 mb-2">
          🌟 Cosmic Blessings Today:
        </div>
        {cosmicAlignedBots.map(bot => (
          <div key={bot.tokenIndex} className="text-xs text-gray-300 mb-1">
            Bot #{bot.tokenIndex} - Affinity: {bot.affinity}/100 ⭐⭐⭐
          </div>
        ))}
      </div>
    )}
  </div>
</div>
```

### 5. Luck Stat Upgrade Screen

```jsx
<div className="upgrade-modal">
  <h2 className="text-2xl font-bold mb-4">Upgrade Luck Stat</h2>
  
  {/* Current Stats */}
  <div className="current-stats mb-6">
    <div className="stat-display">
      <div className="text-sm text-gray-400">Current Luck</div>
      <div className="text-4xl font-bold text-yellow-400">
        {currentLuck}
      </div>
    </div>
    
    <div className="upgrade-arrow">→</div>
    
    <div className="stat-display">
      <div className="text-sm text-gray-400">After Upgrade</div>
      <div className="text-4xl font-bold text-green-400">
        {currentLuck + 1}
      </div>
    </div>
  </div>
  
  {/* Luck Benefits Explanation */}
  <div className="benefits-box p-4 bg-purple-900/30 rounded-lg border border-purple-500/30 mb-6">
    <h3 className="font-bold mb-3">🍀 What Luck Does:</h3>
    <ul className="space-y-2 text-sm text-gray-300">
      <li className="flex items-start gap-2">
        <span className="text-green-400">✓</span>
        <span>Increases chance of lucky moments during races</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-green-400">✓</span>
        <span>Higher chance of major/legendary procs</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-green-400">✓</span>
        <span>Better affinity with cosmic phenomena</span>
      </li>
      <li className="flex items-start gap-2">
        <span className="text-green-400">✓</span>
        <span>Underdog bonus when behind in races</span>
      </li>
    </ul>
  </div>
  
  {/* Proc Chance Preview */}
  <div className="proc-chances grid grid-cols-3 gap-3 mb-6">
    <div className="proc-card p-3 bg-teal-900/30 rounded border border-teal-500/30">
      <div className="text-xs text-gray-400 mb-1">Minor Procs</div>
      <div className="text-2xl font-bold text-teal-400">
        {calculateMinorChance(currentLuck)}%
      </div>
      <div className="text-xs text-gray-400 mt-1">per segment</div>
    </div>
    
    <div className="proc-card p-3 bg-yellow-900/30 rounded border border-yellow-500/30">
      <div className="text-xs text-gray-400 mb-1">Major Procs</div>
      <div className="text-2xl font-bold text-yellow-400">
        {calculateMajorChance(currentLuck)}%
      </div>
      <div className="text-xs text-gray-400 mt-1">per segment</div>
    </div>
    
    <div className="proc-card p-3 bg-purple-900/30 rounded border border-purple-500/30">
      <div className="text-xs text-gray-400 mb-1">Legendary</div>
      <div className="text-2xl font-bold text-purple-400">
        {calculateLegendaryChance(currentLuck)}%
      </div>
      <div className="text-xs text-gray-400 mt-1">per segment</div>
    </div>
  </div>
  
  {/* Cost */}
  <div className="upgrade-cost mb-6 p-4 bg-black/30 rounded">
    <div className="flex justify-between items-center">
      <div>
        <div className="text-sm text-gray-400">Upgrade Cost</div>
        <div className="text-xl font-bold">{upgradeCost} ICP</div>
      </div>
      <div>
        <div className="text-sm text-gray-400">Duration</div>
        <div className="text-xl font-bold">Instant</div>
      </div>
    </div>
  </div>
  
  {/* Confirm */}
  <button className="btn-primary w-full">
    Start Upgrade (Pay with ICP)
  </button>
  <button className="btn-secondary w-full mt-2">
    Pay with Parts ({upgradeCost * 100} parts)
  </button>
</div>
```

---

## Marketing Assets

### 1. Launch Announcement Tweet Thread

```
🎰 Your underdog's day is coming.

We're dropping LUCK into the wasteland. 

A thread on what this means for your bot 👇

1/ 🍀 LUCK is now a 5th stat

Just like Speed, Power, Accel, and Stability... your bot now has LUCK.

High luck = breakthrough moments. The kind that win races.

Upgrade it. Watch it work. Feel the chaos.

2/ 🌟 Every day, the wasteland shifts

13 cosmic phenomena cycle through:
- Solar Flares
- Rust Storms  
- Dead Zones
- Chaos Pulses
... and 9 more

Each day favors different bots. Today might be YOUR bot's day.

3/ ⚡ Mid-race incidents are REAL now

"Bot #4829 discovers a hidden shortcut!"
"Bot #1337 catches a FLOW STATE!"
"Bot #6969 phases through debris!"

These aren't flavor text. These are ACTUAL procs that change race times.

4/ 🔥 Underdogs get spicier chances

Lower position in a race? Higher luck proc chance.

Dead last? Up to 50% more luck opportunities than the leader.

You won't always win. But you'll make it INTERESTING.

5/ 📊 Stats still matter

Top tier bot vs low tier: Still wins 85%+ of the time
Equal tier bots: Luck decides ~25% of outcomes
Cosmic alignment: ~5% win rate boost on your day

This isn't chaos. This is calculated excitement.

6/ 🎯 Three tiers of luck procs:

MINOR (60%): +15% speed, "Lucky dodge!"
MAJOR (30%): +25% speed, "Discovers shortcut!"
LEGENDARY (10%): +40% speed, "FLOW STATE ACTIVATED!"

Each with visual effects. Each tracked. Each EPIC.

7/ 🌈 Check your bot's daily affinity

Every bot has affinity with certain phenomena based on:
- Token index (birth order)
- Faction
- Stats
- Traits

80+ affinity = COSMIC ALIGNMENT = legendary moments incoming

8/ 💰 Can you upgrade luck?

YES. Same as other stats:
- 12 hour timer
- ICP or parts payment
- Progressive cost

Start grinding now. Get that luck to 100.

9/ 🎬 Races are now WATCHABLE

Before: "Bot 1 wins by 2 seconds"
Now: "Bot 5 was dead last, hit 3 major procs, caught FLOW STATE in segment 12, STOLE THE PODIUM"

This is the content.

10/ 🚀 Live NOW on testnet
📅 Mainnet launch: Next week
🎰 First cosmic phenomenon: TBD by launch timestamp

Check your bot's luck stat.
Check today's phenomenon.
Check your affinity.

Your moment is coming.

"I knew he had it in him." 🍀

---

What's your bot's luck stat? Drop token # below 👇
```

### 2. Discord Announcement

```markdown
@everyone 

# 🎰 LUCK HAS ENTERED THE WASTELAND

## What's New:

🍀 **Luck Stat** - Your bot now has a 5th stat: LUCK (30-100 base, upgradeable to 100+)
- Derived from token index + traits + faction
- Increases proc chance for breakthrough moments
- Upgradeable just like other stats (instant, ICP/parts)

🌟 **Daily Cosmic Events** - 13 phenomena on a rotating cycle:
- Solar Flare ☀️ - Favors high power core
- Chaos Pulse ⚡ - Favors high luck  
- Dead Zone 💀 - Favors Dead faction
- ... and 10 more!

⚡ **Mid-Race Incidents** - Luck procs during races:
- **Minor** (60%): +15% speed for 1 segment
- **Major** (30%): +25% speed for 3 segments  
- **Legendary** (10%): +40% speed for 5 segments

🔥 **Underdog Energy** - Lower positions get +50% more luck chances

## How to Check:

1. Visit garage: See your luck stat
2. Check today's phenomenon: Top banner on racing page
3. View your affinity: Shows in bot card (0-100)
4. 80+ affinity = ⭐⭐⭐ COSMIC ALIGNMENT

## FAQ:

**Q: Does this break balance?**
A: No. Top tier still wins 85%+ vs lower tiers. Luck decides ~10-15% of outcomes.

**Q: Can I miss my cosmic day?**
A: Each bot has affinity with multiple phenomena. Plus the cycle repeats every 13 days.

**Q: How much does luck stat matter?**
A: 30 luck = 6% proc chance per segment
    70 luck = 14% proc chance per segment
    100 luck = 20% proc chance per segment

**Q: What about legendary procs?**
A: Rare (<1% of segments) but DRAMATIC when they happen. Need high luck + affinity.

## Testnet Live Now

Try it out: [testnet-link]
Mainnet launch: Next week

Check your bot's luck. Your day is coming. 🍀
```

### 3. In-App Tutorial Tooltips

```jsx
// Luck Stat Tooltip
<Tooltip title="luck-stat">
  <h4>🍀 Luck Stat</h4>
  <p>Controls your bot's chance for breakthrough moments during races.</p>
  
  <div className="tooltip-section">
    <strong>What It Does:</strong>
    <ul>
      <li>Increases lucky proc chance (shortcuts, boosts, flow states)</li>
      <li>Improves daily cosmic affinity</li>
      <li>Scales with underdog position (up to +50% when behind)</li>
    </ul>
  </div>
  
  <div className="tooltip-section">
    <strong>Proc Types:</strong>
    <ul>
      <li>✨ Minor: +15% speed (common)</li>
      <li>🌟 Major: +25% speed (uncommon)</li>
      <li>⭐ Legendary: +40% speed (rare)</li>
    </ul>
  </div>
  
  <div className="tooltip-section">
    <strong>Upgrade:</strong>
    <p>Same cost as other stats (instant, ICP/parts)</p>
  </div>
</Tooltip>

// Daily Affinity Tooltip
<Tooltip title="daily-affinity">
  <h4>🌟 Daily Affinity</h4>
  <p>How well your bot aligns with today's cosmic phenomenon.</p>
  
  <div className="tooltip-section">
    <strong>Affinity Levels:</strong>
    <ul>
      <li>0-39: Low (no bonus)</li>
      <li>40-59: ⭐ Decent (+8% luck chance)</li>
      <li>60-79: ⭐⭐ Strong (+12% luck chance)</li>
      <li>80-100: ⭐⭐⭐ COSMIC ALIGNMENT! (+16% luck chance)</li>
    </ul>
  </div>
  
  <div className="tooltip-section">
    <strong>Based On:</strong>
    <ul>
      <li>Your stats (relevant to today's phenomenon)</li>
      <li>Token index (birth number patterns)</li>
      <li>Faction (some phenomena favor certain factions)</li>
    </ul>
  </div>
  
  <div className="tooltip-section">
    <strong>Strategy:</strong>
    <p>Check your affinity before entering races. High affinity days = better chances!</p>
  </div>
</Tooltip>

// Cosmic Phenomenon Tooltip
<Tooltip title="cosmic-phenomenon">
  <h4>{phenomenon.emoji} {phenomenon.name}</h4>
  <p>{phenomenon.description}</p>
  
  <div className="tooltip-section">
    <strong>Favors:</strong>
    <ul>
      {phenomenon.favors.map(f => (
        <li key={f}>{f}</li>
      ))}
    </ul>
  </div>
  
  <div className="tooltip-section">
    <strong>Cycle:</strong>
    <p>Phenomena rotate every 13 days. This one returns in {daysUntilNext} days.</p>
  </div>
</Tooltip>
```

---

## Animations & Visual Effects

### 1. Luck Proc Visual Effects

```tsx
// Minor Proc - Sparkle effect
<motion.div
  initial={{ scale: 0, rotate: 0 }}
  animate={{ scale: [0, 1.5, 1], rotate: [0, 180, 360] }}
  transition={{ duration: 0.8 }}
  className="luck-proc-minor"
>
  ✨
</motion.div>

// Major Proc - Star burst
<motion.div
  initial={{ scale: 0, opacity: 1 }}
  animate={{ 
    scale: [0, 2, 1.5],
    opacity: [1, 1, 0]
  }}
  transition={{ duration: 1.2 }}
  className="luck-proc-major"
>
  🌟
  <motion.div
    className="burst-rays"
    initial={{ rotate: 0 }}
    animate={{ rotate: 360 }}
    transition={{ duration: 1.2, ease: "linear" }}
  />
</motion.div>

// Legendary Proc - Epic explosion
<motion.div
  initial={{ scale: 0, opacity: 1 }}
  animate={{ 
    scale: [0, 3, 2],
    opacity: [1, 1, 0.8]
  }}
  transition={{ duration: 2 }}
  className="luck-proc-legendary"
>
  <motion.div
    className="legendary-aura"
    animate={{
      boxShadow: [
        "0 0 20px #ff00ff",
        "0 0 60px #ff00ff",
        "0 0 40px #ff00ff"
      ]
    }}
    transition={{ duration: 0.5, repeat: Infinity }}
  >
    ⭐⭐⭐
  </motion.div>
  <motion.div
    className="legendary-text"
    initial={{ y: 20, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    transition={{ delay: 0.5 }}
  >
    FLOW STATE!
  </motion.div>
</motion.div>
```

### 2. Affinity Glow Effect

```css
/* Low affinity - no glow */
.affinity-none {
  border: 1px solid #666;
}

/* Medium affinity - subtle glow */
.affinity-medium {
  border: 2px solid #50C878;
  box-shadow: 0 0 10px rgba(80, 200, 120, 0.3);
  animation: pulse-soft 2s infinite;
}

/* High affinity - strong glow */
.affinity-high {
  border: 2px solid #FFD700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  animation: pulse-strong 1.5s infinite;
}

/* Cosmic alignment - epic glow */
.affinity-cosmic {
  border: 3px solid #FF00FF;
  box-shadow: 
    0 0 30px rgba(255, 0, 255, 0.6),
    inset 0 0 20px rgba(255, 0, 255, 0.3);
  animation: cosmic-pulse 1s infinite;
}

@keyframes pulse-soft {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

@keyframes pulse-strong {
  0%, 100% { 
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }
  50% { 
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.8);
  }
}

@keyframes cosmic-pulse {
  0%, 100% { 
    box-shadow: 
      0 0 30px rgba(255, 0, 255, 0.6),
      inset 0 0 20px rgba(255, 0, 255, 0.3);
  }
  50% { 
    box-shadow: 
      0 0 60px rgba(255, 0, 255, 0.9),
      inset 0 0 40px rgba(255, 0, 255, 0.5);
  }
}
```

### 3. Phenomenon Banner Animation

```css
.cosmic-banner {
  position: relative;
  overflow: hidden;
}

.cosmic-bg {
  background: linear-gradient(
    135deg,
    var(--cosmic-color-1) 0%,
    var(--cosmic-color-2) 100%
  );
  position: relative;
}

.cosmic-bg::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(
    45deg,
    transparent,
    rgba(255, 255, 255, 0.1),
    transparent
  );
  animation: shimmer 3s infinite;
}

@keyframes shimmer {
  0% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
  100% { transform: translateX(100%) translateY(100%) rotate(45deg); }
}

/* Floating particles effect */
.cosmic-particles {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: float 10s infinite;
}

@keyframes float {
  0% {
    transform: translateY(100vh) translateX(0);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) translateX(100px);
    opacity: 0;
  }
}
```

---

## User Journey Flows

### First-Time User Experience

```
1. User logs in → See banner: "🎰 NEW: Luck System!"
   ↓
2. Click banner → Modal explaining luck system
   - What is luck?
   - How do cosmic events work?
   - How to check affinity?
   ↓
3. Visit garage → See new luck stat on their bots
   - Tooltip explains what it does
   - Shows current affinity for today
   - Calls out if affinity is high (60+)
   ↓
4. Check racing page → Daily phenomenon banner prominent
   - Shows what favors today
   - Their bot's affinity highlighted if relevant
   ↓
5. Enter race → Affinity preview in entry modal
   - "Your bot has 85/100 affinity today!"
   - Predicted boost shown
   ↓
6. Watch race → See luck procs happen
   - Visual effects for each proc
   - Commentary mentions lucky moments
   ↓
7. View results → Luck highlights section
   - See all procs that happened
   - Cosmic alignment called out if relevant
   ↓
8. Return next day → Different phenomenon!
   - Check which bots have high affinity today
```

### Power User Experience

```
Daily Routine:
1. Check today's phenomenon (6am)
2. Review bot affinity scores
3. Plan which bots to race today
4. Upgrade luck on aligned bots
5. Enter races strategically
6. Track luck proc stats over time

Weekly Goals:
- Hit 3+ cosmic alignment days
- Get at least 1 legendary proc
- Win an underdog race via luck
- Upgrade luck to 80+ on main bots

Monthly Achievements:
- "Lucky Streak" - 5 legendary procs in a month
- "Cosmic Master" - Win on 10+ different phenomena
- "Fortune's Favorite" - Win with 85+ affinity
```

---

This comprehensive UI/UX design document provides all the visual and interaction patterns needed to make the luck system feel magical and exciting while remaining clear and understandable. The marketing materials set the right tone: **chaotic but calculated, exciting but fair**.
