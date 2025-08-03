	'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import RepositorySelector from '@/components/RepositorySelector';
import ContributorStatsTable from '@/components/ContributorStatsTable';
import CommitActivityChart from '@/components/CommitActivityChart';
import LinesChangedChart from '@/components/LinesChangedChart';
import CommitFrequencyStats from '@/components/CommitFrequencyStats';
import BasicFilters from '@/components/BasicFilters';
import AdvancedFilters from '@/components/AdvancedFilters';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import ProjectConfiguration from '@/components/ProjectConfiguration';
import DarkModeToggle from '@/components/DarkModeToggle';
import ConfigurationButton from '@/components/ConfigurationButton';
import GlobalConfiguration from '@/components/GlobalConfiguration';

// Define structure for stats data (matching API response)
interface ContributorStatsData {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number;
}

interface RepoStatsData {
  totalCommits: number;
  totalCommitsWithConfig: number;
  contributors: Record<string, ContributorStatsData>;
  commitActivity: { date: string; count: number; contributorCount: number; linesAdded: number; linesDeleted: number }[];
  allContributors: string[];
  remoteUrl?: string;
  firstCommitDate?: string;
  lastCommitDate?: string;
  globalConfig?: {
    firstDayOfWeek: 'sunday' | 'monday';
  };
}

export default function Home() {
  const [selectedRepoPath, setSelectedRepoPath] = useState<string | null>(null);
  const [repoStats, setRepoStats] = useState<RepoStatsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState<boolean>(false);
  const [isFilteringCommits, setIsFilteringCommits] = useState<boolean>(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [filters, setFilters] = useState<{ startDate?: string; endDate?: string; contributor?: string }>({});
  const [isDownloadingCsv, setIsDownloadingCsv] = useState<boolean>(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'basic' | 'advanced'>('basic');
  const [isConfigOpen, setIsConfigOpen] = useState<boolean>(false);
  const [isGlobalConfigOpen, setIsGlobalConfigOpen] = useState<boolean>(false);

  // Memoized filtered data for basic stats - only recalculates when repoStats or filters change
  const basicFilteredStats = useMemo(() => {
    if (!repoStats) return null;

    // For date filters, we can apply them client-side since the API returns all data
    let filteredActivity = repoStats.commitActivity;
    if (filters.startDate || filters.endDate) {
      filteredActivity = repoStats.commitActivity.filter(activity => {
        const activityDate = new Date(activity.date);
        const startDate = filters.startDate ? new Date(filters.startDate) : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        if (startDate && activityDate < startDate) return false;
        if (endDate && activityDate > endDate) return false;
        return true;
      });
    }

    // For contributor filter, the API already returns filtered data
    // So we can use the data as-is since it's already filtered by contributor
    const filteredContributors = repoStats.contributors;

    // Calculate filtered total commits
    const filteredTotalCommits = filteredActivity.reduce((sum, activity) => sum + activity.count, 0);

    return {
      ...repoStats,
      commitActivity: filteredActivity,
      contributors: filteredContributors,
      totalCommits: filteredTotalCommits,
    };
  }, [repoStats, filters]);

  // Memoized filtered data for advanced stats - only affected by date filters, not contributor filters
  const advancedFilteredStats = useMemo(() => {
    if (!repoStats) return null;

    // For advanced stats, only apply date filters, not contributor filters
    let filteredActivity = repoStats.commitActivity;
    if (filters.startDate || filters.endDate) {
      filteredActivity = repoStats.commitActivity.filter(activity => {
        const activityDate = new Date(activity.date);
        const startDate = filters.startDate ? new Date(filters.startDate) : null;
        const endDate = filters.endDate ? new Date(filters.endDate) : null;

        if (startDate && activityDate < startDate) return false;
        if (endDate && activityDate > endDate) return false;
        return true;
      });
    }

    // For advanced stats, always use all contributors (no contributor filtering)
    const allContributors = repoStats.contributors;

    // Calculate filtered total commits
    const filteredTotalCommits = filteredActivity.reduce((sum, activity) => sum + activity.count, 0);

    return {
      ...repoStats,
      commitActivity: filteredActivity,
      contributors: allContributors,
      totalCommits: filteredTotalCommits,
    };
  }, [repoStats, filters.startDate, filters.endDate]); // Only depend on date filters

  const handleRepositorySelected = (path: string) => {
    setSelectedRepoPath(path);
    setRepoStats(null);
    setStatsError(null);
    setCsvError(null);
    setFilters({});
    fetchStats(path, {}); // Fetch all data initially
  };

  const handleConfigurationRequested = () => {
    setIsConfigOpen(true);
  };

  const handleGlobalConfigurationRequested = () => {
    setIsGlobalConfigOpen(true);
  };

  const handleConfigurationSaved = () => {
    // Refresh stats when configuration is saved
    if (selectedRepoPath) {
      fetchStats(selectedRepoPath, filters);
    }
  };

  const handleGlobalConfigurationSaved = () => {
    // Refresh stats when global configuration is saved
    if (selectedRepoPath) {
      fetchStats(selectedRepoPath, filters);
    }
  };

  const handleFilterChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
    
    // If contributor filter changed and we're in basic view, refetch data from API
    if (newFilters.contributor !== filters.contributor && selectedRepoPath && activeView === 'basic') {
      fetchStats(selectedRepoPath, newFilters, true);
    }
  };

  const handleContributorClick = (contributorName: string) => {
    const newFilters = { ...filters, contributor: contributorName };
    setFilters(newFilters);
    
    // Refetch data with the new contributor filter (only for basic view)
    if (selectedRepoPath && activeView === 'basic') {
      fetchStats(selectedRepoPath, newFilters, true);
    }
  };

  const handleClearContributorFilter = () => {
    const filtersWithoutContributor = { ...filters };
    delete filtersWithoutContributor.contributor;
    setFilters(filtersWithoutContributor);
    
    // Refetch data without the contributor filter (only for basic view)
    if (selectedRepoPath && activeView === 'basic') {
      fetchStats(selectedRepoPath, filtersWithoutContributor, true);
    }
  };

  const fetchStats = useCallback(async (repoPath: string, currentFilters?: typeof filters, isFilterChange: boolean = false) => {
    if (!repoPath) return;

    if (isFilterChange) {
      setIsFilteringCommits(true);
    } else {
      setIsLoadingStats(true);
    }
    setStatsError(null);
    setCsvError(null);

    try {
      const response = await fetch('/api/stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoPath, filters: currentFilters || {} }),
      });

      const data = await response.json();

      if (response.ok) {
        setRepoStats(data);
      } else {
        setStatsError(data.error || 'Failed to fetch statistics.');
        setRepoStats(null);
      }
    } catch (err: unknown) {
      console.error('Error fetching stats:', err);
      setStatsError(`An unexpected error occurred: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setRepoStats(null);
    } finally {
      if (isFilterChange) {
        setIsFilteringCommits(false);
      } else {
        setIsLoadingStats(false);
      }
    }
  }, []);

  const handleDownloadCsv = async () => {
    if (!selectedRepoPath) return;

    setIsDownloadingCsv(true);
    setCsvError(null);

    try {
      const response = await fetch('/api/csv-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ repoPath: selectedRepoPath, filters }),
      });

      if (response.ok) {
        const disposition = response.headers.get('Content-Disposition');
        let filename = 'git_stats_export.csv';
        if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) {
            filename = matches[1].replace(/['"]/g, '');
          }
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        setCsvError(errorData.error || 'Failed to download CSV.');
      }
    } catch (err: unknown) {
      console.error('Error downloading CSV:', err);
      setCsvError(`An unexpected error occurred during CSV download: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsDownloadingCsv(false);
    }
  };

  // Only fetch stats when repository changes, not when filters change
  useEffect(() => {
    if (selectedRepoPath) {
      fetchStats(selectedRepoPath, {}); // Fetch all data initially
    }
  }, [selectedRepoPath, fetchStats]);

  return (
    <main className="main-container">
      <div className="header-section">
        <h1 className="header-title">
          Local Git Repository Statistics
        </h1>
        <div className="header-controls">
          <ConfigurationButton onClick={handleGlobalConfigurationRequested} />
          <DarkModeToggle />
        </div>
      </div>

      <div className="content-container mb-lg">
        <RepositorySelector 
          onRepositorySelected={handleRepositorySelected} 
          onConfigurationRequested={handleConfigurationRequested}
          isLoadingStats={isLoadingStats}
        />
      </div>

      {selectedRepoPath && (
        <div className="content-container">
          {/* Repository Info and Download Section */}
          <div className="repo-info-section">
            <div className="repo-info-content">
              <div className="repo-info-text">
                <div className="repo-path-display">
                  {isLoadingStats ? (
                    <span>Loading repository...</span>
                  ) : (
                    <>
                      Statistics for: <code className="repo-path-code">{selectedRepoPath}</code>
                    </>
                  )}
                </div>
                {repoStats && !isLoadingStats && (
                  <div className="repo-url-display">
                    Repository: {repoStats.remoteUrl ? (
                      <button
                        onClick={() => {
                          window.open(repoStats.remoteUrl, '_blank');
                        }}
                        className="repo-link-button"
                        title="Click to open GitHub repository in a new tab"
                      >
                        {repoStats.remoteUrl}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          // Open the repository in file explorer in a new tab
                          const fileUrl = `file://${selectedRepoPath.replace(/\\/g, '/')}`;
                          window.open(fileUrl, '_blank');
                        }}
                        className="repo-link-button"
                        title="Click to open in file explorer"
                      >
                        {selectedRepoPath}
                      </button>
                    )}
                  </div>
                )}
              </div>
              
              {/* Download Button */}
              {repoStats && !isLoadingStats && (
                <div className="download-section">
                  <button
                    onClick={handleDownloadCsv}
                    disabled={isDownloadingCsv}
                    className="btn btn-secondary"
                  >
                    {isDownloadingCsv ? 'Downloading...' : 'Download Daily Stats (CSV)'}
                  </button>
                  {csvError && (
                    <p className="download-error">CSV Download Error: {csvError}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Statistics View Selector - positioned below repository info */}
          {repoStats && !isLoadingStats && !statsError && (
            <div className="view-selector">
              <div className="view-selector-container">
                <button
                  onClick={() => setActiveView('basic')}
                  className={`view-selector-button ${activeView === 'basic' ? 'active' : ''}`}
                >
                  📊 Basic Stats
                </button>
                <button
                  onClick={() => setActiveView('advanced')}
                  className={`view-selector-button ${activeView === 'advanced' ? 'active' : ''}`}
                >
                  🔍 Advanced Analytics
                </button>
              </div>
            </div>
          )}

          {/* Filtering Status Section */}
          {isFilteringCommits && (
            <div className="filtering-status-section">
              <div className="filtering-status-content">
                <p className="filtering-message">Filtering commits...</p>
                <p className="applying-config-message">Applying configuration...</p>
              </div>
            </div>
          )}

          {isLoadingStats && (
            <p className="loading-message">Loading statistics...</p>
          )}
          {statsError && (
            <div className="error-alert" role="alert">
                <strong>Error fetching stats:</strong>
                <span> {statsError}</span>
            </div>
          )}

          {/* Stats Content Section */}
          {repoStats && !isLoadingStats && !statsError && (
            <div className="stats-content">
              {activeView === 'basic' && (
                <>
                  {/* Full Filters for Basic Stats (all filters work) */}
                  {repoStats?.allContributors && (
                    <div className="mb-lg">
                      <BasicFilters
                        allContributors={repoStats.allContributors}
                        currentFilters={filters}
                        onFilterChange={handleFilterChange}
                        firstCommitDate={repoStats.firstCommitDate}
                        lastCommitDate={repoStats.lastCommitDate}
                      />
                    </div>
                  )}
                  
                  {/* Total Commits Section with Loading State */}
                  <div className="total-commits-section">
                    {isFilteringCommits ? (
                      <div className="loading-placeholder">
                        <p className="text-secondary">Filtering commits...</p>
                        <p className="text-secondary">Applying configuration...</p>
                      </div>
                    ) : basicFilteredStats ? (
                      <>
                        <p className="text-secondary">Total Commits Analyzed (matching filters): {basicFilteredStats.totalCommits}</p>
                        <p className="text-secondary">Total Commits Analyzed (configuration applied): {basicFilteredStats.totalCommitsWithConfig}</p>
                      </>
                    ) : (
                      <div className="loading-placeholder">
                        <p className="text-secondary">Loading commit statistics...</p>
                      </div>
                    )}
                  </div>

                  {/* Commit Frequency Stats with Placeholder */}
                  {isFilteringCommits ? (
                    <div className="loading-placeholder">
                      <h3>Overall Commit Frequency Distribution</h3>
                      <p>Loading frequency data...</p>
                    </div>
                  ) : basicFilteredStats ? (
                    <CommitFrequencyStats commitActivity={basicFilteredStats.commitActivity} />
                  ) : (
                    <div className="loading-placeholder">
                      <h3>Overall Commit Frequency Distribution</h3>
                      <p>Loading frequency data...</p>
                    </div>
                  )}

                  {/* Contributor Stats Table with Placeholder */}
                  {isFilteringCommits ? (
                    <div className="loading-placeholder">
                      <h3>Contributor Statistics</h3>
                      <p>Loading contributor data...</p>
                    </div>
                  ) : basicFilteredStats ? (
                    <ContributorStatsTable 
                      contributors={basicFilteredStats.contributors} 
                      onContributorClick={handleContributorClick}
                      onClearContributorFilter={handleClearContributorFilter}
                      isFiltered={!!filters.contributor}
                    />
                  ) : (
                    <div className="loading-placeholder">
                      <h3>Contributor Statistics</h3>
                      <p>Loading contributor data...</p>
                    </div>
                  )}

                  {/* Charts with Placeholders */}
                  {isFilteringCommits ? (
                    <>
                      <div className="loading-placeholder">
                        <h3>Commit Activity Chart</h3>
                        <p>Loading chart data...</p>
                      </div>
                      <div className="loading-placeholder">
                        <h3>Lines Changed Chart</h3>
                        <p>Loading chart data...</p>
                      </div>
                    </>
                  ) : basicFilteredStats ? (
                    <>
                      <CommitActivityChart 
                        commitActivity={basicFilteredStats.commitActivity} 
                        isFilteredByAuthor={!!filters.contributor}
                        firstDayOfWeek={basicFilteredStats.globalConfig?.firstDayOfWeek}
                      />
                      <LinesChangedChart 
                        commitActivity={basicFilteredStats.commitActivity}
                        firstDayOfWeek={basicFilteredStats.globalConfig?.firstDayOfWeek}
                      />
                    </>
                  ) : (
                    <>
                      <div className="loading-placeholder">
                        <h3>Commit Activity Chart</h3>
                        <p>Loading chart data...</p>
                      </div>
                      <div className="loading-placeholder">
                        <h3>Lines Changed Chart</h3>
                        <p>Loading chart data...</p>
                      </div>
                    </>
                  )}
                </>
              )}
              
              {activeView === 'advanced' && (
                <>
                  {/* Date-Only Filters for Advanced Analytics (contributor filter doesn't apply) */}
                  <div className="mb-lg">
                    <AdvancedFilters
                      currentFilters={{ startDate: filters.startDate, endDate: filters.endDate }}
                      onFilterChange={(dateFilters) => handleFilterChange({ ...filters, ...dateFilters })}
                      firstCommitDate={repoStats?.firstCommitDate}
                      lastCommitDate={repoStats?.lastCommitDate}
                    />
                  </div>
                  
                  {/* Total Commits Section for Advanced */}
                  <div className="total-commits-section">
                    {isFilteringCommits ? (
                      <div className="loading-placeholder">
                        <p className="text-secondary">Filtering commits...</p>
                        <p className="text-secondary">Applying configuration...</p>
                      </div>
                    ) : advancedFilteredStats ? (
                      <>
                        <p className="text-secondary">Total Commits Analyzed (matching filters): {advancedFilteredStats.totalCommits}</p>
                        <p className="text-secondary">Total Commits Analyzed (configuration applied): {advancedFilteredStats.totalCommitsWithConfig}</p>
                      </>
                    ) : (
                      <div className="loading-placeholder">
                        <p className="text-secondary">Loading commit statistics...</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Performance Dashboard with Placeholder */}
                  {isFilteringCommits ? (
                    <div className="loading-placeholder">
                      <h3>Performance Dashboard</h3>
                      <p>Loading performance data...</p>
                    </div>
                  ) : advancedFilteredStats ? (
                    <PerformanceDashboard 
                      repoPath={selectedRepoPath} 
                      filters={filters}
                      commitActivity={advancedFilteredStats.commitActivity}
                      firstDayOfWeek={advancedFilteredStats.globalConfig?.firstDayOfWeek}
                    />
                  ) : (
                    <div className="loading-placeholder">
                      <h3>Performance Dashboard</h3>
                      <p>Loading performance data...</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

           {!((activeView === 'basic' && basicFilteredStats) || (activeView === 'advanced' && advancedFilteredStats)) && !isLoadingStats && !statsError && selectedRepoPath && (
                <p className="no-data-message">No statistics loaded. Check filters or repository content.</p>
           )}
        </div>
      )}

      {/* Project Configuration Modal */}
      {selectedRepoPath && (
        <ProjectConfiguration
          repoPath={selectedRepoPath}
          isOpen={isConfigOpen}
          onClose={() => setIsConfigOpen(false)}
          onConfigurationSaved={handleConfigurationSaved}
        />
      )}

      {/* Global Configuration Modal */}
      <GlobalConfiguration
        isOpen={isGlobalConfigOpen}
        onClose={() => setIsGlobalConfigOpen(false)}
        onConfigurationSaved={handleGlobalConfigurationSaved}
      />
    </main>
  );
}

