import PokedBotsGarage "../PokedBotsGarage";

module {
  // Get faction-specific flavor text for various events
  public func getFactionGreeting(faction : PokedBotsGarage.FactionType) : Text {
    switch (faction) {
      case (#BattleBot) { "⚔️ **BATTLE PROTOCOLS ACTIVE**" };
      case (#EntertainmentBot) { "🎭 **SHOWTIME SUBROUTINES ENGAGED**" };
      case (#WildBot) { "🦾 **FERAL CIRCUITS ONLINE**" };
      case (#GodClass) { "👑 **DIVINE SYSTEMS INITIALIZED**" };
      case (#Master) { "🎯 **MASTER PROTOCOLS EXECUTING**" };
    };
  };

  public func getStatusFlavor(status : Text, faction : PokedBotsGarage.FactionType) : Text {
    if (status == "Critical Malfunction") {
      switch (faction) {
        case (#BattleBot) {
          "⚠️ **COMBAT INEFFECTIVE** - Systems failing, request immediate repair bay access";
        };
        case (#EntertainmentBot) {
          "💀 **PERFORMANCE CANCELLED** - Critical damage to entertainment modules";
        };
        case (#WildBot) {
          "🔥 **SYSTEMS DYING** - Chaotic failures across all circuits";
        };
        case (#GodClass) {
          "⚡ **DIVINITY FADING** - Even the gods can fall without maintenance";
        };
        case (#Master) {
          "🚨 **MASTER OVERRIDE REQUIRED** - Emergency protocols engaged";
        };
      };
    } else if (status == "Needs Repair") {
      switch (faction) {
        case (#BattleBot) {
          "🔧 **BATTLE DAMAGE DETECTED** - Armor plating compromised";
        };
        case (#EntertainmentBot) {
          "🎪 **STAGE WEAR** - Performance modules degrading";
        };
        case (#WildBot) {
          "⚙️ **SCRAP PARTS FAILING** - Salvaged components breaking down";
        };
        case (#GodClass) {
          "✨ **MINOR IMPERFECTIONS** - Beneath our standards";
        };
        case (#Master) {
          "📋 **SCHEDULED MAINTENANCE** - Optimal performance requires care";
        };
      };
    } else if (status == "Low Battery") {
      switch (faction) {
        case (#BattleBot) {
          "🔋 **POWER RESERVES DEPLETED** - Energy cells critical";
        };
        case (#EntertainmentBot) {
          "💡 **LIGHTS DIMMING** - Can't put on a show without juice";
        };
        case (#WildBot) {
          "⚡ **RUNNING ON FUMES** - Chaotic energy nearly exhausted";
        };
        case (#GodClass) {
          "🌟 **DIVINE ESSENCE LOW** - Celestial power waning";
        };
        case (#Master) {
          "📊 **POWER OPTIMIZATION NEEDED** - Efficiency dropping";
        };
      };
    } else if (status == "Ready") {
      switch (faction) {
        case (#BattleBot) {
          "⚔️ **BATTLE READY** - All weapons systems operational";
        };
        case (#EntertainmentBot) {
          "🎭 **READY TO PERFORM** - The wasteland awaits your show";
        };
        case (#WildBot) {
          "🔥 **WILD AND READY** - Chaos incarnate, primed for action";
        };
        case (#GodClass) {
          "👑 **DIVINE PERFECTION** - Superior systems at peak performance";
        };
        case (#Master) {
          "🎯 **OPTIMAL STATUS** - All systems green, ready for deployment";
        };
      };
    } else {
      switch (faction) {
        case (#BattleBot) {
          "⚙️ **MAINTENANCE REQUIRED** - Combat efficiency suboptimal";
        };
        case (#EntertainmentBot) {
          "🎪 **INTERMISSION** - Need tuning before the next act";
        };
        case (#WildBot) {
          "🦾 **NEEDS ATTENTION** - Even wild machines need care";
        };
        case (#GodClass) {
          "✨ **BELOW STANDARDS** - Perfection demands maintenance";
        };
        case (#Master) {
          "📋 **SERVICE DUE** - Scheduled maintenance recommended";
        };
      };
    };
  };

  public func getUpgradeFlavor(upgradeType : PokedBotsGarage.UpgradeType, faction : PokedBotsGarage.FactionType) : Text {
    let baseText = switch (upgradeType) {
      case (#Velocity) { "⚡ **VELOCITY MODULE**" };
      case (#PowerCore) { "🔋 **POWER CORE**" };
      case (#Thruster) { "🚀 **THRUSTER ARRAY**" };
      case (#Gyro) { "🎯 **GYRO STABILIZER**" };
    };

    let factionNote = switch (faction) {
      case (#BattleBot) { " - Battle-tested components from the frontlines" };
      case (#EntertainmentBot) {
        " - Showroom-quality parts scavenged from Delta City";
      };
      case (#WildBot) { " - Unstable but powerful wasteland salvage" };
      case (#GodClass) { " - Divine technology, superior construction" };
      case (#Master) { " - Precision-engineered from ancient blueprints" };
    };

    baseText # factionNote;
  };

  public func getReputationTier(reputation : Nat) : Text {
    if (reputation == 0) {
      "🔰 **UNKNOWN** - No reputation in the wasteland";
    } else if (reputation < 10) {
      "🌑 **SCAVENGER** - Fresh to the wasteland circuit";
    } else if (reputation < 25) {
      "🌒 **SALVAGER** - Making a name in the scrap heaps";
    } else if (reputation < 50) {
      "🌓 **RAIDER** - Respected among the wasteland gangs";
    } else if (reputation < 100) {
      "🌔 **VETERAN** - Battle-hardened and proven";
    } else if (reputation < 200) {
      "🌕 **CHAMPION** - Legend of the wasteland tracks";
    } else {
      "💫 **WASTELAND LEGEND** - Name spoken in hushed tones at Delta City";
    };
  };

  public func getDecayMessage(faction : PokedBotsGarage.FactionType) : Text {
    switch (faction) {
      case (#BattleBot) {
        "⚠️ Battle wear detected - your BattleBot's systems are degrading from neglect";
      };
      case (#EntertainmentBot) {
        "🎭 Without maintenance, your performer's circuits grow dull";
      };
      case (#WildBot) {
        "🔥 The chaos within accelerates decay - Wild Bots degrade 20% faster!";
      };
      case (#GodClass) {
        "✨ Divine construction resists decay better than common machines (-30%)";
      };
      case (#Master) {
        "📋 Precision engineering maintains integrity, but decay is inevitable";
      };
    };
  };

  public func getWastelandQuote() : Text {
    let quotes = [
      "💀 \"In the wasteland, only the strongest circuits survive.\" - Delta City Mechanic",
      "⚡ \"Race fast, die young, leave a rusty chassis.\" - Wild Bot Proverb",
      "👑 \"We are the inheritors of Earth's machines. We are perfection.\" - God Class Manifesto",
      "🎭 \"Every race is a performance. Make it spectacular.\" - Entertainment Bot Creed",
      "⚔️ \"Built for war, racing for glory.\" - BattleBot Code",
      "🌍 \"The old world died. We race through its bones.\" - Wasteland Saying",
      "🔧 \"A well-maintained bot is a dangerous bot.\" - Garage Master Wisdom",
      "🏁 \"The Silent Klan sees all. They control the races.\" - Delta City Rumor",
      "⚙️ \"Scrap today, champion tomorrow.\" - Scavenger's Hope",
      "🎯 \"Precision beats chaos. Usually.\" - Master Protocol #47",
    ];

    // Return a quote based on some pseudo-random selection
    quotes[0]; // For now, return first one. Could add randomization later
  };
};
