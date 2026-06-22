import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { Trash2, Calendar, Clock, Edit3, Plus, Search, Filter, MessageSquare, Award } from 'lucide-react';
import { Match, MatchParticipant } from '../types';

export default function Matches() {
  const { matches, matchParticipants, players, heroes, deleteMatch, logMatch, updateMatch } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [modeFilter, setModeFilter] = useState('All');
  const [playerFilter, setPlayerFilter] = useState('All');

  // Quick manually log match modal trigger
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [newGameMode, setNewGameMode] = useState('1v1');
  const [newDuration, setNewDuration] = useState(30);
  const [newNotes, setNewNotes] = useState('');
  const [newParticipants, setNewParticipants] = useState<{ playerId: string; heroId: string; placement: number | null }[]>([
    { playerId: '', heroId: '', placement: null },
    { playerId: '', heroId: '', placement: null },
  ]);
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);

  const activePlayers = useMemo(() => players.filter((p) => p.active === 1), [players]);
  const activeHeroes = useMemo(() => heroes.filter((h) => h.active === 1), [heroes]);

  const handleAddParticipantRow = () => {
    setNewParticipants((prev) => [...prev, { playerId: '', heroId: '', placement: null }]);
  };

  const handleRemoveParticipantRow = (index: number) => {
    setNewParticipants((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleParticipantChange = (index: number, field: 'playerId' | 'heroId' | 'placement', value: any) => {
    setNewParticipants((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row))
    );
  };

  const handleQuickLogSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const validParticipants = newParticipants.filter((p) => p.playerId && p.heroId);
    if (validParticipants.length < 2) {
      alert('Please configure at least 2 participants with players and heroes.');
      return;
    }

    if (editingMatchId) {
      await updateMatch(editingMatchId, { gameMode: newGameMode, notes: newNotes, durationMinutes: newDuration }, validParticipants);
    } else {
      await logMatch(newGameMode, validParticipants, newNotes, newDuration);
    }
    
    // reset
    setIsLogOpen(false);
    setEditingMatchId(null);
    setNewNotes('');
    setNewDuration(30);
    setNewGameMode('1v1');
    setNewParticipants([
      { playerId: '', heroId: '', placement: null },
      { playerId: '', heroId: '', placement: null },
    ]);
  };

  const handleStartEdit = (match: Match) => {
    const parts = participantsByMatch[match.id] || [];
    setEditingMatchId(match.id);
    setNewGameMode(match.gameMode);
    setNewDuration(match.durationMinutes || 30);
    setNewNotes(match.notes || '');
    setNewParticipants(
      parts.map((p) => ({
        playerId: p.playerId,
        heroId: p.heroId,
        placement: p.placement,
      }))
    );
    setIsLogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this match record?')) {
      deleteMatch(id);
    }
  };

  // Group participants by matchId for quick lookup
  const participantsByMatch = useMemo(() => {
    return matchParticipants.reduce((acc, curr) => {
      if (!acc[curr.matchId]) acc[curr.matchId] = [];
      acc[curr.matchId].push(curr);
      return acc;
    }, {} as Record<string, MatchParticipant[]>);
  }, [matchParticipants]);

  // Filtered matches
  const filteredMatches = useMemo(() => {
    return matches.filter((m) => {
      const parts = participantsByMatch[m.id] || [];

      // Search matches notes or player names
      const matchPlayerNames = parts.map((p) => players.find((pl) => pl.id === p.playerId)?.name || '');
      const matchHeroNames = parts.map((p) => heroes.find((h) => h.id === p.heroId)?.name || '');
      const searchStr = `${m.notes || ''} ${matchPlayerNames.join(' ')} ${matchHeroNames.join(' ')}`.toLowerCase();
      const matchesSearch = searchStr.includes(searchTerm.toLowerCase());

      // Mode filter
      const matchesMode = modeFilter === 'All' || m.gameMode === modeFilter;

      // Player filter
      const matchesPlayer = playerFilter === 'All' || parts.some((p) => p.playerId === playerFilter);

      return matchesSearch && matchesMode && matchesPlayer;
    });
  }, [matches, participantsByMatch, players, heroes, searchTerm, modeFilter, playerFilter]);

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            MATCH LOGS
          </h1>
          <p className="text-xs text-slate-400">View and manage history of battles</p>
        </div>
        <button
          onClick={() => setIsLogOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-950/50"
        >
          <Plus className="w-4 h-4" /> Quick Log
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search notes, players, heroes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Mode filter */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-300 focus:ring-0 cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Game Modes</option>
            <option value="1v1" className="bg-slate-900">1 vs 1</option>
            <option value="2v2" className="bg-slate-900">2 vs 2</option>
            <option value="FFA" className="bg-slate-900">Free For All</option>
          </select>
        </div>

        {/* Player filter */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={playerFilter}
            onChange={(e) => setPlayerFilter(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-300 focus:ring-0 cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Players</option>
            {players.map((p) => (
              <option key={p.id} value={p.id} className="bg-slate-900">
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        {filteredMatches.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/20 border border-slate-850 rounded-2xl text-slate-500 text-xs">
            No match records found matching current criteria.
          </div>
        ) : (
          filteredMatches.map((match) => {
            const parts = participantsByMatch[match.id] || [];

            return (
              <div
                key={match.id}
                className="bg-slate-900/30 border border-slate-900/60 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden group hover:border-slate-800 transition-all"
              >
                {/* Meta details */}
                <div className="flex items-start gap-4">
                  <div className="bg-slate-950 border border-slate-800/80 p-3 rounded-xl text-center shrink-0 flex flex-col justify-center min-w-16">
                    <span className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">
                      {match.gameMode}
                    </span>
                    <span className="text-xs font-black text-white mt-1">
                      {match.durationMinutes ? `${match.durationMinutes}m` : '-'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formatDate(match.playedAt)}
                      </span>
                    </div>

                    {/* Participants row */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {parts.map((p) => {
                        const player = players.find((pl) => pl.id === p.playerId);
                        const hero = heroes.find((h) => h.id === p.heroId);
                        const isWinner = p.placement === 1;

                        return (
                          <div
                            key={p.id}
                            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs ${
                              isWinner
                                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300 font-bold'
                                : 'bg-slate-950/80 border-slate-900 text-slate-300'
                            }`}
                          >
                            <span>{player?.name || 'Unknown'}</span>
                            <span className="text-[10px] text-slate-500 font-normal">as</span>
                            <span>{hero?.name || 'Unknown'}</span>
                            {isWinner && <Award className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>

                    {match.notes && (
                      <p className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-slate-500 shrink-0" />
                        "{match.notes}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex justify-end items-center gap-2 border-t md:border-t-0 border-slate-800/60 pt-3 md:pt-0">
                  <button
                    onClick={() => handleStartEdit(match)}
                    className="p-2 bg-slate-950 hover:bg-violet-950/30 text-slate-500 hover:text-violet-400 border border-slate-850 hover:border-violet-900/50 rounded-xl transition-all"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(match.id)}
                    className="p-2 bg-slate-950 hover:bg-red-950/30 text-slate-500 hover:text-red-400 border border-slate-850 hover:border-red-900/50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* QUICK LOG MODAL */}
      {isLogOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-black text-white">{editingMatchId ? 'Edit Match Record' : 'Log Custom Match'}</h3>
            <form onSubmit={handleQuickLogSave} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold">GAME MODE</label>
                  <select
                    value={newGameMode}
                    onChange={(e) => setNewGameMode(e.target.value)}
                    className="w-full mt-1 px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  >
                    <option value="1v1">1 vs 1</option>
                    <option value="2v2">2 vs 2</option>
                    <option value="FFA">Free For All</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold">DURATION (MINUTES)</label>
                  <input
                    type="number"
                    value={newDuration}
                    onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold">PARTICIPANTS</label>
                  <button
                    type="button"
                    onClick={handleAddParticipantRow}
                    className="text-[10px] text-violet-400 hover:text-violet-300 font-bold"
                  >
                    + Add Player
                  </button>
                </div>

                <div className="space-y-2.5 max-h-52 overflow-y-auto pr-1">
                  {newParticipants.map((row, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        required
                        value={row.playerId}
                        onChange={(e) => handleParticipantChange(idx, 'playerId', e.target.value)}
                        className="flex-1 px-2.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white"
                      >
                        <option value="">Select Player</option>
                        {activePlayers.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <select
                        required
                        value={row.heroId}
                        onChange={(e) => handleParticipantChange(idx, 'heroId', e.target.value)}
                        className="flex-1 px-2.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white"
                      >
                        <option value="">Select Hero</option>
                        {activeHeroes.map((h) => (
                          <option key={h.id} value={h.id}>
                            {h.name}
                          </option>
                        ))}
                      </select>

                      <select
                        value={row.placement || ''}
                        onChange={(e) =>
                          handleParticipantChange(
                            idx,
                            'placement',
                            e.target.value ? parseInt(e.target.value) : null
                          )
                        }
                        className="w-20 px-2.5 py-2 bg-slate-950 border border-slate-850 rounded-xl text-xs text-white"
                      >
                        <option value="">No Win</option>
                        <option value="1">Win</option>
                      </select>

                      {newParticipants.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParticipantRow(idx)}
                          className="p-2 text-slate-500 hover:text-red-400 shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold">MATCH NOTES</label>
                <input
                  type="text"
                  placeholder="e.g. Shadow Thief poison stack win"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsLogOpen(false);
                    setEditingMatchId(null);
                    setNewNotes('');
                    setNewDuration(30);
                    setNewGameMode('1v1');
                    setNewParticipants([
                      { playerId: '', heroId: '', placement: null },
                      { playerId: '', heroId: '', placement: null },
                    ]);
                  }}
                  className="w-1/2 py-2.5 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-xl"
                >
                  {editingMatchId ? 'Save Changes' : 'Log Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
