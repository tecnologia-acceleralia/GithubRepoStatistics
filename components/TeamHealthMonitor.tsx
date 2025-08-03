'use client';

import React from 'react';
import InfoIcon from './InfoIcon';
import MoreInfoButton from './MoreInfoButton';

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
  };
  relativeToPeers: {
    commitRank: number;
    productivityRank: number;
    consistencyRank: number;
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
}

interface TeamHealthMetrics {
  overallHealth: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  alerts: Alert[];
  keyMetrics: {
    busFactor: number;
    velocity: { current: number; trend: 'up' | 'down' | 'stable' };
    teamSize: number;
    activeContributors: number;
    knowledge_distribution: 'centralized' | 'distributed' | 'fragmented';
  };
  recommendations: Recommendation[];
}

interface Alert {
  id: string;
  type: 'performance' | 'risk' | 'quality' | 'team';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  metric?: number;
  threshold?: number;
  trend?: 'improving' | 'worsening' | 'stable';
  actionable: boolean;
  suggestedActions: string[];
}

interface Recommendation {
  id: string;
  category: 'productivity' | 'quality' | 'collaboration' | 'risk';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  expectedImpact: string;
  effort: 'low' | 'medium' | 'high';
  timeline: string;
}

interface TeamHealthMonitorProps {
  projectHealth: {
    overallScore: number;
    developmentVelocity: {
      current: number;
      trend: 'increasing' | 'decreasing' | 'stable';
      changePercent: number;
    };
    teamCollaboration: {
      score: number;
      activeDevelopers: number;
      busFactor: number;
    };
  };
  contributors: ContributorPerformance[];
  issues: DetectedIssue[];
}

const TeamHealthMonitor: React.FC<TeamHealthMonitorProps> = ({ 
  projectHealth, 
  contributors, 
  issues 
}) => {
  const healthMetrics = analyzeTeamHealth(projectHealth, contributors, issues);

  return (
    <div className="team-health-monitor">
      {/* Health Overview */}
      <div className="team-health-overview">
        <div className="team-health-header">
          <div className="team-health-title-section">
            <h2 className="team-health-title">🏥 Team Health Monitor</h2>
            <InfoIcon content="Real-time monitoring of team health indicators:<br><br>🎯 <strong>Key Metrics:</strong><br>• Bus Factor: Number of people critical to project continuity<br>• Velocity: Development speed and consistency<br>• Knowledge Distribution: How expertise is spread across the team<br>• Risk Assessment: Potential project risks and their severity<br><br>🚨 <strong>Alert System:</strong><br>• Performance alerts for declining productivity<br>• Risk alerts for dependency issues<br>• Quality alerts for code health concerns<br>• Team alerts for collaboration issues<br><br>💡 <strong>Smart Recommendations:</strong><br>• Actionable suggestions to improve team performance<br>• Priority-based improvement roadmap<br>• Expected impact and effort estimates" />
          </div>
          <div className={`team-health-score ${getHealthScoreClass(healthMetrics.overallHealth)}`}>
            {healthMetrics.overallHealth}/100
          </div>
        </div>

        {/* Health Status Banner */}
        <div className={`team-health-banner ${healthMetrics.riskLevel}`}>
          <div className="team-health-banner-content">
            <div className="team-health-banner-left">
              <span className="team-health-banner-emoji">{getHealthEmoji(healthMetrics.riskLevel)}</span>
              <div className="team-health-banner-info">
                <h3>
                  Team Health: {healthMetrics.riskLevel.toUpperCase()}
                </h3>
                <p>
                  {getHealthDescription(healthMetrics.riskLevel)}
                </p>
              </div>
            </div>
            <div className="team-health-banner-right">
              <div className="team-health-alerts-label">Active Alerts</div>
              <div className="team-health-alerts-count">{healthMetrics.alerts.length}</div>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="team-health-metrics-grid">
          <MetricCard
            title="Bus Factor"
            value={healthMetrics.keyMetrics.busFactor}
            type="number"
            status={healthMetrics.keyMetrics.busFactor >= 3 ? 'good' : 
                    healthMetrics.keyMetrics.busFactor >= 2 ? 'warning' : 'critical'}
            description="People critical to project"
          />
          <MetricCard
            title="Team Velocity"
            value={healthMetrics.keyMetrics.velocity.current}
            type="decimal"
            status={healthMetrics.keyMetrics.velocity.trend === 'up' ? 'good' :
                    healthMetrics.keyMetrics.velocity.trend === 'stable' ? 'warning' : 'critical'}
            description="Commits per week"
            trend={healthMetrics.keyMetrics.velocity.trend}
          />
          <MetricCard
            title="Active Contributors"
            value={healthMetrics.keyMetrics.activeContributors}
            type="number"
            status={healthMetrics.keyMetrics.activeContributors >= 3 ? 'good' :
                    healthMetrics.keyMetrics.activeContributors >= 2 ? 'warning' : 'critical'}
            description={`of ${healthMetrics.keyMetrics.teamSize} total`}
          />
          <MetricCard
            title="Knowledge Distribution"
            value={healthMetrics.keyMetrics.knowledge_distribution}
            type="text"
            status={healthMetrics.keyMetrics.knowledge_distribution === 'distributed' ? 'good' :
                    healthMetrics.keyMetrics.knowledge_distribution === 'centralized' ? 'warning' : 'critical'}
            description="Expertise spread"
          />
        </div>
      </div>

      {/* Active Alerts */}
      {healthMetrics.alerts.length > 0 && (
        <div className="team-health-alerts-section">
          <div className="team-health-alerts-header">
            <h3 className="team-health-alerts-title">🚨 Active Alerts</h3>
            <span className="team-health-alerts-badge">
              {healthMetrics.alerts.length}
            </span>
          </div>
          <div className="team-health-alerts-list">
            {healthMetrics.alerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {healthMetrics.recommendations.length > 0 && (
        <div className="team-health-recommendations-section">
          <div className="team-health-recommendations-header">
            <h3 className="team-health-recommendations-title">💡 Smart Recommendations</h3>
            <span className="team-health-recommendations-badge">
              {healthMetrics.recommendations.length}
            </span>
          </div>
          <div className="team-health-recommendations-list">
            {healthMetrics.recommendations.map((rec) => (
              <RecommendationCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
interface MetricCardProps {
  title: string;
  value: number | string;
  type: 'number' | 'decimal' | 'text';
  status: 'good' | 'warning' | 'critical';
  description: string;
  trend?: 'up' | 'down' | 'stable';
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, type, status, description, trend }) => {
  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return '📈';
      case 'down': return '📉';
      case 'stable': return '➡️';
      default: return '';
    }
  };

  const formatValue = (value: number | string, type: string) => {
    if (type === 'decimal' && typeof value === 'number') {
      return value.toFixed(1);
    }
    if (type === 'text' && typeof value === 'string') {
      return value.charAt(0).toUpperCase() + value.slice(1);
    }
    return value.toString();
  };

  const getMoreInfoContent = () => {
    switch (title) {
      case 'Bus Factor':
        return `<strong>Bus Factor Analysis</strong><br><br>
                <strong>What it measures:</strong> The number of people who would need to be "hit by a bus" before the project would be in serious trouble.<br><br>
                <strong>Current Value:</strong> ${value} people<br><br>
                <strong>Risk Levels:</strong><br>
                • <strong>1-2 people:</strong> Critical risk - project heavily dependent on few individuals<br>
                • <strong>3-4 people:</strong> Moderate risk - some dependency concentration<br>
                • <strong>5+ people:</strong> Good distribution - healthy knowledge spread<br><br>
                <strong>Recommendations:</strong><br>
                • Implement pair programming sessions<br>
                • Document critical processes and code<br>
                • Cross-train team members<br>
                • Distribute code ownership`;
      
      case 'Team Velocity':
        return `<strong>Team Velocity Analysis</strong><br><br>
                <strong>What it measures:</strong> The rate at which your team delivers work (commits per week).<br><br>
                <strong>Current Value:</strong> ${value} commits/week<br><br>
                <strong>Trend Analysis:</strong><br>
                • <strong>📈 Increasing:</strong> Team productivity is improving<br>
                • <strong>📉 Decreasing:</strong> May indicate blockers or capacity issues<br>
                • <strong>➡️ Stable:</strong> Consistent delivery pace<br><br>
                <strong>Factors Affecting Velocity:</strong><br>
                • Team size and experience<br>
                • Technical debt and complexity<br>
                • Process efficiency<br>
                • External dependencies<br><br>
                <strong>Improvement Strategies:</strong><br>
                • Remove process bottlenecks<br>
                • Invest in automation<br>
                • Improve code quality<br>
                • Optimize team collaboration`;
      
      case 'Active Contributors':
        return `<strong>Active Contributors Analysis</strong><br><br>
                <strong>What it measures:</strong> The number of developers actively contributing to the project.<br><br>
                <strong>Current Value:</strong> ${value} active contributors<br><br>
                <strong>Team Health Indicators:</strong><br>
                • <strong>1-2 contributors:</strong> High risk - limited team capacity<br>
                • <strong>3-5 contributors:</strong> Moderate - good for focused development<br>
                • <strong>6+ contributors:</strong> Healthy - diverse perspectives and skills<br><br>
                <strong>Benefits of More Contributors:</strong><br>
                • Reduced bus factor risk<br>
                • Faster feature delivery<br>
                • Better code quality through reviews<br>
                • Diverse problem-solving approaches<br><br>
                <strong>Engagement Strategies:</strong><br>
                • Clear contribution guidelines<br>
                • Mentorship programs<br>
                • Recognition and rewards<br>
                • Reduced barriers to entry`;
      
      case 'Knowledge Distribution':
        return `<strong>Knowledge Distribution Analysis</strong><br><br>
                <strong>What it measures:</strong> How expertise and knowledge are spread across the team.<br><br>
                <strong>Current Status:</strong> ${value}<br><br>
                <strong>Distribution Types:</strong><br>
                • <strong>Centralized:</strong> Knowledge concentrated in few individuals<br>
                • <strong>Distributed:</strong> Knowledge well-spread across team<br>
                • <strong>Fragmented:</strong> Knowledge scattered, no clear ownership<br><br>
                <strong>Risk Assessment:</strong><br>
                • <strong>Centralized:</strong> High bus factor risk<br>
                • <strong>Distributed:</strong> Low risk, healthy team<br>
                • <strong>Fragmented:</strong> Medium risk, coordination challenges<br><br>
                <strong>Improvement Strategies:</strong><br>
                • Cross-training programs<br>
                • Documentation initiatives<br>
                • Code review rotations<br>
                • Knowledge sharing sessions<br>
                • Pair programming`;
      
      default:
        return `<strong>${title} Analysis</strong><br><br>
                <strong>Current Value:</strong> ${value}<br><br>
                <strong>Status:</strong> ${status}<br><br>
                <strong>Description:</strong> ${description}`;
    }
  };

  const getMoreInfoStatus = () => {
    switch (status) {
      case 'good': return 'success';
      case 'warning': return 'warning';
      case 'critical': return 'danger';
      default: return 'neutral';
    }
  };

  return (
    <div className={`team-health-metric-card ${status}`}>
      <div className="team-health-metric-top">
        <MoreInfoButton 
          status={getMoreInfoStatus()}
          title={title}
          content={getMoreInfoContent()}
        />
      </div>
      <div className="team-health-metric-content">
        <div className="team-health-metric-header">
          <h4 className="team-health-metric-title">{title}</h4>
          {trend && <span className="team-health-metric-trend">{getTrendIcon(trend)}</span>}
        </div>
        <div className="team-health-metric-value">
          {formatValue(value, type)}
        </div>
        <p className="team-health-metric-description">{description}</p>
      </div>
    </div>
  );
};

// Alert Card Component
interface AlertCardProps {
  alert: Alert;
}

const AlertCard: React.FC<AlertCardProps> = ({ alert }) => {
  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🚨';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getAlertMoreInfoContent = () => {
    return `<strong>${alert.title}</strong><br><br>
            <strong>Alert Type:</strong> ${alert.type}<br>
            <strong>Severity:</strong> ${alert.severity}<br><br>
            <strong>Description:</strong><br>
            ${alert.message}<br><br>
            ${alert.metric !== undefined && alert.threshold !== undefined ? 
              `<strong>Metrics:</strong><br>
              Current: ${alert.metric}<br>
              Threshold: ${alert.threshold}<br><br>` : ''
            }
            ${alert.trend ? `<strong>Trend:</strong> ${alert.trend}<br><br>` : ''}
            ${alert.actionable ? 
              `<strong>Suggested Actions:</strong><br>
              ${alert.suggestedActions.map(action => `• ${action}`).join('<br>')}` : 
              'This alert is informational only.'
            }`;
  };

  const getAlertMoreInfoStatus = () => {
    switch (alert.severity) {
      case 'critical': return 'danger';
      case 'error': return 'danger';
      case 'warning': return 'warning';
      case 'info': return 'neutral';
      default: return 'neutral';
    }
  };

  return (
    <div className={`team-health-alert-card ${alert.severity}`}>
      <div className="team-health-alert-top">
        <MoreInfoButton 
          status={getAlertMoreInfoStatus()}
          title={alert.title}
          content={getAlertMoreInfoContent()}
        />
      </div>
      <div className="team-health-alert-content">
        <span className="team-health-alert-icon">{getSeverityIcon(alert.severity)}</span>
        <div className="team-health-alert-body">
          <div className="team-health-alert-header">
            <h4 className="team-health-alert-title">{alert.title}</h4>
            <span className="team-health-alert-severity">
              {alert.severity.toUpperCase()}
            </span>
          </div>
          <p className="team-health-alert-message">{alert.message}</p>
          
          {alert.metric !== undefined && alert.threshold !== undefined && (
            <div className="team-health-alert-metrics">
              Current: {alert.metric} | Threshold: {alert.threshold}
            </div>
          )}

          {alert.actionable && (
            <div className="team-health-alert-actions">
              <h5 className="team-health-alert-actions-title">Suggested Actions:</h5>
              <ul className="team-health-alert-actions-list">
                {alert.suggestedActions.map((action, index) => (
                  <li key={index} className="team-health-alert-action-item">
                    <span className="team-health-alert-action-bullet">•</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Recommendation Card Component
interface RecommendationCardProps {
  recommendation: Recommendation;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({ recommendation }) => {
  const getRecommendationMoreInfoContent = () => {
    return `<strong>${recommendation.title}</strong><br><br>
            <strong>Category:</strong> ${recommendation.category}<br>
            <strong>Priority:</strong> ${recommendation.priority}<br>
            <strong>Effort:</strong> ${recommendation.effort}<br>
            <strong>Timeline:</strong> ${recommendation.timeline}<br><br>
            <strong>Description:</strong><br>
            ${recommendation.description}<br><br>
            <strong>Expected Impact:</strong><br>
            ${recommendation.expectedImpact}<br><br>
            <strong>Implementation Tips:</strong><br>
            • Break down into smaller tasks<br>
            • Set clear milestones<br>
            • Monitor progress regularly<br>
            • Gather team feedback<br>
            • Adjust timeline as needed`;
  };

  const getRecommendationMoreInfoStatus = () => {
    switch (recommendation.priority) {
      case 'high': return 'danger';
      case 'medium': return 'warning';
      case 'low': return 'success';
      default: return 'neutral';
    }
  };

  return (
    <div className={`team-health-recommendation-card ${recommendation.priority}`}>
      <div className="team-health-recommendation-top">
        <MoreInfoButton 
          status={getRecommendationMoreInfoStatus()}
          title={recommendation.title}
          content={getRecommendationMoreInfoContent()}
        />
      </div>
      <div className="team-health-recommendation-content">
        <div className="team-health-recommendation-header">
          <div className="team-health-recommendation-main">
            <div className="team-health-recommendation-title-section">
              <h4 className="team-health-recommendation-title">{recommendation.title}</h4>
              <span className={`team-health-recommendation-effort ${recommendation.effort}`}>
                {recommendation.effort} effort
              </span>
            </div>
            <p className="team-health-recommendation-description">{recommendation.description}</p>
          </div>
          <div className="team-health-recommendation-meta">
            <span className="mb-1">Priority: {recommendation.priority}</span>
            <span>Timeline: {recommendation.timeline}</span>
          </div>
        </div>
        <div className="team-health-recommendation-impact">
          <strong>Expected Impact:</strong>
          <span>{recommendation.expectedImpact}</span>
        </div>
      </div>
    </div>
  );
};

// Helper functions
function analyzeTeamHealth(projectHealth: TeamHealthMonitorProps['projectHealth'], contributors: ContributorPerformance[], issues: DetectedIssue[]): TeamHealthMetrics {
  const alerts: Alert[] = [];
  const recommendations: Recommendation[] = [];

  // Add alerts from detected issues
  issues.forEach((issue, index) => {
    alerts.push({
      id: `issue-${index}`,
      type: 'risk',
      severity: issue.severity === 'critical' ? 'critical' : 
                issue.severity === 'high' ? 'error' : 
                issue.severity === 'medium' ? 'warning' : 'info',
      title: issue.title,
      message: issue.description,
      actionable: true,
      suggestedActions: issue.suggestions
    });
  });

  // Analyze bus factor risk
  if (projectHealth.teamCollaboration.busFactor <= 1) {
    alerts.push({
      id: 'bus-factor-critical',
      type: 'risk',
      severity: 'critical',
      title: 'Critical Bus Factor Risk',
      message: 'Project depends heavily on a single developer. Immediate action required.',
      metric: projectHealth.teamCollaboration.busFactor,
      threshold: 2,
      trend: 'stable',
      actionable: true,
      suggestedActions: [
        'Implement pair programming sessions',
        'Document critical processes and code',
        'Cross-train team members',
        'Distribute code ownership'
      ]
    });

    recommendations.push({
      id: 'bus-factor-mitigation',
      category: 'risk',
      priority: 'high',
      title: 'Implement Knowledge Sharing Program',
      description: 'Establish systematic knowledge transfer to reduce dependency on key individuals.',
      expectedImpact: 'Reduce bus factor risk by 70% within 4 weeks',
      effort: 'medium',
      timeline: '2-4 weeks'
    });
  }

  // Analyze velocity trends
  if (projectHealth.developmentVelocity.trend === 'decreasing' && 
      projectHealth.developmentVelocity.changePercent < -20) {
    alerts.push({
      id: 'velocity-declining',
      type: 'performance',
      severity: 'warning',
      title: 'Declining Development Velocity',
      message: `Development speed has decreased by ${Math.abs(projectHealth.developmentVelocity.changePercent).toFixed(1)}% recently.`,
      metric: projectHealth.developmentVelocity.current,
      threshold: projectHealth.developmentVelocity.current * 1.2,
      trend: 'worsening',
      actionable: true,
      suggestedActions: [
        'Review sprint planning effectiveness',
        'Identify and remove blockers',
        'Consider team capacity adjustments',
        'Implement process improvements'
      ]
    });
  }

  // Analyze team size
  if (projectHealth.teamCollaboration.activeDevelopers < 2) {
    alerts.push({
      id: 'team-size-risk',
      type: 'team',
      severity: 'error',
      title: 'Insufficient Team Size',
      message: 'Single-person team creates significant project risk.',
      metric: projectHealth.teamCollaboration.activeDevelopers,
      threshold: 3,
      trend: 'stable',
      actionable: true,
      suggestedActions: [
        'Consider hiring additional developers',
        'Engage contractors for additional capacity',
        'Prioritize knowledge documentation',
        'Implement code backup strategies'
      ]
    });
  }

  // Determine overall risk level
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const errorAlerts = alerts.filter(a => a.severity === 'error').length;
  const warningAlerts = alerts.filter(a => a.severity === 'warning').length;

  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (criticalAlerts > 0) riskLevel = 'critical';
  else if (errorAlerts > 0) riskLevel = 'high';
  else if (warningAlerts > 0) riskLevel = 'medium';

  // Add general recommendations
  if (projectHealth.overallScore < 80) {
    recommendations.push({
      id: 'general-health-improvement',
      category: 'productivity',
      priority: 'medium',
      title: 'Improve Overall Project Health',
      description: 'Focus on key metrics to boost overall project health score.',
      expectedImpact: 'Increase health score by 15-20 points',
      effort: 'medium',
      timeline: '4-6 weeks'
    });
  }

  // Determine knowledge distribution
  const totalCommits = contributors.reduce((sum, c) => sum + c.productivity.commitsPerWeek, 0);
  const topContributorCommits = Math.max(...contributors.map(c => c.productivity.commitsPerWeek));
  const topContributorPercentage = totalCommits > 0 ? topContributorCommits / totalCommits : 0;

  let knowledgeDistribution: 'centralized' | 'distributed' | 'fragmented' = 'distributed';
  if (topContributorPercentage > 0.7) knowledgeDistribution = 'centralized';
  else if (contributors.length > 5 && topContributorPercentage < 0.2) knowledgeDistribution = 'fragmented';

  return {
    overallHealth: projectHealth.overallScore,
    riskLevel,
    alerts,
    keyMetrics: {
      busFactor: projectHealth.teamCollaboration.busFactor,
      velocity: {
        current: projectHealth.developmentVelocity.current,
        trend: projectHealth.developmentVelocity.trend === 'increasing' ? 'up' : 
               projectHealth.developmentVelocity.trend === 'decreasing' ? 'down' : 'stable'
      },
      teamSize: contributors.length,
      activeContributors: projectHealth.teamCollaboration.activeDevelopers,
      knowledge_distribution: knowledgeDistribution
    },
    recommendations
  };
}

function getHealthScoreClass(score: number): string {
  if (score >= 80) return 'good';
  if (score >= 60) return 'warning';
  return 'critical';
}

function getHealthEmoji(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': return '🚨';
    case 'high': return '⚠️';
    case 'medium': return '📊';
    case 'low': return '✅';
    default: return '📋';
  }
}

function getHealthDescription(riskLevel: string): string {
  switch (riskLevel) {
    case 'critical': return 'Immediate attention required. Critical issues detected that may impact project delivery.';
    case 'high': return 'High risk factors present. Proactive measures recommended to prevent escalation.';
    case 'medium': return 'Some areas need improvement. Monitor closely and implement suggested optimizations.';
    case 'low': return 'Team health is good. Continue current practices and maintain monitoring.';
    default: return 'Health status being evaluated.';
  }
}

export default TeamHealthMonitor; 