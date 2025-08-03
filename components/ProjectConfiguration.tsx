'use client';

import React, { useState, useEffect } from 'react';
import InfoIcon from './InfoIcon';

interface ProjectConfigurationProps {
  repoPath: string;
  isOpen: boolean;
  onClose: () => void;
  onConfigurationSaved: () => void;
}

interface ProjectConfig {
  groupedAuthors: Array<{
    primaryName: string;
    aliases: string[];
  }>;
  excludedUsers: string[];
}

interface ContributorsResponse {
  contributors: string[];
}

const ProjectConfiguration: React.FC<ProjectConfigurationProps> = ({
  repoPath,
  isOpen,
  onClose,
  onConfigurationSaved
}) => {
  const [config, setConfig] = useState<ProjectConfig>({
    groupedAuthors: [],
    excludedUsers: []
  });
  const [contributors, setContributors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedGroupedAuthor, setSelectedGroupedAuthor] = useState<number | null>(null);
  const [editingExcludedUser, setEditingExcludedUser] = useState<number | null>(null);
  const [editingAlias, setEditingAlias] = useState<{authorIndex: number, aliasIndex: number} | null>(null);

  // Load configuration and contributors when component opens
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
      loadContributors();
    }
  }, [isOpen, repoPath]);

  const loadConfiguration = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/project-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'load',
          repoPath 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        const configData = data.config || { groupedAuthors: [], excludedUsers: [] };
        setConfig(configData);
      } else {
        setError(data.error || 'Failed to load configuration.');
      }
    } catch (err) {
      console.error('Error loading configuration:', err);
      setError('An unexpected error occurred while loading configuration.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadContributors = async () => {
    try {
      const response = await fetch('/api/project-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'get-contributors',
          repoPath 
        }),
      });

      const data: ContributorsResponse = await response.json();

      if (response.ok) {
        setContributors(data.contributors || []);
      } else {
        console.error('Failed to load contributors:', data);
        setContributors([]);
      }
    } catch (err) {
      console.error('Error loading contributors:', err);
      setContributors([]);
    }
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/project-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'save',
          repoPath,
          config 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess('Configuration saved successfully!');
        onConfigurationSaved();
        setTimeout(() => {
          setSuccess(null);
        }, 3000);
      } else {
        setError(data.error || 'Failed to save configuration.');
      }
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError('An unexpected error occurred while saving configuration.');
    } finally {
      setIsSaving(false);
    }
  };

  // Grouped Authors CRUD operations
  const createGroupedAuthor = () => {
    const newAuthor = { primaryName: '', aliases: [] };
    setConfig(prev => ({
      ...prev,
      groupedAuthors: [...prev.groupedAuthors, newAuthor]
    }));
    setSelectedGroupedAuthor(config.groupedAuthors.length);
  };

  const updateGroupedAuthor = (index: number, field: 'primaryName' | 'aliases', value: string | string[]) => {
    setConfig(prev => ({
      ...prev,
      groupedAuthors: prev.groupedAuthors.map((author, i) => 
        i === index ? { ...author, [field]: value } : author
      )
    }));
  };

  const deleteGroupedAuthor = (index: number) => {
    setConfig(prev => ({
      ...prev,
      groupedAuthors: prev.groupedAuthors.filter((_, i) => i !== index)
    }));
    if (selectedGroupedAuthor === index) {
      setSelectedGroupedAuthor(null);
    } else if (selectedGroupedAuthor && selectedGroupedAuthor > index) {
      setSelectedGroupedAuthor(selectedGroupedAuthor - 1);
    }
  };

  const addAlias = (authorIndex: number) => {
    setConfig(prev => ({
      ...prev,
      groupedAuthors: prev.groupedAuthors.map((author, i) => 
        i === authorIndex 
          ? { ...author, aliases: [...author.aliases, ''] }
          : author
      )
    }));
    // Start editing the newly added alias immediately
    const newAliasIndex = config.groupedAuthors[authorIndex].aliases.length;
    setEditingAlias({ authorIndex, aliasIndex: newAliasIndex });
  };

  const deleteAlias = (authorIndex: number, aliasIndex: number) => {
    setConfig(prev => ({
      ...prev,
      groupedAuthors: prev.groupedAuthors.map((author, i) => 
        i === authorIndex 
          ? { ...author, aliases: author.aliases.filter((_, j) => j !== aliasIndex) }
          : author
      )
    }));
  };

  const startEditingAlias = (authorIndex: number, aliasIndex: number) => {
    setEditingAlias({ authorIndex, aliasIndex });
  };

  const finishEditingAlias = () => {
    setEditingAlias(null);
  };

  const updateAliasValue = (authorIndex: number, aliasIndex: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      groupedAuthors: prev.groupedAuthors.map((author, i) => 
        i === authorIndex 
          ? { 
              ...author, 
              aliases: author.aliases.map((alias, j) => j === aliasIndex ? value : alias)
            }
          : author
      )
    }));
  };

  // Excluded Users CRUD operations
  const createExcludedUser = () => {
    setConfig(prev => ({
      ...prev,
      excludedUsers: [...prev.excludedUsers, '']
    }));
    setEditingExcludedUser(config.excludedUsers.length);
  };

  const updateExcludedUser = (index: number, value: string) => {
    setConfig(prev => ({
      ...prev,
      excludedUsers: prev.excludedUsers.map((user, i) => i === index ? value : user)
    }));
  };

  const deleteExcludedUser = (index: number) => {
    setConfig(prev => ({
      ...prev,
      excludedUsers: prev.excludedUsers.filter((_, i) => i !== index)
    }));
    if (editingExcludedUser === index) {
      setEditingExcludedUser(null);
    } else if (editingExcludedUser && editingExcludedUser > index) {
      setEditingExcludedUser(editingExcludedUser - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="project-config-overlay">
      <div className="project-config-modal">
        <div className="project-config-header">
          <h2 className="project-config-title">Project Configuration</h2>
          <button 
            onClick={onClose}
            className="project-config-close"
            aria-label="Close configuration"
          >
            ×
          </button>
        </div>

        <div className="project-config-content">
          {isLoading ? (
            <div className="project-config-loading">
              <p>Loading configuration...</p>
            </div>
          ) : (
            <>
              {/* Grouped Authors Section - Master Detail Table */}
              <div className="config-section">
                <div className="config-section-header">
                  <h3 className="config-section-title">
                    Grouped Authors
                    <InfoIcon 
                      content="Authors who have used different email addresses or names but are the same person. Their contributions will be combined in statistics."
                    />
                  </h3>
                  <button 
                    onClick={createGroupedAuthor}
                    className="btn btn-primary"
                  >
                    + Add Group
                  </button>
                </div>

                <div className="master-detail-container">
                  {/* Master Table */}
                  <div className="master-table">
                    <table className="config-table">
                      <thead>
                        <tr>
                          <th>Primary Name</th>
                          <th>Aliases Count</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {config.groupedAuthors.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="empty-table-message">
                              No grouped authors configured
                            </td>
                          </tr>
                        ) : (
                          config.groupedAuthors.map((author, index) => (
                            <tr 
                              key={index} 
                              className={`table-row ${selectedGroupedAuthor === index ? 'selected' : ''}`}
                              onClick={() => setSelectedGroupedAuthor(index)}
                            >
                              <td>{author.primaryName || 'Not selected'}</td>
                              <td>{author.aliases.filter(alias => alias.trim() !== '').length}</td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteGroupedAuthor(index);
                                    }}
                                    className="table-action-button delete"
                                    title="Delete group"
                                  >
                                    <svg 
                                      className="delete-icon-svg" 
                                      fill="currentColor" 
                                      viewBox="0 0 24 24"
                                    >
                                      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                    </svg>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Detail Panel */}
                  {selectedGroupedAuthor !== null && config.groupedAuthors[selectedGroupedAuthor] && (
                    <div className="detail-panel">
                      <div className="detail-header">
                        <h4>Edit Grouped Author</h4>
                        <button
                          onClick={() => setSelectedGroupedAuthor(null)}
                          className="btn btn-ghost"
                        >
                          ×
                        </button>
                      </div>
                      
                      <div className="detail-content">
                        <div className="detail-field">
                          <label>Primary Name:</label>
                          <select
                            value={config.groupedAuthors[selectedGroupedAuthor].primaryName}
                            onChange={(e) => updateGroupedAuthor(selectedGroupedAuthor, 'primaryName', e.target.value)}
                            className="detail-select"
                            disabled={config.groupedAuthors[selectedGroupedAuthor].primaryName !== ''}
                          >
                            <option value="">Select primary author...</option>
                            {contributors.map((contributor) => (
                              <option key={contributor} value={contributor}>
                                {contributor}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="detail-field">
                          <label>Aliases:</label>
                          <div className="aliases-table-container">
                            <table className="aliases-table">
                              <thead>
                                <tr>
                                  <th>Alias</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {config.groupedAuthors[selectedGroupedAuthor].aliases.length === 0 ? (
                                  <tr>
                                    <td colSpan={2} className="empty-table-message">
                                      No aliases configured
                                    </td>
                                  </tr>
                                ) : (
                                  config.groupedAuthors[selectedGroupedAuthor].aliases.map((alias, aliasIndex) => (
                                    <tr key={aliasIndex} className="alias-table-row">
                                      <td>
                                        {editingAlias?.authorIndex === selectedGroupedAuthor && editingAlias?.aliasIndex === aliasIndex ? (
                                          <select
                                            value={alias}
                                            onChange={(e) => updateAliasValue(selectedGroupedAuthor, aliasIndex, e.target.value)}
                                            onBlur={finishEditingAlias}
                                            className="alias-table-select"
                                            autoFocus
                                          >
                                            <option value="">Select user as alias...</option>
                                            {contributors.map((contributor) => (
                                              <option key={contributor} value={contributor}>
                                                {contributor}
                                              </option>
                                            ))}
                                          </select>
                                        ) : (
                                          <span 
                                            className="table-cell-content"
                                            onClick={() => startEditingAlias(selectedGroupedAuthor, aliasIndex)}
                                          >
                                            {alias}
                                          </span>
                                        )}
                                      </td>
                                      <td>
                                        <div className="table-actions">
                                          <button
                                            onClick={() => deleteAlias(selectedGroupedAuthor, aliasIndex)}
                                            className="table-action-button delete"
                                            title="Remove alias"
                                          >
                                            <svg 
                                              className="delete-icon-svg" 
                                              fill="currentColor" 
                                              viewBox="0 0 24 24"
                                            >
                                              <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                            </svg>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                            <button
                              onClick={() => addAlias(selectedGroupedAuthor)}
                              className="btn btn-primary"
                            >
                              + Add Alias
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Excluded Users Section - Simple Table */}
              <div className="config-section">
                <div className="config-section-header">
                  <h3 className="config-section-title">
                    Excluded Users
                    <InfoIcon 
                      content="Users whose contributions should be excluded from all statistics and comparisons."
                    />
                  </h3>
                  <button 
                    onClick={createExcludedUser}
                    className="btn btn-primary"
                  >
                    + Add User
                  </button>
                </div>

                <div className="simple-table-container">
                  <table className="config-table">
                    <thead>
                      <tr>
                        <th>User Name</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {config.excludedUsers.length === 0 ? (
                        <tr>
                          <td colSpan={2} className="empty-table-message">
                            No excluded users configured
                          </td>
                        </tr>
                      ) : (
                        config.excludedUsers.map((user, index) => (
                          <tr key={index} className="table-row">
                            <td>
                              {editingExcludedUser === index ? (
                                <select
                                  value={user}
                                  onChange={(e) => updateExcludedUser(index, e.target.value)}
                                  onBlur={() => setEditingExcludedUser(null)}
                                  className="table-select"
                                  autoFocus
                                >
                                  <option value="">Select user to exclude...</option>
                                  {contributors.map((contributor) => (
                                    <option key={contributor} value={contributor}>
                                      {contributor}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span 
                                  className="table-cell-content"
                                  onClick={() => setEditingExcludedUser(index)}
                                >
                                  {user || 'Not selected'}
                                </span>
                              )}
                            </td>
                            <td>
                              <div className="table-actions">
                                <button
                                  onClick={() => deleteExcludedUser(index)}
                                  className="table-action-button delete"
                                  title="Delete user"
                                >
                                  <svg 
                                    className="delete-icon-svg" 
                                    fill="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="config-error-message">
                  {error}
                </div>
              )}
              {success && (
                <div className="config-success-message">
                  {success}
                </div>
              )}

              {/* Action Buttons */}
              <div className="project-config-actions">
                <button
                  onClick={onClose}
                  className="btn btn-ghost"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={saveConfiguration}
                  disabled={isSaving}
                  className="btn btn-primary"
                >
                  {isSaving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectConfiguration; 