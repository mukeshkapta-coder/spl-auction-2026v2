export enum PlayerSkill {
  BATSMAN = 'Batter',
  BOWLER = 'Bowler',
  ALL_ROUNDER = 'All-Rounder',
  WICKETKEEPER = 'WK-Batter'
}

export interface PlayerStats {
  matches: number;
  runs?: number;
  wickets?: number;
  strikeRate?: number;
  economy?: number;
  fifties?: number;
  thirties?: number;
}

export interface MatchPerformance {
  matchNumber: number; // 1 to 75+
  url: string;
  points: number;
  breakdown: string;
  isPOTM: boolean;
}

export interface Player {
  id: string;
  name: string;
  skill: string;
  basePrice: number;
  country: string;
  rating: number; // 0-100
  teamId?: string;
  soldPrice?: number;
  isSold: boolean;
  stats?: PlayerStats;
  originalTeam?: string;
  points?: number; // Total points accumulated
  performanceHistory?: MatchPerformance[];
}

export interface Franchise {
  id: string;
  name: string;
  budget: number;
  roster: Player[];
  color: string;
  totalPoints?: number;
  captainId?: string;
  viceCaptainId?: string;
}

export interface AuctionState {
  currentPhase: 'PRE_AUCTION' | 'LIVE_AUCTION' | 'POST_AUCTION';
  currentPlayerId: string | null;
  currentBid: number;
  lastBidderId: string | null;
  bidHistory: { teamId: string; amount: number }[];
}