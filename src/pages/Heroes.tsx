import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { Search, Filter, Plus, BookOpen, ToggleLeft, ToggleRight, X, ExternalLink } from 'lucide-react';
import { Hero } from '../types';

export default function Heroes() {
  const { heroes, matchParticipants, addCustomHero, updateHeroDetails, deleteHero, settings } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [setFilter, setSetFilter] = useState('All');
  const [complexityFilter, setComplexityFilter] = useState('All');
  const [expandedHeroId, setExpandedHeroId] = useState<string | null>(null);

  // Form for custom hero
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [complexity, setComplexity] = useState(3);
  const [releaseSet, setReleaseSet] = useState('Custom');
  const [tags, setTags] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [rulepopUrl, setRulepopUrl] = useState('');

  const allSets = useMemo(() => {
    const sets = new Set(heroes.map((h) => h.releaseSet));
    return Array.from(sets);
  }, [heroes]);

  const allTags = ['Offensive', 'Defensive', 'Control', 'Combo', 'Aggressive', 'Tactical', 'Beginner Friendly', 'Advanced'];

  // Global hero statistics
  const heroStats = useMemo(() => {
    const stats: Record<string, { games: number; wins: number }> = {};
    
    // Initialize
    heroes.forEach((h) => {
      stats[h.id] = { games: 0, wins: 0 };
    });

    matchParticipants.forEach((mp) => {
      if (!stats[mp.heroId]) {
        stats[mp.heroId] = { games: 0, wins: 0 };
      }
      stats[mp.heroId].games++;
      if (mp.placement === 1) {
        stats[mp.heroId].wins++;
      }
    });

    return stats;
  }, [heroes, matchParticipants]);

  const filteredHeroes = useMemo(() => {
    return heroes.filter((h) => {
      const matchSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        h.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchSet = setFilter === 'All' || h.releaseSet === setFilter;
      const matchComplexity = complexityFilter === 'All' || h.complexity.toString() === complexityFilter;
      return matchSearch && matchSet && matchComplexity;
    });
  }, [heroes, searchTerm, setFilter, complexityFilter]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newHeroId = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    await addCustomHero({
      id: newHeroId,
      name,
      complexity,
      releaseSet,
      releaseWave: 'Custom',
      tags,
      imageUrl: imageUrl || 'https://rulepop.com/dice-throne/images/barbarian/board.jpg',
      rulepopUrl: rulepopUrl || 'https://rulepop.com/dice-throne',
      owned: 1,
      active: 1,
    });

    // reset
    setName('');
    setComplexity(3);
    setReleaseSet('Custom');
    setTags([]);
    setImageUrl('');
    setRulepopUrl('');
    setIsAddOpen(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            HERO ROSTER
          </h1>
          <p className="text-xs text-slate-400">Search characteristics, link to rules, and track play counts</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-950/50"
        >
          <Plus className="w-4 h-4" /> Add Hero
        </button>
      </div>

      {/* Filter / Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
          />
        </div>

        {/* Set filter */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={setFilter}
            onChange={(e) => setSetFilter(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-300 focus:ring-0 cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Sets</option>
            {allSets.map((s) => (
              <option key={s} value={s} className="bg-slate-900">
                {s}
              </option>
            ))}
          </select>
        </div>

        {/* Complexity filter */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl px-3 gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <select
            value={complexityFilter}
            onChange={(e) => setComplexityFilter(e.target.value)}
            className="w-full bg-transparent border-none text-xs text-slate-300 focus:ring-0 cursor-pointer"
          >
            <option value="All" className="bg-slate-900">All Complexities</option>
            <option value="1" className="bg-slate-900">Level 1</option>
            <option value="2" className="bg-slate-900">Level 2</option>
            <option value="3" className="bg-slate-900">Level 3</option>
            <option value="4" className="bg-slate-900">Level 4</option>
            <option value="5" className="bg-slate-900">Level 5</option>
            <option value="6" className="bg-slate-900">Level 6</option>
          </select>
        </div>
      </div>

      {/* Grid of Heroes */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {filteredHeroes.map((hero) => {
          const stats = heroStats[hero.id] || { games: 0, wins: 0 };
          const winRate = stats.games > 0 ? Math.round((stats.wins / stats.games) * 100) : 0;
          const isExpanded = expandedHeroId === hero.id;

          return (
            <div
              key={hero.id}
              className={`bg-slate-900/40 border rounded-2xl p-4 flex flex-col justify-between transition-all hover:scale-[1.01] ${
                hero.owned === 1 ? 'border-slate-900' : 'border-slate-950/80 opacity-50'
              }`}
            >
              <div>
                <div className="relative w-full h-24 sm:h-28 rounded-xl overflow-hidden bg-slate-950 border border-slate-850 mb-3 group">
                  {hero.imageUrl ? (
                    <img
                      src={hero.imageUrl}
                      alt={hero.name}
                      loading="lazy"
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 to-indigo-900/20 flex items-center justify-center font-black text-xl text-violet-400 select-none">
                    {hero.name.charAt(0)}
                  </div>
                </div>
                <div className="flex justify-between items-start gap-1">
                  <span className="text-[9px] font-bold text-slate-500">{hero.releaseSet}</span>
                  <span className="bg-slate-950 border border-slate-850 text-slate-400 font-bold text-[9px] px-1.5 py-0.5 rounded-full shrink-0">
                    Lvl {hero.complexity}
                  </span>
                </div>

                <h3 className="text-base font-black text-white mt-2">{hero.name}</h3>

                {/* Tags */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {hero.tags.map((t) => (
                    <span
                      key={t}
                      className="px-2 py-0.5 bg-slate-950/60 border border-slate-850 text-[9px] text-slate-400 rounded-full"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                {/* Quick stats preview */}
                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-850 text-[10px] text-slate-400">
                  <div>
                    <span>Played:</span> <strong className="text-white">{stats.games}</strong>
                  </div>
                  <div>
                    <span>Win Rate:</span> <strong className="text-emerald-400">{winRate}%</strong>
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  onClick={() => setExpandedHeroId(isExpanded ? null : hero.id)}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all border border-slate-850 flex items-center justify-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5 text-violet-400" /> {isExpanded ? 'Hide Details' : 'View Details'}
                </button>

                {isExpanded && (
                  <div className="pt-3 border-t border-slate-850 text-xs text-slate-300 space-y-2.5 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span>Include in Pool:</span>
                      <button
                        onClick={() => updateHeroDetails(hero.id, { active: hero.active === 1 ? 0 : 1 })}
                        className="text-violet-400"
                      >
                        {hero.active === 1 ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                    </div>

                    <div className="flex justify-between items-center">
                      <span>Collection Owned:</span>
                      <button
                        onClick={() => updateHeroDetails(hero.id, { owned: hero.owned === 1 ? 0 : 1 })}
                        className="text-violet-400"
                      >
                        {hero.owned === 1 ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-600" />
                        )}
                      </button>
                    </div>

                    <a
                      href={hero.rulepopUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-1.5 bg-violet-950/20 text-violet-300 border border-violet-900/60 rounded-lg flex items-center justify-center gap-1 font-bold text-[10px] transition-all hover:bg-violet-950/40"
                    >
                      Official Rules <ExternalLink className="w-3 h-3" />
                    </a>

                    {hero.id.startsWith('custom-') && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete ${hero.name}?`)) {
                            deleteHero(hero.id);
                          }
                        }}
                        className="w-full py-1 text-red-400 hover:text-red-300 text-[10px] font-bold"
                      >
                        Delete Custom Hero
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD CUSTOM HERO MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-white">Create Custom Hero</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] text-slate-400 font-bold">HERO NAME</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shadow Assassin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold">COMPLEXITY (1-6)</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    required
                    value={complexity}
                    onChange={(e) => setComplexity(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold">RELEASE SET</label>
                  <input
                    type="text"
                    required
                    value={releaseSet}
                    onChange={(e) => setReleaseSet(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 font-bold">STYLE / TAGS</label>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {allTags.map((tag) => {
                    const isSelected = tags.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`py-1 px-2.5 text-[10px] rounded-full border transition-all ${
                          isSelected
                            ? 'bg-violet-600 border-violet-500 text-white'
                            : 'bg-slate-950 border-slate-850 text-slate-400'
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold">IMAGE URL (OPTIONAL)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold">RULES URL (OPTIONAL)</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={rulepopUrl}
                    onChange={(e) => setRulepopUrl(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="w-1/2 py-2.5 border border-slate-800 text-slate-400 font-bold text-xs rounded-xl hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-1/2 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs rounded-xl"
                >
                  Create Hero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
