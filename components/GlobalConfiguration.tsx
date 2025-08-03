'use client';

import React, { useState, useEffect } from 'react';
import InfoIcon from './InfoIcon';

interface GlobalConfigurationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigurationSaved: () => void;
}

interface GlobalConfig {
  firstDayOfWeek: 'sunday' | 'monday';
}

const GlobalConfiguration: React.FC<GlobalConfigurationProps> = ({
  isOpen,
  onClose,
  onConfigurationSaved
}) => {
  const [config, setConfig] = useState<GlobalConfig>({
    firstDayOfWeek: 'sunday'
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load configuration when component opens
  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen]);

  const loadConfiguration = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/global-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'load'
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setConfig(data.config || { firstDayOfWeek: 'sunday' });
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

  const saveConfiguration = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/global-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'save',
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

  if (!isOpen) return null;

  return (
    <div className="global-config-overlay">
      <div className="global-config-modal">
        <div className="global-config-header">
          <h2 className="global-config-title">Global Configuration</h2>
          <button 
            onClick={onClose}
            className="global-config-close"
            aria-label="Close configuration"
          >
            ×
          </button>
        </div>

        <div className="global-config-content">
          {isLoading ? (
            <div className="global-config-loading">
              <p>Loading configuration...</p>
            </div>
          ) : (
            <>
              {/* First Day of Week Section */}
              <div className="config-section">
                <div className="config-section-header">
                  <h3 className="config-section-title">
                    First Day of Week
                    <InfoIcon 
                      content="This setting determines how weeks are displayed in charts and statistics. Sunday is the traditional start of the week in many countries, while Monday is common in European countries."
                    />
                  </h3>
                </div>

                <div className="config-option">
                  <label className="config-option-label">
                    <input
                      type="radio"
                      name="firstDayOfWeek"
                      value="sunday"
                      checked={config.firstDayOfWeek === 'sunday'}
                      onChange={(e) => setConfig(prev => ({ ...prev, firstDayOfWeek: e.target.value as 'sunday' | 'monday' }))}
                      className="config-radio"
                    />
                    <span className="config-radio-label">Sunday</span>
                  </label>
                  <label className="config-option-label">
                    <input
                      type="radio"
                      name="firstDayOfWeek"
                      value="monday"
                      checked={config.firstDayOfWeek === 'monday'}
                      onChange={(e) => setConfig(prev => ({ ...prev, firstDayOfWeek: e.target.value as 'sunday' | 'monday' }))}
                      className="config-radio"
                    />
                    <span className="config-radio-label">Monday</span>
                  </label>
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
              <div className="global-config-actions">
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

export default GlobalConfiguration; 