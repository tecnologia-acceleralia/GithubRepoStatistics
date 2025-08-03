'use client';

import React, { useState, useEffect } from 'react';
import { subDays, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from 'date-fns';

interface AdvancedFiltersProps {
  currentFilters: { startDate?: string; endDate?: string };
  onFilterChange: (newFilters: { startDate?: string; endDate?: string }) => void;
  firstCommitDate?: string;
  lastCommitDate?: string;
}

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ currentFilters, onFilterChange, firstCommitDate, lastCommitDate }) => {
  const [startDate, setStartDate] = useState(currentFilters.startDate || '');
  const [endDate, setEndDate] = useState(currentFilters.endDate || '');
  const [selectedPreset, setSelectedPreset] = useState('all');
  const [hasUserSelectedPreset, setHasUserSelectedPreset] = useState(false);

  // Update local state if currentFilters prop changes
  useEffect(() => {
    setStartDate(currentFilters.startDate || '');
    setEndDate(currentFilters.endDate || '');
    
    // Only reset to "all" if no filters are set AND user hasn't manually selected a preset
    if (!currentFilters.startDate && !currentFilters.endDate && !hasUserSelectedPreset) {
      setSelectedPreset('all');
    } else if (!currentFilters.startDate && !currentFilters.endDate) {
      // If filters are empty but user has selected a preset, keep the preset selection
      setSelectedPreset(selectedPreset);
    } else {
      setSelectedPreset('');
    }
  }, [currentFilters, hasUserSelectedPreset, selectedPreset]);

  // Set initial dates to repository min/max when preset is "all" and repository dates are available
  useEffect(() => {
    if (selectedPreset === 'all' && firstCommitDate && lastCommitDate && !currentFilters.startDate && !currentFilters.endDate) {
      setStartDate(firstCommitDate);
      setEndDate(lastCommitDate);
    }
  }, [firstCommitDate, lastCommitDate, selectedPreset, currentFilters.startDate, currentFilters.endDate]);

  const applyFilters = (newFilters: { startDate?: string; endDate?: string }) => {
    onFilterChange(newFilters);
  };

  const handleClearFilters = () => {
    setStartDate(firstCommitDate || '');
    setEndDate(lastCommitDate || '');
    setSelectedPreset('all');
    setHasUserSelectedPreset(false);
    applyFilters({
      startDate: firstCommitDate || undefined,
      endDate: lastCommitDate || undefined,
    });
  };

  const applyDateRange = (startDateFormatted: string, endDateFormatted: string) => {
    setStartDate(startDateFormatted);
    setEndDate(endDateFormatted);
    applyFilters({
      startDate: startDateFormatted,
      endDate: endDateFormatted,
    });
  };

  const handlePresetChange = (preset: string) => {
    setSelectedPreset(preset);
    setHasUserSelectedPreset(true);
    const today = new Date();

    switch (preset) {
      case 'last-week': {
        const lastWeekEnd = startOfWeek(today, { weekStartsOn: 0 });
        const lastWeekStart = startOfWeek(subDays(lastWeekEnd, 7), { weekStartsOn: 0 });
        
        const startDateFormatted = format(lastWeekStart, 'yyyy-MM-dd');
        const endDateFormatted = format(endOfWeek(lastWeekStart, { weekStartsOn: 0 }), 'yyyy-MM-dd');
        
        applyDateRange(startDateFormatted, endDateFormatted);
        break;
      }
      case 'last-month': {
        const lastMonthStart = startOfMonth(subMonths(today, 1));
        const lastMonthEnd = endOfMonth(lastMonthStart);
        
        const startDateFormatted = format(lastMonthStart, 'yyyy-MM-dd');
        const endDateFormatted = format(lastMonthEnd, 'yyyy-MM-dd');
        
        applyDateRange(startDateFormatted, endDateFormatted);
        break;
      }
      case 'last-trimester': {
        const lastTrimesterStart = startOfMonth(subMonths(today, 3));
        const lastTrimesterEnd = endOfMonth(subMonths(today, 1));
        
        const startDateFormatted = format(lastTrimesterStart, 'yyyy-MM-dd');
        const endDateFormatted = format(lastTrimesterEnd, 'yyyy-MM-dd');
        
        applyDateRange(startDateFormatted, endDateFormatted);
        break;
      }
      case 'last-semester': {
        const lastSemesterStart = startOfMonth(subMonths(today, 6));
        const lastSemesterEnd = endOfMonth(subMonths(today, 1));
        
        const startDateFormatted = format(lastSemesterStart, 'yyyy-MM-dd');
        const endDateFormatted = format(lastSemesterEnd, 'yyyy-MM-dd');
        
        applyDateRange(startDateFormatted, endDateFormatted);
        break;
      }
      case 'last-year': {
        const lastYearStart = startOfYear(subYears(today, 1));
        const lastYearEnd = endOfYear(subYears(today, 1));
        
        const startDateFormatted = format(lastYearStart, 'yyyy-MM-dd');
        const endDateFormatted = format(lastYearEnd, 'yyyy-MM-dd');
        
        applyDateRange(startDateFormatted, endDateFormatted);
        break;
      }
      case 'all': {
        const startDateFormatted = firstCommitDate || '';
        const endDateFormatted = lastCommitDate || '';
        
        setStartDate(startDateFormatted);
        setEndDate(endDateFormatted);
        applyFilters({
          startDate: startDateFormatted || undefined,
          endDate: endDateFormatted || undefined,
        });
        break;
      }
      default:
        break;
    }
  };

  return (
    <div className="advanced-filters">
      <h3 className="advanced-filters-title">Advanced Filters</h3>
      <div className="advanced-filters-grid">
        {/* Preset Filters */}
        <div className="advanced-filters-field">
          <label htmlFor="preset-dates" className="advanced-filters-label">
            Preset Dates
          </label>
          <select
            id="preset-dates"
            value={selectedPreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="form-control form-control-select"
          >
            <option value="all">All Time</option>
            <option value="last-week">Last Week</option>
            <option value="last-month">Last Month</option>
            <option value="last-trimester">Last Trimester (3 months)</option>
            <option value="last-semester">Last Semester (6 months)</option>
            <option value="last-year">Last Year</option>
          </select>
        </div>

        {/* Start Date */}
        <div className="advanced-filters-field">
          <label htmlFor="startDate" className="advanced-filters-label">
            Start Date {firstCommitDate && <span className="advanced-filters-label-info">(Repository starts: {firstCommitDate})</span>}
          </label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setSelectedPreset(''); // Clear preset when manually changing dates
              setHasUserSelectedPreset(false); // Reset user selection flag
              applyFilters({
                startDate: e.target.value || undefined,
                endDate: endDate || undefined,
              });
            }}
            className="form-control form-control-date"
          />
        </div>

        {/* End Date */}
        <div className="advanced-filters-field">
          <label htmlFor="endDate" className="advanced-filters-label">
            End Date {lastCommitDate && <span className="advanced-filters-label-info">(Repository ends: {lastCommitDate})</span>}
          </label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setSelectedPreset(''); // Clear preset when manually changing dates
              setHasUserSelectedPreset(false); // Reset user selection flag
              applyFilters({
                startDate: startDate || undefined,
                endDate: e.target.value || undefined,
              });
            }}
            className="form-control form-control-date"
          />
        </div>
      </div>

      {/* Action Button */}
      <div className="advanced-filters-actions">
        <button
          onClick={handleClearFilters}
          className="btn btn-tertiary"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};

export default AdvancedFilters; 