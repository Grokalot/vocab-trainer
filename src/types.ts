// ── App flow ────────────────────────────────────────────────────────────────

export type AppPhase = 'setup' | 'study' | 'test' | 'results';

export type SessionStartMode = 'new' | 'tracked-study' | 'tracked-test';

export type Trend = 'improving' | 'declining' | 'stable' | 'new';

// ── Core domain ─────────────────────────────────────────────────────────────

/** A vocabulary word with its study definition. */
export interface Word {
  word: string;
  definition: string;
}

/** The user's full vocabulary list. */
export interface WordList {
  words: string[];
}

/** A single scored recall attempt, persisted in progress storage. */
export interface Attempt {
  timestamp: number;
  score: number;
  userAnswer: string;
}

/** AI review of a user's recall answer. */
export interface ReviewResult {
  score: number;
  feedback: string;
}

/** Persisted progress and definition for one word. */
export interface WordProgress {
  word: string;
  attempts: Attempt[];
  lastDefinition: string;
  customDefinition?: boolean;
}

/** Long-term retention attempts for tracked test (separate from short-term recall). */
export interface RetentionProgress {
  word: string;
  attempts: Attempt[];
}

/** Map of normalized word key → retention progress entry. */
export type RetentionStore = Record<string, RetentionProgress>;

/** A word within an active or completed session, including recall state. */
export interface SessionWord extends Word {
  userAnswer?: string;
  review?: ReviewResult;
}

/** An in-progress or completed study session. */
export interface Session {
  mode: SessionStartMode;
  phase: AppPhase;
  words: SessionWord[];
  studyIndex: number;
  testIndex: number;
}

/** Per-word statistics derived from attempt history. */
export interface WordStatistics {
  word: string;
  trend: Trend;
  averageScore: number;
  recentAverage: number;
  attemptCount: number;
}

/** Aggregate counts across all tracked words. */
export interface TrackedStats {
  count: number;
  overallAverage: number;
}

/** Broad session type for completion stats — one counter per mode. */
export type SessionCategory = SessionStartMode;

/** Summary passed when a recall phase is fully completed. */
export interface SessionCompletionSummary {
  mode: SessionStartMode;
  wordCount: number;
  averageScore: number;
  words: SessionWord[];
}

/** One persisted completed session — extend with fields as stats grow. */
export interface CompletedSessionRecord {
  completedAt: number;
  mode: SessionStartMode;
  wordCount: number;
  averageScore: number;
  results: Array<{ word: string; score: number }>;
}

/** Persisted session history for current and future statistics. */
export interface SessionHistory {
  completedCounts: Record<SessionStartMode, number>;
  sessions: CompletedSessionRecord[];
}

/** Session completion counters by mode. */
export interface SessionStats {
  totalSessions: number;
  new: number;
  trackedStudy: number;
  trackedTest: number;
}

/** Overview statistics shown on the setup screen. */
export interface OverviewStats {
  totalSessions: number;
  sessionsNew: number;
  sessionsTrackedStudy: number;
  sessionsTrackedTest: number;
  /** Words with at least one recall attempt (main progress). */
  wordsLearned: number;
  totalAverage: number;
}

/** Full study statistics shown on the setup screen. */
export interface StudyStatistics {
  trends: WordStatistics[];
  trackedStats: TrackedStats;
  improvingWords: WordStatistics[];
  maxTrackedWords: number;
  maxRetentionWords: number;
  untestedCount: number;
  maxNewWords: number;
  sessionStats: SessionStats;
  overview: OverviewStats;
}

// ── Settings & storage ──────────────────────────────────────────────────────

export interface AppSettings {
  openaiApiKey: string;
}

/** Map of normalized word key → progress entry. */
export type ProgressStore = Record<string, WordProgress>;

/** Bundled Dictionary.com definitions keyed by normalized word. */
export type BundledDefinitions = Record<string, string>;

// ── Session UI view-models ──────────────────────────────────────────────────

export interface WordEditView {
  isEditing: boolean;
  draft: string;
  start: () => void;
  setDraft: (value: string) => void;
  save: () => void;
  cancel: () => void;
}

export interface DefinitionEditView {
  isEditing: boolean;
  draft: string;
  fetchingGpt: boolean;
  start: () => void;
  setDraft: (value: string) => void;
  save: () => void;
  cancel: () => void;
  fetchFromGpt: () => void;
}

export interface SessionLoadingState {
  active: boolean;
  message: string;
  /** When true, hide phase views and show the full-page loading state. */
  blocksUI: boolean;
}

export interface StudyPhaseView {
  words: SessionWord[];
  word: SessionWord;
  index: number;
  total: number;
  wordEdit: WordEditView;
  definitionEdit: DefinitionEditView;
  canGoBack: boolean;
  isLast: boolean;
  goBack: () => void;
  goNext: () => void;
  beginRecall: () => void;
  goHome: () => void;
}

export interface RecallPhaseView {
  words: SessionWord[];
  index: number;
  total: number;
  wordEdit: WordEditView;
  definitionEdit: DefinitionEditView;
  submitAnswer: (answer: string) => Promise<boolean>;
  goHome: () => void;
}

export interface ResultsPhaseView {
  average: number;
  words: SessionWord[];
  goHome: () => void;
}

// ── External API shapes ─────────────────────────────────────────────────────

export interface OpenAIChatCompletionResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export interface DefinitionResponse {
  definition: string;
}

export interface ReviewResponse {
  score: number;
  feedback: string;
}

// ── Dictionary refresh ──────────────────────────────────────────────────────

export interface RefreshProgress {
  done: number;
  total: number;
  word: string;
  updated: number;
  skipped: number;
  missed: number;
}

export interface RefreshResult {
  updated: number;
  skipped: number;
  missed: string[];
}

export interface RefreshDefinitionsOptions {
  respectCustom?: boolean;
  isCustomDefinition?: (word: string) => boolean;
  onProgress?: (progress: RefreshProgress) => void;
  applyDefinition: (word: string, definition: string) => void;
  delayMs?: number;
}

// ── Internal helpers ────────────────────────────────────────────────────────

export interface WeightedWord {
  word: string;
  weight: number;
}
