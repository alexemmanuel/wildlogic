import {
  BiomeType,
  WeatherType,
  TileType,
  GridTile,
  EnemyUnit,
  EnemyType,
  EnemyIntent,
  PlayerUnit,
  CompanionUnit,
  CompanionId,
  CompanionStats,
  DeployableUnit,
  LogicCard,
  ExpeditionNode,
  GameState,
  FloatingText,
  CombatLogEntry,
} from '../types/game';

// Companions Catalog
export const COMPANIONS_CATALOG: Record<CompanionId, CompanionStats> = {
  cheetah: {
    id: 'cheetah',
    name: 'Volt-Cheetah V3',
    species: 'Acinonyx Cybernetica',
    role: 'Flanker / Scout',
    maxHp: 22,
    currentHp: 22,
    attackPower: 5,
    defense: 1,
    movement: 4,
    portrait: '🐆',
    passiveName: 'Overclocked Reflexes',
    passiveDesc: 'Can move up to 4 tiles. Gains +2 attack when striking from the flank or behind.',
    color: '#fbbf24',
  },
  pangolin: {
    id: 'pangolin',
    name: 'Aegis Pangolin',
    species: 'Manis Ferrum',
    role: 'Bulwark / Tank',
    maxHp: 32,
    currentHp: 32,
    attackPower: 3,
    defense: 3,
    movement: 2,
    portrait: '🛡️',
    passiveName: 'Reactive Carapace',
    passiveDesc: 'Absorbs 3 damage from any attack. Can curl into invulnerable fortress mode.',
    color: '#06b6d4',
  },
  falcon: {
    id: 'falcon',
    name: 'Sky-Falcon Recon',
    species: 'Falco Solaris',
    role: 'Recon / Disruptor',
    maxHp: 18,
    currentHp: 18,
    attackPower: 4,
    defense: 0,
    movement: 5,
    portrait: '🦅',
    passiveName: 'Aerial Target-Lock',
    passiveDesc: 'Reveals all stealthed predators and marks targets for +50% critical damage.',
    color: '#10b981',
  },
};

// Initial Library of Logic Subroutine Cards
export const STARTER_DECK: LogicCard[] = [
  {
    id: 'kinetic_strike_1',
    name: 'Kinetic Strike',
    cost: 1,
    type: 'kinetic',
    rarity: 'common',
    targetType: 'enemy',
    range: 2,
    effectValue: 5,
    description: 'Deliver high-impact rail slug dealing 5 damage and knocking enemy back 1 tile.',
    iconName: 'Zap',
    tagline: 'Standard railgun pulse with kinetic recoil impact.',
  },
  {
    id: 'kinetic_strike_2',
    name: 'Kinetic Strike',
    cost: 1,
    type: 'kinetic',
    rarity: 'common',
    targetType: 'enemy',
    range: 2,
    effectValue: 5,
    description: 'Deliver high-impact rail slug dealing 5 damage and knocking enemy back 1 tile.',
    iconName: 'Zap',
    tagline: 'Standard railgun pulse with kinetic recoil impact.',
  },
  {
    id: 'hardlight_shield_1',
    name: 'Hardlight Shield',
    cost: 1,
    type: 'tactical',
    rarity: 'common',
    targetType: 'ally',
    range: 3,
    effectValue: 6,
    description: 'Project energy shielding to Operator or Companion, absorbing 6 incoming damage.',
    iconName: 'Shield',
    tagline: 'Defensive photonic field.',
  },
  {
    id: 'hardlight_shield_2',
    name: 'Hardlight Shield',
    cost: 1,
    type: 'tactical',
    rarity: 'common',
    targetType: 'ally',
    range: 3,
    effectValue: 6,
    description: 'Project energy shielding to Operator or Companion, absorbing 6 incoming damage.',
    iconName: 'Shield',
    tagline: 'Defensive photonic field.',
  },
  {
    id: 'arc_pulse_1',
    name: 'Arc Pulse',
    cost: 2,
    type: 'energy',
    rarity: 'rare',
    targetType: 'enemy',
    range: 3,
    effectValue: 6,
    description: 'Discharge 6 shock damage. If target is in or adjacent to Conductive Pool, shocks all linked enemies!',
    iconName: 'Activity',
    tagline: 'Ionized discharge that exploits environmental water.',
  },
  {
    id: 'cryo_snare_1',
    name: 'Cryo Snare',
    cost: 1,
    type: 'tactical',
    rarity: 'common',
    targetType: 'enemy',
    range: 3,
    effectValue: 3,
    description: 'Flash-freeze target for 3 frost damage and immobilize them for 1 turn.',
    iconName: 'Snowflake',
    tagline: 'Pressurized coolant canister.',
  },
  {
    id: 'deploy_tesla_1',
    name: 'Deploy Tesla Pylon',
    cost: 2,
    type: 'deployable',
    rarity: 'rare',
    targetType: 'tile_empty',
    range: 2,
    effectValue: 3,
    description: 'Erect autonomous 6-HP Tesla Pylon that zaps all predators within 2 tiles for 3 damage at end of every turn.',
    iconName: 'Radio',
    tagline: 'Area denial electrical spire.',
  },
  {
    id: 'neural_hack_1',
    name: 'Neural Hijack',
    cost: 3,
    type: 'hack',
    rarity: 'prototype',
    targetType: 'enemy',
    range: 3,
    effectValue: 2,
    description: 'Override wild beast neural harness. Beast fights for you for 2 turns, attacking other predators!',
    iconName: 'Cpu',
    tagline: 'Direct cerebral firmware rewrite.',
  },
  {
    id: 'solar_siphon_1',
    name: 'Solar Siphon',
    cost: 1,
    type: 'tactical',
    rarity: 'common',
    targetType: 'none',
    range: 0,
    effectValue: 4,
    description: 'Harvest atmospheric radiation. Heals 4 HP. If standing on a Solar Spire or during Solar Flare, refunds 2 Logic!',
    iconName: 'Sun',
    tagline: 'Photovoltaic suit recycler.',
  },
  {
    id: 'nanite_leech_1',
    name: 'Nanite Leech',
    cost: 2,
    type: 'energy',
    rarity: 'rare',
    targetType: 'enemy',
    range: 2,
    effectValue: 4,
    description: 'Drain bio-mechanical fluids: deal 4 damage to target and restore 4 HP to Operator.',
    iconName: 'HeartPulse',
    tagline: 'Vampiric micro-swarms.',
  },
  {
    id: 'overclock_core_1',
    name: 'Overclock Core',
    cost: 0,
    type: 'tactical',
    rarity: 'rare',
    targetType: 'none',
    range: 0,
    effectValue: 2,
    description: 'Immediately gain +2 Logic Points this turn, but take 2 thermal core damage.',
    iconName: 'Flame',
    tagline: 'Bypassing reactor governor for desperate surges.',
  },
  {
    id: 'companion_pounce_1',
    name: 'Companion Command',
    cost: 2,
    type: 'tactical',
    rarity: 'rare',
    targetType: 'enemy',
    range: 4,
    effectValue: 7,
    description: 'Order your wildlife companion to rush the target, dealing 7 heavy damage and stunning them.',
    iconName: 'Crosshair',
    tagline: 'Synchronized neural attack routine.',
  },
];

// Additional Prototype and Rare Cards for Rewards / Shop
export const SHOP_CARDS_CATALOG: LogicCard[] = [
  {
    id: 'terra_barrier_1',
    name: 'Terra-Spike Barrier',
    cost: 1,
    type: 'deployable',
    rarity: 'common',
    targetType: 'tile_empty',
    range: 2,
    effectValue: 10,
    description: 'Instantly erupts a dense Ferro-Rock barrier on an empty tile to block predator charge or incoming attacks.',
    iconName: 'Layers',
    tagline: 'Seismic acoustic ground crystallizer.',
  },
  {
    id: 'emp_blast_1',
    name: 'EMP Supernova',
    cost: 3,
    type: 'energy',
    rarity: 'prototype',
    targetType: 'none',
    range: 0,
    areaRadius: 3,
    effectValue: 8,
    description: 'Detonate wide-spectrum electromagnetic blast. Deals 8 damage and stuns all predators within 3 tiles!',
    iconName: 'Sparkles',
    tagline: 'Catastrophic capacitor discharge.',
  },
  {
    id: 'plasma_grenade_1',
    name: 'Plasma Cluster',
    cost: 2,
    type: 'kinetic',
    rarity: 'rare',
    targetType: 'tile_any',
    range: 3,
    areaRadius: 1,
    effectValue: 5,
    description: 'Lob explosive plasma grenade. Deals 5 damage in 3x3 blast and ignites ground for 2 turns.',
    iconName: 'Flame',
    tagline: 'Phosphorous incendiary cluster.',
  },
  {
    id: 'falcon_recon_lock',
    name: 'Recon Target-Lock',
    cost: 1,
    type: 'tactical',
    rarity: 'rare',
    targetType: 'enemy',
    range: 5,
    effectValue: 4,
    description: 'Marks target beast. Target receives +50% critical damage from all future attacks this combat.',
    iconName: 'Eye',
    tagline: 'Targeting telemetry uplink.',
  },
  {
    id: 'emergency_leap_1',
    name: 'Emergency Thruster',
    cost: 1,
    type: 'tactical',
    rarity: 'common',
    targetType: 'tile_empty',
    range: 2,
    effectValue: 0,
    description: 'Rocket jump up to 2 tiles away, bypassing hazardous terrain and breaking predator melee lock.',
    iconName: 'Move',
    tagline: 'Micro-thruster emergency jump.',
  },
];

// Helper: Seeded Random
export class SeededRng {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(items: T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }
}

// Procedural Sector Grid Generator
export function generateProceduralGrid(
  biome: BiomeType,
  seed: number,
  size: number = 8
): GridTile[][] {
  const rng = new SeededRng(seed);
  const grid: GridTile[][] = [];

  for (let y = 0; y < size; y++) {
    const row: GridTile[] = [];
    for (let x = 0; x < size; x++) {
      let type: TileType = 'plains';
      const roll = rng.next();

      if (biome === 'solar_spire_basin') {
        if (roll < 0.12) type = 'ferro_rock';
        else if (roll < 0.24) type = 'solar_spire';
        else if (roll < 0.32) type = 'decayed_ruin';
        else if (roll < 0.38) type = 'corrupt_relay';
      } else if (biome === 'neon_mangrove') {
        if (roll < 0.16) type = 'ion_spore';
        else if (roll < 0.28) type = 'conductive_pool';
        else if (roll < 0.36) type = 'ferro_rock';
        else if (roll < 0.42) type = 'corrupt_relay';
      } else if (biome === 'ferro_dunes') {
        if (roll < 0.15) type = 'ferro_rock';
        else if (roll < 0.23) type = 'decayed_ruin';
        else if (roll < 0.30) type = 'plasma_vent';
        else if (roll < 0.36) type = 'conductive_pool';
      } else { // reactor_ruins
        if (roll < 0.14) type = 'conductive_pool';
        else if (roll < 0.24) type = 'corrupt_relay';
        else if (roll < 0.34) type = 'decayed_ruin';
        else if (roll < 0.42) type = 'plasma_vent';
      }

      row.push({
        x,
        y,
        type,
        decayState: type === 'decayed_ruin' ? 2 : 0,
        hazardIntensity: type === 'ion_spore' ? 2 : 0,
        conductive: type === 'conductive_pool',
      });
    }
    grid.push(row);
  }

  // Guarantee safety and open space around player start (1, 6) & companion (2, 6)
  const safeCoords = [
    [1, 6], [2, 6], [1, 5], [2, 5], [0, 6], [1, 7], [2, 7]
  ];
  for (const [sx, sy] of safeCoords) {
    if (grid[sy] && grid[sy][sx]) {
      grid[sy][sx].type = 'plains';
      grid[sy][sx].hazardIntensity = 0;
    }
  }

  return grid;
}

// Procedural Enemy Spawn Generator
export function generateEnemiesForSector(
  sectorLevel: number,
  biome: BiomeType,
  seed: number,
  isElite: boolean = false,
  isBoss: boolean = false
): EnemyUnit[] {
  const rng = new SeededRng(seed + 999);
  const enemies: EnemyUnit[] = [];

  if (isBoss) {
    enemies.push({
      id: 'boss_titan_1',
      type: 'behemoth_titan',
      name: 'Titan Dune-Gorgon (APEX BEHEMOTH)',
      x: 4,
      y: 1,
      maxHp: 55 + sectorLevel * 10,
      currentHp: 55 + sectorLevel * 10,
      shields: 10,
      armor: 4,
      attackPower: 8,
      movementRange: 2,
      attackRange: 3,
      isStealthed: false,
      isStunned: false,
      isHacked: false,
      isAlpha: true,
      intent: {
        action: 'emp_stomp',
        targetX: 4,
        targetY: 3,
        value: 8,
        warningDesc: 'Preparing Seismic EMP Slam on central grid (8 dmg + Stun)!',
      },
      flavor: 'Colossal mechanical dreadnought fused with ancient savannah predator bone and hydraulic titanium armor.',
    });
    // Add two escort hyenas
    enemies.push({
      id: 'boss_escort_1',
      type: 'scrap_hyena',
      name: 'Scrap Hyena Raider',
      x: 1,
      y: 2,
      maxHp: 16,
      currentHp: 16,
      shields: 0,
      armor: 1,
      attackPower: 4,
      movementRange: 3,
      attackRange: 1,
      isStealthed: false,
      isStunned: false,
      isHacked: false,
      isAlpha: false,
      intent: {
        action: 'attack',
        targetX: 1,
        targetY: 5,
        value: 4,
        warningDesc: 'Flanking towards Operator (4 melee damage).',
      },
      flavor: 'Scavenger quadruped running scrap-hacked cyber-chassis.',
    });
    return enemies;
  }

  // Normal / Elite Encounters
  const count = isElite ? 4 : 2 + Math.min(2, Math.floor(sectorLevel / 2));
  const candidateTypes: EnemyType[] = ['scrap_hyena', 'apex_stalker', 'vulture_drone', 'ion_strider'];

  const usedCoords = new Set<string>();

  for (let i = 0; i < count; i++) {
    const type = rng.choice(candidateTypes);
    let x = rng.range(0, 7);
    let y = rng.range(0, 3); // top half of grid

    // Avoid overlaps
    while (usedCoords.has(`${x},${y}`)) {
      x = rng.range(0, 7);
      y = rng.range(0, 3);
    }
    usedCoords.add(`${x},${y}`);

    const isAlphaBeast = isElite && i === 0;

    let maxHp = 14 + sectorLevel * 2;
    let attackPower = 4;
    let movementRange = 3;
    let attackRange = 1;
    let armor = 1;
    let isStealthed = false;
    let name = 'Scrap Hyena';
    let flavor = 'Cyber-canine with hydraulic jaws that swarms vulnerable targets.';
    let intentAction: EnemyIntent['action'] = 'attack';
    let warningDesc = 'Circling Operator to strike melee!';

    if (type === 'apex_stalker') {
      name = isAlphaBeast ? 'Alpha Cyber-Leopard' : 'Apex Stalker';
      maxHp = 18 + sectorLevel * 3;
      attackPower = 6;
      movementRange = 4;
      attackRange = 2;
      armor = 2;
      isStealthed = true;
      flavor = 'Silent predator with active photonic camouflage. Lethal pounce attack.';
      intentAction = 'leap';
      warningDesc = 'Priming Camouflaged Leap (6 dmg). Break line of sight!';
    } else if (type === 'ion_strider') {
      name = 'Ion Strider';
      maxHp = 26 + sectorLevel * 4;
      attackPower = 5;
      movementRange = 2;
      attackRange = 2;
      armor = 3;
      flavor = 'Towering biomechanical strider that discharges EMP shocks.';
      intentAction = 'emp_stomp';
      warningDesc = 'Charging ground EMP pulse (5 dmg to all in range 2).';
    } else if (type === 'vulture_drone') {
      name = 'Vulture Recon Drone';
      maxHp = 12 + sectorLevel * 2;
      attackPower = 3;
      movementRange = 4;
      attackRange = 3;
      armor = 0;
      flavor = 'Airborne scavenger that spits corrosive bio-acid onto terrain.';
      intentAction = 'acid_spit';
      warningDesc = 'Aiming Corrosive Acid Spit (3 dmg + corrosive tile).';
    }

    if (isAlphaBeast) {
      maxHp += 10;
      attackPower += 2;
      armor += 1;
    }

    enemies.push({
      id: `enemy_${i}_${Date.now()}`,
      type,
      name,
      x,
      y,
      maxHp,
      currentHp: maxHp,
      shields: isAlphaBeast ? 6 : 0,
      armor,
      attackPower,
      movementRange,
      attackRange,
      isStealthed,
      isStunned: false,
      isHacked: false,
      isAlpha: isAlphaBeast,
      intent: {
        action: intentAction,
        targetX: 1,
        targetY: 6,
        value: attackPower,
        warningDesc,
      },
      flavor,
    });
  }

  return enemies;
}

// Procedural Expedition Node Map Generator
export function generateExpeditionMap(sectorLevel: number, seed: number): ExpeditionNode[] {
  const rng = new SeededRng(seed);
  const nodes: ExpeditionNode[] = [];
  const biomes: BiomeType[] = ['solar_spire_basin', 'neon_mangrove', 'ferro_dunes', 'reactor_ruins'];
  const currentBiome = biomes[(sectorLevel - 1) % biomes.length];

  // Tier 0: Starting sector combat
  nodes.push({
    id: 'node_0_0',
    sectorIndex: sectorLevel,
    tier: 0,
    type: 'combat',
    name: 'Sector Perimeter Patrol',
    biome: currentBiome,
    completed: true, // We start here or just entered
    available: true,
    connectedTo: ['node_1_0', 'node_1_1'],
    rewardScrap: 25,
    hazardNote: 'Scattered Scrap Hyenas detected roaming the perimeter.',
  });

  // Tier 1: Two diverging choices
  nodes.push({
    id: 'node_1_0',
    sectorIndex: sectorLevel,
    tier: 1,
    type: 'vault',
    name: 'Corrupted Relic Vault',
    biome: currentBiome,
    completed: false,
    available: true,
    connectedTo: ['node_2_0', 'node_2_1'],
    rewardScrap: 40,
    hazardNote: 'High electromagnetic pulse interference. Free logic chip inside.',
  });

  nodes.push({
    id: 'node_1_1',
    sectorIndex: sectorLevel,
    tier: 1,
    type: 'combat',
    name: 'Overgrowth Ambush Basin',
    biome: currentBiome,
    completed: false,
    available: true,
    connectedTo: ['node_2_1', 'node_2_2'],
    rewardScrap: 35,
    hazardNote: 'Dense spore cover; predators gain stealth initiative.',
  });

  // Tier 2: Three choices (Elite / Oasis / Merchant)
  nodes.push({
    id: 'node_2_0',
    sectorIndex: sectorLevel,
    tier: 2,
    type: 'elite',
    name: 'Apex Stalker Hunting Grounds',
    biome: currentBiome,
    completed: false,
    available: false,
    connectedTo: ['node_3_0'],
    rewardScrap: 65,
    hazardNote: 'WARNING: Alpha Beast sighted. Massive scrap yield and prototype card.',
  });

  nodes.push({
    id: 'node_2_1',
    sectorIndex: sectorLevel,
    tier: 2,
    type: 'oasis',
    name: 'Bioluminescent Canopy (Rest)',
    biome: currentBiome,
    completed: false,
    available: false,
    connectedTo: ['node_3_0'],
    rewardScrap: 15,
    hazardNote: 'Coolant springs: Repair Operator suit (+12 HP) or tune companion.',
  });

  nodes.push({
    id: 'node_2_2',
    sectorIndex: sectorLevel,
    tier: 2,
    type: 'merchant',
    name: 'Nomad Scavenger Depot',
    biome: currentBiome,
    completed: false,
    available: false,
    connectedTo: ['node_3_0'],
    rewardScrap: 20,
    hazardNote: 'Friendly rogue cyborg merchant trading tactical subroutines.',
  });

  // Tier 3: Boss Gateway
  nodes.push({
    id: 'node_3_0',
    sectorIndex: sectorLevel,
    tier: 3,
    type: 'boss',
    name: 'Sub-Reactor Monolith (SECTOR APEX)',
    biome: currentBiome,
    completed: false,
    available: false,
    connectedTo: [],
    rewardScrap: 100,
    hazardNote: 'Dreadnought class Behemoth Titan guarding the hyper-relay core.',
  });

  return nodes;
}

// Draw Cards Helper
export function drawCards(currentHand: LogicCard[], currentDeck: LogicCard[], currentDiscard: LogicCard[], count: number) {
  let deck = [...currentDeck];
  let discard = [...currentDiscard];
  let hand = [...currentHand];

  for (let i = 0; i < count; i++) {
    if (deck.length === 0) {
      if (discard.length === 0) break;
      // Shuffle discard into deck
      deck = [...discard].sort(() => Math.random() - 0.5);
      discard = [];
    }
    const drawn = deck.pop();
    if (drawn) hand.push(drawn);
  }

  return { hand, deck, discard };
}

// Initial Full Game State Creator
export function createInitialGameState(companionId: CompanionId = 'cheetah', seed: number = Date.now()): GameState {
  const sectorLevel = 1;
  const biomes: BiomeType[] = ['solar_spire_basin', 'neon_mangrove', 'ferro_dunes', 'reactor_ruins'];
  const biome = biomes[0];
  const grid = generateProceduralGrid(biome, seed, 8);
  const enemies = generateEnemiesForSector(sectorLevel, biome, seed, false, false);
  const expeditionNodes = generateExpeditionMap(sectorLevel, seed);

  // Companion
  const compStats = { ...COMPANIONS_CATALOG[companionId] };
  const companion: CompanionUnit = {
    stats: compStats,
    x: 2,
    y: 6,
    currentHp: compStats.maxHp,
    shields: 0,
  };

  // Player
  const player: PlayerUnit = {
    x: 1,
    y: 6,
    maxHp: 30,
    currentHp: 30,
    maxShields: 8,
    currentShields: 4,
    armor: 1,
    maxLogic: 4,
    currentLogic: 4,
    movementRange: 2,
  };

  // Deck
  const deck = [...STARTER_DECK].sort(() => Math.random() - 0.5);
  const { hand, deck: remainingDeck, discard } = drawCards([], deck, [], 5);

  const initialLogs: CombatLogEntry[] = [
    {
      id: 'init_1',
      turn: 1,
      sender: 'SYSTEM',
      text: 'NEURAL LINK ESTABLISHED. Sector: Solar Spire Basin [Sector 01].',
      type: 'info',
      time: '00:00:01',
    },
    {
      id: 'init_2',
      turn: 1,
      sender: 'COMPANION',
      text: `${compStats.name} deployed at tactical flank (2, 6). Systems synchronized.`,
      type: 'info',
      time: '00:00:02',
    },
    {
      id: 'init_3',
      turn: 1,
      sender: 'WILD',
      text: 'Biometric radar detects 3 wild predator signatures in quadrant alpha!',
      type: 'alert',
      time: '00:00:03',
    },
  ];

  return {
    runActive: true,
    mode: 'grid',
    sectorLevel,
    turnNumber: 1,
    seed,
    scrap: 35,
    biome,
    weather: 'clear_skies',
    weatherCountdown: 3,
    grid,
    player,
    companion,
    enemies,
    deployables: [],
    deck: remainingDeck,
    hand,
    discard,
    selectedCard: null,
    activePathHighlight: [],
    floatingTexts: [],
    combatLogs: initialLogs,
    expeditionNodes,
    currentNodeId: 'node_0_0',
    gameOver: false,
    gameWon: false,
    stats: {
      turnsSurvived: 0,
      enemiesDefeated: 0,
      nodesHacked: 0,
      damageDealt: 0,
    },
  };
}
