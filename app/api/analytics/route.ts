import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit } from 'simple-git';

// Define proper types for commit data
interface CommitData {
  hash: string;
  author: string;
  date: string;
  message: string;
  body?: string;
  diff?: {
    files: Array<{
      file: string;
      changes: number;
      insertions: number;
      deletions: number;
    }>;
  };
}

interface ContributorData {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
}

interface PerformanceMetrics {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
  date: string;
}

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
  metrics: PerformanceMetrics;
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
  commits: CommitData[], 
  contributors: Record<string, ContributorData>,
  dateRange: { start: Date; end: Date }
): AnalyticsResponse {
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  const totalWeeks = totalDays / 7;
  
  console.log('calculateAdvancedAnalytics debug:', {
    commitsCount: commits.length,
    contributorsCount: Object.keys(contributors).length,
    totalDays,
    totalWeeks,
    dateRange
  });
  
  // Calculate contributor performances
  const contributorPerformances = calculateContributorPerformances(commits, contributors, totalWeeks);
  
  // Calculate project health
  const projectHealth = calculateProjectHealth(commits, contributors, totalWeeks);
  
  // Detect issues
  const detectedIssues = detectProjectIssues(commits, contributors, contributorPerformances, dateRange);
  
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
  commits: CommitData[], 
  contributors: Record<string, ContributorData>, 
  totalWeeks: number
): ContributorPerformance[] {
  const performances: ContributorPerformance[] = [];
  
  // Calculate performances for each contributor (already filtered and normalized)
  for (const [contributorName, stats] of Object.entries(contributors)) {
    const userCommits = commits.filter(c => c.author === contributorName);
    
    const commitsPerWeek = totalWeeks > 0 ? Math.round((stats.commits / totalWeeks) * 100) / 100 : 0;
    const linesPerCommit = stats.commits > 0 ? Math.round(((stats.linesAdded + stats.linesDeleted) / stats.commits) * 100) / 100 : 0;
    const filesPerCommit = stats.commits > 0 ? Math.round((stats.filesChanged / stats.commits) * 100) / 100 : 0;
    const consistencyScore = Math.round(calculateConsistencyScore(userCommits, totalWeeks) * 100) / 100;
    
    // Determine activity pattern
    const activityPattern = determineActivityPattern(userCommits, totalWeeks);
    
    // Calculate trends
    const last30Days = calculateTrend(userCommits);
    const peakPeriod = findPeakPeriod(userCommits);
    const lowPeriod = findLowPeriod(userCommits);
    
    // Determine performance rating
    const performanceRating = determinePerformanceRating(commitsPerWeek, linesPerCommit, consistencyScore);
    
    // Debug logging for performance calculation
    console.log(`Performance calculation for ${contributorName}:`, {
      commitsPerWeek,
      linesPerCommit,
      consistencyScore,
      performanceRating,
      totalWeeks
    });
    
    performances.push({
      name: contributorName,
      performanceRating,
      productivity: {
        commitsPerWeek,
        linesPerCommit,
        filesPerCommit,
        consistencyScore,
        activityPattern
      },
      trends: {
        last30Days,
        peakPerformancePeriod: peakPeriod,
        lowPerformancePeriod: lowPeriod
      },
      relativeToPeers: {
        commitRank: 1, // Will be calculated after all performances are computed
        productivityRank: 1, // Will be calculated after all performances are computed
        consistencyRank: 1 // Will be calculated after all performances are computed
      }
    });
  }
  
  // Calculate rankings after all performances are computed
  if (performances.length > 1) {
    // Sort by commits per week for commit rank
    const sortedByCommits = [...performances].sort((a, b) => b.productivity.commitsPerWeek - a.productivity.commitsPerWeek);
    
    // Sort by lines per commit for productivity rank
    const sortedByProductivity = [...performances].sort((a, b) => b.productivity.linesPerCommit - a.productivity.linesPerCommit);
    
    // Sort by consistency score for consistency rank
    const sortedByConsistency = [...performances].sort((a, b) => b.productivity.consistencyScore - a.productivity.consistencyScore);
    
    // Update rankings
    performances.forEach(performance => {
      const commitRank = sortedByCommits.findIndex(p => p.name === performance.name) + 1;
      const productivityRank = sortedByProductivity.findIndex(p => p.name === performance.name) + 1;
      const consistencyRank = sortedByConsistency.findIndex(p => p.name === performance.name) + 1;
      
      performance.relativeToPeers = {
        commitRank,
        productivityRank,
        consistencyRank
      };
    });
  }
  
  return performances;
}

function determineActivityPattern(commits: CommitData[], totalWeeks: number): 'regular' | 'burst' | 'irregular' {
  if (commits.length === 0) return 'irregular';
  
  // Simple heuristic: if commits are spread across weeks, it's regular
  const weeksWithCommits = new Set(commits.map(c => getWeekKey(new Date(c.date))));
  const regularityRatio = weeksWithCommits.size / Math.max(1, totalWeeks);
  
  if (regularityRatio > 0.7) return 'regular';
  if (regularityRatio > 0.3) return 'burst';
  return 'irregular';
}

function determinePerformanceRating(commitsPerWeek: number, linesPerCommit: number, consistencyScore: number): 'below_average' | 'average' | 'above_average' | 'exceptional' {
  // Normalize values to a 0-10 scale for better comparison
  const normalizedCommitsPerWeek = Math.min(10, commitsPerWeek * 2); // Scale: 0-5 commits/week = 0-10
  const normalizedLinesPerCommit = Math.min(10, linesPerCommit / 50); // Scale: 0-500 lines/commit = 0-10
  const normalizedConsistencyScore = Math.min(10, Math.max(0, consistencyScore)); // Already 0-10 scale
  
  // Calculate weighted score
  const score = (normalizedCommitsPerWeek * 0.4) + (normalizedLinesPerCommit * 0.3) + (normalizedConsistencyScore * 0.3);
  
  // More reasonable thresholds based on normalized 0-10 scale
  if (score >= 8) return 'exceptional';
  if (score >= 6) return 'above_average';
  if (score >= 4) return 'average';
  return 'below_average';
}

function calculateConsistencyScore(commits: CommitData[], totalWeeks: number): number {
  if (commits.length === 0 || totalWeeks <= 0) return 0;
  
  // Calculate standard deviation of commits per week
  const commitsByWeek = new Map<string, number>();
  
  for (const commit of commits) {
    const weekKey = getWeekKey(new Date(commit.date));
    commitsByWeek.set(weekKey, (commitsByWeek.get(weekKey) || 0) + 1);
  }
  
  const commitCounts = Array.from(commitsByWeek.values());
  
  // Handle edge cases
  if (commitCounts.length === 0) return 0;
  if (commitCounts.length === 1) return 10; // Perfect consistency if only one week
  
  const mean = commitCounts.reduce((sum, count) => sum + count, 0) / commitCounts.length;
  const variance = commitCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / commitCounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate consistency score: higher consistency = lower standard deviation
  // Use a more sophisticated formula that considers the mean and standard deviation
  const coefficientOfVariation = mean > 0 ? stdDev / mean : 0;
  
  // Convert to a 0-10 scale where:
  // - 0 = very inconsistent (high CV)
  // - 10 = very consistent (low CV)
  const consistencyScore = Math.max(0, 10 - (coefficientOfVariation * 10));
  
  return Math.round(consistencyScore * 100) / 100; // Round to 2 decimal places
}

function getWeekKey(date: Date): string {
  const year = date.getFullYear();
  const week = Math.ceil((date.getTime() - new Date(year, 0, 1).getTime()) / (1000 * 60 * 60 * 24 * 7));
  return `${year}-W${week.toString().padStart(2, '0')}`;
}

function calculateTrend(commits: CommitData[]): 'improving' | 'declining' | 'stable' {
  if (commits.length < 2) return 'stable';
  
  // Simple trend calculation based on recent vs older commits
  const sortedCommits = commits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const midPoint = Math.floor(sortedCommits.length / 2);
  const recentCommits = sortedCommits.slice(midPoint);
  const olderCommits = sortedCommits.slice(0, midPoint);
  
  const recentAvg = recentCommits.length > 0 ? recentCommits.length : 0;
  const olderAvg = olderCommits.length > 0 ? olderCommits.length : 0;
  
  if (recentAvg > olderAvg * 1.2) return 'improving';
  if (recentAvg < olderAvg * 0.8) return 'declining';
  return 'stable';
}

function findPeakPeriod(commits: CommitData[]): { start: string; end: string; metrics: PerformanceMetrics } | undefined {
  if (commits.length === 0) return undefined;
  
  // Find the week with most commits
  const commitsByWeek = new Map<string, CommitData[]>();
  
  for (const commit of commits) {
    const weekKey = getWeekKey(new Date(commit.date));
    if (!commitsByWeek.has(weekKey)) {
      commitsByWeek.set(weekKey, []);
    }
    commitsByWeek.get(weekKey)!.push(commit);
  }
  
  let maxCommits = 0;
  let peakWeek = '';
  
  for (const [week, weekCommits] of commitsByWeek) {
    if (weekCommits.length > maxCommits) {
      maxCommits = weekCommits.length;
      peakWeek = week;
    }
  }
  
  if (peakWeek) {
    const peakCommits = commitsByWeek.get(peakWeek)!;
    const totalLines = peakCommits.reduce((sum, commit) => {
      const diff = commit.diff;
      if (diff) {
        return sum + diff.files.reduce((fileSum, file) => fileSum + file.insertions + file.deletions, 0);
      }
      return sum;
    }, 0);
    
    return {
      start: peakCommits[0].date,
      end: peakCommits[peakCommits.length - 1].date,
      metrics: {
        commits: peakCommits.length,
        linesAdded: totalLines,
        linesDeleted: 0,
        filesChanged: peakCommits.reduce((sum, commit) => {
          const diff = commit.diff;
          return sum + (diff ? diff.files.length : 0);
        }, 0),
        date: peakCommits[0].date
      }
    };
  }
  
  return undefined;
}

function findLowPeriod(commits: CommitData[]): { start: string; end: string; metrics: PerformanceMetrics } | undefined {
  if (commits.length === 0) return undefined;
  
  // Find the week with least commits
  const commitsByWeek = new Map<string, CommitData[]>();
  
  for (const commit of commits) {
    const weekKey = getWeekKey(new Date(commit.date));
    if (!commitsByWeek.has(weekKey)) {
      commitsByWeek.set(weekKey, []);
    }
    commitsByWeek.get(weekKey)!.push(commit);
  }
  
  let minCommits = Infinity;
  let lowWeek = '';
  
  for (const [week, weekCommits] of commitsByWeek) {
    if (weekCommits.length < minCommits) {
      minCommits = weekCommits.length;
      lowWeek = week;
    }
  }
  
  if (lowWeek && minCommits > 0) {
    const lowCommits = commitsByWeek.get(lowWeek)!;
    return {
      start: lowCommits[0].date,
      end: lowCommits[lowCommits.length - 1].date,
      metrics: {
        commits: lowCommits.length,
        linesAdded: 0,
        linesDeleted: 0,
        filesChanged: 0,
        date: lowCommits[0].date
      }
    };
  }
  
  return undefined;
}

function calculateProjectHealth(
  commits: CommitData[], 
  contributors: Record<string, ContributorData>, 
  totalWeeks: number
): ProjectHealth {
  // Count unique contributors (already filtered and normalized)
  const activeDevelopers = Object.keys(contributors).length;
  const totalCommits = commits.length;
  const totalLines = commits.reduce((sum, commit) => {
    const diff = commit.diff;
    if (diff) {
      return sum + diff.files.reduce((fileSum, file) => fileSum + file.insertions + file.deletions, 0);
    }
    return sum;
  }, 0);
  
  const averageCommitSize = totalCommits > 0 ? Math.round((totalLines / totalCommits) * 100) / 100 : 0;
  const refactoringRatio = Math.round(commits.reduce((sum, commit) => {
    const diff = commit.diff;
    if (diff) {
      const deletions = diff.files.reduce((fileSum, file) => fileSum + file.deletions, 0);
      const insertions = diff.files.reduce((fileSum, file) => fileSum + file.insertions, 0);
      return sum + (deletions / Math.max(1, insertions));
    }
    return sum;
  }, 0) / Math.max(1, totalCommits) * 100) / 100;
  
  const largeCommits = commits.filter(commit => {
    const diff = commit.diff;
    if (diff) {
      const totalChanges = diff.files.reduce((sum, file) => sum + file.insertions + file.deletions, 0);
      return totalChanges > 500; // Large commit threshold
    }
    return false;
  }).length;
  
  const largeCommitFrequency = totalCommits > 0 ? Math.round((largeCommits / totalCommits) * 100) / 100 : 0;
  
  // Calculate development velocity with proper trend analysis
  const currentVelocity = totalWeeks > 0 ? Math.round((totalCommits / totalWeeks) * 100) / 100 : 0;
  
  console.log('calculateProjectHealth debug:', {
    activeDevelopers,
    totalCommits,
    totalLines,
    averageCommitSize,
    refactoringRatio,
    largeCommits,
    largeCommitFrequency,
    currentVelocity,
    totalWeeks
  });
  
  // Calculate trend by comparing first half vs second half of commits
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  let changePercent = 0;
  
  if (commits.length >= 4) {
    const sortedCommits = commits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const midPoint = Math.floor(sortedCommits.length / 2);
    const firstHalf = sortedCommits.slice(0, midPoint);
    const secondHalf = sortedCommits.slice(midPoint);
    
    const firstHalfWeeks = Math.max(1, (new Date(firstHalf[firstHalf.length - 1].date).getTime() - new Date(firstHalf[0].date).getTime()) / (1000 * 60 * 60 * 24 * 7));
    const secondHalfWeeks = Math.max(1, (new Date(secondHalf[secondHalf.length - 1].date).getTime() - new Date(secondHalf[0].date).getTime()) / (1000 * 60 * 60 * 24 * 7));
    
    const firstHalfVelocity = firstHalfWeeks > 0 ? Math.round((firstHalf.length / firstHalfWeeks) * 100) / 100 : 0;
    const secondHalfVelocity = secondHalfWeeks > 0 ? Math.round((secondHalf.length / secondHalfWeeks) * 100) / 100 : 0;
    
    if (firstHalfVelocity > 0) {
      changePercent = Math.round(((secondHalfVelocity - firstHalfVelocity) / firstHalfVelocity) * 100) / 100;
      
      if (changePercent > 20) {
        trend = 'increasing';
      } else if (changePercent < -20) {
        trend = 'decreasing';
      } else {
        trend = 'stable';
      }
    }
  }
  
  // Calculate bus factor (number of contributors with >20% of total commits)
  const contributorPercentages = Object.entries(contributors).map(([name, stats]) => ({
    name,
    percentage: Math.round((stats.commits / totalCommits) * 100) / 100
  }));
  
  const criticalContributors = contributorPercentages.filter(c => c.percentage > 20);
  const busFactor = criticalContributors.length;
  
  // Calculate team collaboration score (more sophisticated)
  const teamCollaborationScore = Math.min(100, 
    Math.max(0, (activeDevelopers * 15) + (busFactor * 10) + (Math.max(0, 10 - largeCommitFrequency * 100) * 5))
  );
  
  // Calculate new contributors (contributors who started in the last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const newContributors = Object.entries(contributors).filter(([name]) => {
    // Find the first commit by this contributor
    const contributorCommits = commits.filter(c => c.author === name);
    if (contributorCommits.length === 0) return false;
    
    // Sort commits by date and check if first commit was within last 30 days
    const sortedCommits = contributorCommits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstCommitDate = new Date(sortedCommits[0].date);
    
    return firstCommitDate >= thirtyDaysAgo;
  }).length;
  
  // Calculate overall score with better weighting
  let overallScore = 100; // Start with perfect score
  
  // Deduct for low activity
  if (currentVelocity < 1) overallScore -= 20;
  else if (currentVelocity < 2) overallScore -= 10;
  
  // Deduct for single contributor risk
  if (activeDevelopers <= 1) overallScore -= 30;
  else if (activeDevelopers <= 2) overallScore -= 15;
  
  // Deduct for critical bus factor
  if (busFactor <= 1) overallScore -= 25;
  else if (busFactor <= 2) overallScore -= 10;
  
  // Deduct for declining velocity
  if (trend === 'decreasing' && changePercent < -50) overallScore -= 15;
  else if (trend === 'decreasing') overallScore -= 5;
  
  // Deduct for large commits
  if (averageCommitSize > 500) overallScore -= 10;
  else if (averageCommitSize > 200) overallScore -= 5;
  
  // Bonus for increasing velocity
  if (trend === 'increasing' && changePercent > 20) overallScore += 10;
  
  return {
    overallScore: Math.max(0, Math.min(100, overallScore)),
    developmentVelocity: {
      current: currentVelocity,
      trend,
      changePercent
    },
    teamCollaboration: {
      score: teamCollaborationScore,
      activeDevelopers,
      newContributors,
      busFactor
    },
    codeQuality: {
      averageCommitSize,
      refactoringRatio,
      largeCommitFrequency
    }
  };
}

function detectProjectIssues(
  commits: CommitData[], 
  contributors: Record<string, ContributorData>, 
  performances: ContributorPerformance[],
  dateRange: { start: Date; end: Date }
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  
  // Check for low activity
  const totalCommits = commits.length;
  const totalWeeks = Math.max(1, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  const commitsPerWeek = Math.round((totalCommits / totalWeeks) * 100) / 100;
  
  if (commitsPerWeek < 2) {
    // Calculate actual metrics for the affected period
    const affectedCommits = commits.filter(commit => {
      const commitDate = new Date(commit.date);
      return commitDate >= dateRange.start && commitDate <= dateRange.end;
    });
    
    const totalLinesAdded = affectedCommits.reduce((sum, commit) => {
      const diff = commit.diff;
      if (diff) {
        return sum + diff.files.reduce((fileSum, file) => fileSum + file.insertions, 0);
      }
      return sum;
    }, 0);
    
    const totalLinesDeleted = affectedCommits.reduce((sum, commit) => {
      const diff = commit.diff;
      if (diff) {
        return sum + diff.files.reduce((fileSum, file) => fileSum + file.deletions, 0);
      }
      return sum;
    }, 0);
    
    const totalFilesChanged = affectedCommits.reduce((sum, commit) => {
      const diff = commit.diff;
      if (diff) {
        return sum + diff.files.length;
      }
      return sum;
    }, 0);
    
    issues.push({
      type: 'low_activity',
      severity: commitsPerWeek < 1 ? 'critical' : 'high',
      title: 'Low Development Activity',
      description: `Project shows very low commit activity with only ${commitsPerWeek.toFixed(1)} commits per week`,
      affectedPeriod: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() },
      affectedContributors: Object.keys(contributors),
      impact: 'Project may be stalled or abandoned',
      suggestions: ['Schedule regular development sessions', 'Set up automated reminders', 'Review project priorities'],
      metrics: {
        commits: totalCommits,
        linesAdded: totalLinesAdded,
        linesDeleted: totalLinesDeleted,
        filesChanged: totalFilesChanged,
        date: dateRange.start.toISOString()
      }
    });
  }
  
  // Check for single contributor dependency
  const contributorCount = Object.keys(contributors).length;
  if (contributorCount === 1) {
    const contributor = Object.keys(contributors)[0];
    issues.push({
      type: 'single_contributor_dependency',
      severity: 'critical',
      title: 'Single Contributor Dependency',
      description: `Project depends entirely on ${contributor} for development`,
      affectedPeriod: { start: dateRange.start.toISOString(), end: dateRange.end.toISOString() },
      affectedContributors: [contributor],
      impact: 'High risk of project abandonment if contributor leaves',
      suggestions: ['Onboard additional developers', 'Document processes thoroughly', 'Consider pair programming'],
      metrics: {
        commits: contributors[contributor].commits,
        linesAdded: contributors[contributor].linesAdded,
        linesDeleted: contributors[contributor].linesDeleted,
        filesChanged: contributors[contributor].filesChanged,
        date: dateRange.start.toISOString()
      }
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
  
  console.log('generateInsights debug:', {
    performancesCount: performances.length,
    healthScore: health.overallScore,
    issuesCount: issues.length,
    activeDevelopers: health.teamCollaboration.activeDevelopers,
    busFactor: health.teamCollaboration.busFactor,
    velocityTrend: health.developmentVelocity.trend,
    avgCommitSize: health.codeQuality.averageCommitSize
  });
  
  // Generate insights based on project health
  if (health.overallScore < 50) {
    keyFindings.push('Project health score is below average');
    recommendations.push('Focus on improving development velocity and team collaboration');
  } else if (health.overallScore >= 80) {
    keyFindings.push('Project health score is excellent');
    recommendations.push('Maintain current development practices and consider sharing best practices');
  } else {
    keyFindings.push('Project health score is good with room for improvement');
    recommendations.push('Focus on specific areas to reach excellent health status');
  }
  
  // Analyze team collaboration
  if (health.teamCollaboration.activeDevelopers <= 1) {
    keyFindings.push('Single developer project detected');
    recommendations.push('Consider expanding the team or implementing knowledge sharing practices');
  } else if (health.teamCollaboration.activeDevelopers >= 5) {
    keyFindings.push('Strong team collaboration with multiple active developers');
    recommendations.push('Leverage team diversity for better code quality and knowledge distribution');
  }
  
  // Analyze development velocity
  if (health.developmentVelocity.trend === 'increasing') {
    keyFindings.push('Development velocity is improving');
    recommendations.push('Maintain momentum and consider scaling successful practices');
  } else if (health.developmentVelocity.trend === 'decreasing') {
    keyFindings.push('Development velocity is declining');
    recommendations.push('Investigate bottlenecks and implement process improvements');
  } else {
    keyFindings.push('Development velocity is stable');
    recommendations.push('Consider optimization opportunities to increase productivity');
  }
  
  // Analyze code quality
  if (health.codeQuality.averageCommitSize > 100) {
    keyFindings.push('Large commit sizes detected');
    recommendations.push('Consider smaller, more frequent commits for better code review');
  } else if (health.codeQuality.averageCommitSize < 20) {
    keyFindings.push('Small, focused commits detected');
    recommendations.push('Good practice! Continue with granular commit strategy');
  }
  
  // Analyze contributor performance
  const exceptionalContributors = performances.filter(p => p.performanceRating === 'exceptional').length;
  const belowAverageContributors = performances.filter(p => p.performanceRating === 'below_average').length;
  
  if (exceptionalContributors > 0) {
    keyFindings.push(`${exceptionalContributors} exceptional contributor(s) identified`);
    recommendations.push('Leverage exceptional contributors for mentoring and best practices');
  }
  
  if (belowAverageContributors > 0) {
    keyFindings.push(`${belowAverageContributors} contributor(s) performing below average`);
    recommendations.push('Provide additional support and training for struggling contributors');
  }
  
  // Add insights about detected issues
  if (issues.length > 0) {
    keyFindings.push(`${issues.length} critical issues detected`);
    recommendations.push('Address detected issues to improve project health');
  } else {
    keyFindings.push('No critical issues detected in the project');
    recommendations.push('Continue monitoring to maintain high project quality');
  }
  
  // Calculate bus factor risk based on number of contributors and their distribution
  const contributorCount = performances.length;
  const criticalBusFactorThreshold = Math.max(2, Math.ceil(contributorCount * 0.3)); // At least 2, or 30% of contributors
  
  if (health.teamCollaboration.busFactor < criticalBusFactorThreshold) {
    riskFactors.push('High bus factor risk - project depends on few contributors');
  } else {
    keyFindings.push('Good bus factor - project has healthy knowledge distribution');
  }
  
  // Add general productivity insights
  const totalContributors = performances.length;
  if (totalContributors > 0) {
    const avgCommitsPerWeek = performances.reduce((sum, p) => sum + p.productivity.commitsPerWeek, 0) / totalContributors;
    if (avgCommitsPerWeek > 5) {
      keyFindings.push('High team activity with frequent commits');
      recommendations.push('Ensure code quality doesn\'t suffer from rapid development');
    } else if (avgCommitsPerWeek < 1) {
      keyFindings.push('Low team activity detected');
      recommendations.push('Consider ways to increase development momentum');
    }
  }
  
  // Ensure we always have at least some insights
  if (keyFindings.length === 0) {
    keyFindings.push('Project analysis completed successfully');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('Continue monitoring project metrics for ongoing improvement');
  }
  
  console.log('Generated insights:', { keyFindings, recommendations, riskFactors });
  
  return { keyFindings, recommendations, riskFactors };
}

function calculateBenchmarks(
  contributors: Record<string, ContributorData>, 
  totalWeeks: number
) {
  const totalCommits = Object.values(contributors).reduce((sum, stats) => sum + stats.commits, 0);
  const totalLines = Object.values(contributors).reduce((sum, stats) => sum + stats.linesAdded + stats.linesDeleted, 0);
  const totalFiles = Object.values(contributors).reduce((sum, stats) => sum + stats.filesChanged, 0);
  
  return {
    averageCommitsPerWeek: totalWeeks > 0 ? Math.round((totalCommits / totalWeeks) * 100) / 100 : 0,
    averageLinesPerCommit: totalCommits > 0 ? Math.round((totalLines / totalCommits) * 100) / 100 : 0,
    averageFilesPerCommit: totalCommits > 0 ? Math.round((totalFiles / totalCommits) * 100) / 100 : 0,
    teamProductivityScore: Math.min(100, Math.round((totalCommits / Math.max(1, totalWeeks)) * 10) / 10)
  };
}

async function loadProjectConfig(git: SimpleGit, repoPath: string): Promise<{ groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/project-config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: 'load',
        repoPath 
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.config || { groupedAuthors: [], excludedUsers: [] };
    }
  } catch (error) {
    console.warn('Failed to load project configuration:', error);
  }
  
  return {
    groupedAuthors: [],
    excludedUsers: []
  };
}

function normalizeAuthorName(authorName: string, config: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }): string {
  // Check if author is in excluded users
  if (config.excludedUsers.includes(authorName)) {
    return ''; // Return empty string to exclude
  }
  
  // Check if author is in grouped authors
  for (const group of config.groupedAuthors) {
    if (group.aliases.includes(authorName)) {
      return group.primaryName;
    }
  }
  
  return authorName;
}

async function parseGitLogForAnalytics(git: SimpleGit, repoPath: string, options?: { from?: string; to?: string; author?: string }): Promise<AnalyticsResponse> {
  try {
    // Load project configuration
    const projectConfig = await loadProjectConfig(git, repoPath);
    console.log('Project config loaded:', projectConfig);
    
    // Use the same Git log options as the working stats API
    const logOptions: Record<string, string | null> = {
      '--all': null,
      '--no-merges': null,
      '--numstat': null,
      '--date': 'iso-strict',
    };

    if (options?.from) logOptions['--since'] = options.from;
    if (options?.to) logOptions['--until'] = options.to;
    if (options?.author) logOptions['--author'] = options.author;

    const logResult = await git.log(logOptions);
    console.log('Total commits found:', logResult.all.length);
    
    // Debug: Log the first commit to see what we're getting
    if (logResult.all.length > 0) {
      const firstCommit = logResult.all[0];
      console.log('First commit debug:', {
        hash: firstCommit.hash,
        author_name: firstCommit.author_name,
        author_email: firstCommit.author_email,
        date: firstCommit.date,
        message: firstCommit.message,
        diff: firstCommit.diff
      });
    }
    
    // Parse commits and calculate statistics using the same logic as stats API
    const commits: CommitData[] = [];
    const contributors: Record<string, ContributorData> = {};
    
    // Process each commit with the same logic as the working stats API
    for (const commit of logResult.all) {
      const author = commit.author_name || '';
      console.log(`Processing commit ${commit.hash}: author="${author}"`);
      
      // Skip commits with empty author names
      if (!author || author.trim() === '') {
        console.log(`Skipping commit with empty author: ${commit.hash}`);
        continue;
      }
      
      // Apply project configuration to normalize author name
      const normalizedAuthor = normalizeAuthorName(author, projectConfig);
      console.log(`Author "${author}" normalized to "${normalizedAuthor}"`);
      
      // Skip commits from excluded users
      if (normalizedAuthor === '') {
        console.log(`Skipping commit from excluded user: ${author}`);
        continue;
      }
      
      // Initialize contributor stats if not exists
      if (normalizedAuthor && !contributors[normalizedAuthor]) {
        contributors[normalizedAuthor] = {
          commits: 0,
          linesAdded: 0,
          linesDeleted: 0,
          filesChanged: 0
        };
      }
      
      // Process diff stats using the same logic as the working stats API
      let linesAdded = 0;
      let linesDeleted = 0;
      let filesChanged = 0;
      
      // Use the same diff processing logic as the working stats API
      if (commit.diff && commit.diff.files) {
        commit.diff.files.forEach(fileChange => {
          // Check if it's a text file with insertions/deletions (not binary)
          if ('insertions' in fileChange && 'deletions' in fileChange) {
            const insertions = fileChange.insertions as number;
            const deletions = fileChange.deletions as number;
            if (typeof insertions === 'number' && typeof deletions === 'number') {
              linesAdded += insertions;
              linesDeleted += deletions;
              filesChanged++;
            }
          }
        });
      } else {
        // Fallback parsing from commit.body (same as stats API)
        if (commit.body) {
          const lines = commit.body.trim().split('\n');
          lines.forEach(line => {
            const parts = line.split('\t');
            if (parts.length === 3) {
              const added = parseInt(parts[0], 10);
              const deleted = parseInt(parts[1], 10);
              if (!isNaN(added) && !isNaN(deleted)) {
                linesAdded += added;
                linesDeleted += deleted;
                filesChanged++;
              }
            }
          });
        }
      }
      
      // Create commit data
      const commitData: CommitData = {
        hash: commit.hash,
        author: normalizedAuthor,
        date: commit.date,
        message: commit.message || '',
        body: commit.body || undefined,
        diff: {
          files: [{
            file: 'aggregated',
            changes: linesAdded + linesDeleted,
            insertions: linesAdded,
            deletions: linesDeleted
          }]
        }
      };
      
      commits.push(commitData);
      
      // Update contributor statistics
      if (normalizedAuthor) {
        contributors[normalizedAuthor].commits++;
        contributors[normalizedAuthor].linesAdded += linesAdded;
        contributors[normalizedAuthor].linesDeleted += linesDeleted;
        contributors[normalizedAuthor].filesChanged += filesChanged;
      }
    }
    
    console.log('Processed commits:', commits.length);
    console.log('Contributors found:', Object.keys(contributors));
    
    // Calculate date range
    const sortedCommits = commits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dateRange = {
      start: sortedCommits.length > 0 ? new Date(sortedCommits[0].date) : new Date(),
      end: sortedCommits.length > 0 ? new Date(sortedCommits[sortedCommits.length - 1].date) : new Date()
    };
    
    // Calculate advanced analytics
    return calculateAdvancedAnalytics(commits, contributors, dateRange);
    
  } catch (error) {
    console.error('Error parsing git log for analytics:', error);
    throw new Error('Failed to parse git log for analytics');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { repoPath, filters } = await req.json();
    
    if (!repoPath) {
      return NextResponse.json({ error: 'Repository path is required' }, { status: 400 });
    }
    
    const git = simpleGit(repoPath);
    
    // Validate repository
    try {
      await git.status();
    } catch {
      return NextResponse.json({ error: 'Invalid repository path' }, { status: 400 });
    }
    
    // Extract filter options
    const options: { from?: string; to?: string; author?: string } = {};
    if (filters?.startDate) options.from = filters.startDate;
    if (filters?.endDate) options.to = filters.endDate;
    if (filters?.contributor) options.author = filters.contributor;
    
    // Parse git log and calculate analytics
    const analytics = await parseGitLogForAnalytics(git, repoPath, options);
    
    return NextResponse.json(analytics);
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
} 