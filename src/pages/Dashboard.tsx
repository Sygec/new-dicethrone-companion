import React, { useState, useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Legend, Cell } from 'recharts';
import { Trophy, Users, ShieldAlert, Sparkles, Flame, Play, Clock } from 'lucide-react';

export default function Dashboard() {
  const { players, heroes, matches, matchParticipants } = useStore();
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('group');

  // Load store data on mount (this will be run in App.tsx globally, but safe to assume it's here)

  // Map participants and matches for quick analytics
  const processedStats = useMemo(() => {
    if (players.length === 0) return null;

    // Filter participants for selected player, or group-wide
    const targetPlayerId = selectedPlayerId;
    const isGroup = targetPlayerId === 'group';

    const playerMatches = matches.filter((m) => {
      if (isGroup) return true;
      const parts = matchParticipants.filter((mp) => mp.matchId === m.id);
      return parts.some((p) => p.playerId === targetPlayerId);
    });

    const totalGames = playerMatches.length;

    // Calculate wins
    let wins = 0;
    let losses = 0;
    let draws = 0;

    playerMatches.forEach((m) => {
      const parts = matchParticipants.filter((mp) => mp.matchId === m.id);
      if (isGroup) {
        // Group wins: a win is whenever there is a participant with placement === 1
        const hasWinner = parts.some((p) => p.placement === 1);
        if (hasWinner) wins++;
      } else {
        const userPart = parts.find((p) => p.playerId === targetPlayerId);
        if (userPart) {
          if (userPart.placement === 1) {
            wins++;
          } else if (userPart.placement === null) {
            draws++;
          } else {
            losses++;
          }
        }
      }
    });

    const winPercentage = totalGames > 0 ? Math.round((wins / (totalGames - draws)) * 100) : 0;

    // Calculate current streak
    let currentStreak = 0;
    let streakType: 'win' | 'loss' | null = null;

    if (!isGroup && playerMatches.length > 0) {
      // Sort playerMatches descending
      const sortedPlayerMatches = [...playerMatches].sort((a, b) => b.playedAt - a.playedAt);
      for (let i = 0; i < sortedPlayerMatches.length; i++) {
        const m = sortedPlayerMatches[i];
        const parts = matchParticipants.filter((mp) => mp.matchId === m.id);
        const userPart = parts.find((p) => p.playerId === targetPlayerId);
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

    // Hero stats for selected player or group
    const heroStats: Record<string, { games: number; wins: number }> = {};
    matchParticipants.forEach((mp) => {
      if (!isGroup && mp.playerId !== targetPlayerId) return;
      if (!heroStats[mp.heroId]) {
        heroStats[mp.heroId] = { games: 0, wins: 0 };
      }
      heroStats[mp.heroId].games++;
      if (mp.placement === 1) {
        heroStats[mp.heroId].wins++;
      }
    });

    // Favorite Hero (most played)
    let favoriteHeroId = '';
    let maxPlayed = 0;
    Object.entries(heroStats).forEach(([heroId, data]) => {
      if (data.games > maxPlayed) {
        maxPlayed = data.games;
        favoriteHeroId = heroId;
      }
    });
    const favoriteHero = heroes.find((h) => h.id === favoriteHeroId);

    // Most Successful Hero (highest win rate, min 3 games)
    let bestHeroId = '';
    let maxWinRate = 0;
    Object.entries(heroStats).forEach(([heroId, data]) => {
      if (data.games >= 2) {
        const wr = data.wins / data.games;
        if (wr > maxWinRate) {
          maxWinRate = wr;
          bestHeroId = heroId;
        }
      }
    });
    const bestHero = heroes.find((h) => h.id === bestHeroId);

    // Stalled Heroes (owned but not played in last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const lastPlayedByHero: Record<string, number> = {};

    matchParticipants.forEach((mp) => {
      if (!isGroup && mp.playerId !== targetPlayerId) return;
      const match = matches.find((m) => m.id === mp.matchId);
      if (match) {
        const prev = lastPlayedByHero[mp.heroId] || 0;
        if (match.playedAt > prev) {
          lastPlayedByHero[mp.heroId] = match.playedAt;
        }
      }
    });

    const stalledHeroes = heroes.filter((h) => {
      if (h.owned === 0 || h.active === 0) return false;
      const lastPlayed = lastPlayedByHero[h.id];
      if (!lastPlayed) return playerMatches.length > 0; // if player has played games, but never this hero
      return lastPlayed < thirtyDaysAgo;
    });

    // Suggested progression / variety opportunities
    const suggestions: string[] = [];
    if (!isGroup) {
      const neverPlayed = heroes.filter(
        (h) => h.owned === 1 && h.active === 1 && !heroStats[h.id]
      );
      if (neverPlayed.length > 0) {
        const randomHero = neverPlayed[Math.floor(Math.random() * neverPlayed.length)];
        suggestions.push(`Try out ${randomHero.name} - you haven't played them yet!`);
      }
      if (stalledHeroes.length > 0) {
        const randomStalled = stalledHeroes[Math.floor(Math.random() * stalledHeroes.length)];
        suggestions.push(`Revive ${randomStalled.name} - it's been idle for over 30 days.`);
      }
    } else {
      const neverPlayedGroup = heroes.filter(
        (h) => h.owned === 1 && h.active === 1 && !heroStats[h.id]
      );
      if (neverPlayedGroup.length > 0) {
        const randomHero = neverPlayedGroup[Math.floor(Math.random() * neverPlayedGroup.length)];
        suggestions.push(`Unveil ${randomHero.name} - no one in the group has logged a game with them yet!`);
      }
    }

    if (suggestions.length === 0) {
      suggestions.push("Great work! Keep rotating your heroes to maintain maximum play variety.");
    }

    // Chart Data: Match history breakdown over time (group by week/month)
    const matchFreq: Record<string, number> = {};
    [...matches].reverse().forEach((m) => {
      const date = new Date(m.playedAt);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;
      matchFreq[label] = (matchFreq[label] || 0) + 1;
    });
    const matchHistoryChartData = Object.entries(matchFreq).map(([date, count]) => ({
      date,
      matches: count,
    })).slice(-10); // last 10 active days

    // Chart Data: Win Rate by complexity
    const complexityWins: Record<number, { games: number; wins: number }> = {};
    matchParticipants.forEach((mp) => {
      if (!isGroup && mp.playerId !== targetPlayerId) return;
      const hero = heroes.find((h) => h.id === mp.heroId);
      if (hero) {
        if (!complexityWins[hero.complexity]) {
          complexityWins[hero.complexity] = { games: 0, wins: 0 };
        }
        complexityWins[hero.complexity].games++;
        if (mp.placement === 1) {
          complexityWins[hero.complexity].wins++;
        }
      }
    });

    const complexityChartData = Object.entries(complexityWins).map(([comp, data]) => ({
      complexity: `Lvl ${comp}`,
      'Win Rate %': Math.round((data.wins / data.games) * 100),
      games: data.games,
    })).sort((a, b) => a.complexity.localeCompare(b.complexity));

    return {
      totalGames,
      wins,
      losses,
      draws,
      winPercentage,
      currentStreak,
      streakType,
      favoriteHero,
      bestHero,
      bestHeroWinRate: bestHero ? Math.round((heroStats[bestHero.id].wins / heroStats[bestHero.id].games) * 100) : 0,
      stalledHeroes,
      suggestions,
      matchHistoryChartData,
      complexityChartData,
    };
  }, [players, heroes, matches, matchParticipants, selectedPlayerId]);

  if (players.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-900 rounded-2xl border border-slate-800 text-center max-w-md mx-auto my-12">
        <Users className="w-16 h-16 text-violet-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold mb-2">No Players Registered</h3>
        <p className="text-slate-400 mb-6">
          To get started, head over to the Players tab and register your playgroup.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-1">
      {/* Player Selector Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-violet-400 via-indigo-400 to-indigo-600 bg-clip-text text-transparent">
            TRAINING DASHBOARD
          </h1>
          <p className="text-xs text-slate-400">Track and optimize your group hero rotation</p>
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-0.5 max-w-full overflow-x-auto">
          <button
            onClick={() => setSelectedPlayerId('group')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedPlayerId === 'group'
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/50'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Group View
          </button>
          {players.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPlayerId(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedPlayerId === p.id
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {processedStats && (
        <>
          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-900 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 bg-violet-950/50 p-2 rounded-xl text-violet-400 border border-violet-900/50">
                <Trophy className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 font-medium">TOTAL GAMES</p>
              <h2 className="text-3xl font-black mt-2 text-white">{processedStats.totalGames}</h2>
              <div className="text-[10px] text-slate-400 mt-1">
                {selectedPlayerId === 'group' ? 'Logged by playgroup' : `Wins: ${processedStats.wins} | Losses: ${processedStats.losses}`}
              </div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-900 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 bg-emerald-950/50 p-2 rounded-xl text-emerald-400 border border-emerald-900/50">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 font-medium">WIN RATE</p>
              <h2 className="text-3xl font-black mt-2 text-emerald-400">{processedStats.winPercentage}%</h2>
              <div className="text-[10px] text-slate-400 mt-1">Excludes draws</div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-900 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 bg-orange-950/50 p-2 rounded-xl text-orange-400 border border-orange-900/50">
                <Flame className="w-5 h-5 animate-pulse" />
              </div>
              <p className="text-xs text-slate-400 font-medium">STREAK</p>
              <h2 className={`text-3xl font-black mt-2 ${processedStats.streakType === 'win' ? 'text-orange-400' : 'text-slate-400'}`}>
                {processedStats.currentStreak} {processedStats.streakType === 'win' ? 'W' : processedStats.streakType === 'loss' ? 'L' : '-'}
              </h2>
              <div className="text-[10px] text-slate-400 mt-1">Active match streak</div>
            </div>

            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-900 p-4 rounded-2xl relative overflow-hidden">
              <div className="absolute right-3 top-3 bg-indigo-950/50 p-2 rounded-xl text-indigo-400 border border-indigo-900/50">
                <Clock className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-400 font-medium">FAVORITE HERO</p>
              <h2 className="text-lg font-black mt-3 truncate text-indigo-200">
                {processedStats.favoriteHero ? processedStats.favoriteHero.name : 'None'}
              </h2>
              <div className="text-[10px] text-slate-400 mt-1">
                {processedStats.favoriteHero ? `${processedStats.favoriteHero.releaseSet}` : 'Play matches to unlock'}
              </div>
            </div>
          </div>

          {/* Suggestions & Rotation Reminders */}
          <div className="bg-gradient-to-r from-violet-950/40 via-indigo-950/30 to-slate-900/50 border border-violet-900/30 rounded-2xl p-4 flex gap-4 items-start">
            <div className="p-3 bg-violet-600 rounded-xl text-white shadow-lg shadow-violet-900/40 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-violet-200">Rotation Suggestions</h4>
              <div className="space-y-1 mt-1 text-slate-300 text-xs">
                {processedStats.suggestions.map((s, idx) => (
                  <p key={idx} className="flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-violet-400 shrink-0" />
                    {s}
                  </p>
                ))}
              </div>
            </div>
          </div>

          {/* Main Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Play Frequency Heatmap/Line Chart */}
            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl">
              <h3 className="text-sm font-bold mb-4 text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-violet-400" /> Play Frequency Trend
              </h3>
              <div className="h-64">
                {processedStats.matchHistoryChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={processedStats.matchHistoryChartData}>
                      <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                        labelClassName="text-slate-400 font-bold"
                      />
                      <Line
                        type="monotone"
                        dataKey="matches"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 4, stroke: '#8b5cf6', strokeWidth: 2, fill: '#0f172a' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    Not enough match history data
                  </div>
                )}
              </div>
            </div>

            {/* Complexity Win Rates */}
            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl">
              <h3 className="text-sm font-bold mb-4 text-slate-300 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-emerald-400" /> Win Rate by Complexity
              </h3>
              <div className="h-64">
                {processedStats.complexityChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={processedStats.complexityChartData}>
                      <XAxis dataKey="complexity" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px' }}
                      />
                      <Bar dataKey="Win Rate %" fill="#10b981" radius={[8, 8, 0, 0]}>
                        {processedStats.complexityChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#6366f1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-500 text-xs">
                    No wins recorded to calculate complexity metrics
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stalled and Top Success Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stalled Heroes */}
            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
                <ShieldAlert className="w-4 h-4 text-orange-400" /> Stalled Rotation (30+ Days Unused)
              </h3>
              {processedStats.stalledHeroes.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 overflow-y-auto max-h-48 pr-2">
                  {processedStats.stalledHeroes.map((h) => (
                    <div
                      key={h.id}
                      className="bg-slate-950/60 border border-slate-800 p-2 rounded-xl text-center flex flex-col justify-between"
                    >
                      <div className="text-xs font-bold truncate text-white">{h.name}</div>
                      <div className="text-[9px] text-slate-500 mt-1">{h.releaseSet}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 text-center py-4">
                  Amazing! All active owned heroes have been played recently. Rotation is healthy.
                </p>
              )}
            </div>

            {/* Top Performers */}
            <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-2xl">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-violet-400" /> Peak Performance (Min. 2 games)
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-[10px] text-slate-400">FAVORITE HERO</div>
                    <div className="text-sm font-bold text-white">
                      {processedStats.favoriteHero ? processedStats.favoriteHero.name : 'None'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-violet-950/50 border border-violet-900 text-violet-300 text-xs font-bold rounded-lg">
                    {processedStats.favoriteHero ? 'Most Played' : '-'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
                  <div>
                    <div className="text-[10px] text-slate-400">HIGHEST WIN RATE</div>
                    <div className="text-sm font-bold text-white">
                      {processedStats.bestHero ? processedStats.bestHero.name : 'None'}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-emerald-950/50 border border-emerald-900 text-emerald-300 text-xs font-bold rounded-lg">
                    {processedStats.bestHero ? `${processedStats.bestHeroWinRate}% WR` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
