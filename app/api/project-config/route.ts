import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import simpleGit, { SimpleGit } from 'simple-git';

interface ProjectConfig {
  groupedAuthors: Array<{
    primaryName: string;
    aliases: string[];
  }>;
  excludedUsers: string[];
}

interface RequestBody {
  action: 'load' | 'save' | 'get-contributors';
  repoPath: string;
  config?: ProjectConfig;
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

async function getConfigFilePath(repoPath: string): Promise<string> {
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
  return path.join(configDir, `${safeName}_config.json`);
}

async function ensureConfigDirectory(): Promise<void> {
  const configDir = path.join(process.cwd(), 'configs');
  try {
    await fs.access(configDir);
  } catch {
    await fs.mkdir(configDir, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { action, repoPath, config } = body;

    if (!repoPath) {
      return NextResponse.json(
        { error: 'Repository path is required' },
        { status: 400 }
      );
    }

    const configFilePath = await getConfigFilePath(repoPath);

    if (action === 'load') {
      try {
        await ensureConfigDirectory();
        const configData = await fs.readFile(configFilePath, 'utf-8');
        const parsedConfig: ProjectConfig = JSON.parse(configData);
        
        return NextResponse.json({ config: parsedConfig });
      } catch (error) {
        // If file doesn't exist, return default config
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          return NextResponse.json({ 
            config: { groupedAuthors: [], excludedUsers: [] } 
          });
        }
        throw error;
      }
    } else if (action === 'save') {
      if (!config) {
        return NextResponse.json(
          { error: 'Configuration data is required for save action' },
          { status: 400 }
        );
      }

      // Validate configuration
      if (!Array.isArray(config.groupedAuthors) || !Array.isArray(config.excludedUsers)) {
        return NextResponse.json(
          { error: 'Invalid configuration format' },
          { status: 400 }
        );
      }

      // Clean up empty entries
      const cleanedConfig: ProjectConfig = {
        groupedAuthors: config.groupedAuthors
          .filter(author => author.primaryName.trim() !== '')
          .map(author => ({
            primaryName: author.primaryName.trim(),
            aliases: author.aliases.filter(alias => alias.trim() !== '')
          })),
        excludedUsers: config.excludedUsers.filter(user => user.trim() !== '')
      };

      await ensureConfigDirectory();
      await fs.writeFile(configFilePath, JSON.stringify(cleanedConfig, null, 2));
      
      return NextResponse.json({ success: true });
    } else if (action === 'get-contributors') {
      try {
        // Get contributors from the stats API
        const response = await fetch(`${request.nextUrl.origin}/api/stats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            repoPath,
            // Request minimal data to get contributors list
            options: { limit: 1 }
          }),
        });

        if (response.ok) {
          const statsData = await response.json();
          return NextResponse.json({ contributors: statsData.allContributors || [] });
        } else {
          return NextResponse.json({ contributors: [] });
        }
      } catch (error) {
        console.error('Error fetching contributors:', error);
        return NextResponse.json({ contributors: [] });
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "load", "save", or "get-contributors"' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Project config API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 