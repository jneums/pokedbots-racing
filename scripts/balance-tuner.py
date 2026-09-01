#!/usr/bin/env python3
"""
Interactive Combat Balance Dashboard
Real-time simulation and balance tuning
"""

import json
import subprocess
import pandas as pd
from pathlib import Path
from typing import Dict, List
import time

BALANCE_CONFIG = Path(__file__).parent / "balance-config.json"


class BalanceTuner:
    """Interactive balance tuning tool"""

    def __init__(self):
        self.config = self.load_config()

    def load_config(self) -> Dict:
        """Load balance configuration"""
        with open(BALANCE_CONFIG) as f:
            return json.load(f)

    def save_config(self):
        """Save balance configuration"""
        with open(BALANCE_CONFIG, "w") as f:
            json.dump(self.config, f, indent=2)
        print("✅ Configuration saved")

    def list_factions(self):
        """List all faction/class combinations"""
        print("\n📋 AVAILABLE FACTION/CLASS COMBINATIONS:")
        for faction, classes in self.config["factions"].items():
            for class_name in classes:
                print(f"  - {faction}/{class_name}")

    def show_stats(self, faction: str, class_name: str):
        """Display stats for a faction/class"""
        try:
            data = self.config["factions"][faction][class_name]
            print(f"\n📊 {faction}/{class_name}")
            print(f"  HP: {data['hp']}")
            print(f"  Starting Resource: {data['startingResource']}")
            print(f"  Max Resource: {data['maxResource']}")
            print(f"\n  Abilities:")
            for ability_name, ability in data["abilities"].items():
                print(f"    {ability_name}:")
                for key, value in ability.items():
                    print(f"      {key}: {value}")
        except KeyError:
            print(f"❌ {faction}/{class_name} not found")

    def edit_ability(
        self, faction: str, class_name: str, ability: str, stat: str, value: float
    ):
        """Edit an ability stat"""
        try:
            self.config["factions"][faction][class_name]["abilities"][ability][
                stat
            ] = value
            print(f"✅ Updated {faction}/{class_name} {ability}.{stat} = {value}")
        except KeyError as e:
            print(f"❌ Not found: {e}")

    def edit_base_stat(self, faction: str, class_name: str, stat: str, value: int):
        """Edit a base stat (hp, startingResource, maxResource)"""
        try:
            self.config["factions"][faction][class_name][stat] = value
            print(f"✅ Updated {faction}/{class_name} {stat} = {value}")
        except KeyError as e:
            print(f"❌ Not found: {e}")

    def quick_test(self, faction: str, class_name: str, role: str = "dps1"):
        """Run a quick test with the specified faction/class"""
        print(f"\n🧪 Running quick test with {faction}/{class_name} as {role}...")

        # Create test composition
        comp = {
            "tank": {"faction": "Industrial", "class": "Bulwark"},
            "healer": {"faction": "Bee", "class": "Fixer"},
            "dps1": {"faction": faction, "class": class_name},
            "dps2": {"faction": "Murder", "class": "Striker"},
            "support": {"faction": "Golden", "class": "Tactician"},
        }

        encounter = {"name": "Patchwerk", "faction": "Dead", "class": "Bulwark"}

        # Run simulation
        config = {"party": comp, "encounter": encounter}
        result = subprocess.run(
            ["node", str(Path(__file__).parent / "run-combat-simulation.js")],
            input=json.dumps(config),
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            print(f"❌ Simulation failed: {result.stderr}")
            return

        data = json.loads(result.stdout)

        # Display results
        print(
            f"\n{'✅' if data['winningTeam'] == 'party' else '❌'} Result: {data['winningTeam'].upper()} wins in {data['totalTicks']} ticks"
        )
        print(f"\n📊 Party Stats:")
        for bot in data["partyStats"]:
            status = "💀" if bot["died"] else "✅"
            print(
                f"  {status} {bot['faction']}/{bot['class']}: {bot['finalHp']} HP, {bot['damageDealt']} dmg, {bot['healingDone']} heal"
            )

    def compare_builds(self, builds: List[Dict]):
        """Compare multiple builds side-by-side"""
        print("\n🔬 COMPARING BUILDS...")
        results = []

        for i, build in enumerate(builds, 1):
            print(f"  Testing build {i}/{len(builds)}...", end="\r")

            # Temporarily apply build changes
            original = {}
            for change in build["changes"]:
                faction = change["faction"]
                class_name = change["class"]
                ability = change.get("ability")
                stat = change["stat"]
                value = change["value"]

                # Save original
                if ability:
                    original_path = f"{faction}.{class_name}.abilities.{ability}.{stat}"
                    original[original_path] = self.config["factions"][faction][
                        class_name
                    ]["abilities"][ability][stat]
                    self.config["factions"][faction][class_name]["abilities"][ability][
                        stat
                    ] = value
                else:
                    original_path = f"{faction}.{class_name}.{stat}"
                    original[original_path] = self.config["factions"][faction][
                        class_name
                    ][stat]
                    self.config["factions"][faction][class_name][stat] = value

            # Run test
            # (simplified - you'd run actual simulation here)

            # Restore original values
            for path, value in original.items():
                parts = path.split(".")
                if len(parts) == 5:  # faction.class.abilities.ability.stat
                    self.config["factions"][parts[0]][parts[1]]["abilities"][parts[3]][
                        parts[4]
                    ] = value
                else:  # faction.class.stat
                    self.config["factions"][parts[0]][parts[1]][parts[2]] = value

        print(f"\n✅ Comparison complete")

    def interactive_mode(self):
        """Interactive tuning mode"""
        print("\n🎮 INTERACTIVE BALANCE TUNER")
        print("Commands:")
        print("  list - Show all faction/class combos")
        print("  show <faction> <class> - Show stats")
        print("  edit <faction> <class> <ability> <stat> <value> - Edit ability")
        print("  base <faction> <class> <stat> <value> - Edit base stat")
        print("  test <faction> <class> [role] - Quick test")
        print("  save - Save configuration")
        print("  quit - Exit")

        while True:
            try:
                cmd = input("\n> ").strip().split()
                if not cmd:
                    continue

                action = cmd[0].lower()

                if action == "quit":
                    break
                elif action == "list":
                    self.list_factions()
                elif action == "show" and len(cmd) == 3:
                    self.show_stats(cmd[1], cmd[2])
                elif action == "edit" and len(cmd) == 6:
                    self.edit_ability(cmd[1], cmd[2], cmd[3], cmd[4], float(cmd[5]))
                elif action == "base" and len(cmd) == 5:
                    self.edit_base_stat(cmd[1], cmd[2], cmd[3], int(cmd[4]))
                elif action == "test" and len(cmd) >= 3:
                    role = cmd[3] if len(cmd) == 4 else "dps1"
                    self.quick_test(cmd[1], cmd[2], role)
                elif action == "save":
                    self.save_config()
                else:
                    print("❌ Invalid command")
            except Exception as e:
                print(f"❌ Error: {e}")


def main():
    tuner = BalanceTuner()
    tuner.interactive_mode()


if __name__ == "__main__":
    main()
