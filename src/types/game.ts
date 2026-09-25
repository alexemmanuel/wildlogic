export type BiomeType = 
  | 'solar_spire_basin' 
  | 'neon_mangrove' 
  | 'ferro_dunes' 
  | 'reactor_ruins';

export type WeatherType = 
  | 'clear_skies' 
  | 'solar_flare' 
  | 'acid_monsoon' 
  | 'emp_dust_storm' 
  | 'bioluminescent_fog';

export type TileType = 
  | 'plains' 
  | 'ferro_rock' 
  | 'ion_spore' 
  | 'conductive_pool' 
  | 'solar_spire' 
  | 'decayed_ruin' 
  | 'corrupt_relay' 
  | 'plasma_vent';

export interface GridTile {
  x: number;
  y: number;
  type: TileType;
  decayState: number; // 0: solid, 1: cracked, 2: critical, 3: broken
  hazardIntensity: number; // 0 - 3
  isOccupied?: boolean;
  conductive?: boolean;
  hacked?: boolean;
}

export type CompanionId = 'cheetah' | 'pangolin' | 'falcon';

export interface CompanionStats {
  id: CompanionId;
  name: string;
  species: string;
  role: string;
  maxHp: number;
  currentHp: number;
  attackPower: number;
  defense: number;
  movement: number;
  portrait: string;
  passiveName: string;
  passiveDesc: string;
  color: string;
}

export type EnemyType = 
  | 'apex_stalker' 
  | 'scrap_hyena' 
  | 'ion_strider' 
  | 'vulture_drone' 
  | 'behemoth_titan';

export interface EnemyIntent {
  action: 'attack' | 'leap' | 'emp_stomp' | 'acid_spit' | 'prowl' | 'buff';
  targetX?: number;
  targetY?: number;
  value: number;
  warningDesc: string;
}

export interface EnemyUnit {
  id: string;
  type: EnemyType;
  name: string;
  x: number;
  y: number;
  maxHp: number;
  currentHp: number;
  shields: number;
  armor: number;
  attackPower: number;
  movementRange: number;
  attackRange: number;
  isStealthed: boolean;
  isStunned: boolean;
  isHacked: boolean; // fights for player for N turns
  hackedTurnsRemaining?: number;
  isAlpha: boolean;
  intent: EnemyIntent;
  flavor: string;
}

export interface PlayerUnit {
  x: number;
  y: number;
  maxHp: number;
  currentHp: number;
  maxShields: number;
  currentShields: number;
  armor: number;
  maxLogic: number; // Max AP
  currentLogic: number; // Current AP
  movementRange: number;
}

export interface CompanionUnit {
  stats: CompanionStats;
  x: number;
  y: number;
  currentHp: number;
  shields: number;
  isCurled?: boolean; // Pangolin defensive state
  isMarking?: boolean; // Falcon scout state
}

export interface DeployableUnit {
  id: string;
  type: 'tesla_pylon' | 'kinetic_barrier' | 'cryo_mine';
  name: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  duration: number; // turns remaining
}

export type CardTargetType = 
  | 'none' 
  | 'tile_empty' 
  | 'enemy' 
  | 'ally' 
  | 'tile_any' 
  | 'relay';

export interface LogicCard {
  id: string;
  name: string;
  cost: number; // Logic points
  type: 'kinetic' | 'energy' | 'tactical' | 'hack' | 'deployable';
  rarity: 'common' | 'rare' | 'prototype';
  targetType: CardTargetType;
  range: number;
  areaRadius?: number;
  description: string;
  effectValue: number;
  iconName: string;
  tagline: string;
}

export interface FloatingText {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  timestamp: number;
}

export interface CombatLogEntry {
  id: string;
  turn: number;
  sender: 'SYSTEM' | 'OPERATOR' | 'COMPANION' | 'WILD' | 'HAZARD';
  text: string;
  type: 'info' | 'damage' | 'heal' | 'alert' | 'hack';
  time: string;
}

export type NodeType = 'combat' | 'elite' | 'vault' | 'merchant' | 'oasis' | 'boss';

export interface ExpeditionNode {
  id: string;
  sectorIndex: number;
  tier: number;
  type: NodeType;
  name: string;
  biome: BiomeType;
  completed: boolean;
  available: boolean;
  connectedTo: string[];
  rewardScrap: number;
  hazardNote: string;
}

export interface GameState {
  runActive: boolean;
  mode: 'grid' | 'expedition_map' | 'deck' | 'codex';
  sectorLevel: number;
  turnNumber: number;
  seed: number;
  scrap: number; // currency for deck building & upgrades
  biome: BiomeType;
  weather: WeatherType;
  weatherCountdown: number; // turns until weather shifts
  grid: GridTile[][];
  player: PlayerUnit;
  companion: CompanionUnit | null;
  enemies: EnemyUnit[];
  deployables: DeployableUnit[];
  deck: LogicCard[];
  hand: LogicCard[];
  discard: LogicCard[];
  selectedCard: LogicCard | null;
  activePathHighlight: { x: number; y: number }[];
  floatingTexts: FloatingText[];
  combatLogs: CombatLogEntry[];
  expeditionNodes: ExpeditionNode[];
  currentNodeId: string | null;
  gameOver: boolean;
  gameWon: boolean;
  stats: {
    turnsSurvived: number;
    enemiesDefeated: number;
    nodesHacked: number;
    damageDealt: number;
  };
}
