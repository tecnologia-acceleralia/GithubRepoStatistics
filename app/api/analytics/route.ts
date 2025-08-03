import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import path from 'path';
import fs from 'fs';

// Interfaces for advanced analytics
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
    peakPerformancePeriod?: { start: string; end: string; metrics: any };
    lowPerformancePeriod?: { start: string; end: string; metrics: any };
  };
  relativeToPeers: {
    commitRank: number;
    productivityRank: number;
    consistencyRank: number;
  };
}

interface ProjectHealth {
  overallScore: number; // 0-100
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
    refactoringRatio: number; // deletions / additions
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
  metrics: any;
}

interface AnalyticsResponse {
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

// Helper function to calculate statistics from commit data
function calculateAdvancedAnalytics(
  commits: any[], 
  contributors: Record<string, any>,
  dateRange: { start: Date; end: Date },
  projectConfig: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }
): AnalyticsResponse {
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const totalWeeks = Math.max(1, totalDays / 7);
  
  // Calculate contributor performances
  const contributorPerformances = calculateContributorPerformances(commits, contributors, totalWeeks, projectConfig);
  
  // Calculate project health
  const projectHealth = calculateProjectHealth(commits, contributors, totalWeeks, dateRange);
  
  // Detect issues
  const detectedIssues = detectProjectIssues(commits, contributors, contributorPerformances, dateRange, projectConfig);
  
  // Generate insights
  const insights = generateInsights(contributorPerformances, projectHealth, detectedIssues);
  
  // Calculate benchmarks
  const benchmarks = calculateBenchmarks(contributors, totalWeeks);
  
  return {
    contributors: contributorPerformances,
    projectHealth,
    detectedIssues,
    insights,
    benchmarks
  };
}

function calculateContributorPerformances(
  commits: any[], 
  contributors: Record<string, any>, 
  totalWeeks: number,
  projectConfig: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }
): ContributorPerformance[] {
  const performances: ContributorPerformance[] = [];
  const contributorNames = Object.keys(contributors);
  
  // Calculate metrics for each contributor
  const contributorMetrics = contributorNames.map(name => {
    const stats = contributors[name];
    const commitsPerWeek = stats.commits / totalWeeks;
    const linesPerCommit = stats.commits > 0 ? (stats.linesAdded + stats.linesDeleted) / stats.commits : 0;
    const filesPerCommit = stats.commits > 0 ? stats.filesChanged / stats.commits : 0;
    
         // Calculate consistency score based on commit distribution
     // Use normalized author names that were applied during processing
     const contributorCommits = commits.filter(c => {
       const normalizedAuthor = normalizeAuthorName(c.author_name, projectConfig);
       return normalizedAuthor === name;
     });
     const consistencyScore = calculateConsistencyScore(contributorCommits, totalWeeks);
    
    return {
      name,
      commitsPerWeek,
      linesPerCommit,
      filesPerCommit,
      consistencyScore,
      totalCommits: stats.commits,
      totalLines: stats.linesAdded + stats.linesDeleted
    };
  });
  
  // Calculate rankings
  const sortedByCommits = [...contributorMetrics].sort((a, b) => b.commitsPerWeek - a.commitsPerWeek);
  const sortedByProductivity = [...contributorMetrics].sort((a, b) => b.linesPerCommit - a.linesPerCommit);
  const sortedByConsistency = [...contributorMetrics].sort((a, b) => b.consistencyScore - a.consistencyScore);
  
  // Calculate averages for comparison
  const avgCommitsPerWeek = contributorMetrics.reduce((sum, c) => sum + c.commitsPerWeek, 0) / contributorMetrics.length;
  const avgLinesPerCommit = contributorMetrics.reduce((sum, c) => sum + c.linesPerCommit, 0) / contributorMetrics.length;
  const avgConsistency = contributorMetrics.reduce((sum, c) => sum + c.consistencyScore, 0) / contributorMetrics.length;
  
  for (const metric of contributorMetrics) {
    // Determine performance rating
    let performanceRating: ContributorPerformance['performanceRating'] = 'average';
    const commitPerformance = metric.commitsPerWeek / avgCommitsPerWeek;
    const productivityPerformance = avgLinesPerCommit > 0 ? metric.linesPerCommit / avgLinesPerCommit : 1;
    const consistencyPerformance = avgConsistency > 0 ? metric.consistencyScore / avgConsistency : 1;
    
    const overallPerformance = (commitPerformance + productivityPerformance + consistencyPerformance) / 3;
    
    if (overallPerformance >= 1.5) performanceRating = 'exceptional';
    else if (overallPerformance >= 1.2) performanceRating = 'above_average';
    else if (overallPerformance >= 0.8) performanceRating = 'average';
    else performanceRating = 'below_average';
    
    // Calculate activity pattern
    let activityPattern: 'regular' | 'burst' | 'irregular' = 'regular';
    if (metric.consistencyScore < 0.3) activityPattern = 'irregular';
    else if (metric.linesPerCommit > avgLinesPerCommit * 2) activityPattern = 'burst';
    
         // Calculate trend (simplified - last 30 days vs previous period)
     const contributorCommits = commits.filter(c => {
       const normalizedAuthor = normalizeAuthorName(c.author_name, projectConfig);
       return normalizedAuthor === metric.name;
     }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
     const trend = calculateTrend(contributorCommits);
    
    performances.push({
      name: metric.name,
      performanceRating,
      productivity: {
        commitsPerWeek: Math.round(metric.commitsPerWeek * 100) / 100,
        linesPerCommit: Math.round(metric.linesPerCommit),
        filesPerCommit: Math.round(metric.filesPerCommit * 100) / 100,
        consistencyScore: Math.round(metric.consistencyScore * 100) / 100,
        activityPattern
      },
      trends: {
        last30Days: trend,
        peakPerformancePeriod: findPeakPeriod(contributorCommits),
        lowPerformancePeriod: findLowPeriod(contributorCommits)
      },
      relativeToPeers: {
        commitRank: sortedByCommits.findIndex(c => c.name === metric.name) + 1,
        productivityRank: sortedByProductivity.findIndex(c => c.name === metric.name) + 1,
        consistencyRank: sortedByConsistency.findIndex(c => c.name === metric.name) + 1
      }
    });
  }
  
  return performances.sort((a, b) => a.relativeToPeers.commitRank - b.relativeToPeers.commitRank);
}

function calculateConsistencyScore(commits: any[], totalWeeks: number): number {
  if (commits.length === 0) return 0;
  
  // Group commits by week
  const weeklyCommits: Record<string, number> = {};
  commits.forEach(commit => {
    const date = new Date(commit.date);
    const weekKey = getWeekKey(date);
    weeklyCommits[weekKey] = (weeklyCommits[weekKey] || 0) + 1;
  });
  
  const weeks = Object.values(weeklyCommits);
  if (weeks.length === 0) return 0;
  
  // Calculate coefficient of variation (lower = more consistent)
  const mean = weeks.reduce((sum, count) => sum + count, 0) / weeks.length;
  const variance = weeks.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / weeks.length;
  const stdDev = Math.sqrt(variance);
  
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 1;
  
  // Convert to consistency score (0-1, higher = more consistent)
  return Math.max(0, 1 - Math.min(1, coefficientOfVariation));
}

function getWeekKey(date: Date): string {
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());
  return startOfWeek.toISOString().split('T')[0];
}

function calculateTrend(commits: any[]): 'improving' | 'declining' | 'stable' {
  if (commits.length < 4) return 'stable';
  
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  
  const recentCommits = commits.filter(c => new Date(c.date) >= thirtyDaysAgo).length;
  const previousCommits = commits.filter(c => new Date(c.date) >= sixtyDaysAgo && new Date(c.date) < thirtyDaysAgo).length;
  
  if (recentCommits > previousCommits * 1.2) return 'improving';
  if (recentCommits < previousCommits * 0.8) return 'declining';
  return 'stable';
}

function findPeakPeriod(commits: any[]): { start: string; end: string; metrics: any } | undefined {
  // Simplified peak detection - find the most active 7-day period
  if (commits.length < 2) return undefined;
  
  let maxActivity = 0;
  let peakStart = '';
  let peakEnd = '';
  
  for (let i = 0; i < commits.length - 1; i++) {
    const startDate = new Date(commits[i].date);
    const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    const activityInPeriod = commits.filter(c => {
      const commitDate = new Date(c.date);
      return commitDate >= startDate && commitDate <= endDate;
    }).length;
    
    if (activityInPeriod > maxActivity) {
      maxActivity = activityInPeriod;
      peakStart = startDate.toISOString().split('T')[0];
      peakEnd = endDate.toISOString().split('T')[0];
    }
  }
  
  return maxActivity > 0 ? { start: peakStart, end: peakEnd, metrics: { commits: maxActivity } } : undefined;
}

function findLowPeriod(commits: any[]): { start: string; end: string; metrics: any } | undefined {
  // Find the longest period without commits
  if (commits.length < 2) return undefined;
  
  let maxGap = 0;
  let gapStart = '';
  let gapEnd = '';
  
  for (let i = 0; i < commits.length - 1; i++) {
    const currentDate = new Date(commits[i].date);
    const nextDate = new Date(commits[i + 1].date);
    const gap = (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (gap > maxGap) {
      maxGap = gap;
      gapStart = currentDate.toISOString().split('T')[0];
      gapEnd = nextDate.toISOString().split('T')[0];
    }
  }
  
  return maxGap > 7 ? { start: gapStart, end: gapEnd, metrics: { daysSilent: Math.round(maxGap) } } : undefined;
}

function calculateProjectHealth(
  commits: any[], 
  contributors: Record<string, any>, 
  totalWeeks: number,
  dateRange: { start: Date; end: Date }
): ProjectHealth {
  const contributorCount = Object.keys(contributors).length;
  const totalCommits = commits.length;
  const currentVelocity = totalCommits / totalWeeks;
  
  // Calculate previous period velocity for trend
  const midPoint = new Date((dateRange.start.getTime() + dateRange.end.getTime()) / 2);
  const recentCommits = commits.filter(c => new Date(c.date) >= midPoint).length;
  const previousCommits = commits.filter(c => new Date(c.date) < midPoint).length;
  
  const recentWeeks = totalWeeks / 2;
  const recentVelocity = recentCommits / recentWeeks;
  const previousVelocity = previousCommits / recentWeeks;
  
  let velocityTrend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let changePercent = 0;
  
  if (previousVelocity > 0) {
    changePercent = ((recentVelocity - previousVelocity) / previousVelocity) * 100;
    if (changePercent > 20) velocityTrend = 'increasing';
    else if (changePercent < -20) velocityTrend = 'decreasing';
  }
  
  // Calculate bus factor (simplified - contributors with >20% of commits)
  const totalContributions = Object.values(contributors).reduce((sum: number, c: any) => sum + c.commits, 0);
  const majorContributors = Object.values(contributors).filter((c: any) => c.commits / totalContributions > 0.2).length;
  const busFactor = Math.max(1, majorContributors);
  
  // Calculate average commit size
  const avgCommitSize = totalCommits > 0 ? 
    Object.values(contributors).reduce((sum: number, c: any) => sum + c.linesAdded + c.linesDeleted, 0) / totalCommits : 0;
  
  // Calculate refactoring ratio
  const totalAdded = Object.values(contributors).reduce((sum: number, c: any) => sum + c.linesAdded, 0);
  const totalDeleted = Object.values(contributors).reduce((sum: number, c: any) => sum + c.linesDeleted, 0);
  const refactoringRatio = totalAdded > 0 ? totalDeleted / totalAdded : 0;
  
  // Calculate overall health score
  let healthScore = 100;
  if (currentVelocity < 1) healthScore -= 20; // Low activity
  if (contributorCount < 2) healthScore -= 30; // Single contributor risk
  if (busFactor === 1) healthScore -= 25; // Bus factor risk
  if (velocityTrend === 'decreasing' && changePercent < -50) healthScore -= 15; // Declining velocity
  if (avgCommitSize > 500) healthScore -= 10; // Large commits
  
  healthScore = Math.max(0, Math.min(100, healthScore));
  
  return {
    overallScore: Math.round(healthScore),
    developmentVelocity: {
      current: Math.round(currentVelocity * 100) / 100,
      trend: velocityTrend,
      changePercent: Math.round(changePercent * 100) / 100
    },
    teamCollaboration: {
      score: Math.round((contributorCount / (contributorCount + 2)) * 100), // Normalized team size score
      activeDevelopers: contributorCount,
      newContributors: 0, // Would need more complex analysis
      busFactor
    },
    codeQuality: {
      averageCommitSize: Math.round(avgCommitSize),
      refactoringRatio: Math.round(refactoringRatio * 100) / 100,
      largeCommitFrequency: commits.filter(c => {
        // Estimate if commit is large (this would need actual line count per commit)
        return false; // Placeholder
      }).length / totalCommits
    }
  };
}

function detectProjectIssues(
  commits: any[], 
  contributors: Record<string, any>, 
  performances: ContributorPerformance[],
  dateRange: { start: Date; end: Date },
  projectConfig: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  const contributorCount = Object.keys(contributors).length;
  const totalCommits = commits.length;
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Check for low activity
  const avgCommitsPerDay = totalCommits / totalDays;
  if (avgCommitsPerDay < 0.1) {
    issues.push({
      type: 'low_activity',
      severity: avgCommitsPerDay < 0.05 ? 'high' : 'medium',
      title: 'Low Development Activity Detected',
      description: `Average of only ${Math.round(avgCommitsPerDay * 100) / 100} commits per day. This may indicate project stagnation or resource constraints.`,
      affectedPeriod: { start: dateRange.start.toISOString().split('T')[0], end: dateRange.end.toISOString().split('T')[0] },
      affectedContributors: [],
      impact: 'Project velocity is significantly below typical development standards',
      suggestions: [
        'Review project priorities and resource allocation',
        'Consider breaking down large tasks into smaller, manageable pieces',
        'Implement daily standups to identify blockers',
        'Analyze if the team needs additional resources or training'
      ],
      metrics: { avgCommitsPerDay, totalCommits, totalDays }
    });
  }
  
  // Check for single contributor dependency
  const totalContributions = Object.values(contributors).reduce((sum: number, c: any) => sum + c.commits, 0);
  const dominantContributor = Object.entries(contributors).find(([_, stats]: [string, any]) => 
    stats.commits / totalContributions > 0.7
  );
  
  if (dominantContributor && contributorCount > 1) {
    issues.push({
      type: 'single_contributor_dependency',
      severity: 'high',
      title: 'High Dependency on Single Developer',
      description: `${dominantContributor[0]} is responsible for ${Math.round((dominantContributor[1].commits / totalContributions) * 100)}% of all commits. This creates a significant bus factor risk.`,
      affectedPeriod: { start: dateRange.start.toISOString().split('T')[0], end: dateRange.end.toISOString().split('T')[0] },
      affectedContributors: [dominantContributor[0]],
      impact: 'Critical knowledge and development capacity concentrated in one person',
      suggestions: [
        'Implement pair programming sessions',
        'Create comprehensive documentation',
        'Cross-train team members on critical components',
        'Encourage code reviews and knowledge sharing',
        'Consider distributing responsibilities more evenly'
      ],
      metrics: { dominantContributorPercentage: dominantContributor[1].commits / totalContributions }
    });
  }
  
  // Check for irregular commit patterns
  const irregularContributors = performances.filter(p => p.productivity.activityPattern === 'irregular');
  if (irregularContributors.length > contributorCount * 0.5) {
    issues.push({
      type: 'irregular_commits',
      severity: 'medium',
      title: 'Irregular Development Patterns',
      description: `${irregularContributors.length} out of ${contributorCount} contributors show irregular commit patterns, which may indicate workflow issues or lack of consistent development practices.`,
      affectedPeriod: { start: dateRange.start.toISOString().split('T')[0], end: dateRange.end.toISOString().split('T')[0] },
      affectedContributors: irregularContributors.map(c => c.name),
      impact: 'Unpredictable development flow may affect project planning and delivery',
      suggestions: [
        'Establish regular development schedules',
        'Implement sprint planning and retrospectives',
        'Provide guidance on optimal commit frequency',
        'Consider workflow automation tools',
        'Address potential blockers or distractions'
      ],
      metrics: { irregularContributorCount: irregularContributors.length, totalContributors: contributorCount }
    });
  }
  
  // Check for declining performance
  const decliningContributors = performances.filter(p => p.trends.last30Days === 'declining');
  if (decliningContributors.length > 0) {
    issues.push({
      type: 'team_shrinking',
      severity: decliningContributors.length > contributorCount * 0.3 ? 'high' : 'medium',
      title: 'Declining Developer Activity',
      description: `${decliningContributors.length} contributors show declining activity in the last 30 days, which may indicate burnout, changing priorities, or other issues.`,
      affectedPeriod: { 
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        end: new Date().toISOString().split('T')[0] 
      },
      affectedContributors: decliningContributors.map(c => c.name),
      impact: 'Reduced team capacity may affect project delivery timelines',
      suggestions: [
        'Conduct one-on-one meetings with affected developers',
        'Review workload distribution and priorities',
        'Address potential burnout or motivation issues',
        'Consider temporary resource reallocation',
        'Investigate external factors affecting productivity'
      ],
      metrics: { decliningContributorCount: decliningContributors.length }
    });
  }
  
  return issues;
}

function generateInsights(
  performances: ContributorPerformance[], 
  health: ProjectHealth, 
  issues: DetectedIssue[]
): { keyFindings: string[]; recommendations: string[]; riskFactors: string[] } {
  const keyFindings: string[] = [];
  const recommendations: string[] = [];
  const riskFactors: string[] = [];
  
  // Key findings
  const topPerformer = performances.find(p => p.performanceRating === 'exceptional');
  if (topPerformer) {
    keyFindings.push(`${topPerformer.name} is the top performer with exceptional productivity (${topPerformer.productivity.commitsPerWeek} commits/week)`);
  }
  
  const belowAverageCount = performances.filter(p => p.performanceRating === 'below_average').length;
  if (belowAverageCount > 0) {
    keyFindings.push(`${belowAverageCount} contributors performing below average may need additional support`);
  }
  
  keyFindings.push(`Project health score: ${health.overallScore}/100 with ${health.developmentVelocity.trend} velocity trend`);
  
  // Recommendations
  if (health.overallScore < 70) {
    recommendations.push('Focus on improving overall project health through better resource allocation and process optimization');
  }
  
  if (health.teamCollaboration.busFactor <= 2) {
    recommendations.push('Implement knowledge sharing practices to reduce dependency on key contributors');
  }
  
  if (health.developmentVelocity.trend === 'decreasing') {
    recommendations.push('Investigate causes of declining velocity and implement corrective measures');
  }
  
  // Risk factors
  if (issues.some(i => i.severity === 'high' || i.severity === 'critical')) {
    riskFactors.push('Critical issues detected that may significantly impact project delivery');
  }
  
  if (health.teamCollaboration.busFactor === 1) {
    riskFactors.push('Single point of failure: project depends heavily on one developer');
  }
  
  if (performances.filter(p => p.trends.last30Days === 'declining').length > performances.length * 0.3) {
    riskFactors.push('Team capacity declining: multiple developers showing reduced activity');
  }
  
  return { keyFindings, recommendations, riskFactors };
}

function calculateBenchmarks(contributors: Record<string, any>, totalWeeks: number) {
  const contributorStats = Object.values(contributors);
  const totalCommits = contributorStats.reduce((sum: number, c: any) => sum + c.commits, 0);
  const totalLines = contributorStats.reduce((sum: number, c: any) => sum + c.linesAdded + c.linesDeleted, 0);
  const totalFiles = contributorStats.reduce((sum: number, c: any) => sum + c.filesChanged, 0);
  
  return {
    averageCommitsPerWeek: Math.round((totalCommits / totalWeeks) * 100) / 100,
    averageLinesPerCommit: totalCommits > 0 ? Math.round(totalLines / totalCommits) : 0,
    averageFilesPerCommit: totalCommits > 0 ? Math.round((totalFiles / totalCommits) * 100) / 100 : 0,
    teamProductivityScore: Math.min(100, Math.round((totalCommits / totalWeeks) * 10)) // Simplified score
  };
}

// Main API function to parse git log and calculate analytics
// Helper function to load project configuration
async function loadProjectConfig(git: SimpleGit, repoPath: string): Promise<{ groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }> {
  try {
    // Try to get GitHub repository name first
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(remote => remote.name === 'origin');
    
    let safeName: string;
    if (origin && origin.refs.fetch) {
      let url = origin.refs.fetch;
      if (url.startsWith('git@github.com:')) {
        url = url.replace('git@github.com:', 'https://github.com/');
      }
      if (url.endsWith('.git')) {
        url = url.slice(0, -4);
      }
      const match = url.match(/https:\/\/github\.com\/([^\/]+\/[^\/]+)$/);
      if (match) {
        safeName = match[1].replace(/[^a-zA-Z0-9\-]/g, '_');
      } else {
        safeName = repoPath.replace(/[^a-zA-Z0-9]/g, '_');
      }
    } else {
      safeName = repoPath.replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    const configDir = path.join(process.cwd(), 'configs');
    const configFilePath = path.join(configDir, `${safeName}_config.json`);
    
    try {
      const configData = await fs.promises.readFile(configFilePath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      // Return default config if file doesn't exist
      return { groupedAuthors: [], excludedUsers: [] };
    }
  } catch (error) {
    console.warn('Could not load project configuration:', error);
    return { groupedAuthors: [], excludedUsers: [] };
  }
}

// Helper function to normalize author name based on project configuration
function normalizeAuthorName(authorName: string, config: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }): string {
  // Check if author is in excluded users
  if (config.excludedUsers.includes(authorName)) {
    return ''; // Return empty string to exclude
  }
  
  // Check if author is an alias in grouped authors
  for (const group of config.groupedAuthors) {
    if (group.aliases.includes(authorName)) {
      return group.primaryName;
    }
  }
  
  return authorName;
}

async function parseGitLogForAnalytics(git: SimpleGit, repoPath: string, options?: { from?: string; to?: string }): Promise<AnalyticsResponse> {
  const logOptions: Record<string, string | null> = {
    '--all': null,
    '--no-merges': null,
    '--numstat': null,
    '--date': 'iso-strict',
  };

  if (options?.from) logOptions['--since'] = options.from;
  if (options?.to) logOptions['--until'] = options.to;

  const log: LogResult<any> = await git.log(logOptions);
  
  // Load project configuration
  const projectConfig = await loadProjectConfig(git, repoPath);
  
  // Process commits similar to existing route.ts but collect more data
  const contributors: Record<string, any> = {};
  const commits: any[] = [];
  
  let startDate = new Date();
  let endDate = new Date(0);
  
  for (const commit of log.all) {
    const commitDate = new Date(commit.date);
    if (commitDate < startDate) startDate = commitDate;
    if (commitDate > endDate) endDate = commitDate;
    
    // Apply project configuration to normalize author name
    const normalizedAuthor = normalizeAuthorName(commit.author_name, projectConfig);
    
    // Skip commits from excluded users
    if (normalizedAuthor === '') {
      continue;
    }
    
    commits.push(commit);
    
    const author = normalizedAuthor;
    if (!contributors[author]) {
      contributors[author] = { commits: 0, linesAdded: 0, linesDeleted: 0, filesChanged: 0 };
    }
    contributors[author].commits++;
    
    // Process diff stats
    if (commit.diff && commit.diff.files) {
      commit.diff.files.forEach((fileChange: any) => {
        if (typeof fileChange.insertions === 'number' && typeof fileChange.deletions === 'number') {
          contributors[author].linesAdded += fileChange.insertions;
          contributors[author].linesDeleted += fileChange.deletions;
          contributors[author].filesChanged++;
        }
      });
    } else if (commit.body) {
      // Fallback parsing
      const lines = commit.body.trim().split('\n');
      lines.forEach((line: string) => {
        const parts = line.split('\t');
        if (parts.length === 3) {
          const added = parseInt(parts[0], 10);
          const deleted = parseInt(parts[1], 10);
          if (!isNaN(added) && !isNaN(deleted)) {
            contributors[author].linesAdded += added;
            contributors[author].linesDeleted += deleted;
            contributors[author].filesChanged++;
          }
        }
      });
    }
  }
  
  const dateRange = { start: startDate, end: endDate };
  return calculateAdvancedAnalytics(commits, contributors, dateRange, projectConfig);
}

export async function POST(req: NextRequest) {
  try {
    const { repoPath, filters } = await req.json();

    if (!repoPath || typeof repoPath !== 'string') {
      return NextResponse.json({ error: 'Invalid repository path provided' }, { status: 400 });
    }

    // Security check
    const resolvedPath = path.resolve(repoPath);
    if (!fs.existsSync(resolvedPath) || !fs.lstatSync(resolvedPath).isDirectory()) {
      return NextResponse.json({ error: 'Path does not exist or is not a directory' }, { status: 400 });
    }

    const git = simpleGit(resolvedPath);
    const isRepo = await git.checkIsRepo();

    if (!isRepo) {
      return NextResponse.json({ error: 'Not a valid Git repository' }, { status: 400 });
    }

    // Apply filters
    const logOptions: { from?: string; to?: string } = {};
    if (filters?.startDate) logOptions.from = filters.startDate;
    if (filters?.endDate) logOptions.to = filters.endDate;

    const analytics = await parseGitLogForAnalytics(git, repoPath, logOptions);

    return NextResponse.json(analytics);

  } catch (error: unknown) {
    console.error('Error fetching analytics:', error);
    let errorMessage = 'Failed to fetch analytics';
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        errorMessage = 'Repository path not found or inaccessible.';
      } else if (error.message.includes('Not a git repository')) {
        errorMessage = 'The specified path is not a valid Git repository.';
      }
    }
    return NextResponse.json({ 
      error: errorMessage, 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 