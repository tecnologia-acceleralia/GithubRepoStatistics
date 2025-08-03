import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import path from 'path';
import fs from 'fs';
import { promises as fsPromises } from 'fs';

// Define structure for contributor stats
interface ContributorStats {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: Set<string>; // Use Set for uniqueness, convert later
}

// Define structure for project configuration
interface ProjectConfig {
  groupedAuthors: Array<{
    primaryName: string;
    aliases: string[];
  }>;
  excludedUsers: string[];
}

// Define structure for overall stats
interface RepoStats {
  totalCommits: number;
  totalCommitsWithConfig: number; // New field for commits after configuration is applied
  contributors: Record<string, ContributorStats>;
  commitActivity: { date: string; count: number; contributorCount: number; linesAdded: number; linesDeleted: number }[];
  allContributors: string[]; // Add list of all contributors for filtering UI
  remoteUrl?: string; // Add remote repository URL
  firstCommitDate?: string; // First commit date in the repository
  lastCommitDate?: string; // Last commit date in the repository
}

// Define the expected structure of a commit log entry with diff stats
// Based on simple-git types and --numstat output
interface CommitLogEntry {
  hash: string;
  date: string;
  message: string;
  refs: string;
  body: string;
  author_name: string;
  author_email: string;
  diff?: {
    added: number;
    deleted: number;
    files: {
      file: string;
      changes: number;
      insertions: number;
      deletions: number;
      binary: boolean;
    }[];
  };
}

// Helper function to get remote repository URL
async function getRemoteUrl(git: SimpleGit): Promise<string | undefined> {
  try {
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(remote => remote.name === 'origin');
    if (origin && origin.refs.fetch) {
      let url = origin.refs.fetch;
      // Convert SSH URL to HTTPS URL for GitHub
      if (url.startsWith('git@github.com:')) {
        url = url.replace('git@github.com:', 'https://github.com/');
      }
      // Remove .git suffix if present
      if (url.endsWith('.git')) {
        url = url.slice(0, -4);
      }
      return url;
    }
  } catch (error) {
    console.warn('Could not retrieve remote URL:', error);
  }
  return undefined;
}

// Helper function to get GitHub repository name from remote URL
async function getGitHubRepoName(repoPath: string): Promise<string | null> {
  try {
    const git: SimpleGit = simpleGit(repoPath);
    const remotes = await git.getRemotes(true);
    const origin = remotes.find(remote => remote.name === 'origin');
    
    if (origin && origin.refs.fetch) {
      let url = origin.refs.fetch;
      
      // Convert SSH URL to HTTPS URL for GitHub
      if (url.startsWith('git@github.com:')) {
        url = url.replace('git@github.com:', 'https://github.com/');
      }
      
      // Remove .git suffix if present
      if (url.endsWith('.git')) {
        url = url.slice(0, -4);
      }
      
      // Extract repository name from GitHub URL
      // URL format: https://github.com/owner/repo-name
      const match = url.match(/https:\/\/github\.com\/([^\/]+\/[^\/]+)$/);
      if (match) {
        return match[1]; // Returns "owner/repo-name"
      }
    }
  } catch (error) {
    console.warn('Could not retrieve GitHub repository name:', error);
  }
  
  return null;
}

// Helper function to load project configuration
async function loadProjectConfig(repoPath: string): Promise<ProjectConfig> {
  try {
    // Try to get GitHub repository name first
    const repoName = await getGitHubRepoName(repoPath);
    
    let safeName: string;
    if (repoName) {
      // Use GitHub repository name (owner/repo-name format)
      // Preserve hyphens but replace other special characters
      safeName = repoName.replace(/[^a-zA-Z0-9\-]/g, '_');
    } else {
      // Fallback to local path if GitHub name cannot be determined
      safeName = repoPath.replace(/[^a-zA-Z0-9]/g, '_');
    }
    
    const configDir = path.join(process.cwd(), 'configs');
    const configFilePath = path.join(configDir, `${safeName}_config.json`);
    
    const configData = await fsPromises.readFile(configFilePath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    // Return default config if file doesn't exist or can't be read
    return { groupedAuthors: [], excludedUsers: [] };
  }
}

// Helper function to load global configuration
async function loadGlobalConfig(): Promise<{ firstDayOfWeek: 'sunday' | 'monday' }> {
  try {
    const configDir = path.join(process.cwd(), 'configs');
    const configFilePath = path.join(configDir, 'global_config.json');
    
    const configData = await fsPromises.readFile(configFilePath, 'utf-8');
    return JSON.parse(configData);
  } catch (error) {
    // Return default config if file doesn't exist or can't be read
    return { firstDayOfWeek: 'sunday' };
  }
}

// Helper function to normalize author name based on configuration
function normalizeAuthorName(authorName: string, config: ProjectConfig): string {
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

// Helper function to parse git log output for stats
async function parseGitLog(git: SimpleGit, options?: { from?: string; to?: string; author?: string }, config?: ProjectConfig): Promise<RepoStats> {
  const logOptions: Record<string, string | null> = {
    '--all': null,
    '--no-merges': null,
    '--numstat': null,
    '--date': 'iso-strict',
  };

  if (options?.from) logOptions['--since'] = options.from;
  if (options?.to) logOptions['--until'] = options.to;

  const log: LogResult<CommitLogEntry> = await git.log(logOptions) as LogResult<CommitLogEntry>;

  const stats: RepoStats = {
    totalCommits: 0, // Will be calculated after filtering
    totalCommitsWithConfig: 0, // Initialize new field
    contributors: {},
    commitActivity: [],
    allContributors: [],
  };

  const commitCountsByDate: Record<string, number> = {};
  const contributorsByDate: Record<string, Set<string>> = {};
  const linesAddedByDate: Record<string, number> = {};
  const linesDeletedByDate: Record<string, number> = {};
  const allContributorsSet = new Set<string>();
  let firstCommitDate: string | undefined;
  let lastCommitDate: string | undefined;
  let totalCommitsBeforeConfig = 0; // Track commits before configuration is applied

  for (const commit of log.all) {
    allContributorsSet.add(commit.author_name); // Collect all contributors before filtering

    // Track first and last commit dates (before filtering)
    const currentCommitDate = commit.date.substring(0, 10);
    if (!firstCommitDate || currentCommitDate < firstCommitDate) {
      firstCommitDate = currentCommitDate;
    }
    if (!lastCommitDate || currentCommitDate > lastCommitDate) {
      lastCommitDate = currentCommitDate;
    }

    // Filter by author if specified
    if (options?.author && commit.author_name !== options.author) {
      continue;
    }

    // Count commits before configuration is applied
    totalCommitsBeforeConfig++;

    // Apply project configuration to normalize author name
    const normalizedAuthor = config ? normalizeAuthorName(commit.author_name, config) : commit.author_name;
    
    // Skip commits from excluded users
    if (normalizedAuthor === '') {
      continue;
    }

    stats.totalCommitsWithConfig++; // Increment commits after configuration is applied

    const author = normalizedAuthor;
    if (!stats.contributors[author]) {
      stats.contributors[author] = { commits: 0, linesAdded: 0, linesDeleted: 0, filesChanged: new Set() };
    }
    stats.contributors[author].commits++;

    // Process diff stats directly from the parsed 'diff' property
    // This relies on simple-git correctly parsing --numstat output into commit.diff
    if (commit.diff && commit.diff.files) {
        commit.diff.files.forEach(fileChange => {
            // Check if insertions/deletions are numbers (not binary files)
            if (typeof fileChange.insertions === 'number' && typeof fileChange.deletions === 'number') {
                stats.contributors[author].linesAdded += fileChange.insertions;
                stats.contributors[author].linesDeleted += fileChange.deletions;
                stats.contributors[author].filesChanged.add(fileChange.file);
            }
        });
    } else {
        // Fallback or alternative parsing if commit.diff is not populated as expected
        // This might involve parsing commit.body or using git.show('--stat', commit.hash)
        // For now, we'll log a warning if diff is missing, indicating potential simple-git parsing issue
        // console.warn(`Diff stats not found for commit ${commit.hash}. Parsing commit.body as fallback.`);
        // Fallback parsing from commit.body (less reliable)
        if (commit.body) {
            const lines = commit.body.trim().split('\n');
            lines.forEach(line => {
                const parts = line.split('\t');
                if (parts.length === 3) {
                    const added = parseInt(parts[0], 10);
                    const deleted = parseInt(parts[1], 10);
                    const file = parts[2];
                    if (!isNaN(added) && !isNaN(deleted)) {
                        stats.contributors[author].linesAdded += added;
                        stats.contributors[author].linesDeleted += deleted;
                        stats.contributors[author].filesChanged.add(file);
                    }
                }
            });
        }
    }

    // Aggregate commit activity and contributors by date (YYYY-MM-DD)
    const commitDate = commit.date.substring(0, 10);
    commitCountsByDate[commitDate] = (commitCountsByDate[commitDate] || 0) + 1;
    
    // Track distinct contributors per date (use normalized author)
    if (!contributorsByDate[commitDate]) {
      contributorsByDate[commitDate] = new Set<string>();
    }
    contributorsByDate[commitDate].add(author);
    
    // Track lines added/deleted per date
    linesAddedByDate[commitDate] = (linesAddedByDate[commitDate] || 0);
    linesDeletedByDate[commitDate] = (linesDeletedByDate[commitDate] || 0);
    
    // Add current commit's lines to the daily totals
    if (commit.diff && commit.diff.files) {
        commit.diff.files.forEach(fileChange => {
            if (typeof fileChange.insertions === 'number' && typeof fileChange.deletions === 'number') {
                linesAddedByDate[commitDate] += fileChange.insertions;
                linesDeletedByDate[commitDate] += fileChange.deletions;
            }
        });
    } else if (commit.body) {
        const lines = commit.body.trim().split('\n');
        lines.forEach(line => {
            const parts = line.split('\t');
            if (parts.length === 3) {
                const added = parseInt(parts[0], 10);
                const deleted = parseInt(parts[1], 10);
                if (!isNaN(added) && !isNaN(deleted)) {
                    linesAddedByDate[commitDate] += added;
                    linesDeletedByDate[commitDate] += deleted;
                }
            }
        });
    }
  }

  // Convert filesChanged Set to Array length for JSON serialization
  Object.values(stats.contributors).forEach(contrib => {
    // @ts-expect-error - Replace Set with its size
    contrib.filesChanged = contrib.filesChanged.size;
  });

  // Format commit activity
  stats.commitActivity = Object.entries(commitCountsByDate)
    .map(([date, count]) => ({ 
      date, 
      count, 
      contributorCount: contributorsByDate[date]?.size || 0,
      linesAdded: linesAddedByDate[date] || 0,
      linesDeleted: linesDeletedByDate[date] || 0
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date

  // Add zero records for missing days
  if (stats.commitActivity.length > 0) {
    const startDate = new Date(stats.commitActivity[0].date);
    const endDate = new Date(stats.commitActivity[stats.commitActivity.length - 1].date);
    const allDates = new Set<string>();
    
    // Generate all dates in range
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      allDates.add(d.toISOString().split('T')[0]);
    }
    
    // Add zero records for missing dates
    const completeActivity = Array.from(allDates).map(date => ({
      date,
      count: commitCountsByDate[date] || 0,
      contributorCount: contributorsByDate[date]?.size || 0,
      linesAdded: linesAddedByDate[date] || 0,
      linesDeleted: linesDeletedByDate[date] || 0
    })).sort((a, b) => a.date.localeCompare(b.date));
    
    stats.commitActivity = completeActivity;
  }

  // Set total commits to the count before configuration is applied
  stats.totalCommits = totalCommitsBeforeConfig;

  // Add sorted list of all unique contributors (normalized)
  const normalizedContributors = new Set<string>();
  for (const contributor of Array.from(allContributorsSet)) {
    const normalized = config ? normalizeAuthorName(contributor, config) : contributor;
    if (normalized !== '') {
      normalizedContributors.add(normalized);
    }
  }
  stats.allContributors = Array.from(normalizedContributors).sort();

  // Get remote repository URL
  stats.remoteUrl = await getRemoteUrl(git);

  // Add first and last commit dates
  stats.firstCommitDate = firstCommitDate;
  stats.lastCommitDate = lastCommitDate;

  return stats;
}

export async function POST(req: NextRequest) {
  try {
    const { repoPath, filters } = await req.json();

    if (!repoPath || typeof repoPath !== 'string') {
      return NextResponse.json({ error: 'Invalid repository path provided' }, { status: 400 });
    }

    // Security check: Ensure path exists and is a directory (basic check)
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
    const logOptions: { from?: string; to?: string; author?: string } = {};
    if (filters?.startDate) logOptions.from = filters.startDate;
    if (filters?.endDate) logOptions.to = filters.endDate;
    if (filters?.contributor) logOptions.author = filters.contributor;

    // Load project configuration
    const config = await loadProjectConfig(repoPath);
    
    // Load global configuration
    const globalConfig = await loadGlobalConfig();
    
    const stats = await parseGitLog(git, logOptions, config);

    // Include global configuration in response
    return NextResponse.json({
      ...stats,
      globalConfig
    });

  } catch (error: unknown) {
    console.error('Error fetching Git statistics:', error);
    let errorMessage = 'Failed to fetch Git statistics';
    if (error instanceof Error) {
      if (error.message.includes('ENOENT')) {
        errorMessage = 'Repository path not found or inaccessible.';
      } else if (error.message.includes('Not a git repository')) {
        errorMessage = 'The specified path is not a valid Git repository.';
      }
    }
    return NextResponse.json({ error: errorMessage, details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

