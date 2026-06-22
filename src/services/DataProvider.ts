import { Player, Hero, Match, MatchParticipant, RecommendationHistory, AppSettings, HeroOwnership } from '../types';

export interface IDataProvider {
  // Players
  getPlayers(): Promise<Player[]>;
  createPlayer(player: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player>;
  updatePlayer(id: string, player: Partial<Player>): Promise<Player>;
  deletePlayer(id: string): Promise<void>;

  // Heroes
  getHeroes(): Promise<Hero[]>;
  createHero(hero: Omit<Hero, 'createdAt' | 'updatedAt'>): Promise<Hero>;
  updateHero(id: string, hero: Partial<Hero>): Promise<Hero>;
  deleteHero(id: string): Promise<void>;

  // Collection Ownership
  getHeroOwnership(): Promise<HeroOwnership[]>;
  addHeroOwnership(heroId: string, playerId: string): Promise<void>;
  removeHeroOwnership(heroId: string, playerId: string): Promise<void>;
  clearHeroOwnership(playerId: string): Promise<void>;

  // Matches
  getMatches(): Promise<Match[]>;
  getMatchParticipants(matchId?: string): Promise<MatchParticipant[]>;
  createMatch(
    match: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>,
    participants: Omit<MatchParticipant, 'id' | 'matchId'>[]
  ): Promise<{ match: Match; participants: MatchParticipant[] }>;
  updateMatch(
    matchId: string,
    matchUpdates: Partial<Match>,
    participantsUpdates: Omit<MatchParticipant, 'id' | 'matchId'>[]
  ): Promise<{ match: Match; participants: MatchParticipant[] }>;
  deleteMatch(id: string): Promise<void>;

  // Recommendations
  getRecommendations(): Promise<RecommendationHistory[]>;
  saveRecommendations(recs: Omit<RecommendationHistory, 'id' | 'generatedAt'>[]): Promise<RecommendationHistory[]>;
  updateRecommendationStatus(id: string, status: 'recommended' | 'chosen' | 'ignored'): Promise<void>;

  // Settings
  getSettings(): Promise<Record<string, any>>;
  setSetting(key: string, value: any): Promise<void>;

  // Backup & Import
  exportData(): Promise<any>;
  importData(data: any): Promise<void>;
}
