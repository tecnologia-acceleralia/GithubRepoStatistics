import { NextRequest, NextResponse } from 'next/server';
import simpleGit, { SimpleGit, LogResult } from 'simple-git';
import path from 'path';
import fs from 'fs';
import { format } from 'date-fns';

// Define the expected structure of a commit log entry with diff stats
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

// Helper function to generate CSV content
function generateCsvContent(data: { date: string; commits: number; linesAdded: number; linesDeleted: number; filesChanged: number }[]): string {
    const header = 'Date,Commits,Lines Added,Lines Deleted,Files Changed\n';
    const rows = data.map(row => 
        `${row.date},${row.commits},${row.linesAdded},${row.linesDeleted},${row.filesChanged}`
    ).join('\n');
    return header + rows;
}

// Helper function to parse git log and aggregate stats per day
async function parseGitLogForDailyStats(git: SimpleGit, options?: { from?: string; to?: string; author?: string }): Promise<{ date: string; commits: number; linesAdded: number; linesDeleted: number; filesChanged: number }[]> {
  const logOptions: Record<string, string | null> = {
    '--all': null,
    '--no-merges': null,
    '--numstat': null,
    '--date': 'iso-strict',
  };

  if (options?.from) logOptions['--since'] = options.from;
  if (options?.to) logOptions['--until'] = options.to;

  const log: LogResult<CommitLogEntry> = await git.log(logOptions) as LogResult<CommitLogEntry>;

  const dailyStats: Record<string, { commits: number; linesAdded: number; linesDeleted: number; filesChanged: Set<string> }> = {};

  for (const commit of log.all) {
    // Filter by author if specified
    if (options?.author && commit.author_name !== options.author) {
      continue;
    }

    const commitDate = commit.date.substring(0, 10); // YYYY-MM-DD

    if (!dailyStats[commitDate]) {
      dailyStats[commitDate] = { commits: 0, linesAdded: 0, linesDeleted: 0, filesChanged: new Set() };
    }

    dailyStats[commitDate].commits++;

    // Process diff stats
    if (commit.diff && commit.diff.files) {
        commit.diff.files.forEach(fileChange => {
            if (typeof fileChange.insertions === 'number' && typeof fileChange.deletions === 'number') {
                dailyStats[commitDate].linesAdded += fileChange.insertions;
                dailyStats[commitDate].linesDeleted += fileChange.deletions;
                dailyStats[commitDate].filesChanged.add(fileChange.file);
            }
        });
    } else if (commit.body) { // Fallback parsing from commit.body
        const lines = commit.body.trim().split('\n');
        lines.forEach(line => {
            const parts = line.split('\t');
            if (parts.length === 3) {
                const added = parseInt(parts[0], 10);
                const deleted = parseInt(parts[1], 10);
                const file = parts[2];
                if (!isNaN(added) && !isNaN(deleted)) {
                    dailyStats[commitDate].linesAdded += added;
                    dailyStats[commitDate].linesDeleted += deleted;
                    dailyStats[commitDate].filesChanged.add(file);
                }
            }
        });
    }
  }

  // Convert aggregated stats into the desired array format
  const result = Object.entries(dailyStats)
    .map(([date, stats]) => ({
      date,
      commits: stats.commits,
      linesAdded: stats.linesAdded,
      linesDeleted: stats.linesDeleted,
      filesChanged: stats.filesChanged.size, // Count unique files changed per day
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Sort by date

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { repoPath, filters } = await req.json();

    if (!repoPath || typeof repoPath !== 'string') {
      return NextResponse.json({ error: 'Invalid repository path provided' }, { status: 400 });
    }

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

    // Fetch and aggregate daily stats
    const dailyStatsData = await parseGitLogForDailyStats(git, logOptions);

    // Generate CSV content
    const csvContent = generateCsvContent(dailyStatsData);

    // Create filename
    const timestamp = format(new Date(), 'yyyyMMddHHmmss');
    const repoName = path.basename(resolvedPath);
    const filename = `git_stats_${repoName}_${timestamp}.csv`;

    // Return CSV content as a response
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`, // Suggest filename for download
      },
    });

  } catch (error: unknown) {
    console.error('Error generating CSV:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSV', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

