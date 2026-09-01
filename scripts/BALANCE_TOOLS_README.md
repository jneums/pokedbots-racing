# Combat Balance Tools

Python-based combat balance analysis and tuning system for PokedBots Brawl.

## Setup

```bash
# Install dependencies
pip install pandas numpy

# Make scripts executable
chmod +x scripts/combat-balance-analyzer.py
chmod +x scripts/balance-tuner.py
```

## Tools

### 1. Combat Balance Analyzer

Runs 100+ simulations per composition, identifies balance issues, generates reports.

```bash
python scripts/combat-balance-analyzer.py
```

**Output:**
- `balance-results/balance-results.csv` - Raw simulation data
- `balance-results/balance-summary.json` - Summary with issues
- Console report with win rates, survival rates, balance issues

**What it analyzes:**
- Win rates by composition (target: 60-95%)
- Fight duration (target: 100-300 ticks)
- Tank survival rate (target: >80%)
- Healer mana efficiency (target: >15 final mana)
- DPS variance
- Resource efficiency

### 2. Balance Tuner (Interactive)

Interactive CLI for quick edits and testing.

```bash
python scripts/balance-tuner.py
```

**Commands:**
```
> list                                          # Show all faction/class combos
> show Murder Striker                           # Display stats
> edit Murder Striker spender damage 90         # Edit ability damage
> base Bee Fixer hp 650                         # Edit base HP
> test Murder Striker dps1                      # Quick test fight
> save                                          # Save changes
> quit                                          # Exit
```

### 3. Balance Configuration

Edit `scripts/balance-config.json` to tune all abilities:

```json
{
  "factions": {
    "Murder": {
      "Striker": {
        "hp": 700,
        "abilities": {
          "basic": {
            "damage": 30,
            "cost": 0,
            "resourceGeneration": 10,
            "cooldown": 3
          },
          "spender": {
            "damage": 80,
            "cost": 50
          }
        }
      }
    }
  },
  "tuningKnobs": {
    "global": {
      "damageMultiplier": 1.0,
      "healingMultiplier": 1.0
    }
  }
}
```

## Workflow

### Iteration Loop

1. **Analyze current state**
   ```bash
   python scripts/combat-balance-analyzer.py
   ```

2. **Review issues**
   ```
   ⚠️  standard: Healer low on mana (8.3) - mana issues
   ⚠️  double_tank: Tank dies in 62% of wins - survivability issues
   ```

3. **Make changes**
   ```bash
   python scripts/balance-tuner.py
   > edit Bee Fixer spender cost 25          # Reduce heal cost
   > test Bee Fixer healer                    # Quick test
   > save
   ```

4. **Re-analyze**
   ```bash
   python scripts/combat-balance-analyzer.py
   ```

5. **Repeat until balanced**

### Priority Order

1. **Role viability** - Can each role function?
   - Tanks survive long enough?
   - Healers have mana to heal?
   - DPS deal competitive damage?

2. **Composition balance** - Do comps win 60-95%?

3. **Fight pacing** - 100-300 tick fights?

4. **Fine tuning** - Optimize specific abilities

## Balance Targets

From `balance-config.json`:

- **Win Rate**: 60-95% (standard composition vs boss)
- **Fight Duration**: 100-300 ticks
- **Tank Survival**: >80% in winning fights
- **Healer Mana**: >15 final mana average
- **DPS Variance**: All DPS within 15% of each other

## Adding New Tests

Edit `COMPOSITIONS` in `combat-balance-analyzer.py`:

```python
COMPOSITIONS = {
    "all_dps": {
        "dps1": {"faction": "Murder", "class": "Striker"},
        "dps2": {"faction": "Murder", "class": "Striker"},
        "dps3": {"faction": "Murder", "class": "Striker"},
        "dps4": {"faction": "Murder", "class": "Striker"},
        "dps5": {"faction": "Murder", "class": "Striker"}
    }
}
```

Edit `ENCOUNTERS`:

```python
ENCOUNTERS = {
    "heal_check": {
        "name": "Heal Check Boss",
        "faction": "Murder",
        "class": "Striker",
        "description": "High damage test"
    }
}
```

## Exporting to Combat Engine

Once balanced, update `combat-engine.ts` with values from `balance-config.json`:

```typescript
const FACTION_CLASS_ABILITIES = {
  Murder: {
    Striker: {
      basicAttack: {
        damage: 30,  // from balance-config.json
        resourceGeneration: 10,
        cooldown: 3
      }
    }
  }
};
```

## Tips

- Run analyzer after every balance change
- Use balance-tuner for quick iteration
- Keep balance-config.json as source of truth
- Export to combat-engine.ts when satisfied
- Focus on one issue at a time
- Test edge cases (no healer, double tank, etc.)
