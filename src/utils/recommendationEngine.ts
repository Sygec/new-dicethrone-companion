import { Player, Hero, Match, MatchParticipant, HeroOwnership } from '../types';

export interface RecommendationResult {
  heroId: string;
  score: number;
  reasons: string[];
}

export function generateRecommendations(
  playerId: string,
  players: Player[],
  heroes: Hero[],
  matches: Match[],
  matchParticipants: MatchParticipant[],
  heroOwnership: HeroOwnership[],
  settings: { useCollectionOwnership?: boolean; ownedSets?: string[] },
  filters: {
    includeSets?: string[];
    excludeSets?: string[];
    complexityMin?: number;
    complexityMax?: number;
    tags?: string[];
    ownedOnly?: boolean;
    excludeHeroIds?: string[];
  } = {}
): RecommendationResult[] {
  // Sort matches chronologically: index 0 is most recent
  const sortedMatches = [...matches].sort((a, b) => b.playedAt - a.playedAt);

  // Group participants by matchId for quick lookup
  const participantsByMatch = matchParticipants.reduce((acc, curr) => {
    if (!acc[curr.matchId]) acc[curr.matchId] = [];
    acc[curr.matchId].push(curr);
    return acc;
  }, {} as Record<string, MatchParticipant[]>);

  // Find all matches the current player participated in, sorted by date (most recent first)
  const playerMatches = sortedMatches
    .filter((m) => {
      const parts = participantsByMatch[m.id] || [];
      return parts.some((p) => p.playerId === playerId);
    })
    .map((m) => {
      const parts = participantsByMatch[m.id] || [];
      const userPart = parts.find((p) => p.playerId === playerId);
      return {
        matchId: m.id,
        playedAt: m.playedAt,
        heroId: userPart?.heroId || '',
      };
    });

  // Filter out any matches that don't have valid user parts
  const validPlayerMatches = playerMatches.filter((m) => m.heroId);

  // Total matches played by this player
  const playerTotalGames = validPlayerMatches.length;

  // Filter heroes based on criteria
  let filteredHeroes = heroes.filter((h) => h.active === 1);

  // Filter: Exclude already recommended/selected heroes in current UI session
  if (filters.excludeHeroIds && filters.excludeHeroIds.length > 0) {
    filteredHeroes = filteredHeroes.filter((h) => !filters.excludeHeroIds?.includes(h.id));
  }

  // Filter: Owned only (either globally owned or player-owned collection)
  if (filters.ownedOnly) {
    if (settings.useCollectionOwnership) {
      filteredHeroes = filteredHeroes.filter((h) =>
        heroOwnership.some((ho) => ho.heroId === h.id && ho.playerId === playerId)
      );
    } else {
      filteredHeroes = filteredHeroes.filter((h) => h.owned === 1);
    }
  }

  // Filter: Included Sets
  if (filters.includeSets && filters.includeSets.length > 0) {
    filteredHeroes = filteredHeroes.filter((h) => filters.includeSets?.includes(h.releaseSet));
  }

  // Filter: Excluded Sets
  if (filters.excludeSets && filters.excludeSets.length > 0) {
    filteredHeroes = filteredHeroes.filter((h) => !filters.excludeSets?.includes(h.releaseSet));
  }

  // Filter: Complexity
  if (filters.complexityMin !== undefined) {
    filteredHeroes = filteredHeroes.filter((h) => h.complexity >= (filters.complexityMin || 1));
  }
  if (filters.complexityMax !== undefined) {
    filteredHeroes = filteredHeroes.filter((h) => h.complexity <= (filters.complexityMax || 6));
  }

  // Filter: Tags (Match all chosen tags)
  if (filters.tags && filters.tags.length > 0) {
    filteredHeroes = filteredHeroes.filter((h) =>
      filters.tags?.every((t) => h.tags.includes(t))
    );
  }

  // For each filtered hero, compute recommendation score
  const scoredHeroes: RecommendationResult[] = filteredHeroes.map((hero) => {
    let score = 0;
    const reasons: string[] = [];

    // --- FACTOR 1: Play Count by Player ---
    const timesPlayedByPlayer = validPlayerMatches.filter((m) => m.heroId === hero.id).length;

    // --- FACTOR 2: Recency / Games since last played ---
    // Find index of last time played
    const lastPlayedIndex = validPlayerMatches.findIndex((m) => m.heroId === hero.id);
    const gamesSinceLastPlayed = lastPlayedIndex === -1 ? Infinity : lastPlayedIndex;

    if (timesPlayedByPlayer === 0) {
      score += 100;
      reasons.push('Never played by you (+100)');
    } else {
      if (gamesSinceLastPlayed >= 20) {
        score += 60;
        reasons.push(`Not played by you in ${gamesSinceLastPlayed} matches (+60)`);
      } else if (gamesSinceLastPlayed >= 10) {
        score += 30;
        reasons.push(`Not played by you in ${gamesSinceLastPlayed} matches (+30)`);
      }
    }

    // --- FACTOR 3: Group-wide usage ---
    // Find index of last time ANY player played this hero in sorted matches
    let groupGamesSincePlayed = Infinity;
    for (let i = 0; i < sortedMatches.length; i++) {
      const parts = participantsByMatch[sortedMatches[i].id] || [];
      if (parts.some((p) => p.heroId === hero.id)) {
        groupGamesSincePlayed = i;
        break;
      }
    }

    if (groupGamesSincePlayed === Infinity) {
      score += 20;
      reasons.push('Never played by the group (+20)');
    } else if (groupGamesSincePlayed >= 10) {
      score += 15;
      reasons.push(`Not played by group in ${groupGamesSincePlayed} matches (+15)`);
    }

    // --- FACTOR 4: Penalties ---
    if (gamesSinceLastPlayed === 0) {
      score -= 50;
      reasons.push('Played in your last match (-50)');
    } else if (gamesSinceLastPlayed > 0 && gamesSinceLastPlayed < 3) {
      score -= 25;
      reasons.push(`Played in your last ${gamesSinceLastPlayed + 1} matches (-25)`);
    }

    // Variety bonus based on overall rarity
    if (timesPlayedByPlayer > 0 && playerTotalGames > 0) {
      const playPercentage = timesPlayedByPlayer / playerTotalGames;
      if (playPercentage < 0.03) {
        score += 15;
        reasons.push('Low overall play rate (+15)');
      }
    }

    // Make sure score doesn't fall below 0 unless heavily penalized
    score = Math.max(score, 0);

    return {
      heroId: hero.id,
      score,
      reasons,
    };
  });

  // Sort by score descending with a random tie-breaker for equal scores
  return scoredHeroes.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return Math.random() - 0.5;
  });
}

/**
 * Weighted random selection of a hero from recommendations.
 * Gives higher probability to higher scored items, but keeps selection organic.
 */
export function selectWeightedRandom(recs: RecommendationResult[], count: number = 1): RecommendationResult[] {
  if (recs.length === 0) return [];
  const results: RecommendationResult[] = [];
  const pool = [...recs];

  for (let c = 0; c < count; c++) {
    if (pool.length === 0) break;

    // Shift scores so the lowest is at least 1, if all scores are 0
    const minScore = Math.min(...pool.map((r) => r.score));
    const shift = minScore <= 0 ? Math.abs(minScore) + 1 : 0;

    const totalWeight = pool.reduce((sum, r) => sum + (r.score + shift), 0);
    let r = Math.random() * totalWeight;

    for (let i = 0; i < pool.length; i++) {
      const weight = pool[i].score + shift;
      if (r <= weight) {
        results.push(pool[i]);
        pool.splice(i, 1);
        break;
      }
      r -= weight;
    }
  }

  return results;
}
