import { useState, useEffect } from 'react';
import { APLRule, getAbilitiesForBot, Faction, Class } from '../lib/combat-engine';

interface APLEditorProps {
  botName: string;
  botFaction: Faction;
  botClass: Class;
  apl: APLRule[];
  onAPLChange: (newAPL: APLRule[]) => void;
}

export function APLEditor({ botName, botFaction, botClass, apl, onAPLChange }: APLEditorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [availableAbilities, setAvailableAbilities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Get all abilities this bot has access to
    const abilities = getAbilitiesForBot(botFaction, botClass);
    setAvailableAbilities(abilities.map(a => ({ id: a.id, name: a.name || a.id })));
  }, [botFaction, botClass]);

  const addRule = () => {
    const newRule: APLRule = {
      condition: 'always',
      abilityId: availableAbilities[0]?.id || 'basic_attack'
    };
    onAPLChange([...apl, newRule]);
  };

  const updateRule = (index: number, field: keyof APLRule, value: string) => {
    const newAPL = [...apl];
    newAPL[index] = { ...newAPL[index], [field]: value };
    onAPLChange(newAPL);
  };

  const deleteRule = (index: number) => {
    onAPLChange(apl.filter((_, i) => i !== index));
  };

  const moveRuleUp = (index: number) => {
    if (index <= 0) return;
    const newAPL = [...apl];
    [newAPL[index - 1], newAPL[index]] = [newAPL[index], newAPL[index - 1]];
    onAPLChange(newAPL);
  };

  const moveRuleDown = (index: number) => {
    if (index >= apl.length - 1) return;
    const newAPL = [...apl];
    [newAPL[index], newAPL[index + 1]] = [newAPL[index + 1], newAPL[index]];
    onAPLChange(newAPL);
  };

  const conditionTemplates = [
    'always',
    'hp < 20%',
    'hp < 30%',
    'hp < 50%',
    'hp < 80%',
    'resource >= 100',
    'resource >= 80',
    'resource >= 40',
    'ally_hp < 20%',
    'ally_hp < 30%',
    'ally_hp < 50%',
    'ally_hp < 80%',
    'enemy_hp < 20%',
    'enemy_hp < 30%',
    'enemy_hp < 50%',
    'tank_threat > 20',
    'tank_threat > 50',
    'tank_threat > 100',
    'tank_threat > 150',
    'tank_threat > threat * 2',
    'threat > tank_threat * 0.4',
    'threat > tank_threat * 0.7',
    'ally_threat > tank_threat * 0.7',
    'in_melee_range'
  ];

  return (
    <div className="border border-border rounded-lg p-4 bg-card">
      <div 
        className="flex justify-between items-center cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-semibold text-lg">
          📋 APL for {botName}
        </h3>
        <button className="text-2xl hover:text-primary">
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-4 space-y-3">
          <div className="text-sm text-muted-foreground mb-3 space-y-1">
            <p><strong>Action Priority List</strong> - Rules are evaluated in order. First matching condition executes.</p>
            <p className="text-xs">
              <strong>Common Conditions:</strong> hp &lt; X%, resource &gt;= X, ally_hp &lt; X%, enemy_hp &lt; X%, tank_threat &gt; X, threat &gt; tank_threat * X, in_melee_range, always
            </p>
            <p className="text-xs">
              <strong>Compound Conditions:</strong> Use AND to combine (e.g., "ally_hp &lt; 50% AND tank_threat &gt; 150")
            </p>
          </div>

          {apl.length === 0 && (
            <p className="text-muted-foreground italic">No rules defined. Add a rule to get started.</p>
          )}

          {apl.map((rule, index) => (
            <div key={index} className="border border-border rounded p-3 bg-background">
              <div className="flex items-start gap-2">
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => moveRuleUp(index)}
                    disabled={index === 0}
                    className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs"
                    title="Move up"
                  >
                    ▲
                  </button>
                  <button
                    onClick={() => moveRuleDown(index)}
                    disabled={index === apl.length - 1}
                    className="px-2 py-0.5 bg-secondary hover:bg-secondary/80 disabled:opacity-30 disabled:cursor-not-allowed rounded text-xs"
                    title="Move down"
                  >
                    ▼
                  </button>
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-16">Rule {index + 1}</label>
                    <span className="text-xs text-muted-foreground">(Priority: {index + 1})</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-16">IF:</label>
                    <input
                      type="text"
                      value={rule.condition}
                      onChange={(e) => updateRule(index, 'condition', e.target.value)}
                      className="flex-1 px-2 py-1 border border-input rounded text-sm bg-background font-mono"
                      placeholder="Enter condition (e.g., ally_hp < 50%)"
                      list={`conditions-${index}`}
                    />
                    <datalist id={`conditions-${index}`}>
                      {conditionTemplates.map(cond => (
                        <option key={cond} value={cond} />
                      ))}
                    </datalist>
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium w-16">CAST:</label>
                    <select
                      value={rule.abilityId}
                      onChange={(e) => updateRule(index, 'abilityId', e.target.value)}
                      className="flex-1 px-2 py-1 border border-input rounded text-sm bg-background"
                    >
                      {availableAbilities.map(ability => (
                        <option key={ability.id} value={ability.id}>{ability.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={() => deleteRule(index)}
                  className="px-3 py-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded text-sm"
                  title="Delete rule"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={addRule}
            className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded font-medium"
          >
            + Add Rule
          </button>
        </div>
      )}
    </div>
  );
}
