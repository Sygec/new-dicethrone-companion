import { create } from 'zustand';
import { Player, Hero, Match, MatchParticipant, RecommendationHistory, HeroOwnership } from '../types';
import { IDataProvider } from '../services/DataProvider';
import { dbProvider } from '../db/db';

// Switch data provider here to pocketbase/supabase/etc. in future
const provider: IDataProvider = dbProvider;

interface AppState {
  players: Player[];
  heroes: Hero[];
  heroOwnership: HeroOwnership[];
  matches: Match[];
  matchParticipants: MatchParticipant[];
  recommendations: RecommendationHistory[];
  settings: {
    theme: string;
    ownedSets: string[];
    useCollectionOwnership: boolean;
    [key: string]: any;
  };
  isLoading: boolean;

  // Sync / Load
  loadAllData: () => Promise<void>;

  // Players
  addPlayer: (name: string) => Promise<Player>;
  togglePlayerActive: (id: string) => Promise<void>;
  updatePlayerName: (id: string, name: string) => Promise<void>;
  deletePlayer: (id: string) => Promise<void>;

  // Heroes
  toggleHeroOwned: (id: string) => Promise<void>;
  toggleHeroActive: (id: string) => Promise<void>;
  addCustomHero: (hero: Omit<Hero, 'createdAt' | 'updatedAt'>) => Promise<Hero>;
  updateHeroDetails: (id: string, updates: Partial<Hero>) => Promise<Hero>;
  deleteHero: (id: string) => Promise<void>;

  // Hero Ownership (for custom collection per player)
  toggleCollectionOwnership: (heroId: string, playerId: string) => Promise<void>;

  // Matches
  logMatch: (
    gameMode: string,
    participants: Omit<MatchParticipant, 'id' | 'matchId'>[],
    notes?: string,
    durationMinutes?: number
  ) => Promise<{ match: Match; participants: MatchParticipant[] }>;
  updateMatch: (
    matchId: string,
    matchUpdates: Partial<Match>,
    participantsUpdates: Omit<MatchParticipant, 'id' | 'matchId'>[]
  ) => Promise<{ match: Match; participants: MatchParticipant[] }>;
  deleteMatch: (id: string) => Promise<void>;

  // Recommendations
  saveRecommendations: (recs: Omit<RecommendationHistory, 'id' | 'generatedAt'>[]) => Promise<RecommendationHistory[]>;
  updateRecommendationStatus: (id: string, status: 'recommended' | 'chosen' | 'ignored') => Promise<void>;

  // Settings
  setSetting: (key: string, value: any) => Promise<void>;

  // Backup & Import
  importBackup: (backupJson: any) => Promise<void>;
  exportBackup: () => Promise<any>;
}

export const useStore = create<AppState>((set, get) => ({
  players: [],
  heroes: [],
  heroOwnership: [],
  matches: [],
  matchParticipants: [],
  recommendations: [],
  settings: {
    theme: 'dark',
    ownedSets: ['Season 1', 'Season 2', 'Marvel', 'Santa vs Krampus', 'X-Men', 'The Outcasts', 'Single Hero Pack'],
    useCollectionOwnership: false,
  },
  isLoading: true,

  loadAllData: async () => {
    set({ isLoading: true });
    try {
      // Ensure seeded database if using IndexedDB Dexie
      if (typeof (provider as any).ensureSeeded === 'function') {
        await (provider as any).ensureSeeded();
      }

      const [players, heroes, heroOwnership, matches, matchParticipants, recommendations, settingsMap] = await Promise.all([
        provider.getPlayers(),
        provider.getHeroes(),
        provider.getHeroOwnership(),
        provider.getMatches(),
        provider.getMatchParticipants(),
        provider.getRecommendations(),
        provider.getSettings(),
      ]);

      const defaultSettings = {
        theme: 'dark',
        ownedSets: ['Season 1', 'Season 2', 'Marvel', 'Santa vs Krampus', 'X-Men', 'The Outcasts', 'Single Hero Pack'],
        useCollectionOwnership: false,
        ...settingsMap,
      };

      set({
        players,
        heroes,
        heroOwnership,
        matches,
        matchParticipants,
        recommendations,
        settings: defaultSettings,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load data:', error);
      set({ isLoading: false });
    }
  },

  // Players
  addPlayer: async (name: string) => {
    const newPlayer = await provider.createPlayer({ name, active: 1 });
    set((state) => ({ players: [...state.players, newPlayer] }));
    return newPlayer;
  },

  togglePlayerActive: async (id: string) => {
    const player = get().players.find((p) => p.id === id);
    if (!player) return;
    const updated = await provider.updatePlayer(id, { active: player.active ? 0 : 1 });
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? updated : p)),
    }));
  },

  updatePlayerName: async (id: string, name: string) => {
    const updated = await provider.updatePlayer(id, { name });
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? updated : p)),
    }));
  },

  deletePlayer: async (id: string) => {
    await provider.deletePlayer(id);
    set((state) => ({
      players: state.players.filter((p) => p.id !== id),
      heroOwnership: state.heroOwnership.filter((ho) => ho.playerId !== id),
      recommendations: state.recommendations.filter((r) => r.playerId !== id),
    }));
  },

  // Heroes
  toggleHeroOwned: async (id: string) => {
    const hero = get().heroes.find((h) => h.id === id);
    if (!hero) return;
    const updated = await provider.updateHero(id, { owned: hero.owned ? 0 : 1 });
    set((state) => ({
      heroes: state.heroes.map((h) => (h.id === id ? updated : h)),
    }));
  },

  toggleHeroActive: async (id: string) => {
    const hero = get().heroes.find((h) => h.id === id);
    if (!hero) return;
    const updated = await provider.updateHero(id, { active: hero.active ? 0 : 1 });
    set((state) => ({
      heroes: state.heroes.map((h) => (h.id === id ? updated : h)),
    }));
  },

  addCustomHero: async (heroData: Omit<Hero, 'createdAt' | 'updatedAt'>) => {
    const newHero = await provider.createHero(heroData);
    set((state) => ({ heroes: [...state.heroes, newHero] }));
    return newHero;
  },

  updateHeroDetails: async (id: string, updates: Partial<Hero>) => {
    const updated = await provider.updateHero(id, updates);
    set((state) => ({
      heroes: state.heroes.map((h) => (h.id === id ? updated : h)),
    }));
    return updated;
  },

  deleteHero: async (id: string) => {
    await provider.deleteHero(id);
    set((state) => ({
      heroes: state.heroes.filter((h) => h.id !== id),
      heroOwnership: state.heroOwnership.filter((ho) => ho.heroId !== id),
    }));
  },

  // Collection Ownership
  toggleCollectionOwnership: async (heroId: string, playerId: string) => {
    const exists = get().heroOwnership.some((ho) => ho.heroId === heroId && ho.playerId === playerId);
    if (exists) {
      await provider.removeHeroOwnership(heroId, playerId);
      set((state) => ({
        heroOwnership: state.heroOwnership.filter((ho) => !(ho.heroId === heroId && ho.playerId === playerId)),
      }));
    } else {
      await provider.addHeroOwnership(heroId, playerId);
      set((state) => ({
        heroOwnership: [...state.heroOwnership, { heroId, playerId }],
      }));
    }
  },

  // Matches
  logMatch: async (gameMode, participants, notes, durationMinutes) => {
    const result = await provider.createMatch({ playedAt: Date.now(), gameMode, notes, durationMinutes }, participants);
    set((state) => ({
      matches: [result.match, ...state.matches],
      matchParticipants: [...state.matchParticipants, ...result.participants],
    }));
    return result;
  },

  updateMatch: async (matchId, matchUpdates, participantsUpdates) => {
    const result = await provider.updateMatch(matchId, matchUpdates, participantsUpdates);
    set((state) => ({
      matches: state.matches.map((m) => (m.id === matchId ? result.match : m)),
      matchParticipants: [
        ...state.matchParticipants.filter((mp) => mp.matchId !== matchId),
        ...result.participants,
      ],
    }));
    return result;
  },

  deleteMatch: async (id: string) => {
    await provider.deleteMatch(id);
    set((state) => ({
      matches: state.matches.filter((m) => m.id !== id),
      matchParticipants: state.matchParticipants.filter((mp) => mp.matchId !== id),
    }));
  },

  // Recommendations
  saveRecommendations: async (recs) => {
    const saved = await provider.saveRecommendations(recs);
    set((state) => ({
      recommendations: [...state.recommendations, ...saved],
    }));
    return saved;
  },

  updateRecommendationStatus: async (id, status) => {
    await provider.updateRecommendationStatus(id, status);
    set((state) => ({
      recommendations: state.recommendations.map((r) => (r.id === id ? { ...r, status } : r)),
    }));
  },

  // Settings
  setSetting: async (key, value) => {
    await provider.setSetting(key, value);
    set((state) => ({
      settings: {
        ...state.settings,
        [key]: value,
      },
    }));
  },

  // Backup & Import
  importBackup: async (backupJson) => {
    await provider.importData(backupJson);
    await get().loadAllData();
  },

  exportBackup: async () => {
    return provider.exportData();
  },
}));
