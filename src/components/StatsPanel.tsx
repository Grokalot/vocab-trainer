import type { OverviewStats, WordStatistics } from '../types';
import LearnedWordsList from './LearnedWordsList';

interface StatsPanelProps {
  overview: OverviewStats;
  learnedWords: WordStatistics[];
}

export default function StatsPanel({ overview, learnedWords }: StatsPanelProps) {
  return (
    <div className="panel stats-panel">
      <dl className="stats-list">
        <div className="stats-row">
          <dt>Total sessions</dt>
          <dd>{overview.totalSessions}</dd>
        </div>
        <div className="stats-row stats-sub">
          <dt>New</dt>
          <dd>{overview.sessionsNew}</dd>
        </div>
        <div className="stats-row stats-sub">
          <dt>Tracked study</dt>
          <dd>{overview.sessionsTrackedStudy}</dd>
        </div>
        <div className="stats-row stats-sub">
          <dt>Definition test</dt>
          <dd>{overview.sessionsTrackedTest}</dd>
        </div>
        <div className="stats-row stats-sub">
          <dt>Word test</dt>
          <dd>{overview.sessionsTrackedTestWord}</dd>
        </div>
        <div className="stats-row">
          <dt>Words learned</dt>
          <dd>{overview.wordsLearned}</dd>
        </div>
        <div className="stats-row">
          <dt>Total average</dt>
          <dd>{overview.totalAverage}%</dd>
        </div>
        <div className="stats-row">
          <dt>Word recall attempts</dt>
          <dd>{overview.wordRecallAttempts}</dd>
        </div>
        <div className="stats-row">
          <dt>Word recall average</dt>
          <dd>{overview.wordRecallAverage}%</dd>
        </div>
      </dl>
      <LearnedWordsList words={learnedWords} />
    </div>
  );
}
