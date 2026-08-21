// Small dependency-free fuzzy matcher for the command palette and the
// name-based resource search it offers. Subsequence match: every character
// of the query must appear in order in the target, scored by how tightly
// the matched characters cluster and whether they land on word boundaries.
export interface FuzzyMatch {
  score: number;
  indices: number[];
}

export function fuzzyMatch(query: string, target: string): FuzzyMatch | null {
  if (query.length === 0) return { score: 0, indices: [] };
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  const indices: number[] = [];
  let qi = 0;
  let score = 0;
  let lastIndex = -1;

  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      indices.push(ti);
      const isBoundary = ti === 0 || /[\s/_.-]/.test(t[ti - 1]);
      const isConsecutive = lastIndex === ti - 1;
      score += isBoundary ? 12 : isConsecutive ? 8 : 1;
      lastIndex = ti;
      qi++;
    }
  }

  if (qi < q.length) return null;
  // Reward shorter targets slightly (a tighter, more exact match).
  score += Math.max(0, 20 - t.length) * 0.1;
  return { score, indices };
}

export function fuzzyFilter<T>(
  items: T[],
  query: string,
  getText: (item: T) => string,
): { item: T; match: FuzzyMatch }[] {
  if (!query.trim()) return items.map((item) => ({ item, match: { score: 0, indices: [] } }));
  const results: { item: T; match: FuzzyMatch }[] = [];
  for (const item of items) {
    const match = fuzzyMatch(query, getText(item));
    if (match) results.push({ item, match });
  }
  results.sort((a, b) => b.match.score - a.match.score);
  return results;
}
