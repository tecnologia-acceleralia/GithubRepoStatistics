'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import InfoIcon from './InfoIcon';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
);

type TimePeriod = 'day' | 'week' | 'month' | 'trimester' | 'semester' | 'year' | 'all';

interface LinesChangedData {
  date: string; // Expecting 'YYYY-MM-DD'
  count: number;
  contributorCount: number;
  linesAdded: number;
  linesDeleted: number;
}

interface LinesChangedChartProps {
  commitActivity: LinesChangedData[];
  firstDayOfWeek?: 'sunday' | 'monday';
}

// Utility function to group data by time period
const groupDataByPeriod = (data: LinesChangedData[], period: TimePeriod, firstDayOfWeek: 'sunday' | 'monday' = 'sunday'): LinesChangedData[] => {
  if (period === 'day' || data.length === 0) {
    return data;
  }

  const grouped: Record<string, LinesChangedData> = {};

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
        linesAdded: 0,
        linesDeleted: 0
      };
    }

    grouped[key].count += item.count;
    grouped[key].contributorCount = Math.max(grouped[key].contributorCount, item.contributorCount);
    grouped[key].linesAdded += item.linesAdded;
    grouped[key].linesDeleted += item.linesDeleted;
  });

  return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
};

const LinesChangedChart: React.FC<LinesChangedChartProps> = ({ commitActivity, firstDayOfWeek = 'sunday' }) => {
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('day');

  const groupedData = useMemo(() => {
    return groupDataByPeriod(commitActivity, selectedPeriod, firstDayOfWeek);
  }, [commitActivity, selectedPeriod]);

  if (!commitActivity || commitActivity.length === 0) {
    return <p className="lines-changed-chart-error">No lines changed data available for the selected period or filters.</p>;
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

  const chartData = {
    labels: groupedData.map(activity => activity.date),
    datasets: [
      {
        label: 'Lines Added',
        type: 'bar' as const,
        data: groupedData.map(activity => ({ x: activity.date, y: activity.linesAdded })),
        backgroundColor: 'rgba(75, 192, 192, 0.8)', // Teal color to match Commit Activity chart
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Lines Deleted',
        type: 'bar' as const,
        data: groupedData.map(activity => ({ x: activity.date, y: activity.linesDeleted })),
        backgroundColor: 'rgba(255, 99, 132, 0.8)', // Red color for deletions
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
        yAxisID: 'y',
      },
      {
        label: 'Net Contribution',
        type: 'line' as const,
        data: groupedData.map(activity => ({ 
          x: activity.date, 
          y: activity.linesAdded - activity.linesDeleted 
        })),
        borderColor: 'rgb(255, 193, 7)', // Yellow color to match Average Commits
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointHoverRadius: 5,
        fill: false,
        tension: 0.1,
        yAxisID: 'y1',
      },
    ],
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
        text: 'Lines Added, Deleted, and Net Contribution Over Time',
        color: '#e2e8f0', // Lighter gray for dark mode title
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false,
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: getTimeUnit(),
          minUnit: getTimeUnit(),
          tooltipFormat: 'PPP (EEEE)',
          displayFormats: {
            day: 'MMM d (EEE)',
            week: 'MMM d',
            month: 'MMM yyyy',
            year: 'yyyy'
          }
        },
        title: {
          display: true,
          text: 'Date',
          color: '#94a3b8',
        },
        ticks: {
          color: '#cbd5e1',
          maxRotation: 45,
          minRotation: 45,
        },
        grid: {
          color: '#374151',
        },
        stacked: true,
      },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        title: {
          display: true,
          text: 'Lines Added/Deleted',
          color: '#94a3b8',
        },
        beginAtZero: true,
        ticks: {
          color: '#cbd5e1',
          precision: 0
        },
        grid: {
          color: '#374151',
        },
        stacked: true,
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        title: {
          display: true,
          text: 'Net Contribution',
          color: 'rgb(255, 193, 7)', // Yellow color to match the line
        },
        ticks: {
          color: '#cbd5e1',
          precision: 0
        },
        grid: {
          drawOnChartArea: false, // Only show grid lines for primary y-axis
        },
      },
    },
  };

  return (
    <div className="chart-container lines-changed-chart">
      <div className="chart-header">
        <div className="chart-title-section">
          <h3 className="chart-title">Lines Changed & Net Contribution</h3>
          <InfoIcon content="This chart shows code changes over time:<br><br>• Teal bars (left axis): Lines of code added<br>• Red bars (left axis): Lines of code deleted<br>• Yellow line (right axis): Net contribution (added - deleted)<br><br>📈 <strong>Understanding Net Contribution:</strong><br>The bars are stacked to show total daily activity. The yellow line shows the net impact:<br><br>• Positive values: More code was added than removed (codebase grew)<br>• Negative values: More code was removed than added (codebase shrank)<br>• Zero line: Equal additions and deletions (refactoring)<br><br>📊 Use the dropdown to group data by different time periods." />
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
        <Chart type="bar" options={options} data={chartData} />
      </div>
    </div>
  );
};

export default LinesChangedChart; 