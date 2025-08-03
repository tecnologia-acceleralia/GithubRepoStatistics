	'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale, // Import TimeScale for time-based x-axis
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns'; // Import the date adapter
import InfoIcon from './InfoIcon';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale // Register TimeScale
);

type TimePeriod = 'day' | 'week' | 'month' | 'trimester' | 'semester' | 'year' | 'all';

interface CommitActivityData {
  date: string; // Expecting 'YYYY-MM-DD'
  count: number;
  contributorCount: number;
}

interface CommitActivityChartProps {
  commitActivity: CommitActivityData[];
  isFilteredByAuthor?: boolean;
  firstDayOfWeek?: 'sunday' | 'monday';
}

// Utility function to group data by time period
const groupDataByPeriod = (data: CommitActivityData[], period: TimePeriod, firstDayOfWeek: 'sunday' | 'monday' = 'sunday'): CommitActivityData[] => {
  if (period === 'day' || data.length === 0) {
    return data;
  }

  const grouped: Record<string, CommitActivityData> = {};

  data.forEach(item => {
    const date = new Date(item.date);
    let key: string;

    switch (period) {
      case 'week':
        const startOfWeek = new Date(date);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
        const firstDayOffset = firstDayOfWeek === 'monday' ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1) : dayOfWeek;
        startOfWeek.setDate(date.getDate() - firstDayOffset);
        key = startOfWeek.toISOString().split('T')[0];
        break;
      case 'month':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
        break;
      case 'trimester':
        const trimester = Math.floor(date.getMonth() / 3) + 1;
        const trimesterMonth = (trimester - 1) * 3 + 1;
        key = `${date.getFullYear()}-${String(trimesterMonth).padStart(2, '0')}-01`;
        break;
      case 'semester':
        const semester = date.getMonth() < 6 ? 1 : 7;
        key = `${date.getFullYear()}-${String(semester).padStart(2, '0')}-01`;
        break;
      case 'year':
        key = `${date.getFullYear()}-01-01`;
        break;
      case 'all':
        key = 'all-time';
        break;
      default:
        key = item.date;
    }

    if (!grouped[key]) {
      grouped[key] = {
        date: key,
        count: 0,
        contributorCount: 0,
      };
    }

    grouped[key].count += item.count;
    
    // For contributors, we need to count unique contributors across the period
    // This is an approximation since we don't have individual contributor data per day
    grouped[key].contributorCount = Math.max(grouped[key].contributorCount, item.contributorCount);
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

const CommitActivityChart: React.FC<CommitActivityChartProps> = ({ commitActivity, isFilteredByAuthor = false, firstDayOfWeek = 'sunday' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');

  const groupedData = useMemo(() => {
    return groupDataByPeriod(commitActivity, selectedPeriod, firstDayOfWeek);
  }, [commitActivity, selectedPeriod, firstDayOfWeek]);

  // Calculate average commits per period
  const averageCommits = useMemo(() => {
    if (groupedData.length === 0) return 0;
    const totalCommits = groupedData.reduce((sum, activity) => sum + activity.count, 0);
    return totalCommits / groupedData.length;
  }, [groupedData]);

  if (!commitActivity || commitActivity.length === 0) {
    return <p className="chart-error">No commit activity data available for the selected period or filters.</p>;
  }

  const getTimeUnit = (): 'day' | 'week' | 'month' | 'year' => {
    switch (selectedPeriod) {
      case 'day': return 'day';
      case 'week': return 'week';
      case 'month': return 'month';
      case 'trimester': 
      case 'semester': 
      case 'year': return 'month';
      case 'all': return 'year';
      default: return 'day';
    }
  };

  const datasets = [
    {
      label: 'Commits per Period',
      // Map data to {x: date, y: count} format for time scale
      data: groupedData.map(activity => ({ x: activity.date, y: activity.count })),
      fill: false,
      borderColor: 'rgb(75, 192, 192)',
      tension: 0.1,
      yAxisID: 'y',
    },
    {
      label: 'Average Commits',
      // Create a horizontal line at the average level
      data: groupedData.map(activity => ({ x: activity.date, y: averageCommits })),
      fill: false,
      borderColor: 'rgb(255, 193, 7)', // Yellow color for average line
      borderDash: [5, 5], // Dashed line
      tension: 0,
      yAxisID: 'y',
    },
  ];

  // Only add contributors dataset if not filtering by author
  if (!isFilteredByAuthor) {
    datasets.push({
      label: 'Contributors per Period',
      // Map data to {x: date, y: contributorCount} format for time scale
      data: groupedData.map(activity => ({ x: activity.date, y: activity.contributorCount })),
      fill: false,
      borderColor: 'rgb(255, 99, 132)', // Red color for contributors
      tension: 0.1,
      yAxisID: 'y1',
    });
  }

  const chartData = {
    // Use dates directly as x-values for the time scale
    labels: groupedData.map(activity => activity.date),
    datasets,
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
            color: '#cbd5e1', // Light gray for dark mode legend text
        }
      },
      title: {
        display: true,
        text: isFilteredByAuthor ? 'Commit Activity Over Time' : 'Commit Activity and Contributors Over Time',
        color: '#e2e8f0', // Lighter gray for dark mode title
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        type: 'time' as const, // Use time scale
        time: {
          unit: getTimeUnit(), // Display units based on selected period
          minUnit: getTimeUnit(), // Force minimum unit based on selected period
          tooltipFormat: 'PPP (EEEE)', // Format for tooltips (e.g., 'Jan 1, 2024 (Monday)')
          displayFormats: {
             day: 'MMM d (EEE)', // Format for axis labels (e.g., 'Jan 1 (Mon)')
             week: 'MMM d', // Week format
             month: 'MMM yyyy', // Month format
             year: 'yyyy' // Year format
          }
        },
        title: {
          display: true,
          text: 'Date',
          color: '#94a3b8', // Medium gray for axis titles
        },
         ticks: {
            color: '#cbd5e1', // Light gray for dark mode ticks
            maxRotation: 45,
            minRotation: 45,
         },
         grid: {
            color: '#374151', // Darker grid lines for dark mode
         }
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Number of Commits',
          color: 'rgb(75, 192, 192)', // Match commits line color
        },
        beginAtZero: true,
        ticks: {
            color: '#cbd5e1', // Light gray for dark mode ticks
            precision: 0 // Ensure whole numbers for commit counts
        },
        grid: {
            color: '#374151', // Darker grid lines for dark mode
        }
      },
      ...(isFilteredByAuthor ? {} : {
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: {
            display: true,
            text: 'Contributors',
            color: 'rgb(255, 99, 132)', // Match contributors line color
          },
          beginAtZero: true,
          min: 0,
          ticks: {
              color: '#cbd5e1', // Light gray for dark mode ticks
              precision: 0, // Ensure whole numbers for contributor counts
              stepSize: 1 // Force integer steps for contributors
          },
          grid: {
              drawOnChartArea: false, // Only show grid lines for primary y-axis
          }
        },
      }),
    },
    // Add layout options to ensure consistent height
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    },
    // Ensure the chart doesn't resize based on data
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5
      },
      line: {
        tension: 0.1
      }
    }
  };

  return (
    <div className="chart-container commit-activity-chart">
      <div className="chart-header">
        <div className="chart-title-section">
          <h3 className="chart-title">
            {isFilteredByAuthor ? 'Commit Activity' : 'Commit Activity & Contributors'}
          </h3>
          <InfoIcon content={
            isFilteredByAuthor 
              ? "This chart shows daily development activity over time for the selected author:<br><br>• Teal line: Number of commits per day<br>• Yellow dashed line: Average commits per day<br><br>📊 <strong>Time Period Grouping:</strong><br>Use the dropdown to group data by different time periods (daily, weekly, monthly, etc.).<br><br>🔍 <strong>This helps identify:</strong><br>• Individual development intensity patterns<br>• Personal productivity cycles<br>• Project milestones and sprints<br>• Quiet periods vs active development phases"
              : "This chart shows daily development activity over time:<br><br>• Teal line (left axis): Number of commits per day<br>• Yellow dashed line (left axis): Average commits per day<br>• Red line (right axis): Number of unique contributors per day<br><br>📊 <strong>Time Period Grouping:</strong><br>Use the dropdown to group data by different time periods (daily, weekly, monthly, etc.).<br><br>🔍 <strong>This helps identify:</strong><br>• Development intensity patterns<br>• Team collaboration levels<br>• Project milestones and sprints<br>• Quiet periods vs active development phases"
          } />
        </div>
        <div className="chart-controls">
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value as TimePeriod)}
            className="chart-period-selector"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="trimester">Trimester</option>
            <option value="semester">Semester</option>
            <option value="year">Yearly</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>
      <div className="chart-canvas-container">
        <div style={{ height: '100%', width: '100%', position: 'relative' }}>
          <Line options={options} data={chartData} />
        </div>
      </div>
    </div>
  );
};

export default CommitActivityChart;

