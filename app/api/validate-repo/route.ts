import { NextRequest, NextResponse } from 'next/server';
import simpleGit from 'simple-git';
import fs from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { repoPath } = await req.json();

    if (!repoPath || typeof repoPath !== 'string') {
      return NextResponse.json({ isValid: false, error: 'Invalid path provided' }, { status: 400 });
    }

    // Basic security check: prevent path traversal
    const resolvedPath = path.resolve(repoPath);
    // This is a basic check; a real app might need more robust security
    // For local-only app, we might assume user provides valid paths, but some check is good.
    // Check if path exists and is a directory
    if (!fs.existsSync(resolvedPath) || !fs.lstatSync(resolvedPath).isDirectory()) {
        return NextResponse.json({ isValid: false, error: 'Path does not exist or is not a directory' }, { status: 400 });
    }

    const git = simpleGit(resolvedPath);
    const isRepo = await git.checkIsRepo();

    if (isRepo) {
      return NextResponse.json({ isValid: true, path: resolvedPath });
    } else {
      return NextResponse.json({ isValid: false, error: 'Not a valid Git repository' }, { status: 400 });
    }
  } catch (error: unknown) {
    console.error('Error validating repository:', error);
    return NextResponse.json(
      { error: 'Failed to validate repository', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

