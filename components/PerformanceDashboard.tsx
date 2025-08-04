'use client';

import React, { useState, useEffect, useCallback } from 'react';
import InfoIcon from './InfoIcon';
import SortIcon from './SortIcon';
import TrendAnalysisChart from './TrendAnalysisChart';
import TeamHealthMonitor from './TeamHealthMonitor';
import MoreInfoButton from './MoreInfoButton';

// Interfaces matching the analytics API
interface PerformanceMetrics {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  date: string;
}

interface ContributorPerformance {
  name: string;
  performanceRating: 'below_average' | 'average' | 'above_average' | 'exceptional';
  productivity: {
    commitsPerWeek: number;
    linesPerCommit: number;
    filesPerCommit: number;
    consistencyScore: number;
    activityPattern: 'regular' | 'burst' | 'irregular';
  };
  trends: {
    last30Days: 'improving' | 'declining' | 'stable';
    peakPerformancePeriod?: { start: string; end: string; metrics: PerformanceMetrics };
    lowPerformancePeriod?: { start: string; end: string; metrics: PerformanceMetrics };
  };
  relativeToPeers: {
    commitRank: number;
    productivityRank: number;
    consistencyRank: number;
  };
}

interface ProjectHealth {
  overallScore: number;
  developmentVelocity: {
    current: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    changePercent: number;
  };
  teamCollaboration: {
    score: number;
    activeDevelopers: number;
    newContributors: number;
    busFactor: number;
  };
  codeQuality: {
    averageCommitSize: number;
    refactoringRatio: number;
    largeCommitFrequency: number;
  };
}

interface DetectedIssue {
  type: 'low_activity' | 'single_contributor_dependency' | 'irregular_commits' | 'large_commits' | 'team_shrinking' | 'knowledge_hoarding';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedPeriod: { start: string; end: string };
  affectedContributors: string[];
  impact: string;
  suggestions: string[];
  metrics: PerformanceMetrics;
}

interface AnalyticsData {
  contributors: ContributorPerformance[];
  projectHealth: ProjectHealth;
  detectedIssues: DetectedIssue[];
  insights: {
    keyFindings: string[];
    recommendations: string[];
    riskFactors: string[];
  };
  benchmarks: {
    averageCommitsPerWeek: number;
    averageLinesPerCommit: number;
    averageFilesPerCommit: number;
    teamProductivityScore: number;
  };
}

interface PerformanceDashboardProps {
  repoPath: string;
  filters?: { startDate?: string; endDate?: string; contributor?: string };
  commitActivity?: { date: string; count: number; contributorCount: number; linesAdded: number; linesDeleted: number }[];
  firstDayOfWeek?: 'sunday' | 'monday';
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ repoPath, filters, commitActivity, firstDayOfWeek = 'sunday' }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'contributors' | 'trends' | 'health' | 'issues' | 'insights'>('overview');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/analytics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoPath, filters }),
      });

      const data = await response.json();

      if (response.ok) {
        setAnalytics(data);
      } else {
        setError(data.error || 'Failed to fetch analytics.');
      }
    } catch (err: unknown) {
      console.error('Error fetching analytics:', err);
      setError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  }, [repoPath, filters]);

  useEffect(() => {
    if (repoPath) {
      fetchAnalytics();
    }
  }, [fetchAnalytics, repoPath]);

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading-skeleton">
          <div className="dashboard-loading-line wide"></div>
          <div className="dashboard-loading-line medium"></div>
          <div className="dashboard-loading-line narrow"></div>
        </div>
        <p className="dashboard-loading-text">Loading advanced analytics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3 className="dashboard-error-title">Analytics Error</h3>
        <p className="dashboard-error-message">{error}</p>
      </div>
    );
  }

  if (!analytics) {
    return null;
  }

  return (
    <div className="performance-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-title-section">
            <h2 className="dashboard-title">📊 Performance Analytics</h2>
            <InfoIcon content="Advanced analytics dashboard providing deep insights into team performance, project health, and potential issues.<br><br>📊 <strong>What This Dashboard Provides:</strong><br>• Team performance metrics and trends<br>• Project health indicators and risk assessment<br>• Code quality and collaboration insights<br>• Actionable recommendations for improvement<br><br>💡 <strong>Key Features:</strong><br>• Real-time analytics with historical context<br>• Pattern recognition and anomaly detection<br>• Priority-based improvement suggestions<br>• Expected impact and effort estimates" />
          </div>
          <div className="dashboard-tab-selector">
            {(['overview', 'contributors', 'trends', 'health', 'issues', 'insights'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`dashboard-tab-button ${selectedTab === tab ? 'active' : ''}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && <OverviewTab analytics={analytics} />}
      {selectedTab === 'contributors' && <ContributorsTab analytics={analytics} />}
              {selectedTab === 'trends' && <TrendsTab commitActivity={commitActivity} firstDayOfWeek={firstDayOfWeek} />}
      {selectedTab === 'health' && <HealthTab analytics={analytics} />}
      {selectedTab === 'issues' && <IssuesTab analytics={analytics} />}
      {selectedTab === 'insights' && <InsightsTab analytics={analytics} />}
    </div>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{ analytics: AnalyticsData }> = ({ analytics }) => {
  const { projectHealth, benchmarks } = analytics;

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getHealthStatus = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getVelocityStatus = (trend: string, changePercent: number) => {
    if (trend === 'increasing' && changePercent > 20) return 'success';
    if (trend === 'decreasing' && changePercent > 20) return 'danger';
    return 'neutral';
  };

  const getBusFactorStatus = (busFactor: number) => {
    if (busFactor <= 1) return 'danger';
    if (busFactor <= 2) return 'warning';
    return 'success';
  };

  const getCommitSizeStatus = (avgCommitSize: number) => {
    if (avgCommitSize < 100) return 'success';
    if (avgCommitSize < 500) return 'warning';
    return 'danger';
  };

  const getProductivityStatus = (score: number) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  const getBenchmarkStatus = (linesPerCommit: number) => {
    if (linesPerCommit < 50) return 'success';
    if (linesPerCommit < 200) return 'warning';
    return 'danger';
  };

  // Functions to generate specific analysis content for each metric
  const getProjectHealthAnalysis = (projectHealth: ProjectHealth) => {
    const score = projectHealth.overallScore;
    const status = getHealthStatus(score);
    
    let analysis = `<h5>Project Analysis</h5>`;
    
    if (status === 'success') {
      analysis += `<p><strong>Status: Excellent</strong> - Your project shows very good overall health.</p>`;
    } else if (status === 'warning') {
      analysis += `<p><strong>Status: Good with improvement areas</strong> - The project is functioning well but there are optimization opportunities.</p>`;
    } else {
      analysis += `<p><strong>Status: Requires attention</strong> - Several factors were identified that need immediate intervention.</p>`;
    }

    // Specific factors analysis
    analysis += `<h5>Analyzed Factors:</h5><ul>`;
    
    if (projectHealth.teamCollaboration.activeDevelopers <= 1) {
      analysis += `<li><strong>Single dependency risk:</strong> Only ${projectHealth.teamCollaboration.activeDevelopers} active developer</li>`;
    }
    
    if (projectHealth.teamCollaboration.busFactor <= 1) {
      analysis += `<li><strong>Critical Bus Factor:</strong> ${projectHealth.teamCollaboration.busFactor} - Critical knowledge loss</li>`;
    }
    
    if (projectHealth.developmentVelocity.current < 1) {
      analysis += `<li><strong>Low activity:</strong> ${projectHealth.developmentVelocity.current} commits/week average</li>`;
    }
    
    if (projectHealth.codeQuality.averageCommitSize > 500) {
      analysis += `<li><strong>Very large commits:</strong> ${projectHealth.codeQuality.averageCommitSize} average lines per commit</li>`;
    }
    
    analysis += `</ul>`;

    // Recommendations
    analysis += `<h5>Recommendations:</h5><ul>`;
    if (projectHealth.teamCollaboration.activeDevelopers <= 1) {
      analysis += `<li>Involve more developers in the project</li>`;
    }
    if (projectHealth.teamCollaboration.busFactor <= 1) {
      analysis += `<li>Document critical processes and distribute knowledge</li>`;
    }
    if (projectHealth.developmentVelocity.current < 1) {
      analysis += `<li>Establish a more consistent development pace</li>`;
    }
    if (projectHealth.codeQuality.averageCommitSize > 500) {
      analysis += `<li>Break large commits into smaller, focused changes</li>`;
    }
    analysis += `</ul>`;

    return analysis;
  };

  const getVelocityAnalysis = (velocity: ProjectHealth['developmentVelocity']) => {
    const status = getVelocityStatus(velocity.trend, velocity.changePercent);
    
    let analysis = `<h5>Velocity Analysis</h5>`;
    
    if (status === 'success') {
      analysis += `<p><strong>Status: Improving</strong> - Development velocity is increasing significantly.</p>`;
    } else if (status === 'danger') {
      analysis += `<p><strong>Status: Declining</strong> - Development velocity is decreasing, requires attention.</p>`;
    } else {
      analysis += `<p><strong>Status: Stable</strong> - Velocity remains consistent.</p>`;
    }

    analysis += `<ul>`;
    analysis += `<li><strong>Current velocity:</strong> ${velocity.current} commits/week</li>`;
    analysis += `<li><strong>Trend:</strong> ${velocity.trend === 'increasing' ? 'Increasing' : velocity.trend === 'decreasing' ? 'Decreasing' : 'Stable'}</li>`;
    analysis += `<li><strong>Change:</strong> ${velocity.changePercent > 0 ? '+' : ''}${velocity.changePercent.toFixed(1)}%</li>`;
    analysis += `</ul>`;

    if (status === 'danger') {
      analysis += `<h5>Possible Causes:</h5><ul>`;
      analysis += `<li>Technical or process blockers</li>`;
      analysis += `<li>Team capacity reduction</li>`;
      analysis += `<li>Project in maturity phase</li>`;
      analysis += `<li>Changes in methodology or tools</li>`;
      analysis += `</ul>`;
    }

    return analysis;
  };

  const getTeamCollaborationAnalysis = (collaboration: ProjectHealth['teamCollaboration']) => {
    const status = getBusFactorStatus(collaboration.busFactor);
    
    let analysis = `<h5>Collaboration Analysis</h5>`;
    
    if (status === 'success') {
      analysis += `<p><strong>Status: Good</strong> - Knowledge is well distributed across the team.</p>`;
    } else if (status === 'warning') {
      analysis += `<p><strong>Status: Warning</strong> - There is risk of knowledge loss.</p>`;
    } else {
      analysis += `<p><strong>Status: Critical</strong> - High risk of critical knowledge loss.</p>`;
    }

    analysis += `<ul>`;
    analysis += `<li><strong>Active developers:</strong> ${collaboration.activeDevelopers}</li>`;
    analysis += `<li><strong>Bus Factor:</strong> ${collaboration.busFactor}</li>`;
    analysis += `<li><strong>Collaboration score:</strong> ${collaboration.score}/100</li>`;
    analysis += `</ul>`;

    if (status === 'danger') {
      analysis += `<h5>Critical Actions:</h5><ul>`;
      analysis += `<li>Immediately document critical processes</li>`;
      analysis += `<li>Implement pair programming</li>`;
      analysis += `<li>Rotate code responsibilities</li>`;
      analysis += `<li>Train other developers</li>`;
      analysis += `</ul>`;
    }

    return analysis;
  };

  const getCodeQualityAnalysis = (codeQuality: ProjectHealth['codeQuality']) => {
    const status = getCommitSizeStatus(codeQuality.averageCommitSize);
    
    let analysis = `<h5>Code Quality Analysis</h5>`;
    
    if (status === 'success') {
      analysis += `<p><strong>Status: Excellent</strong> - Commits are small and focused.</p>`;
    } else if (status === 'warning') {
      analysis += `<p><strong>Status: Acceptable</strong> - Commits are of moderate size.</p>`;
    } else {
      analysis += `<p><strong>Status: Requires improvement</strong> - Commits are very large.</p>`;
    }

    analysis += `<ul>`;
    analysis += `<li><strong>Average commit size:</strong> ${codeQuality.averageCommitSize} lines</li>`;
    analysis += `<li><strong>Refactoring ratio:</strong> ${(codeQuality.refactoringRatio * 100).toFixed(1)}%</li>`;
    analysis += `<li><strong>Large commit frequency:</strong> ${codeQuality.largeCommitFrequency}%</li>`;
    analysis += `</ul>`;

    if (status === 'danger') {
      analysis += `<h5>Recommendations:</h5><ul>`;
      analysis += `<li>Break large commits into smaller changes</li>`;
      analysis += `<li>Implement more frequent code reviews</li>`;
      analysis += `<li>Establish commit size limits</li>`;
      analysis += `<li>Use feature branches for large changes</li>`;
      analysis += `</ul>`;
    }

    return analysis;
  };

  const getProductivityAnalysis = (benchmarks: AnalyticsData['benchmarks']) => {
    const status = getProductivityStatus(benchmarks.teamProductivityScore);
    
    let analysis = `<h5>Productivity Analysis</h5>`;
    
    if (status === 'success') {
      analysis += `<p><strong>Status: Excellent</strong> - The team is very productive.</p>`;
    } else if (status === 'warning') {
      analysis += `<p><strong>Status: Good</strong> - There is room to improve productivity.</p>`;
    } else {
      analysis += `<p><strong>Status: Low</strong> - Productivity needs attention.</p>`;
    }

    analysis += `<ul>`;
    analysis += `<li><strong>Productivity score:</strong> ${benchmarks.teamProductivityScore}/100</li>`;
    analysis += `<li><strong>Average commits/week:</strong> ${benchmarks.averageCommitsPerWeek}</li>`;
    analysis += `<li><strong>Average lines/commit:</strong> ${benchmarks.averageLinesPerCommit}</li>`;
    analysis += `<li><strong>Average files/commit:</strong> ${benchmarks.averageFilesPerCommit}</li>`;
    analysis += `</ul>`;

    if (status === 'danger') {
      analysis += `<h5>Affecting Factors:</h5><ul>`;
      analysis += `<li>Technical or process blockers</li>`;
      analysis += `<li>Lack of tools or automation</li>`;
      analysis += `<li>High technical complexity</li>`;
      analysis += `<li>External dependencies</li>`;
      analysis += `</ul>`;
    }

    return analysis;
  };

  const getBenchmarkAnalysis = (benchmarks: AnalyticsData['benchmarks']) => {
    const status = getBenchmarkStatus(benchmarks.averageLinesPerCommit);
    
    let analysis = `<h5>Benchmarks Analysis</h5>`;
    
    if (status === 'success') {
      analysis += `<p><strong>Status: Excellent</strong> - Commits are small and manageable.</p>`;
    } else if (status === 'warning') {
      analysis += `<p><strong>Status: Acceptable</strong> - Commits are of moderate size.</p>`;
    } else {
      analysis += `<p><strong>Status: Requires improvement</strong> - Commits are very large.</p>`;
    }

    analysis += `<ul>`;
    analysis += `<li><strong>Average lines/commit:</strong> ${benchmarks.averageLinesPerCommit}</li>`;
    analysis += `<li><strong>Average files/commit:</strong> ${benchmarks.averageFilesPerCommit}</li>`;
    analysis += `<li><strong>Average commits/week:</strong> ${benchmarks.averageCommitsPerWeek}</li>`;
    analysis += `</ul>`;

    analysis += `<h5>Comparison with Standards:</h5><ul>`;
    analysis += `<li><strong>Ideal:</strong> &lt;50 lines per commit</li>`;
    analysis += `<li><strong>Acceptable:</strong> 50-200 lines per commit</li>`;
    analysis += `<li><strong>Requires attention:</strong> &gt;200 lines per commit</li>`;
    analysis += `</ul>`;

    return analysis;
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      default: return '➡️';
    }
  };

  return (
    <div className="overview-grid">
      {/* Project Health Score */}
      <div className={`metric-card ${getHealthStatus(projectHealth.overallScore)}`}>
        <div className="metric-card-header">
          <div className="metric-card-title-section">
            <h3 className="metric-card-title">Project Health</h3>
            <InfoIcon content="Project Health Score (0-100):<br><br>📊 <strong>Calculation Method:</strong><br>Starts at 100 and deductions are made based on:<br>• Low activity: -20 points (if &lt;1 commit/week average)<br>• Single contributor risk: -30 points (if only 1 active contributor)<br>• Critical bus factor: -25 points (if bus factor = 1)<br>• Declining velocity: -15 points (if &gt;50% velocity decrease)<br>• Large commits: -10 points (if avg commit &gt;500 lines)<br><br>🎯 <strong>How to Interpret:</strong><br>• 80-100: Excellent health, well-balanced project<br>• 60-79: Good health with minor areas for improvement<br>• 40-59: Moderate health, requires attention<br>• 0-39: Poor health, immediate action needed<br><br>💡 <strong>Improvement Tips:</strong><br>• Maintain consistent development pace<br>• Distribute work among multiple contributors<br>• Keep commits focused and reasonably sized<br>• Address declining productivity trends early" />
          </div>
          <div className={`metric-card-value ${getHealthColor(projectHealth.overallScore)}`}>
            {projectHealth.overallScore}/100
          </div>
        </div>
        <div className="metric-card-progress">
          <div
            className={`metric-card-progress-bar ${
              projectHealth.overallScore >= 80
                ? 'success'
                : projectHealth.overallScore >= 60
                ? 'warning'
                : 'danger'
            }`}
            style={{ width: `${projectHealth.overallScore}%` }}
          ></div>
        </div>
        <p className="metric-card-description">
          {projectHealth.overallScore >= 80
            ? 'Excellent project health'
            : projectHealth.overallScore >= 60
            ? 'Good project health with room for improvement'
            : 'Project health needs attention'}
        </p>
        <div className="metric-card-actions">
          <MoreInfoButton
            status={getHealthStatus(projectHealth.overallScore)}
            title="Project Health Analysis"
            content={getProjectHealthAnalysis(projectHealth)}
          />
        </div>
      </div>

      {/* Development Velocity */}
      <div className={`metric-card ${getVelocityStatus(projectHealth.developmentVelocity.trend, projectHealth.developmentVelocity.changePercent)}`}>
        <div className="metric-card-header">
          <div className="metric-card-title-section">
            <h3 className="metric-card-title">Development Velocity</h3>
            <InfoIcon content="Development Velocity Analysis:<br><br>📊 <strong>Calculation Method:</strong><br>• Current Velocity: Total commits ÷ Total weeks in analysis period<br>• Trend Calculation: Recent period (last 50%) vs Previous period (first 50%)<br>• Change Percentage: ((Recent - Previous) ÷ Previous) × 100<br><br>📈 <strong>Trend Indicators:</strong><br>• 📈 Increasing: &gt;20% improvement in recent period<br>• 📉 Decreasing: &gt;20% decline in recent period<br>• ➡️ Stable: Within ±20% variation<br><br>🎯 <strong>How to Interpret:</strong><br>• Higher velocity = More frequent commits and active development<br>• Increasing trend = Team productivity improving over time<br>• Decreasing trend = May indicate blockers, reduced capacity, or project maturity<br>• Stable trend = Consistent development pace<br><br>⚠️ <strong>Important Notes:</strong><br>• Velocity alone doesn&apos;t indicate code quality<br>• Consider commit size and complexity<br>• Seasonal variations are normal (holidays, sprints, etc.)" />
          </div>
          <span className="metric-card-icon">{getTrendIcon(projectHealth.developmentVelocity.trend)}</span>
        </div>
        <div className="metric-card-metrics">
          <div className="metric-row">
            <span className="metric-label">Current:</span>
            <span className="metric-value">{projectHealth.developmentVelocity.current} commits/week</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Trend:</span>
            <span className={`metric-value ${
              projectHealth.developmentVelocity.trend === 'increasing' ? 'success' :
              projectHealth.developmentVelocity.trend === 'decreasing' ? 'danger' :
              'neutral'
            }`}>
              {projectHealth.developmentVelocity.changePercent > 0 ? '+' : ''}
              {projectHealth.developmentVelocity.changePercent.toFixed(1)}%
            </span>
          </div>
        </div>
        <div className="metric-card-actions">
          <MoreInfoButton
            status={getVelocityStatus(projectHealth.developmentVelocity.trend, projectHealth.developmentVelocity.changePercent)}
            title="Development Velocity Analysis"
            content={getVelocityAnalysis(projectHealth.developmentVelocity)}
          />
        </div>
      </div>

      {/* Team Collaboration */}
      <div className={`metric-card ${getBusFactorStatus(projectHealth.teamCollaboration.busFactor)}`}>
        <div className="metric-card-header">
          <div className="metric-card-title-section">
            <h3 className="metric-card-title">Team Collaboration</h3>
            <InfoIcon content="Team Collaboration Metrics:<br><br>👥 <strong>Active Developers:</strong><br>Count of contributors who made at least 1 commit in the analysis period<br><br>🚌 <strong>Bus Factor (Critical Risk Metric):</strong><br>Number of people who could leave the project without critical knowledge loss<br>• Calculation: Contributors with &gt;20% of total commits<br>• 1 = High Risk: Single point of failure<br>• 2 = Medium Risk: Still vulnerable<br>• 3+ = Lower Risk: Knowledge distributed<br><br>📊 <strong>Collaboration Score:</strong><br>Normalized team effectiveness score (0-100)<br>• Formula: (Team Size ÷ (Team Size + 2)) × 100<br>• Accounts for diminishing returns of larger teams<br><br>🎯 <strong>How to Interpret:</strong><br>• Higher active developers = More distributed workload<br>• Bus Factor 1-2 = Immediate risk mitigation needed<br>• Low collaboration score = Consider team structure optimization<br><br>💡 <strong>Improvement Strategies:</strong><br>• Implement pair programming<br>• Rotate code ownership<br>• Document critical processes<br>• Cross-train team members" />
          </div>
          <span className="metric-card-icon">👥</span>
        </div>
        <div className="metric-card-metrics">
          <div className="metric-row">
            <span className="metric-label">Active Developers:</span>
            <span className="metric-value">{projectHealth.teamCollaboration.activeDevelopers}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Bus Factor:</span>
            <span className={`metric-value ${
              projectHealth.teamCollaboration.busFactor <= 1 ? 'danger' :
              projectHealth.teamCollaboration.busFactor <= 2 ? 'warning' :
              'success'
            }`}>
              {projectHealth.teamCollaboration.busFactor}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Collaboration Score:</span>
            <span className="metric-value">{projectHealth.teamCollaboration.score}/100</span>
          </div>
        </div>
        <div className="metric-card-actions">
          <MoreInfoButton
            status={getBusFactorStatus(projectHealth.teamCollaboration.busFactor)}
            title="Team Collaboration Analysis"
            content={getTeamCollaborationAnalysis(projectHealth.teamCollaboration)}
          />
        </div>
      </div>

      {/* Code Quality Metrics */}
      <div className={`metric-card ${getCommitSizeStatus(projectHealth.codeQuality.averageCommitSize)}`}>
        <div className="metric-card-header">
          <div className="metric-card-title-section">
            <h3 className="metric-card-title">Code Quality</h3>
            <InfoIcon content="Code Quality Indicators:<br><br>📏 <strong>Average Commit Size:</strong><br>Total lines changed (added + deleted) ÷ Total commits<br>• &lt;100 lines: Small, focused commits (ideal)<br>• 100-500 lines: Medium commits (acceptable)<br>• &gt;500 lines: Large commits (potential risk)<br><br>🔄 <strong>Refactoring Ratio:</strong><br>Lines deleted ÷ Lines added<br>• 0.0-0.3: Mostly additive development (new features)<br>• 0.3-0.7: Balanced development (features + cleanup)<br>• 0.7-1.0: Heavy refactoring/cleanup phase<br>• &gt;1.0: Code reduction (simplification/removal)<br><br>📊 <strong>Large Commit Frequency:</strong><br>Percentage of commits that are unusually large<br>• Calculated as commits with &gt;2× average size<br><br>🎯 <strong>How to Interpret:</strong><br>• Smaller, frequent commits = Better code review and debugging<br>• Balanced refactoring ratio = Healthy codebase maintenance<br>• High large commit frequency = May indicate poor commit discipline<br><br>💡 <strong>Best Practices:</strong><br>• Aim for atomic commits (one logical change per commit)<br>• Regular refactoring prevents technical debt<br>• Break large features into smaller commits" />
          </div>
          <span className="metric-card-icon">🔍</span>
        </div>
        <div className="metric-card-metrics">
          <div className="metric-row">
            <span className="metric-label">Avg Commit Size:</span>
            <span className="metric-value">{projectHealth.codeQuality.averageCommitSize} lines</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Refactoring Ratio:</span>
            <span className="metric-value">{(projectHealth.codeQuality.refactoringRatio * 100).toFixed(1)}%</span>
          </div>
        </div>
        <div className="metric-card-actions">
          <MoreInfoButton
            status={getCommitSizeStatus(projectHealth.codeQuality.averageCommitSize)}
            title="Code Quality Analysis"
            content={getCodeQualityAnalysis(projectHealth.codeQuality)}
          />
        </div>
      </div>

      {/* Team Productivity Score */}
      <div className={`metric-card ${getProductivityStatus(benchmarks.teamProductivityScore)}`}>
        <div className="metric-card-header">
          <div className="metric-card-title-section">
            <h3 className="metric-card-title">Team Productivity</h3>
            <InfoIcon content="Team Productivity Analysis:<br><br>⚡ <strong>Productivity Score (0-100):</strong><br>Normalized team output measure<br>• Formula: min(100, (Total Commits ÷ Total Weeks) × 10)<br>• Scales with team velocity but caps at 100<br><br>📈 <strong>Average Commits/Week:</strong><br>Team&apos;s sustained development pace<br>• Total commits in period ÷ Number of weeks<br>• Useful for capacity planning and sprint estimation<br><br>🎯 <strong>How to Interpret Scores:</strong><br>• 90-100: Exceptionally productive team<br>• 70-89: High productivity, well-functioning team<br>• 50-69: Moderate productivity, room for improvement<br>• 30-49: Low productivity, investigate blockers<br>• &lt;30: Very low productivity, requires immediate attention<br><br>📊 <strong>Benchmarking Context:</strong><br>• Scores vary by project type, team size, and methodology<br>• Compare against your own historical data<br>• Consider code quality alongside quantity<br><br>💡 <strong>Factors Affecting Productivity:</strong><br>• Team experience and domain knowledge<br>• Code complexity and technical debt<br>• Process efficiency and tooling<br>• External dependencies and blockers<br>• Project phase (research vs implementation)" />
          </div>
          <span className="metric-card-icon">⚡</span>
        </div>
        <div className="metric-card-metrics">
          <div className="metric-row">
            <span className="metric-label">Productivity Score:</span>
            <span className="metric-value neutral">{benchmarks.teamProductivityScore}/100</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Avg Commits/Week:</span>
            <span className="metric-value">{benchmarks.averageCommitsPerWeek}</span>
          </div>
        </div>
        <div className="metric-card-actions">
          <MoreInfoButton
            status={getProductivityStatus(benchmarks.teamProductivityScore)}
            title="Team Productivity Analysis"
            content={getProductivityAnalysis(benchmarks)}
          />
        </div>
      </div>

      {/* Benchmarks */}
      <div className={`metric-card ${getBenchmarkStatus(benchmarks.averageLinesPerCommit)}`}>
        <div className="metric-card-header">
          <div className="metric-card-title-section">
            <h3 className="metric-card-title">Benchmarks</h3>
            <InfoIcon content="Development Benchmarks:<br><br>📏 <strong>Lines per Commit:</strong><br>Average code change volume per commit<br>• Calculation: (Total Lines Added + Total Lines Deleted) ÷ Total Commits<br>• 10-50 lines: Small, focused changes (ideal for most contexts)<br>• 50-200 lines: Medium changes (acceptable for features)<br>• &gt;200 lines: Large changes (may need breaking down)<br><br>📁 <strong>Files per Commit:</strong><br>Average scope of changes per commit<br>• Calculation: Total Unique Files Changed ÷ Total Commits<br>• &lt;2 files: Very focused commits<br>• 2-5 files: Moderate scope (typical for features)<br>• &gt;5 files: Wide scope (may indicate architectural changes)<br><br>🎯 <strong>How to Use Benchmarks:</strong><br>• Compare against your team&apos;s historical performance<br>• Identify trends over time periods<br>• Set realistic goals for improvement<br>• Benchmark against similar projects in your domain<br><br>📊 <strong>Interpretation Guidelines:</strong><br>• Smaller commits = Easier code review and debugging<br>• Balanced file changes = Good separation of concerns<br>• Consistent patterns = Predictable development workflow<br><br>⚠️ <strong>Context Matters:</strong><br>• Initial development may have larger commits<br>• Bug fixes typically have smaller commits<br>• Refactoring may affect many files simultaneously<br>• Consider project phase and team experience" />
          </div>
          <span className="metric-card-icon">📏</span>
        </div>
        <div className="metric-card-metrics">
          <div className="metric-row">
            <span className="metric-label">Lines/Commit:</span>
            <span className="metric-value">{benchmarks.averageLinesPerCommit}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Files/Commit:</span>
            <span className="metric-value">{benchmarks.averageFilesPerCommit}</span>
          </div>
        </div>
        <div className="metric-card-actions">
          <MoreInfoButton
            status={getBenchmarkStatus(benchmarks.averageLinesPerCommit)}
            title="Benchmarks Analysis"
            content={getBenchmarkAnalysis(benchmarks)}
          />
        </div>
      </div>
    </div>
  );
};

// Contributors Tab Component
const ContributorsTab: React.FC<{ analytics: AnalyticsData }> = ({ analytics }) => {
  const [sortField, setSortField] = useState<'name' | 'performance' | 'productivity' | 'pattern' | 'trend' | 'commitRank' | 'productivityRank' | 'consistencyRank'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const getTrendEmoji = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      default: return '➡️';
    }
  };

  const getActivityPatternEmoji = (pattern: string) => {
    switch (pattern) {
      case 'regular': return '🟢';
      case 'burst': return '🟡';
      case 'irregular': return '🔴';
      default: return '⚪';
    }
  };

  const handleSort = (field: 'name' | 'performance' | 'productivity' | 'pattern' | 'trend' | 'commitRank' | 'productivityRank' | 'consistencyRank') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortedContributors = () => {
    const sorted = [...analytics.contributors].sort((a, b) => {
      let aValue: number | string, bValue: number | string;
      
      switch (sortField) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'performance':
          const performanceOrder = { 'exceptional': 4, 'above_average': 3, 'average': 2, 'below_average': 1 };
          aValue = performanceOrder[a.performanceRating];
          bValue = performanceOrder[b.performanceRating];
          break;
        case 'productivity':
          aValue = a.productivity.commitsPerWeek;
          bValue = b.productivity.commitsPerWeek;
          break;
        case 'pattern':
          const patternOrder = { 'regular': 3, 'burst': 2, 'irregular': 1 };
          aValue = patternOrder[a.productivity.activityPattern];
          bValue = patternOrder[b.productivity.activityPattern];
          break;
        case 'trend':
          const trendOrder = { 'improving': 3, 'stable': 2, 'declining': 1 };
          aValue = trendOrder[a.trends.last30Days];
          bValue = trendOrder[b.trends.last30Days];
          break;
        case 'commitRank':
          aValue = a.relativeToPeers.commitRank;
          bValue = b.relativeToPeers.commitRank;
          break;
        case 'productivityRank':
          aValue = a.relativeToPeers.productivityRank;
          bValue = b.relativeToPeers.productivityRank;
          break;
        case 'consistencyRank':
          aValue = a.relativeToPeers.consistencyRank;
          bValue = b.relativeToPeers.consistencyRank;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  return (
    <div className="contributors-section">
      <div className="contributors-card">
        <div className="contributors-header">
          <div className="contributors-title-section">
            <h3 className="contributors-title">Individual Performance Analysis</h3>
            <InfoIcon content="Individual Performance Metrics:<br><br>🏆 <strong>Performance Rating Calculation:</strong><br>Based on weighted average of 3 factors:<br>• Commit Performance: Individual commits/week ÷ Team average<br>• Productivity Performance: Individual lines/commit ÷ Team average<br>• Consistency Performance: Individual consistency ÷ Team average<br><br><strong>Rating Scale:</strong><br>• Exceptional: ≥150% of team average<br>• Above Average: 120-149% of team average<br>• Average: 80-119% of team average<br>• Below Average: &lt;80% of team average<br><br>📊 <strong>Productivity Metrics:</strong><br>• Commits/Week: Sustained contribution rate<br>• Lines/Commit: Code change volume per contribution<br>• Files/Commit: Scope of changes per commit<br>• Consistency Score: Regularity of contributions (0-1 scale)<br><br>🔄 <strong>Activity Patterns:</strong><br>• Regular: Consistent daily/weekly contributions<br>• Burst: Periods of intense activity followed by quiet periods<br>• Irregular: Unpredictable contribution patterns<br><br>📈 <strong>Trend Analysis (Last 30 Days):</strong><br>• Improving: Recent activity &gt; Previous 30-day period<br>• Declining: Recent activity &lt; Previous 30-day period<br>• Stable: Activity within ±20% of previous period<br><br>🥇 <strong>Peer Rankings:</strong><br>Position relative to team members in each metric category" />
          </div>

          <p className="contributors-subtitle">
            Detailed breakdown of each contributor&apos;s productivity, consistency, and trends
          </p>
        </div>
        <div className="contributors-table-container">
          <table className="contributors-table">
            <thead className="contributors-table-header">
              <tr>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('name')}
                    className="contributors-table-sort-button"
                  >
                    Contributor
                    <SortIcon 
                      isActive={sortField === 'name'} 
                      direction={sortField === 'name' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('performance')}
                    className="contributors-table-sort-button"
                  >
                    Performance
                    <SortIcon 
                      isActive={sortField === 'performance'} 
                      direction={sortField === 'performance' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('productivity')}
                    className="contributors-table-sort-button"
                  >
                    Productivity
                    <SortIcon 
                      isActive={sortField === 'productivity'} 
                      direction={sortField === 'productivity' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('pattern')}
                    className="contributors-table-sort-button"
                  >
                    Pattern
                    <SortIcon 
                      isActive={sortField === 'pattern'} 
                      direction={sortField === 'pattern' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('trend')}
                    className="contributors-table-sort-button"
                  >
                    Trend
                    <SortIcon 
                      isActive={sortField === 'trend'} 
                      direction={sortField === 'trend' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('commitRank')}
                    className="contributors-table-sort-button"
                  >
                    Commit Rank
                    <SortIcon 
                      isActive={sortField === 'commitRank'} 
                      direction={sortField === 'commitRank' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('productivityRank')}
                    className="contributors-table-sort-button"
                  >
                    Productivity Rank
                    <SortIcon 
                      isActive={sortField === 'productivityRank'} 
                      direction={sortField === 'productivityRank' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
                <th className="contributors-table-header th">
                  <button 
                    onClick={() => handleSort('consistencyRank')}
                    className="contributors-table-sort-button"
                  >
                    Consistency Rank
                    <SortIcon 
                      isActive={sortField === 'consistencyRank'} 
                      direction={sortField === 'consistencyRank' ? sortDirection : null}
                      className="contributors-table-sort-icon"
                    />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="contributors-table-body">
              {getSortedContributors().map((contributor) => (
                <tr key={contributor.name} className="contributors-table-row">
                  <td className="contributors-table-cell">
                    <div className="contributors-name">{contributor.name}</div>
                  </td>
                  <td className="contributors-table-cell">
                    <span className={`contributors-performance-badge ${contributor.performanceRating}`}>
                      {contributor.performanceRating.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="contributors-table-cell">
                    <div className="contributors-metrics">{contributor.productivity.commitsPerWeek.toFixed(1)} commits/week</div>
                    <div className="contributors-metrics">{contributor.productivity.linesPerCommit} lines/commit</div>
                    <div className="contributors-metrics">Consistency: {(contributor.productivity.consistencyScore * 100).toFixed(0)}%</div>
                  </td>
                  <td className="contributors-table-cell">
                    <div className="contributors-pattern">
                      <span className="contributors-pattern-emoji">{getActivityPatternEmoji(contributor.productivity.activityPattern)}</span>
                      {contributor.productivity.activityPattern}
                    </div>
                  </td>
                  <td className="contributors-table-cell">
                    <div className="contributors-trend">
                      <span className="contributors-trend-emoji">{getTrendEmoji(contributor.trends.last30Days)}</span>
                      {contributor.trends.last30Days}
                    </div>
                  </td>
                  <td className="contributors-table-cell">
                    <div className="contributors-rankings">#{contributor.relativeToPeers.commitRank}</div>
                  </td>
                  <td className="contributors-table-cell">
                    <div className="contributors-rankings">#{contributor.relativeToPeers.productivityRank}</div>
                  </td>
                  <td className="contributors-table-cell">
                    <div className="contributors-rankings">#{contributor.relativeToPeers.consistencyRank}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// Issues Tab Component
const IssuesTab: React.FC<{ analytics: AnalyticsData }> = ({ analytics }) => {

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '📝';
    }
  };

  if (analytics.detectedIssues.length === 0) {
    return (
      <div className="issues-no-issues">
        <div className="issues-no-issues-icon">✅</div>
        <h3 className="issues-no-issues-title">No Issues Detected</h3>
        <p className="issues-no-issues-message">
          Great! The analysis didn&apos;t find any significant issues with your project&apos;s development patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="issues-section">
      {analytics.detectedIssues.map((issue, index) => (
        <div key={index} className={`issues-item ${issue.severity}`}>
          <div className="issues-item-content">
            <span className="issues-item-icon">{getSeverityIcon(issue.severity)}</span>
            <div className="issues-item-main">
              <div className="issues-item-header">
                <h3 className="issues-item-title">{issue.title}</h3>
                <span className="issues-item-severity">
                  {issue.severity.toUpperCase()}
                </span>
              </div>
              <p className="issues-item-description">{issue.description}</p>
              
              {issue.affectedContributors.length > 0 && (
                <div className="issues-item-section">
                  <h4 className="issues-item-section-title">Affected Contributors:</h4>
                  <div className="issues-item-contributors">
                    {issue.affectedContributors.map((contributor) => (
                      <span key={contributor} className="issues-item-contributor">
                        {contributor}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="issues-item-section">
                <h4 className="issues-item-section-title">Impact:</h4>
                <p className="issues-item-impact">{issue.impact}</p>
              </div>

              <div className="issues-item-section">
                <h4 className="issues-item-section-title">Suggestions:</h4>
                <ul className="issues-item-suggestions">
                  {issue.suggestions.map((suggestion, suggestionIndex) => (
                    <li key={suggestionIndex}>{suggestion}</li>
                  ))}
                </ul>
              </div>

              <div className="issues-item-period">
                Period: {issue.affectedPeriod.start} to {issue.affectedPeriod.end}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Insights Tab Component
const InsightsTab: React.FC<{ analytics: AnalyticsData }> = ({ analytics }) => {
  const { insights } = analytics;

  console.log('InsightsTab debug:', {
    insights,
    keyFindingsLength: insights.keyFindings.length,
    recommendationsLength: insights.recommendations.length,
    riskFactorsLength: insights.riskFactors.length
  });

  return (
    <div className="insights-grid">
      {/* Key Findings */}
      <div className="insights-card">
        <div className="insights-card-header">
          <span className="insights-card-icon">🔍</span>
          <h3 className="insights-card-title">Key Findings</h3>
        </div>
        <ul className="insights-list">
          {insights.keyFindings.length > 0 ? (
            insights.keyFindings.map((finding, index) => (
              <li key={index} className="insights-list-item">
                <span className="insights-list-bullet">•</span>
                <span className="insights-list-text">{finding}</span>
              </li>
            ))
          ) : (
            <li className="insights-list-item">
              <span className="insights-list-bullet">•</span>
              <span className="insights-list-text">Analysis in progress...</span>
            </li>
          )}
        </ul>
      </div>

      {/* Recommendations */}
      <div className="insights-card">
        <div className="insights-card-header">
          <span className="insights-card-icon">💡</span>
          <h3 className="insights-card-title">Recommendations</h3>
        </div>
        <ul className="insights-list">
          {insights.recommendations.length > 0 ? (
            insights.recommendations.map((recommendation, index) => (
              <li key={index} className="insights-list-item">
                <span className="insights-list-bullet success">✓</span>
                <span className="insights-list-text">{recommendation}</span>
              </li>
            ))
          ) : (
            <li className="insights-list-item">
              <span className="insights-list-bullet success">✓</span>
              <span className="insights-list-text">Continue monitoring project metrics...</span>
            </li>
          )}
        </ul>
      </div>

      {/* Risk Factors */}
      <div className="insights-card">
        <div className="insights-card-header">
          <span className="insights-card-icon">⚠️</span>
          <h3 className="insights-card-title">Risk Factors</h3>
        </div>
        <ul className="insights-list">
          {insights.riskFactors.length > 0 ? (
            insights.riskFactors.map((risk, index) => (
              <li key={index} className="insights-list-item">
                <span className="insights-list-bullet danger">!</span>
                <span className="insights-list-text">{risk}</span>
              </li>
            ))
          ) : (
            <li className="insights-list-item">
              <span className="insights-list-bullet">•</span>
              <span className="insights-list-text">No significant risks detected</span>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

// Trends Tab Component
const TrendsTab: React.FC<{ commitActivity?: { date: string; count: number; contributorCount: number; linesAdded: number; linesDeleted: number }[]; firstDayOfWeek?: 'sunday' | 'monday' }> = ({ commitActivity, firstDayOfWeek = 'sunday' }) => {
  if (!commitActivity || commitActivity.length === 0) {
    return (
      <div className="trends-warning">
        <div className="trends-warning-content">
          <span className="trends-warning-icon">⚠️</span>
          <p className="trends-warning-message">
            Trend analysis requires commit activity data. Please ensure you have selected a repository and loaded basic statistics first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="trends-section">
                      <TrendAnalysisChart commitActivity={commitActivity} firstDayOfWeek={firstDayOfWeek} />
    </div>
  );
};

// Health Tab Component
const HealthTab: React.FC<{ analytics: AnalyticsData }> = ({ analytics }) => {
  return (
    <div className="health-section">
      <TeamHealthMonitor 
        projectHealth={analytics.projectHealth}
        contributors={analytics.contributors}
        issues={analytics.detectedIssues}
      />
    </div>
  );
};

export default PerformanceDashboard; 