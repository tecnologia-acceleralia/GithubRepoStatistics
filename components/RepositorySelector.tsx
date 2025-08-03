'use client';

import React, { useState, useEffect } from 'react';

interface RepositorySelectorProps {
  onRepositorySelected: (path: string) => void;
  onConfigurationRequested: (path: string) => void;
  isLoadingStats?: boolean;
}

interface RecentRepo {
  path: string;
  lastUsed: number;
}

const MAX_RECENT_REPOS = 5;
const RECENT_REPOS_KEY = 'git-stats-recent-repos';

const RepositorySelector: React.FC<RepositorySelectorProps> = ({ 
  onRepositorySelected, 
  onConfigurationRequested,
  isLoadingStats = false 
}) => {
  const [repoPath, setRepoPath] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [recentRepos, setRecentRepos] = useState<RecentRepo[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load recent repos from localStorage
    const stored = localStorage.getItem(RECENT_REPOS_KEY);
    if (stored) {
      setRecentRepos(JSON.parse(stored));
    }
  }, []);

  useEffect(() => {
    // Don't clear validation state when stats loading starts
    // This allows the Configure button to remain visible
    // Only clear error messages during loading
    if (isLoadingStats) {
      setError(null);
    }
  }, [isLoadingStats]);

  const updateRecentRepos = (path: string) => {
    const now = Date.now();
    const newRepo: RecentRepo = { path, lastUsed: now };
    
    setRecentRepos(prev => {
      // Remove if exists, add new one, sort by lastUsed, limit to MAX_RECENT_REPOS
      const updated = [
        newRepo,
        ...prev.filter(repo => repo.path !== path)
      ].sort((a, b) => b.lastUsed - a.lastUsed)
       .slice(0, MAX_RECENT_REPOS);
      
      localStorage.setItem(RECENT_REPOS_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleValidate = async (pathToValidate?: string) => {
    const path = pathToValidate || repoPath;
    if (!path) {
      setError('Please enter a repository path.');
      setIsValid(false);
      return;
    }
    setIsValidating(true);
    setError(null);
    setIsValid(null);

    try {
      const response = await fetch('/api/validate-repo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoPath: path }),
      });

      const data = await response.json();

      if (response.ok && data.isValid) {
        setIsValid(true);
        setError(null);
        const validatedPath = data.path;
        updateRecentRepos(validatedPath);
        onRepositorySelected(validatedPath);
      } else {
        setIsValid(false);
        setError(data.error || 'Failed to validate repository.');
      }
    } catch (err) {
      console.error('Validation error:', err);
      setIsValid(false);
      setError('An unexpected error occurred during validation.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRecentRepoSelect = (path: string) => {
    setRepoPath(path);
    handleValidate(path);
  };

  const handleConfigurationClick = (path: string) => {
    onConfigurationRequested(path);
  };

  return (
    <div className={`repository-selector ${isLoadingStats ? 'loading' : ''}`}>
      <h2 className="repository-selector-title">Select Local Repository</h2>
      <div className="repository-selector-content">
        {mounted && recentRepos.length > 0 && (
          <div className="recent-repos-section">
            <label className="recent-repos-label">Recent Repositories:</label>
            <div className="recent-repos-list">
              {recentRepos.map((repo) => (
                <button
                  key={repo.path}
                  onClick={() => handleRecentRepoSelect(repo.path)}
                  disabled={isValidating || isLoadingStats}
                  className="btn btn-ghost"
                >
                  {repo.path}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="input-section">
          <input
            type="text"
            value={repoPath}
            onChange={(e) => setRepoPath(e.target.value)}
            placeholder="Enter absolute path to local Git repository"
            className="form-control"
            disabled={isValidating || isLoadingStats}
          />
          <div className="input-buttons">
            <button
              onClick={() => handleValidate()}
              disabled={isValidating || isLoadingStats}
              className="btn btn-primary"
            >
              {isValidating ? 'Validating...' : isLoadingStats ? 'Loading Statistics...' : 'Select Repository'}
            </button>
            {isValid && (
              <button
                onClick={() => handleConfigurationClick(repoPath)}
                disabled={isValidating || isLoadingStats}
                className="btn btn-ghost"
                title="Configure project settings"
              >
                ⚙️ Configure
              </button>
            )}
          </div>
        </div>
      </div>
      {error && (
        <p className="status-message status-error">Error: {error}</p>
      )}
      {isValid === true && (
        <p className="status-message status-success">Repository validated successfully!</p>
      )}
    </div>
  );
};

export default RepositorySelector;

