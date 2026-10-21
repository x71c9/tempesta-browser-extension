// Small fuzzy matcher: every character of a term must appear in order,
// consecutive characters and word starts score higher

import type { Bookmark } from "../protocol.ts";

export interface Match {
  score: number;
  positions: number[];
}

export interface Result {
  bookmark: Bookmark;
  score: number;
  // Matched character positions in the path, for highlighting
  positions: number[];
}

const BOUNDARIES = "/-_. :?=&#";
const SCORE_MATCH = 1;
const SCORE_CONSECUTIVE = 4;
const SCORE_BOUNDARY = 3;
const PENALTY_GAP = 0.1;
const MAX_GAP = 10;
const PENALTY_START = 0.01;
// URL matches count less than path matches
const URL_WEIGHT = 0.6;

// `term` must be lowercase
export function matchTerm(term: string, text: string): Match | null {
  const lower = text.toLowerCase();
  const first = term[0];
  if (first === undefined) {
    return { score: 0, positions: [] };
  }
  let best: Match | null = null;
  for (
    let start = lower.indexOf(first);
    start !== -1;
    start = lower.indexOf(first, start + 1)
  ) {
    const match = matchFrom(term, lower, start);
    // No match from here means no match from any later start
    if (!match) {
      break;
    }
    if (!best || match.score > best.score) {
      best = match;
    }
  }
  return best;
}

function matchFrom(term: string, text: string, start: number): Match | null {
  const positions: number[] = [];
  let score = -start * PENALTY_START;
  let previous = start - 1;
  for (const char of term) {
    const index = text.indexOf(char, previous + 1);
    if (index === -1) {
      return null;
    }
    score += SCORE_MATCH;
    if (positions.length > 0) {
      if (index === previous + 1) {
        score += SCORE_CONSECUTIVE;
      } else {
        score -= Math.min(index - previous - 1, MAX_GAP) * PENALTY_GAP;
      }
    }
    const before = text[index - 1];
    if (before === undefined || BOUNDARIES.includes(before)) {
      score += SCORE_BOUNDARY;
    }
    positions.push(index);
    previous = index;
  }
  return { score, positions };
}

function stripScheme(url: string): string {
  return url.replace(/^[a-z]+:\/\/(www\.)?/i, "");
}

// Space separated terms must all match; an empty query keeps the order
export function rank(
  bookmarks: Bookmark[],
  query: string,
  matchUrl: boolean,
): Result[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) {
    return bookmarks.map((bookmark) => ({ bookmark, score: 0, positions: [] }));
  }
  const results: Result[] = [];
  for (const bookmark of bookmarks) {
    const result = rankBookmark(bookmark, terms, matchUrl);
    if (result) {
      results.push(result);
    }
  }
  return results.sort(
    (a, b) =>
      b.score - a.score ||
      a.bookmark.path.length - b.bookmark.path.length ||
      a.bookmark.path.localeCompare(b.bookmark.path),
  );
}

function rankBookmark(
  bookmark: Bookmark,
  terms: string[],
  matchUrl: boolean,
): Result | null {
  const url = matchUrl ? stripScheme(bookmark.url) : "";
  const positions = new Set<number>();
  let score = 0;
  for (const term of terms) {
    const path = matchTerm(term, bookmark.path);
    const urlScore = matchUrl
      ? (matchTerm(term, url)?.score ?? null)
      : null;
    if (path && (urlScore === null || path.score >= urlScore * URL_WEIGHT)) {
      score += path.score;
      path.positions.forEach((position) => positions.add(position));
    } else if (urlScore !== null) {
      score += urlScore * URL_WEIGHT;
    } else {
      return null;
    }
  }
  return {
    bookmark,
    score,
    positions: [...positions].sort((a, b) => a - b),
  };
}
