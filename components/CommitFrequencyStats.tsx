'use client';

import React from 'react';
import InfoIcon from './InfoIcon';

interface CommitFrequencyStatsProps {
  commitActivity: { date: string; count: number }[];
}

const CommitFrequencyStats: React.FC<CommitFrequencyStatsProps> = ({ commitActivity }) => {
  if (!commitActivity || commitActivity.length === 0) {
    return null;
  }

  const isWeekend = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
  };

  const calculateStats = () => ({
    zeroCommits: 0,
    oneToTwoCommits: 0,
    threeToFiveCommits: 0,
    sixPlusCommits: 0
  });

  const overallStats = calculateStats();
  const weekdayStats = calculateStats();

  commitActivity.forEach(day => {
    const stats = overallStats;
    if (day.count === 0) {
      stats.zeroCommits++;
    } else if (day.count <= 2) {
      stats.oneToTwoCommits++;
    } else if (day.count <= 5) {
      stats.threeToFiveCommits++;
    } else {
      stats.sixPlusCommits++;
    }

    if (!isWeekend(day.date)) {
      const wStats = weekdayStats;
      if (day.count === 0) {
        wStats.zeroCommits++;
      } else if (day.count <= 2) {
        wStats.oneToTwoCommits++;
      } else if (day.count <= 5) {
        wStats.threeToFiveCommits++;
      } else {
        wStats.sixPlusCommits++;
      }
    }
  });

  const StatBox = ({ title, stats, infoContent }: { title: string; stats: typeof overallStats; infoContent: string }) => (
    <div className="commit-frequency-stat-box">
      <div className="commit-frequency-header">
        <h3 className="commit-frequency-title">{title}</h3>
        <InfoIcon content={infoContent} />
      </div>
      <div className="commit-frequency-grid">
        <div className="commit-frequency-stat-item">
          <div className="commit-frequency-stat-value">{stats.zeroCommits}</div>
          <div className="commit-frequency-stat-label">0 commits</div>
        </div>
        <div className="commit-frequency-stat-item">
          <div className="commit-frequency-stat-value">{stats.oneToTwoCommits}</div>
          <div className="commit-frequency-stat-label">1-2 commits</div>
        </div>
        <div className="commit-frequency-stat-item">
          <div className="commit-frequency-stat-value">{stats.threeToFiveCommits}</div>
          <div className="commit-frequency-stat-label">3-5 commits</div>
        </div>
        <div className="commit-frequency-stat-item">
          <div className="commit-frequency-stat-value">{stats.sixPlusCommits}</div>
          <div className="commit-frequency-stat-label">6+ commits</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="commit-frequency-stats">
      <StatBox 
        title="Overall Commit Frequency Distribution" 
        stats={overallStats}
        infoContent="Shows how many days had different numbers of commits. This helps identify development patterns:<br><br>• 0 commits: Inactive days (weekends, holidays, breaks)<br>• 1-2 commits: Light development days<br>• 3-5 commits: Regular development activity<br>• 6+ commits: Heavy development or cleanup days"
      />
      <StatBox 
        title="Weekday Commit Frequency Distribution" 
        stats={weekdayStats}
        infoContent="Same as overall distribution but excludes weekends (Saturday &amp; Sunday). This shows pure workday patterns:<br><br>• High &apos;0 commits&apos; may indicate holidays or project breaks<br>• Even distribution suggests consistent daily work<br>• Many &apos;6+ commits&apos; days might indicate intensive sprints or deadline pressure"
      />
    </div>
  );
};

export default CommitFrequencyStats; 