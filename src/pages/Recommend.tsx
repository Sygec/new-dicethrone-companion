import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { generateRecommendations, selectWeightedRandom, RecommendationResult } from '../utils/recommendationEngine';
import { Sparkles, Dices, ChevronRight, User, Filter, AlertCircle, RefreshCw, CheckCircle2, Trophy, HelpCircle } from 'lucide-react';
import { Hero } from '../types';

interface ParticipantSelection {
  playerId: string;
  heroId: string;
  recommendedHeroIds: string[];
  recommendationScores: Record<string, number>;
  recommendationReasons: Record<string, string[]>;
}

export default function Recommend() {
  const { players, heroes, matches, matchParticipants, heroOwnership, settings, saveRecommendations, logMatch } = useStore();

  const [step, setStep] = useState<number>(1);
  const [gameMode, setGameMode] = useState<string>('1v1');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  
  // Filters
  const [complexityMin, setComplexityMin] = useState<number>(1);
  const [complexityMax, setComplexityMax] = useState<number>(6);
  const [selectedSets, setSelectedSets] = useState<string[]>(['Season 1', 'Season 2', 'Marvel', 'Santa vs Krampus', 'X-Men']);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [ownedOnly, setOwnedOnly] = useState<boolean>(true);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<Record<string, RecommendationResult[]>>({});
  const [selections, setSelections] = useState<Record<string, string>>({}); // playerId -> chosen heroId

  // Match Log placement state
  const [placements, setPlacements] = useState<Record<string, number | null>>({}); // playerId -> placement (1 for winner, etc.)
  const [duration, setDuration] = useState<number>(30);
  const [notes, setNotes] = useState<string>('');

  const activePlayers = useMemo(() => players.filter((p) => p.active === 1), [players]);
  
  const allSets = useMemo(() => {
    const sets = new Set(heroes.map((h) => h.releaseSet));
    return Array.from(sets);
  }, [heroes]);

  const allTags = ['Offensive', 'Defensive', 'Control', 'Combo', 'Aggressive', 'Tactical', 'Beginner Friendly', 'Advanced'];

  // Toggle player selection
  const togglePlayer = (id: string) => {
    setSelectedPlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Generate recommendations for all selected players
  const handleGenerate = async () => {
    if (selectedPlayerIds.length === 0) return;

    const results: Record<string, RecommendationResult[]> = {};
    const chosenHeroIds: string[] = [];

    // Run recommendations sequentially to avoid recommending duplicate heroes to different players in the same session
    selectedPlayerIds.forEach((playerId) => {
      const recs = generateRecommendations(
        playerId,
        players,
        heroes,
        matches,
        matchParticipants,
        heroOwnership,
        settings,
        {
          complexityMin,
          complexityMax,
          includeSets: selectedSets,
          tags: selectedTags,
          ownedOnly,
          excludeHeroIds: chosenHeroIds,
        }
      );

      // Take top 5
      const topRecs = recs.slice(0, 5);
      results[playerId] = topRecs;
      
      // Save all generated recommendations to DB history for future tuning
      const saveRecords = topRecs.map((r) => ({
        playerId,
        heroId: r.heroId,
        score: r.score,
        reasons: r.reasons,
        status: 'recommended' as const,
      }));
      saveRecommendations(saveRecords);
    });

    setRecommendations(results);
    setSelections({});
    setStep(3);
  };

  // Helper to trigger weighted random selection for a player
  const triggerWeightedRandom = (playerId: string) => {
    const recList = recommendations[playerId] || [];
    if (recList.length === 0) return;
    const selected = selectWeightedRandom(recList, 1);
    if (selected.length > 0) {
      setSelections((prev) => ({ ...prev, [playerId]: selected[0].heroId }));
    }
  };

  const handleManualSelect = (playerId: string, heroId: string) => {
    setSelections((prev) => ({ ...prev, [playerId]: heroId }));
  };

  // Move to playing step
  const handleStartMatch = () => {
    // Check that all selected players have chosen a hero
    const allSelected = selectedPlayerIds.every((pId) => selections[pId]);
    if (!allSelected) return;

    // Set initial placement states (draw/none to start)
    const initialPlacements: Record<string, number | null> = {};
    selectedPlayerIds.forEach((pId) => {
      initialPlacements[pId] = null;
    });
    setPlacements(initialPlacements);
    setStep(4);
  };

  // Submit match logging
  const handleSaveMatch = async () => {
    const participants = selectedPlayerIds.map((pId) => ({
      playerId: pId,
      heroId: selections[pId],
      placement: placements[pId],
    }));

    await logMatch(gameMode, participants, notes, duration);

    // Reset and go back to step 1
    setStep(1);
    setSelectedPlayerIds([]);
    setRecommendations({});
    setSelections({});
    setPlacements({});
    setNotes('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Wizard Header Progress Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex justify-between items-center text-xs font-semibold text-slate-400">
        <span className={`flex items-center gap-1.5 ${step >= 1 ? 'text-violet-400' : ''}`}>
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 1 ? 'bg-violet-600 text-white font-bold' : 'bg-slate-800'}`}>1</span> Mode & Players
        </span>
        <ChevronRight className="w-4 h-4 text-slate-700" />
        <span className={`flex items-center gap-1.5 ${step >= 2 ? 'text-violet-400' : ''}`}>
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 2 ? 'bg-violet-600 text-white font-bold' : 'bg-slate-800'}`}>2</span> Filters
        </span>
        <ChevronRight className="w-4 h-4 text-slate-700" />
        <span className={`flex items-center gap-1.5 ${step >= 3 ? 'text-violet-400' : ''}`}>
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 3 ? 'bg-violet-600 text-white font-bold' : 'bg-slate-800'}`}>3</span> Recommendations
        </span>
        <ChevronRight className="w-4 h-4 text-slate-700" />
        <span className={`flex items-center gap-1.5 ${step >= 4 ? 'text-violet-400' : ''}`}>
          <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${step >= 4 ? 'bg-violet-600 text-white font-bold' : 'bg-slate-800'}`}>4</span> Battle & Log
        </span>
      </div>

      {/* STEP 1: Select Game Mode & Players */}
      {step === 1 && (
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl space-y-6">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-white">Select Game Mode</h2>
            <p className="text-xs text-slate-400">Choose the format of your battle</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {['1v1', '2v2', 'FFA'].map((mode) => (
              <button
                key={mode}
                onClick={() => setGameMode(mode)}
                className={`py-3 rounded-2xl font-bold border text-sm transition-all ${
                  gameMode === mode
                    ? 'bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-950/40'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {mode === '1v1' ? '1 vs 1' : mode === '2v2' ? '2 vs 2' : 'Free For All'}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h2 className="text-base font-bold text-white">Who is playing?</h2>
              <span className="text-xs text-slate-400">{selectedPlayerIds.length} Selected</span>
            </div>
            {activePlayers.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center text-xs text-slate-400">
                Please add active players under the Players tab first.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {activePlayers.map((player) => {
                  const isSelected = selectedPlayerIds.includes(player.id);
                  return (
                    <button
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${
                        isSelected
                          ? 'bg-gradient-to-br from-violet-900/60 to-indigo-900/60 border-violet-500 text-white shadow-md shadow-violet-950/30'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold ${
                          isSelected ? 'bg-violet-500 text-white' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </div>
                      <span className="font-bold text-sm truncate">{player.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={selectedPlayerIds.length === 0}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-violet-950/40 disabled:shadow-none transition-all"
          >
            Configure Engine Filters <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 2: Configure Recommendation Filters */}
      {step === 2 && (
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Recommendation Filters</h2>
              <p className="text-xs text-slate-400">Tailor the pool of heroes to suggest</p>
            </div>
            <Filter className="w-5 h-5 text-violet-400" />
          </div>

          {/* Owned only switch */}
          <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-2xl">
            <div>
              <h4 className="text-sm font-bold text-white">Owned Heroes Only</h4>
              <p className="text-[10px] text-slate-400">
                {settings.useCollectionOwnership ? 'Uses custom player ownership system' : 'Only recommends owned sets'}
              </p>
            </div>
            <button
              onClick={() => setOwnedOnly((prev) => !prev)}
              className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-all duration-300 ${
                ownedOnly ? 'bg-violet-600 justify-end' : 'bg-slate-800 justify-start'
              }`}
            >
              <span className="w-4 h-4 rounded-full bg-white shadow-md" />
            </button>
          </div>

          {/* Complexity Slider */}
          <div className="space-y-3">
            <label className="text-xs text-slate-400 font-semibold">Complexity Range (1 to 6)</label>
            <div className="flex items-center gap-4">
              <div className="flex-1 flex gap-2">
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={complexityMin}
                  onChange={(e) => setComplexityMin(parseInt(e.target.value))}
                  className="w-full accent-violet-500"
                />
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={complexityMax}
                  onChange={(e) => setComplexityMax(parseInt(e.target.value))}
                  className="w-full accent-violet-500"
                />
              </div>
              <span className="text-xs font-bold text-violet-400 whitespace-nowrap bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl">
                {complexityMin} - {complexityMax}
              </span>
            </div>
          </div>

          {/* Set checkboxes */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold">Include Release Sets</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {allSets.map((set) => {
                const isSelected = selectedSets.includes(set);
                return (
                  <button
                    key={set}
                    onClick={() =>
                      setSelectedSets((prev) =>
                        isSelected ? prev.filter((s) => s !== set) : [...prev, set]
                      )
                    }
                    className={`py-2 px-3 text-xs font-bold rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'bg-violet-950/40 border-violet-500 text-violet-300'
                        : 'bg-slate-900/40 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {set}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tag checkboxes */}
          <div className="space-y-2">
            <label className="text-xs text-slate-400 font-semibold">Filter by Hero Style / Tags</label>
            <div className="flex flex-wrap gap-1.5">
              {allTags.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() =>
                      setSelectedTags((prev) =>
                        isSelected ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
                    className={`py-1.5 px-3 text-xs rounded-full border transition-all ${
                      isSelected
                        ? 'bg-violet-600 border-violet-500 text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setStep(1)}
              className="w-1/3 py-3 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleGenerate}
              className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-violet-950/40"
            >
              <Sparkles className="w-4 h-4" /> Generate recommendations
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: View Recommendations & Choose Hero */}
      {step === 3 && (
        <div className="space-y-6">
          {selectedPlayerIds.map((playerId) => {
            const player = players.find((p) => p.id === playerId);
            const recList = recommendations[playerId] || [];
            const selectedHeroId = selections[playerId];
            const selectedHero = heroes.find((h) => h.id === selectedHeroId);

            return (
              <div key={playerId} className="bg-slate-900/40 border border-slate-950/60 p-5 rounded-3xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-6 bg-violet-500 rounded-full" />
                    <h3 className="font-black text-base text-white">{player?.name}</h3>
                  </div>
                  <button
                    onClick={() => triggerWeightedRandom(playerId)}
                    className="flex items-center gap-1.5 text-xs text-violet-400 bg-violet-950/30 border border-violet-900/60 hover:bg-violet-950/60 px-3 py-1.5 rounded-xl font-bold transition-all"
                  >
                    <Dices className="w-3.5 h-3.5" /> Roll Choice
                  </button>
                </div>

                {selectedHero ? (
                  <div className="p-4 bg-gradient-to-r from-violet-950/30 via-indigo-950/30 to-slate-900/40 border border-violet-500/50 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 shrink-0">
                        {selectedHero.imageUrl ? (
                          <img
                            src={selectedHero.imageUrl}
                            alt={selectedHero.name}
                            className="w-full h-full object-cover object-top"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-indigo-900/20 flex items-center justify-center font-black text-xs text-violet-400 select-none">
                          {selectedHero.name.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-violet-400 font-bold uppercase tracking-wider">Locked Selection</div>
                        <h4 className="text-sm font-black text-white mt-0.5">{selectedHero.name}</h4>
                        <p className="text-[10px] text-slate-400">{selectedHero.releaseSet}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelections((prev) => ({ ...prev, [playerId]: '' }))}
                      className="text-xs text-slate-400 hover:text-white underline font-semibold"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {recList.length === 0 ? (
                      <div className="col-span-5 text-center text-xs text-slate-500 py-4">
                        No recommendations matching filters. Try widening filters.
                      </div>
                    ) : (
                      recList.map((rec) => {
                        const hero = heroes.find((h) => h.id === rec.heroId);
                        if (!hero) return null;
                        return (
                          <div
                            key={rec.heroId}
                            onClick={() => handleManualSelect(playerId, rec.heroId)}
                            className="bg-slate-900 border border-slate-800/80 hover:border-violet-600 rounded-2xl p-3 flex flex-col justify-between text-left cursor-pointer transition-all hover:scale-[1.02] shadow-sm relative overflow-hidden group"
                          >
                            <div>
                              <div className="relative w-full h-20 rounded-xl overflow-hidden bg-slate-950 border border-slate-850 mb-2.5 group">
                                {hero.imageUrl ? (
                                  <img
                                    src={hero.imageUrl}
                                    alt={hero.name}
                                    className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                                    onError={(e) => {
                                      (e.target as HTMLElement).style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-indigo-900/20 flex items-center justify-center font-black text-sm text-violet-400 select-none">
                                  {hero.name.charAt(0)}
                                </div>
                              </div>
                              <div className="flex justify-between items-start gap-1">
                                <span className="text-[9px] font-bold text-slate-500 truncate shrink">
                                  {hero.releaseSet}
                                </span>
                                <span className="bg-violet-950/80 border border-violet-900 text-violet-300 font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">
                                  Score: {rec.score}
                                </span>
                              </div>
                              <h4 className="text-sm font-black text-white mt-1.5 group-hover:text-violet-400 transition-colors">
                                {hero.name}
                              </h4>
                              {/* Reason details tooltip-like area */}
                              <div className="mt-2 space-y-0.5 max-h-16 overflow-y-auto">
                                {rec.reasons.slice(0, 2).map((reason, rIdx) => (
                                  <p key={rIdx} className="text-[9px] text-slate-400 line-clamp-1">
                                    • {reason}
                                  </p>
                                ))}
                              </div>
                            </div>
                            <button className="w-full mt-3 py-1.5 bg-slate-950 hover:bg-violet-600 text-slate-300 hover:text-white text-[10px] font-bold rounded-lg transition-all">
                              Select
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="w-1/3 py-4 border border-slate-800 text-slate-400 font-bold text-xs rounded-2xl hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleStartMatch}
              disabled={!selectedPlayerIds.every((pId) => selections[pId])}
              className="flex-1 py-4 bg-gradient-to-r from-violet-600 to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-1.5 shadow-lg shadow-violet-950/40 disabled:shadow-none"
            >
              Lock Selection & Play <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Play the Match & Record results */}
      {step === 4 && (
        <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-3xl space-y-6">
          <div className="border-b border-slate-800/80 pb-4">
            <h2 className="text-xl font-bold text-white">Record Battle Results</h2>
            <p className="text-xs text-slate-400">Flag the winner and complete your workout</p>
          </div>

          <div className="space-y-4">
            {selectedPlayerIds.map((playerId) => {
              const player = players.find((p) => p.id === playerId);
              const hero = heroes.find((h) => h.id === selections[playerId]);
              const isWinner = placements[playerId] === 1;

              return (
                <div
                  key={playerId}
                  className={`p-4 border rounded-2xl flex items-center justify-between transition-all ${
                    isWinner
                      ? 'bg-emerald-950/20 border-emerald-500/80 shadow-md shadow-emerald-950/20'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-xs text-slate-400">PLAYER & HERO</div>
                    <div className="text-base font-black text-white mt-0.5">
                      {player?.name} <span className="text-slate-400 font-normal">as</span> {hero?.name}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setPlacements((prev) => ({
                          ...prev,
                          [playerId]: prev[playerId] === 1 ? null : 1, // toggle winner
                        }))
                      }
                      className={`px-4 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all ${
                        isWinner
                          ? 'bg-emerald-600 border-emerald-500 text-white shadow-md'
                          : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5" /> Win
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-semibold">Duration (Minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-semibold">Session Notes</label>
              <input
                type="text"
                placeholder="e.g. Tight game, final roll won it"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 px-4 py-3 rounded-2xl text-white text-sm focus:outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-3">
            <button
              onClick={() => setStep(3)}
              className="w-1/3 py-3 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
            >
              Back
            </button>
            <button
              onClick={handleSaveMatch}
              className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/40 animate-pulse"
            >
              <CheckCircle2 className="w-4 h-4" /> Save Match Record
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
