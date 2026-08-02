import type {
  CompletedSessionRecord,
  SessionCategory,
  SessionCompletionSummary,
  SessionHistory,
  SessionStartMode,
  SessionStats,
} from '../types';

const SESSION_HISTORY_KEY = 'vocab-trainer-session-history';

const defaultHistory: SessionHistory = {
  completedCounts: { new: 0, tracked: 0 },
  sessions: [],
};

export function sessionCategory(mode: SessionStartMode): SessionCategory {
  return mode === 'new' ? 'new' : 'tracked';
}

export function loadSessionHistory(): SessionHistory {
  try {
    const raw = localStorage.getItem(SESSION_HISTORY_KEY);
    if (!raw) return { ...defaultHistory, completedCounts: { ...defaultHistory.completedCounts } };

    const parsed = JSON.parse(raw) as Partial<SessionHistory>;
    return {
      completedCounts: {
        new: parsed.completedCounts?.new ?? 0,
        tracked: parsed.completedCounts?.tracked ?? 0,
      },
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    };
  } catch {
    return { ...defaultHistory, completedCounts: { ...defaultHistory.completedCounts } };
  }
}

export function saveSessionHistory(history: SessionHistory): void {
  localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(history));
}

export function getSessionStats(): SessionStats {
  const { completedCounts } = loadSessionHistory();
  return {
    completedNewSessions: completedCounts.new,
    completedTrackedSessions: completedCounts.tracked,
  };
}

/** Record a fully completed session. Returns the updated history. */
export function recordSessionCompletion(
  summary: SessionCompletionSummary,
): SessionHistory {
  const history = loadSessionHistory();
  const category = sessionCategory(summary.mode);

  const record: CompletedSessionRecord = {
    completedAt: Date.now(),
    mode: summary.mode,
    category,
    wordCount: summary.wordCount,
    averageScore: summary.averageScore,
    results: summary.words.map((word) => ({
      word: word.word,
      score: word.review?.score ?? 0,
    })),
  };

  history.sessions.push(record);
  history.completedCounts[category] += 1;
  saveSessionHistory(history);

  return history;
}
