import Dexie, { Table } from 'dexie';
import { Player, Hero, Match, MatchParticipant, RecommendationHistory, AppSettings, HeroOwnership } from '../types';
import { DEFAULT_HEROES } from './heroSeedData';
import { IDataProvider } from '../services/DataProvider';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class DiceThroneDexieDB extends Dexie {
  players!: Table<Player, string>;
  heroes!: Table<Hero, string>;
  heroOwnership!: Table<HeroOwnership, [string, string]>; // Compound key: [heroId, playerId]
  matches!: Table<Match, string>;
  matchParticipants!: Table<MatchParticipant, string>;
  recommendations!: Table<RecommendationHistory, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('DiceThroneCompanionDB');
    this.version(1).stores({
      players: 'id, name, active, createdAt',
      heroes: 'id, name, complexity, releaseSet, owned, active',
      heroOwnership: '[heroId+playerId]',
      matches: 'id, playedAt, gameMode',
      matchParticipants: 'id, matchId, playerId, heroId',
      recommendations: 'id, playerId, generatedAt, heroId, status',
      settings: 'key',
    });
  }
}

const rawDb = new DiceThroneDexieDB();

export class DexieDataProvider implements IDataProvider {
  private db: DiceThroneDexieDB;

  constructor() {
    this.db = rawDb;
    this.db.on('populate', () => {
      this.seedHeroes();
    });
  }

  private async seedHeroes() {
    const now = Date.now();
    const heroRecords: Hero[] = DEFAULT_HEROES.map((h) => ({
      ...h,
      createdAt: now,
      updatedAt: now,
    }));
    await this.db.heroes.bulkAdd(heroRecords);
    
    // Seed default settings
    await this.db.settings.bulkAdd([
      { key: 'theme', value: 'dark' },
      { key: 'ownedSets', value: ['Season 1', 'Season 2', 'Marvel', 'Santa vs Krampus', 'X-Men', 'The Outcasts', 'Single Hero Pack'] },
      { key: 'useCollectionOwnership', value: false }
    ]);
  }

  // Helper to ensure database is seeded (e.g. if we check and count is 0)
  public async ensureSeeded() {
    const count = await this.db.heroes.count();
    if (count === 0) {
      await this.seedHeroes();
    }
  }

  // Players
  async getPlayers(): Promise<Player[]> {
    return this.db.players.toArray();
  }

  async createPlayer(playerData: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>): Promise<Player> {
    const now = Date.now();
    const player: Player = {
      ...playerData,
      id: generateUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await this.db.players.add(player);
    return player;
  }

  async updatePlayer(id: string, playerUpdates: Partial<Player>): Promise<Player> {
    const existing = await this.db.players.get(id);
    if (!existing) throw new Error(`Player with ID ${id} not found.`);
    const updated: Player = {
      ...existing,
      ...playerUpdates,
      updatedAt: Date.now(),
    };
    await this.db.players.put(updated);
    return updated;
  }

  async deletePlayer(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.players, this.db.matchParticipants, this.db.recommendations, this.db.heroOwnership], async () => {
      await this.db.players.delete(id);
      // Clean up relations
      await this.db.heroOwnership.where({ playerId: id }).delete();
      await this.db.recommendations.where({ playerId: id }).delete();
      // Keep match participants to preserve records but could flag as deleted if needed
    });
  }

  // Heroes
  async getHeroes(): Promise<Hero[]> {
    return this.db.heroes.toArray();
  }

  async createHero(heroData: Omit<Hero, 'createdAt' | 'updatedAt'>): Promise<Hero> {
    const now = Date.now();
    const hero: Hero = {
      ...heroData,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.heroes.add(hero);
    return hero;
  }

  async updateHero(id: string, heroUpdates: Partial<Hero>): Promise<Hero> {
    const existing = await this.db.heroes.get(id);
    if (!existing) throw new Error(`Hero with ID ${id} not found.`);
    const updated: Hero = {
      ...existing,
      ...heroUpdates,
      updatedAt: Date.now(),
    };
    await this.db.heroes.put(updated);
    return updated;
  }

  async deleteHero(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.heroes, this.db.heroOwnership], async () => {
      await this.db.heroes.delete(id);
      await this.db.heroOwnership.where({ heroId: id }).delete();
    });
  }

  // Collection Ownership
  async getHeroOwnership(): Promise<HeroOwnership[]> {
    return this.db.heroOwnership.toArray();
  }

  async addHeroOwnership(heroId: string, playerId: string): Promise<void> {
    await this.db.heroOwnership.put({ heroId, playerId });
  }

  async removeHeroOwnership(heroId: string, playerId: string): Promise<void> {
    await this.db.heroOwnership.delete([heroId, playerId]);
  }

  async clearHeroOwnership(playerId: string): Promise<void> {
    const keys = await this.db.heroOwnership.where({ playerId }).primaryKeys();
    await this.db.heroOwnership.bulkDelete(keys);
  }

  // Matches
  async getMatches(): Promise<Match[]> {
    return this.db.matches.orderBy('playedAt').reverse().toArray();
  }

  async getMatchParticipants(matchId?: string): Promise<MatchParticipant[]> {
    if (matchId) {
      return this.db.matchParticipants.where({ matchId }).toArray();
    }
    return this.db.matchParticipants.toArray();
  }

  async createMatch(
    matchData: Omit<Match, 'id' | 'createdAt' | 'updatedAt'>,
    participants: Omit<MatchParticipant, 'id' | 'matchId'>[]
  ): Promise<{ match: Match; participants: MatchParticipant[] }> {
    const matchId = generateUUID();
    const now = Date.now();
    const match: Match = {
      ...matchData,
      id: matchId,
      createdAt: now,
      updatedAt: now,
    };

    const participantRecords: MatchParticipant[] = participants.map((p) => ({
      ...p,
      id: generateUUID(),
      matchId,
    }));

    await this.db.transaction('rw', [this.db.matches, this.db.matchParticipants], async () => {
      await this.db.matches.add(match);
      await this.db.matchParticipants.bulkAdd(participantRecords);
    });

    return { match, participants: participantRecords };
  }

  async updateMatch(
    matchId: string,
    matchUpdates: Partial<Match>,
    participantsUpdates: Omit<MatchParticipant, 'id' | 'matchId'>[]
  ): Promise<{ match: Match; participants: MatchParticipant[] }> {
    const existingMatch = await this.db.matches.get(matchId);
    if (!existingMatch) throw new Error(`Match with ID ${matchId} not found.`);

    const now = Date.now();
    const updatedMatch: Match = {
      ...existingMatch,
      ...matchUpdates,
      updatedAt: now,
    };

    const newParticipants: MatchParticipant[] = participantsUpdates.map((p) => ({
      ...p,
      id: generateUUID(),
      matchId,
    }));

    await this.db.transaction('rw', [this.db.matches, this.db.matchParticipants], async () => {
      await this.db.matches.put(updatedMatch);
      // delete existing participants for this match and re-insert
      const existingPartIds = await this.db.matchParticipants.where({ matchId }).primaryKeys();
      await this.db.matchParticipants.bulkDelete(existingPartIds);
      await this.db.matchParticipants.bulkAdd(newParticipants);
    });

    return { match: updatedMatch, participants: newParticipants };
  }

  async deleteMatch(id: string): Promise<void> {
    await this.db.transaction('rw', [this.db.matches, this.db.matchParticipants], async () => {
      await this.db.matches.delete(id);
      const existingPartIds = await this.db.matchParticipants.where({ matchId: id }).primaryKeys();
      await this.db.matchParticipants.bulkDelete(existingPartIds);
    });
  }

  // Recommendations
  async getRecommendations(): Promise<RecommendationHistory[]> {
    return this.db.recommendations.toArray();
  }

  async saveRecommendations(recs: Omit<RecommendationHistory, 'id' | 'generatedAt'>[]): Promise<RecommendationHistory[]> {
    const now = Date.now();
    const records: RecommendationHistory[] = recs.map((r) => ({
      ...r,
      id: generateUUID(),
      generatedAt: now,
    }));
    await this.db.recommendations.bulkAdd(records);
    return records;
  }

  async updateRecommendationStatus(id: string, status: 'recommended' | 'chosen' | 'ignored'): Promise<void> {
    const rec = await this.db.recommendations.get(id);
    if (rec) {
      rec.status = status;
      await this.db.recommendations.put(rec);
    }
  }

  // Settings
  async getSettings(): Promise<Record<string, any>> {
    const all = await this.db.settings.toArray();
    return all.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, any>);
  }

  async setSetting(key: string, value: any): Promise<void> {
    await this.db.settings.put({ key, value });
  }

  // Backup & Import
  async exportData(): Promise<any> {
    const players = await this.db.players.toArray();
    const heroes = await this.db.heroes.toArray();
    const heroOwnership = await this.db.heroOwnership.toArray();
    const matches = await this.db.matches.toArray();
    const matchParticipants = await this.db.matchParticipants.toArray();
    const recommendations = await this.db.recommendations.toArray();
    const settings = await this.db.settings.toArray();

    return {
      version: 1,
      exportedAt: Date.now(),
      players,
      heroes,
      heroOwnership,
      matches,
      matchParticipants,
      recommendations,
      settings,
    };
  }

  async importData(data: any): Promise<void> {
    if (!data || typeof data !== 'object') throw new Error('Invalid backup data.');
    
    await this.db.transaction(
      'rw',
      [
        this.db.players,
        this.db.heroes,
        this.db.heroOwnership,
        this.db.matches,
        this.db.matchParticipants,
        this.db.recommendations,
        this.db.settings,
      ],
      async () => {
        // Clear all tables first
        await this.db.players.clear();
        await this.db.heroes.clear();
        await this.db.heroOwnership.clear();
        await this.db.matches.clear();
        await this.db.matchParticipants.clear();
        await this.db.recommendations.clear();
        await this.db.settings.clear();

        // Load data if array exists
        if (Array.isArray(data.players)) await this.db.players.bulkAdd(data.players);
        if (Array.isArray(data.heroes)) await this.db.heroes.bulkAdd(data.heroes);
        if (Array.isArray(data.heroOwnership)) await this.db.heroOwnership.bulkAdd(data.heroOwnership);
        if (Array.isArray(data.matches)) await this.db.matches.bulkAdd(data.matches);
        if (Array.isArray(data.matchParticipants)) await this.db.matchParticipants.bulkAdd(data.matchParticipants);
        if (Array.isArray(data.recommendations)) await this.db.recommendations.bulkAdd(data.recommendations);
        if (Array.isArray(data.settings)) await this.db.settings.bulkAdd(data.settings);
      }
    );
  }
}

export const dbProvider = new DexieDataProvider();
