import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { User, Plus, Edit3, Trash2, Trophy, Award, Flame, Check, X, ShieldAlert } from 'lucide-react';
import { Player, Match, MatchParticipant, Hero } from '../types';

export default function Players() {
  const { players, matches, matchParticipants, heroes, addPlayer, updatePlayerName, togglePlayerActive, deletePlayer, settings, toggleCollectionOwnership, heroOwnership } = useStore();

  const [newPlayerName, setNewPlayerName] = useState('');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showManageCollectionId, setShowManageCollectionId] = useState<string | null>(null);

  // Group participants by matchId for quick lookup
  const participantsByMatch = useMemo(() => {
    return matchParticipants.reduce((acc, curr) => {
      if (!acc[curr.matchId]) acc[curr.matchId] = [];
      acc[curr.matchId].push(curr);
      return acc;
    }, {} as Record<string, MatchParticipant[]>);
  }, [matchParticipants]);

  // Calculate detailed stats per player
  const playerStats = useMemo(() => {
    const stats: Record<
      string,
      {
        totalGames: number;
        wins: number;
        losses: number;
        draws: number;
        winPercentage: number;
        currentStreak: number;
        streakType: 'win' | 'loss' | null;
        favoriteHeroName: string;
      }
    > = {};

    players.forEach((p) => {
      const pMatches = matches.filter((m) => {
        const parts = participantsByMatch[m.id] || [];
        return parts.some((part) => part.playerId === p.id);
      });

      let wins = 0;
      let losses = 0;
      let draws = 0;

      pMatches.forEach((m) => {
        const parts = participantsByMatch[m.id] || [];
        const userPart = parts.find((part) => part.playerId === p.id);
        if (userPart) {
          if (userPart.placement === 1) {
            wins++;
          } else if (userPart.placement === null) {
            draws++;
          } else {
            losses++;
          }
        }
      });

      const totalGames = pMatches.length;
      const winPercentage = totalGames > 0 ? Math.round((wins / (totalGames - draws)) * 100) : 0;

      // Current Streak
      let currentStreak = 0;
      let streakType: 'win' | 'loss' | null = null;
      if (pMatches.length > 0) {
        // Sort matches descending
        const sortedPMatches = [...pMatches].sort((a, b) => b.playedAt - a.playedAt);
        for (let i = 0; i < sortedPMatches.length; i++) {
          const m = sortedPMatches[i];
          const parts = participantsByMatch[m.id] || [];
          const userPart = parts.find((part) => part.playerId === p.id);
          if (!userPart || userPart.placement === null) break;

          const isWin = userPart.placement === 1;
          if (streakType === null) {
            streakType = isWin ? 'win' : 'loss';
            currentStreak = 1;
          } else if ((streakType === 'win' && isWin) || (streakType === 'loss' && !isWin)) {
            currentStreak++;
          } else {
            break;
          }
        }
      }

      // Favorite Hero
      const heroCounts: Record<string, number> = {};
      matchParticipants.forEach((mp) => {
        if (mp.playerId === p.id) {
          heroCounts[mp.heroId] = (heroCounts[mp.heroId] || 0) + 1;
        }
      });

      let favHeroId = '';
      let maxCount = 0;
      Object.entries(heroCounts).forEach(([hId, cnt]) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          favHeroId = hId;
        }
      });
      const favHero = heroes.find((h) => h.id === favHeroId);

      stats[p.id] = {
        totalGames,
        wins,
        losses,
        draws,
        winPercentage,
        currentStreak,
        streakType,
        favoriteHeroName: favHero ? favHero.name : 'None',
      };
    });

    return stats;
  }, [players, matches, participantsByMatch, matchParticipants, heroes]);

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    await addPlayer(newPlayerName.trim());
    setNewPlayerName('');
  };

  const handleStartEdit = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditingName(player.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    await updatePlayerName(id, editingName.trim());
    setEditingPlayerId(null);
  };

  const handleDeletePlayer = (id: string) => {
    if (window.confirm('Are you sure you want to delete this player? All their play history and collections will be affected.')) {
      deletePlayer(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-800/80">
        <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
          PLAYER PROFILES
        </h1>
        <p className="text-xs text-slate-400">Configure players, customize active catalog collections, and view metrics</p>
      </div>

      {/* Add Player Box */}
      <form onSubmit={handleAddPlayer} className="bg-slate-900/40 border border-slate-900 p-4 rounded-2xl flex gap-3 max-w-md">
        <input
          type="text"
          placeholder="New player name..."
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          className="flex-1 bg-slate-950 border border-slate-800 px-4 py-2.5 rounded-xl text-xs text-white focus:outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all"
        >
          Add Player
        </button>
      </form>

      {/* Grid of Players */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {players.map((player) => {
          const stats = playerStats[player.id] || {
            totalGames: 0,
            wins: 0,
            losses: 0,
            draws: 0,
            winPercentage: 0,
            currentStreak: 0,
            streakType: null,
            favoriteHeroName: 'None',
          };
          const isEditing = editingPlayerId === player.id;
          const isManagingCollection = showManageCollectionId === player.id;

          return (
            <div key={player.id} className="bg-slate-900/40 border border-slate-900 p-5 rounded-3xl space-y-4">
              <div className="flex justify-between items-center">
                {isEditing ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveEdit(player.id)}
                      className="p-1.5 bg-emerald-600 rounded-lg text-white"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingPlayerId(null)}
                      className="p-1.5 bg-slate-850 rounded-lg text-slate-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-violet-950/40 border border-violet-900/40 flex items-center justify-center text-violet-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white">{player.name}</h3>
                      <button
                        onClick={() => togglePlayerActive(player.id)}
                        className={`text-[10px] font-bold ${player.active === 1 ? 'text-emerald-400' : 'text-slate-500'}`}
                      >
                        {player.active === 1 ? 'Active Partner' : 'Archived / Inactive'}
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-slate-500">
                  <button
                    onClick={() => handleStartEdit(player)}
                    className="p-2 hover:bg-slate-950 text-slate-400 hover:text-white rounded-xl transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="p-2 hover:bg-slate-950 text-slate-400 hover:text-red-400 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Player stats numbers */}
              <div className="grid grid-cols-3 gap-2 bg-slate-950/40 border border-slate-900 p-3 rounded-2xl text-center">
                <div>
                  <div className="text-[10px] text-slate-500">MATCHES</div>
                  <div className="text-lg font-black text-white mt-0.5">{stats.totalGames}</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500">WIN RATE</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">{stats.winPercentage}%</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-semibold">STREAK</div>
                  <div className="text-lg font-black text-orange-400 mt-0.5 flex items-center justify-center gap-0.5">
                    {stats.currentStreak}
                    {stats.streakType === 'win' && <Flame className="w-4 h-4 text-orange-400 animate-pulse" />}
                  </div>
                </div>
              </div>

              {/* Meta information: Favorite Hero */}
              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Favorite Hero:</span>
                <span className="font-bold text-slate-200">{stats.favoriteHeroName}</span>
              </div>

              {/* Collections management toggle */}
              {settings.useCollectionOwnership && (
                <div className="pt-2 border-t border-slate-850">
                  <button
                    onClick={() => setShowManageCollectionId(isManagingCollection ? null : player.id)}
                    className="text-xs text-violet-400 font-bold hover:text-violet-300 transition-colors"
                  >
                    {isManagingCollection ? 'Hide Owned Heroes Catalog' : 'Manage Collection Ownership'}
                  </button>

                  {isManagingCollection && (
                    <div className="mt-3 bg-slate-950/60 p-3 rounded-2xl space-y-2 border border-slate-850">
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <ShieldAlert className="w-3.5 h-3.5 text-violet-400" />
                        Toggle heroes owned by {player.name}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                        {heroes.map((hero) => {
                          const isOwned = heroOwnership.some((ho) => ho.heroId === hero.id && ho.playerId === player.id);
                          return (
                            <button
                              key={hero.id}
                              onClick={() => toggleCollectionOwnership(hero.id, player.id)}
                              className={`py-1 px-2.5 text-[10px] rounded-lg text-left truncate transition-all border ${
                                isOwned
                                  ? 'bg-violet-950/40 border-violet-500 text-violet-300 font-bold'
                                  : 'bg-slate-900 border-slate-850 text-slate-500'
                              }`}
                            >
                              {hero.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
