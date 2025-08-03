	'use client';

import React, { useState, useMemo } from 'react';
import InfoIcon from './InfoIcon';
import SortIcon from './SortIcon';

interface ContributorStatsData {
  commits: number;
  linesAdded: number;
  linesDeleted: number;
  filesChanged: number; // Updated: Now a number (count)
}

interface ContributorStatsTableProps {
  contributors: Record<string, ContributorStatsData>;
  onContributorClick: (contributorName: string) => void; // Add prop for click handling
  onClearContributorFilter?: () => void; // Add prop for clearing contributor filter
  isFiltered?: boolean; // Add prop to know if table is filtered
}

type SortColumn = 'name' | 'commits' | 'linesAdded' | 'linesDeleted' | 'netContribution' | 'filesChanged';
type SortDirection = 'asc' | 'desc';

const ContributorStatsTable: React.FC<ContributorStatsTableProps> = ({ 
  contributors, 
  onContributorClick, 
  onClearContributorFilter,
  isFiltered = false 
}) => {
  const [sortColumn, setSortColumn] = useState<SortColumn>('commits');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const contributorNames = Object.keys(contributors);

  const sortedContributors = useMemo(() => {
    return contributorNames.sort((a, b) => {
      const statsA = contributors[a];
      const statsB = contributors[b];
      
      let valueA: string | number;
      let valueB: string | number;

      switch (sortColumn) {
        case 'name':
          valueA = a.toLowerCase();
          valueB = b.toLowerCase();
          break;
        case 'commits':
          valueA = statsA.commits;
          valueB = statsB.commits;
          break;
        case 'linesAdded':
          valueA = statsA.linesAdded;
          valueB = statsB.linesAdded;
          break;
        case 'linesDeleted':
          valueA = statsA.linesDeleted;
          valueB = statsB.linesDeleted;
          break;
        case 'netContribution':
          valueA = statsA.linesAdded - statsA.linesDeleted;
          valueB = statsB.linesAdded - statsB.linesDeleted;
          break;
        case 'filesChanged':
          valueA = statsA.filesChanged;
          valueB = statsB.filesChanged;
          break;
        default:
          valueA = statsA.commits;
          valueB = statsB.commits;
      }

      if (valueA < valueB) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [contributors, contributorNames, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc'); // Default to desc for numeric columns, asc for name
    }
  };

  const getSortIcon = (column: SortColumn) => {
    const isActive = sortColumn === column;
    const direction = isActive ? sortDirection : null;
    return <SortIcon isActive={isActive} direction={direction} />;
  };

  if (contributorNames.length === 0) {
    return <p className="contributor-table-empty">No contributor data available for the selected period or filters.</p>;
  }

  return (
    <div className="contributor-stats-table">
      <div className="table-header">
        <div className="table-title-section">
          <h3 className="table-title">Contributor Statistics</h3>
          <InfoIcon content="This table shows each contributor&apos;s activity metrics:<br><br>• Commits: Total number of commits made<br>• Lines Added: New code lines contributed (shown in green)<br>• Lines Deleted: Code lines removed or modified (shown in red)<br>• Net Contribution: Lines Added minus Lines Deleted (positive = net addition)<br>• Files Changed: Number of unique files modified<br><br>💡 <strong>Interactive Features:</strong><br>• Click any contributor name to filter all charts to show only their activity<br>• Click column headers to sort the data by that metric" />
        </div>
        {isFiltered && onClearContributorFilter && (
          <button 
            onClick={onClearContributorFilter}
            className="btn btn-tertiary"
            title="Clear contributor filter"
          >
            Clear Contributor Filter
          </button>
        )}
      </div>
      <table className="contributor-table">
        <thead>
          <tr>
            <th 
              scope="col" 
              onClick={() => handleSort('name')}
            >
              <div className="sort-header">
                <span>Contributor (Click to Filter)</span>
                {getSortIcon('name')}
              </div>
            </th>
            <th 
              scope="col" 
              onClick={() => handleSort('commits')}
            >
              <div className="sort-header">
                <span>Commits</span>
                {getSortIcon('commits')}
              </div>
            </th>
            <th 
              scope="col" 
              onClick={() => handleSort('linesAdded')}
            >
              <div className="sort-header">
                <span>Lines Added</span>
                {getSortIcon('linesAdded')}
              </div>
            </th>
            <th 
              scope="col" 
              onClick={() => handleSort('linesDeleted')}
            >
              <div className="sort-header">
                <span>Lines Deleted</span>
                {getSortIcon('linesDeleted')}
              </div>
            </th>
            <th 
              scope="col" 
              onClick={() => handleSort('netContribution')}
            >
              <div className="sort-header">
                <span>Net Contribution</span>
                {getSortIcon('netContribution')}
              </div>
            </th>
            <th 
              scope="col" 
              onClick={() => handleSort('filesChanged')}
            >
              <div className="sort-header">
                <span>Files Changed</span>
                {getSortIcon('filesChanged')}
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedContributors.map((name) => {
            const stats = contributors[name];
            const netContribution = stats.linesAdded - stats.linesDeleted;
            return (
              <tr key={name}>
                <td className="contributor-name">
                  {/* Make contributor name clickable */}
                  <button 
                    onClick={() => onContributorClick(name)} 
                    className="contributor-link"
                  >
                    {name}
                  </button>
                </td>
                <td className="commits">
                  {stats.commits}
                </td>
                <td className="lines-added">
                  +{stats.linesAdded}
                </td>
                <td className="lines-deleted">
                  -{stats.linesDeleted}
                </td>
                 <td className={`net-contribution ${netContribution >= 0 ? 'positive' : 'negative'}`}>
                  {netContribution >= 0 ? '+' : ''}{netContribution}
                </td>
                <td className="files-changed">
                  {stats.filesChanged} {/* Updated: Directly use the number */}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ContributorStatsTable;

