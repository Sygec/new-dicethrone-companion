export interface Player {
  id: string;
  name: string;
  active: number; // 0 or 1 for easy Dexie indexing
  createdAt: number;
  updatedAt: number;
}

export interface Hero {
  id: string;
  name: string;
  imageUrl: string;
  rulepopUrl: string;
  complexity: number; // 1 to 6
  releaseSet: string; // e.g. "Season 1", "Season 2", "Marvel", "X-Men", "Santa vs Krampus"
  releaseWave: string;
  tags: string[];
  owned: number; // 0 or 1
  active: number; // 0 or 1
  createdAt: number;
  updatedAt: number;
}

export interface HeroOwnership {
  heroId: string;
  playerId: string;
}

export interface Match {
  id: string;
  playedAt: number;
  gameMode: string; // "1v1" | "2v2" | "FFA" | "Adventures"
  durationMinutes?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface MatchParticipant {
  id: string;
  matchId: string;
  playerId: string;
  heroId: string;
  placement: number | null; // 1 for winner, 2 for runner up, null for draw or FFA participations
}

export interface RecommendationHistory {
  id: string;
  playerId: string;
  generatedAt: number;
  heroId: string;
  score: number;
  reasons: string[];
  status: 'recommended' | 'chosen' | 'ignored';
}

export interface AppSettings {
  key: string;
  value: any;
}
