import type { OverviewStats, WordStatistics } from '../types';
import LearnedWordsList from './LearnedWordsList';

interface StatsPanelProps {
  overview: OverviewStats;
  learnedWords: WordStatistics[];
}

export default function StatsPanel({ overview, learnedWords }: StatsPanelProps) {
  const trackedTestTotal =
    overview.sessionsTrackedTest + overview.sessionsTrackedTestWord;

  return (
    <div className="panel stats-panel">
      <dl className="stats-list">
        <details className="stats-sessions-details">
          <summary className="stats-row stats-row-toggle">
            <span className="stats-row-label">Total sessions</span>
            <span className="stats-row-value">{overview.totalSessions}</span>
          </summary>
          <div className="stats-sessions-breakdown">
            <div className="stats-row stats-sub">
              <dt>New</dt>
              <dd>{overview.sessionsNew}</dd>
            </div>
            <div className="stats-row stats-sub">
              <dt>Tracked study</dt>
              <dd>{overview.sessionsTrackedStudy}</dd>
            </div>
            <div className="stats-row stats-sub">
              <dt>Tracked test</dt>
              <dd>{trackedTestTotal}</dd>
            </div>
            <div className="stats-row stats-sub stats-sub-nested">
              <dt>Definition test</dt>
              <dd>{overview.sessionsTrackedTest}</dd>
            </div>
            <div className="stats-row stats-sub stats-sub-nested">
              <dt>Word test</dt>
              <dd>{overview.sessionsTrackedTestWord}</dd>
            </div>
          </div>
        </details>
        <div className="stats-row">
          <dt>Words learned</dt>
          <dd>{overview.wordsLearned}</dd>
        </div>
        <div className="stats-row">
          <dt>Total average</dt>
          <dd>{overview.totalAverage}%</dd>
        </div>
        <div className="stats-row">
          <dt>Definition attempts</dt>
          <dd>{overview.definitionAttempts}</dd>
        </div>
        <div className="stats-row">
          <dt>Definition average</dt>
          <dd>{overview.definitionAverage}%</dd>
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
