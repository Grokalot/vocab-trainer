import type {
  CompletedSessionRecord,
  SessionCompletionSummary,
  SessionHistory,
  SessionStartMode,
  SessionStats,
} from '../types';

const SESSION_HISTORY_KEY = 'vocab-trainer-session-history';

const defaultCounts = (): Record<SessionStartMode, number> => ({
  new: 0,
  'tracked-study': 0,
  'tracked-test': 0,
});

function normalizeCounts(
  raw: Partial<Record<string, number>> | undefined,
): Record<SessionStartMode, number> {
  const counts = defaultCounts();
  if (!raw) return counts;

  counts.new = raw.new ?? 0;
  counts['tracked-study'] = raw['tracked-study'] ?? raw.tracked ?? 0;
  counts['tracked-test'] = raw['tracked-test'] ?? 0;
  return counts;
}

export function loadSessionHistory(): SessionHistory {
  try {
    const raw = localStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) {
      return { completedCounts: defaultCounts(), sessions: [] };
    }

    const parsed = JSON.parse(raw) as Partial<SessionHistory>;
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions : [];

    return {
      completedCounts: normalizeCounts(parsed.completedCounts as Partial<Record<string, number>>),
      sessions,
    };
  } catch {
    return { completedCounts: defaultCounts(), sessions: [] };
  }
}

export function saveSessionHistory(history: SessionHistory): void {
  localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
}

export function getSessionStats(): SessionStats {
  const { completedCounts } = loadSessionHistory();
  return {
    totalSessions:
      completedCounts.new + completedCounts['tracked-study'] + completedCounts['tracked-test'],
    new: completedCounts.new,
    trackedStudy: completedCounts['tracked-study'],
    trackedTest: completedCounts['tracked-test'],
  };
}

/** Record a fully completed session. Returns the updated history. */
export function recordSessionCompletion(
  summary: SessionCompletionSummary,
): SessionHistory {
  const history = loadSessionHistory();

  const record: CompletedSessionRecord = {
    completedAt: Date.now(),
    mode: summary.mode,
    wordCount: summary.wordCount,
    averageScore: summary.averageScore,
    results: summary.words.map((word) => ({
      word: word.word,
      score: word.review?.score ?? 0,
    })),
  };

  history.sessions.push(record);
  history.completedCounts[summary.mode] += 1;
  saveSessionHistory(history);

  return history;
}
