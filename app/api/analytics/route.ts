import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import path from 'path';
import fs from 'fs';

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
  dateRange: { start: Date; end: Date },
  projectConfig: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }
): AnalyticsResponse {
  const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Calculate contributor performances
  const contributorPerformances = calculateContributorPerformances(commits, contributors, totalDays / 7, projectConfig);
  
  // Calculate project health
  const projectHealth = calculateProjectHealth(commits, contributors, totalDays / 7, dateRange);
  
  // Detect issues
  const detectedIssues = detectProjectIssues(commits, contributors, contributorPerformances, dateRange, projectConfig);
  
  // Generate insights
  const insights = generateInsights(contributorPerformances, projectHealth, detectedIssues);
  
  // Calculate benchmarks
  const benchmarks = calculateBenchmarks(contributors, totalDays / 7);
  
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
  totalWeeks: number,
  projectConfig: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }
): ContributorPerformance[] {
  const performances: ContributorPerformance[] = [];
  
  for (const [name, stats] of Object.entries(contributors)) {
    if (projectConfig.excludedUsers.includes(name)) continue;
    
    const normalizedName = normalizeAuthorName(name, projectConfig);
    const userCommits = commits.filter(c => normalizeAuthorName(c.author, projectConfig) === normalizedName);
    
    const commitsPerWeek = totalWeeks > 0 ? stats.commits / totalWeeks : 0;
    const linesPerCommit = stats.commits > 0 ? (stats.linesAdded + stats.linesDeleted) / stats.commits : 0;
    const filesPerCommit = stats.commits > 0 ? stats.filesChanged / stats.commits : 0;
    const consistencyScore = calculateConsistencyScore(userCommits, totalWeeks);
    
    // Determine activity pattern
    const activityPattern = determineActivityPattern(userCommits, totalWeeks);
    
    // Calculate trends
    const last30Days = calculateTrend(userCommits);
    const peakPeriod = findPeakPeriod(userCommits);
    const lowPeriod = findLowPeriod(userCommits);
    
    // Calculate relative rankings (simplified)
    const commitRank = 1; // Placeholder
    const productivityRank = 1; // Placeholder
    const consistencyRank = 1; // Placeholder
    
    // Determine performance rating
    const performanceRating = determinePerformanceRating(commitsPerWeek, linesPerCommit, consistencyScore);
    
    performances.push({
      name: normalizedName,
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
        commitRank,
        productivityRank,
        consistencyRank
      }
    });
  }
  
  return performances;
}

function determineActivityPattern(commits: CommitData[], totalWeeks: number): 'regular' | 'burst' | 'irregular' {
  if (commits.length === 0) return 'irregular';
  
  // Simple heuristic: if commits are spread across weeks, it's regular
  const weeksWithCommits = new Set(commits.map(c => getWeekKey(new Date(c.date))).length);
  const regularityRatio = weeksWithCommits.size / Math.max(1, totalWeeks);
  
  if (regularityRatio > 0.7) return 'regular';
  if (regularityRatio > 0.3) return 'burst';
  return 'irregular';
}

function determinePerformanceRating(commitsPerWeek: number, linesPerCommit: number, consistencyScore: number): 'below_average' | 'average' | 'above_average' | 'exceptional' {
  const score = (commitsPerWeek * 0.4) + (linesPerCommit * 0.3) + (consistencyScore * 0.3);
  
  if (score > 8) return 'exceptional';
  if (score > 6) return 'above_average';
  if (score > 4) return 'average';
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
  const mean = commitCounts.reduce((sum, count) => sum + count, 0) / commitCounts.length;
  const variance = commitCounts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / commitCounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Higher consistency = lower standard deviation
  return Math.max(0, 10 - stdDev);
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
  totalWeeks: number,
  dateRange: { start: Date; end: Date }
): ProjectHealth {
  const activeDevelopers = Object.keys(contributors).length;
  const totalCommits = commits.length;
  const totalLines = commits.reduce((sum, commit) => {
    const diff = commit.diff;
    if (diff) {
      return sum + diff.files.reduce((fileSum, file) => fileSum + file.insertions + file.deletions, 0);
    }
    return sum;
  }, 0);
  
  const averageCommitSize = totalCommits > 0 ? totalLines / totalCommits : 0;
  const refactoringRatio = commits.reduce((sum, commit) => {
    const diff = commit.diff;
    if (diff) {
      const deletions = diff.files.reduce((fileSum, file) => fileSum + file.deletions, 0);
      const insertions = diff.files.reduce((fileSum, file) => fileSum + file.insertions, 0);
      return sum + (deletions / Math.max(1, insertions));
    }
    return sum;
  }, 0) / Math.max(1, totalCommits);
  
  const largeCommits = commits.filter(commit => {
    const diff = commit.diff;
    if (diff) {
      const totalChanges = diff.files.reduce((sum, file) => sum + file.insertions + file.deletions, 0);
      return totalChanges > 500; // Large commit threshold
    }
    return false;
  }).length;
  
  const largeCommitFrequency = totalCommits > 0 ? largeCommits / totalCommits : 0;
  
  // Calculate development velocity
  const currentVelocity = totalWeeks > 0 ? totalCommits / totalWeeks : 0;
  const trend = currentVelocity > 10 ? 'increasing' : currentVelocity < 5 ? 'decreasing' : 'stable';
  const changePercent = 0; // Placeholder
  
  // Calculate team collaboration score
  const teamCollaborationScore = Math.min(100, activeDevelopers * 20);
  const newContributors = 0; // Placeholder
  const busFactor = activeDevelopers > 1 ? 100 - (100 / activeDevelopers) : 0;
  
  // Calculate overall score
  const overallScore = Math.min(100, 
    (currentVelocity * 10) + 
    (teamCollaborationScore * 0.3) + 
    ((1 - largeCommitFrequency) * 20) +
    (Math.max(0, 10 - refactoringRatio) * 5)
  );
  
  return {
    overallScore,
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
  dateRange: { start: Date; end: Date },
  projectConfig: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];
  
  // Check for low activity
  const totalCommits = commits.length;
  const totalWeeks = Math.max(1, (dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24 * 7));
  const commitsPerWeek = totalCommits / totalWeeks;
  
  if (commitsPerWeek < 2) {
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
        linesAdded: 0,
        linesDeleted: 0,
        filesChanged: 0,
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
  
  // Generate insights based on data
  if (health.overallScore < 50) {
    keyFindings.push('Project health score is below average');
    recommendations.push('Focus on improving development velocity and team collaboration');
  }
  
  if (issues.length > 0) {
    keyFindings.push(`${issues.length} critical issues detected`);
    recommendations.push('Address detected issues to improve project health');
  }
  
  if (health.teamCollaboration.busFactor < 50) {
    riskFactors.push('High bus factor risk - project depends on few contributors');
  }
  
  return { keyFindings, recommendations, riskFactors };
}

function calculateBenchmarks(contributors: Record<string, ContributorData>, totalWeeks: number) {
  const totalCommits = Object.values(contributors).reduce((sum, stats) => sum + stats.commits, 0);
  const totalLines = Object.values(contributors).reduce((sum, stats) => sum + stats.linesAdded + stats.linesDeleted, 0);
  const totalFiles = Object.values(contributors).reduce((sum, stats) => sum + stats.filesChanged, 0);
  
  return {
    averageCommitsPerWeek: totalWeeks > 0 ? totalCommits / totalWeeks : 0,
    averageLinesPerCommit: totalCommits > 0 ? totalLines / totalCommits : 0,
    averageFilesPerCommit: totalCommits > 0 ? totalFiles / totalCommits : 0,
    teamProductivityScore: Math.min(100, (totalCommits / Math.max(1, totalWeeks)) * 10)
  };
}

async function loadProjectConfig(git: SimpleGit, repoPath: string): Promise<{ groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }> {
  const configPath = path.join(repoPath, 'PROJECT_CONFIGURATION.md');
  
  try {
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      // Parse configuration (simplified)
      return {
        groupedAuthors: [],
        excludedUsers: []
      };
    }
  } catch {
    // Ignore errors and return default config
  }
  
  return {
    groupedAuthors: [],
    excludedUsers: []
  };
}

function normalizeAuthorName(authorName: string, config: { groupedAuthors: Array<{ primaryName: string; aliases: string[] }>; excludedUsers: string[] }): string {
  // Check if author is in grouped authors
  for (const group of config.groupedAuthors) {
    if (group.aliases.includes(authorName)) {
      return group.primaryName;
    }
  }
  
  return authorName;
}

async function parseGitLogForAnalytics(git: SimpleGit, repoPath: string, options?: { from?: string; to?: string }): Promise<AnalyticsResponse> {
  try {
    // Load project configuration
    const projectConfig = await loadProjectConfig(git, repoPath);
    
    // Get git log with detailed information
    const logOptions = ['--pretty=format:%H|%an|%ad|%s|%b', '--date=iso', '--numstat'];
    if (options?.from) logOptions.push(`--since=${options.from}`);
    if (options?.to) logOptions.push(`--until=${options.to}`);
    
    const logResult = await git.log(logOptions);
    
    // Parse commits and calculate statistics
    const commits: CommitData[] = [];
    const contributors: Record<string, ContributorData> = {};
    
    // Process log output (simplified parsing)
    const lines = logResult.raw.split('\n');
    let currentCommit: Partial<CommitData> = {};
    
    for (const line of lines) {
      if (line.includes('|')) {
        // This is a commit line
        const [hash, author, date, message, body] = line.split('|');
        currentCommit = {
          hash: hash || '',
          author: author || '',
          date: date || '',
          message: message || '',
          body: body || undefined
        };
        commits.push(currentCommit as CommitData);
        
        // Initialize contributor stats
        if (author && !contributors[author]) {
          contributors[author] = {
            commits: 0,
            linesAdded: 0,
            linesDeleted: 0,
            filesChanged: 0
          };
        }
        
        if (author) {
          contributors[author].commits++;
        }
      }
    }
    
    // Calculate date range
    const sortedCommits = commits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const dateRange = {
      start: sortedCommits.length > 0 ? new Date(sortedCommits[0].date) : new Date(),
      end: sortedCommits.length > 0 ? new Date(sortedCommits[sortedCommits.length - 1].date) : new Date()
    };
    
    // Calculate advanced analytics
    return calculateAdvancedAnalytics(commits, contributors, dateRange, projectConfig);
    
  } catch (error) {
    console.error('Error parsing git log for analytics:', error);
    throw new Error('Failed to parse git log for analytics');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { repoPath, from, to } = await req.json();
    
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
    
    // Parse git log and calculate analytics
    const analytics = await parseGitLogForAnalytics(git, repoPath, { from, to });
    
    return NextResponse.json(analytics);
    
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json({ error: 'Failed to generate analytics' }, { status: 500 });
  }
} 