export type AppPhase = 'setup' | 'study' | 'test' | 'results';

export interface WordEntry {
  word: string;
  definition: string;
}

export interface ScoreResult {
  score: number;
  feedback: string;
}

export interface WordAttempt {
  timestamp: number;
  score: number;
  userAnswer: string;
}

export interface WordProgress {
  word: string;
  attempts: WordAttempt[];
  lastDefinition: string;
}

export interface SessionWord extends WordEntry {
  userAnswer?: string;
  scoreResult?: ScoreResult;
}

export type Trend = 'improving' | 'declining' | 'stable' | 'new';

export interface WordTrend {
  word: string;
  trend: Trend;
  averageScore: number;
  recentAverage: number;
  attemptCount: number;
}
