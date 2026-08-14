import type { Note } from '../types';

export interface ScoredNote {
  note: Note;
  score: number;
  matchedTerms: string[];
}

export function weightedLocalRetrieval(
  notes: Note[],
  query: string,
  options: { maxResults?: number; minScore?: number } = {}
): ScoredNote[] {
  const { maxResults = 10, minScore = 0.5 } = options;
  if (!query || !query.trim()) return [];

  const rawTokens = query
    .toLowerCase()
    .split(/[\s,.;:!?()\[\]{}'"]+/)
    .filter((t) => t.length > 1);

  if (rawTokens.length === 0) return [];

  const scored: ScoredNote[] = [];

  for (const note of notes) {
    if (note.isDeleted || note.isArchived) continue;

    let score = 0;
    const matchedTerms: string[] = [];

    const titleLower = (note.title || '').toLowerCase();
    const contentLower = (note.plainText || note.content || '').toLowerCase();
    const summaryLower = (note.summary || '').toLowerCase();
    const tagsLower = (note.tagIds || []).map((t) => t.toLowerCase());
    const peopleLower = (note.aiInsights?.people || []).map((p) => p.name.toLowerCase());
    const placesLower = (note.aiInsights?.places || []).map((p) => p.name.toLowerCase());
    const topicsLower = (note.aiInsights?.topics || []).map((t) => t.toLowerCase());

    for (const token of rawTokens) {
      let tokenMatched = false;

      // Title match (weight 3.5)
      if (titleLower.includes(token)) {
        score += titleLower === token ? 5.0 : 3.5;
        tokenMatched = true;
      }

      // Tags match (weight 3.0)
      if (tagsLower.some((tag) => tag.includes(token))) {
        score += 3.0;
        tokenMatched = true;
      }

      // People / Places match (weight 2.5)
      if (
        peopleLower.some((p) => p.includes(token)) ||
        placesLower.some((p) => p.includes(token))
      ) {
        score += 2.5;
        tokenMatched = true;
      }

      // Topics / Summary match (weight 2.0)
      if (topicsLower.some((top) => top.includes(token)) || summaryLower.includes(token)) {
        score += 2.0;
        tokenMatched = true;
      }

      // Content match (weight 1.0)
      if (contentLower.includes(token)) {
        // Count frequency up to 5
        const occurrences = (contentLower.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
        score += Math.min(occurrences * 0.8, 3.0);
        tokenMatched = true;
      }

      if (tokenMatched) {
        matchedTerms.push(token);
      }
    }

    // Boost pinned notes slightly
    if (note.isPinned) {
      score += 0.5;
    }

    // Boost recently modified notes
    const daysSinceUpdate = (Date.now() - (note.updatedAt || note.createdAt)) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      score += 0.4;
    } else if (daysSinceUpdate < 30) {
      score += 0.2;
    }

    if (score >= minScore && matchedTerms.length > 0) {
      scored.push({ note, score, matchedTerms });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxResults);
}
