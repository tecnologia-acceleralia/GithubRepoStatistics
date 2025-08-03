'use client';

import React, { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler,
} from 'chart.js';
import { Line, Bar, Scatter } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import InfoIcon from './InfoIcon';
import MoreInfoButton from './MoreInfoButton';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  Filler
);

interface TrendData {
  date: string;
  count: number;
  contributorCount: number;
  linesAdded: number;
  linesDeleted: number;
}

interface TrendAnalysisChartProps {
  commitActivity: TrendData[];
  firstDayOfWeek?: 'sunday' | 'monday';
}

interface TrendAnalysis {
  slope: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  volatility: number;
  anomalies: { date: string; value: number; type: 'high' | 'low' }[];
  prediction: { date: string; value: number }[];
  seasonality: {
    dayOfWeek: Record<string, number>;
    monthOfYear: Record<string, number>;
  };
}

// Helper functions for status and analysis
const getTrendDirectionStatus = (trend: 'increasing' | 'decreasing' | 'stable'): 'success' | 'warning' | 'danger' | 'neutral' => {
  switch (trend) {
    case 'increasing': return 'success';
    case 'decreasing': return 'danger';
    case 'stable': return 'warning';
    default: return 'neutral';
  }
};

const getVolatilityStatus = (volatility: number): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (volatility > 0.5) return 'danger';
  if (volatility > 0.3) return 'warning';
  return 'success';
};

const getAnomaliesStatus = (anomalyCount: number): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (anomalyCount > 5) return 'danger';
  if (anomalyCount > 2) return 'warning';
  return 'success';
};

const getSlopeStatus = (slope: number): 'success' | 'warning' | 'danger' | 'neutral' => {
  if (slope > 0.5) return 'success';
  if (slope > 0.1) return 'warning';
  if (slope < -0.5) return 'danger';
  if (slope < -0.1) return 'warning';
  return 'neutral';
};

const getTrendDirectionAnalysis = (trend: 'increasing' | 'decreasing' | 'stable', slope: number): string => {
  const slopeValue = slope.toFixed(3);
  const slopeSign = slope > 0 ? '+' : '';
  
  let content = `📈 <strong>Trend Direction Analysis:</strong><br><br>`;
  
  switch (trend) {
    case 'increasing':
      content += `✅ <strong>Status: Rising Trend</strong><br>• Development activity is increasing over time<br>• Slope: ${slopeSign}${slopeValue} (positive growth rate)<br>• Indicates healthy project momentum<br><br>📊 <strong>Calculation:</strong><br>• Linear regression analysis on daily commit data<br>• Slope > 0.1 indicates increasing trend<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Team productivity is improving<br>• Project is gaining momentum<br>• Development velocity is increasing<br><br>🚀 <strong>Improvement Actions:</strong><br>• Maintain current development practices<br>• Continue team collaboration efforts<br>• Monitor for sustainable growth patterns<br>• Consider scaling successful processes`;
      break;
    case 'decreasing':
      content += `⚠️ <strong>Status: Declining Trend</strong><br>• Development activity is decreasing over time<br>• Slope: ${slopeSign}${slopeValue} (negative growth rate)<br>• May indicate project challenges<br><br>📊 <strong>Calculation:</strong><br>• Linear regression analysis on daily commit data<br>• Slope < -0.1 indicates decreasing trend<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Team productivity may be declining<br>• Project momentum is slowing<br>• Development velocity is decreasing<br><br>🔧 <strong>Improvement Actions:</strong><br>• Investigate potential blockers or issues<br>• Review team capacity and workload<br>• Consider process improvements<br>• Implement regular check-ins and support<br>• Address any technical debt or complexity issues`;
      break;
    case 'stable':
      content += `➡️ <strong>Status: Stable Trend</strong><br>• Development activity remains consistent<br>• Slope: ${slopeSign}${slopeValue} (minimal change)<br>• Indicates steady, predictable development<br><br>📊 <strong>Calculation:</strong><br>• Linear regression analysis on daily commit data<br>• Slope between -0.1 and 0.1 indicates stable trend<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Consistent development pace<br>• Predictable project velocity<br>• Sustainable development practices<br><br>🎯 <strong>Improvement Actions:</strong><br>• Consider if stable pace meets project goals<br>• Look for opportunities to optimize processes<br>• Ensure team has capacity for growth<br>• Monitor for any emerging trends`;
      break;
  }
  
  return content;
};

const getVolatilityAnalysis = (volatility: number): string => {
  const volatilityPercent = (volatility * 100).toFixed(1);
  
  let content = `🌊 <strong>Volatility Analysis:</strong><br><br>`;
  
  if (volatility > 0.5) {
    content += `⚠️ <strong>Status: High Volatility</strong><br>• Significant variation in daily activity (${volatilityPercent}%)<br>• Inconsistent development patterns<br>• May indicate unstable development practices<br><br>📊 <strong>Calculation:</strong><br>• Coefficient of variation = (Standard Deviation ÷ Mean) × 100<br>• High volatility = >50% variation<br>• Current volatility: ${volatilityPercent}%<br><br>💡 <strong>What This Means:</strong><br>• Unpredictable development pace<br>• Potential for missed deadlines<br>• Inconsistent team performance<br>• May indicate external factors affecting development<br><br>🔧 <strong>Improvement Actions:</strong><br>• Implement consistent development schedules<br>• Establish regular commit patterns<br>• Reduce external interruptions<br>• Improve project planning and estimation<br>• Consider agile methodologies for better predictability<br>• Address any team coordination issues`;
  } else if (volatility > 0.3) {
    content += `🔄 <strong>Status: Medium Volatility</strong><br>• Moderate variation in daily activity (${volatilityPercent}%)<br>• Some inconsistency in development patterns<br>• Room for improvement in predictability<br><br>📊 <strong>Calculation:</strong><br>• Coefficient of variation = (Standard Deviation ÷ Mean) × 100<br>• Medium volatility = 30-50% variation<br>• Current volatility: ${volatilityPercent}%<br><br>💡 <strong>What This Means:</strong><br>• Moderate predictability in development<br>• Some variation in team performance<br>• Potential for optimization<br><br>🎯 <strong>Improvement Actions:</strong><br>• Standardize development workflows<br>• Improve estimation accuracy<br>• Reduce variability in commit patterns<br>• Consider implementing development guidelines<br>• Monitor for patterns in high-activity days`;
  } else {
    content += `✅ <strong>Status: Low Volatility</strong><br>• Consistent daily activity (${volatilityPercent}% variation)<br>• Predictable development patterns<br>• Excellent development stability<br><br>📊 <strong>Calculation:</strong><br>• Coefficient of variation = (Standard Deviation ÷ Mean) × 100<br>• Low volatility = <30% variation<br>• Current volatility: ${volatilityPercent}%<br><br>💡 <strong>What This Means:</strong><br>• Highly predictable development pace<br>• Consistent team performance<br>• Reliable project planning<br>• Sustainable development practices<br><br>🚀 <strong>Maintenance Actions:</strong><br>• Continue current development practices<br>• Document successful processes<br>• Share best practices across team<br>• Monitor for any emerging trends<br>• Consider if pace meets project goals`;
  }
  
  return content;
};

const getAnomaliesAnalysis = (anomalies: { date: string; value: number; type: 'high' | 'low' }[]): string => {
  const highAnomalies = anomalies.filter(a => a.type === 'high').length;
  const lowAnomalies = anomalies.filter(a => a.type === 'low').length;
  
  let content = `🔍 <strong>Anomaly Detection Analysis:</strong><br><br>`;
  
  if (anomalies.length === 0) {
    content += `✅ <strong>Status: No Anomalies Detected</strong><br>• No unusual activity patterns found<br>• Development activity is consistent and predictable<br>• Excellent stability in development patterns<br><br>📊 <strong>Calculation:</strong><br>• Statistical outlier detection using 2 standard deviations<br>• Anomalies = values >2σ from trend line<br>• No data points exceed threshold<br><br>💡 <strong>What This Means:</strong><br>• Very stable development environment<br>• Consistent team performance<br>• Predictable project velocity<br>• No major disruptions or special events detected<br><br>🚀 <strong>Maintenance Actions:</strong><br>• Continue current development practices<br>• Monitor for any emerging patterns<br>• Document successful stability factors<br>• Share best practices with team`;
  } else if (anomalies.length <= 2) {
    content += `🔄 <strong>Status: Few Anomalies (${anomalies.length} events)</strong><br>• ${highAnomalies} high-activity spikes, ${lowAnomalies} low-activity drops<br>• Generally stable with occasional variations<br>• Normal development patterns with minor disruptions<br><br>📊 <strong>Calculation:</strong><br>• Statistical outlier detection using 2 standard deviations<br>• Anomalies = values >2σ from trend line<br>• ${anomalies.length} events detected<br><br>💡 <strong>What This Means:</strong><br>• Mostly stable development environment<br>• Occasional special events or releases<br>• Normal variation in development activity<br>• May indicate planned releases or sprints<br><br>🎯 <strong>Improvement Actions:</strong><br>• Review anomaly dates for patterns<br>• Identify causes of high/low activity<br>• Plan for similar events in future<br>• Consider if anomalies are planned or unplanned`;
  } else if (anomalies.length <= 5) {
    content += `⚠️ <strong>Status: Moderate Anomalies (${anomalies.length} events)</strong><br>• ${highAnomalies} high-activity spikes, ${lowAnomalies} low-activity drops<br>• Some inconsistency in development patterns<br>• May indicate irregular development practices<br><br>📊 <strong>Calculation:</strong><br>• Statistical outlier detection using 2 standard deviations<br>• Anomalies = values >2σ from trend line<br>• ${anomalies.length} events detected<br><br>💡 <strong>What This Means:</strong><br>• Some unpredictability in development<br>• Potential for missed deadlines<br>• May indicate external factors affecting development<br>• Could be normal for certain project phases<br><br>🔧 <strong>Improvement Actions:</strong><br>• Investigate causes of anomalies<br>• Implement more consistent development schedules<br>• Improve project planning and estimation<br>• Address any external factors affecting development<br>• Consider if anomalies are planned or need mitigation`;
  } else {
    content += `🚨 <strong>Status: High Anomalies (${anomalies.length} events)</strong><br>• ${highAnomalies} high-activity spikes, ${lowAnomalies} low-activity drops<br>• Significant inconsistency in development patterns<br>• Indicates unstable development practices<br><br>📊 <strong>Calculation:</strong><br>• Statistical outlier detection using 2 standard deviations<br>• Anomalies = values >2σ from trend line<br>• ${anomalies.length} events detected<br><br>💡 <strong>What This Means:</strong><br>• Highly unpredictable development environment<br>• Risk of missed deadlines and poor planning<br>• Potential team coordination issues<br>• May indicate external factors significantly affecting development<br><br>🔧 <strong>Improvement Actions:</strong><br>• Investigate root causes of anomalies<br>• Implement consistent development workflows<br>• Improve project planning and estimation<br>• Address team coordination issues<br>• Consider external factors and their impact<br>• Implement regular check-ins and support`;
  }
  
  return content;
};

const getSlopeAnalysis = (slope: number): string => {
  const slopeValue = slope.toFixed(3);
  const slopeSign = slope > 0 ? '+' : '';
  const slopeMagnitude = Math.abs(slope);
  
  let content = `📏 <strong>Slope Analysis:</strong><br><br>`;
  
  if (slope > 0.5) {
    content += `🚀 <strong>Status: Strong Positive Growth</strong><br>• Rapidly increasing development activity<br>• Slope: ${slopeSign}${slopeValue} (strong positive trend)<br>• Excellent project momentum<br><br>📊 <strong>Calculation:</strong><br>• Linear regression coefficient from daily commit data<br>• Slope > 0.5 indicates strong growth<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Development velocity is accelerating<br>• Team productivity is improving significantly<br>• Project is gaining strong momentum<br>• May indicate successful process improvements<br><br>🎯 <strong>Maintenance Actions:</strong><br>• Continue current successful practices<br>• Monitor for sustainable growth<br>• Ensure team can maintain pace<br>• Document what's working well<br>• Consider if growth rate is sustainable`;
  } else if (slope > 0.1) {
    content += `📈 <strong>Status: Moderate Positive Growth</strong><br>• Steadily increasing development activity<br>• Slope: ${slopeSign}${slopeValue} (moderate positive trend)<br>• Good project momentum<br><br>📊 <strong>Calculation:</strong><br>• Linear regression coefficient from daily commit data<br>• Slope 0.1-0.5 indicates moderate growth<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Development velocity is improving<br>• Team productivity is growing<br>• Project has positive momentum<br>• Sustainable development pace<br><br>🚀 <strong>Improvement Actions:</strong><br>• Continue current development practices<br>• Look for opportunities to accelerate growth<br>• Monitor for sustainable improvement<br>• Consider process optimizations<br>• Ensure team capacity supports growth`;
  } else if (slope > -0.1) {
    content += `➡️ <strong>Status: Stable Development</strong><br>• Consistent development activity<br>• Slope: ${slopeSign}${slopeValue} (minimal change)<br>• Predictable project pace<br><br>📊 <strong>Calculation:</strong><br>• Linear regression coefficient from daily commit data<br>• Slope between -0.1 and 0.1 indicates stability<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Consistent development velocity<br>• Predictable project progress<br>• Sustainable development practices<br>• May indicate mature project phase<br><br>🎯 <strong>Improvement Actions:</strong><br>• Evaluate if current pace meets project goals<br>• Look for opportunities to optimize processes<br>• Consider if stability is appropriate for project phase<br>• Monitor for any emerging trends<br>• Ensure team has capacity for growth if needed`;
  } else if (slope > -0.5) {
    content += `📉 <strong>Status: Moderate Decline</strong><br>• Gradually decreasing development activity<br>• Slope: ${slopeSign}${slopeValue} (moderate negative trend)<br>• May indicate project challenges<br><br>📊 <strong>Calculation:</strong><br>• Linear regression coefficient from daily commit data<br>• Slope -0.5 to -0.1 indicates moderate decline<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Development velocity is decreasing<br>• Team productivity may be declining<br>• Project momentum is slowing<br>• May indicate project maturity or challenges<br><br>🔧 <strong>Improvement Actions:</strong><br>• Investigate causes of declining activity<br>• Review team capacity and workload<br>• Address any blockers or issues<br>• Consider process improvements<br>• Implement regular check-ins and support<br>• Evaluate if decline is appropriate for project phase`;
  } else {
    content += `🚨 <strong>Status: Strong Decline</strong><br>• Rapidly decreasing development activity<br>• Slope: ${slopeSign}${slopeValue} (strong negative trend)<br>• Significant project challenges<br><br>📊 <strong>Calculation:</strong><br>• Linear regression coefficient from daily commit data<br>• Slope < -0.5 indicates strong decline<br>• Current slope: ${slopeSign}${slopeValue}<br><br>💡 <strong>What This Means:</strong><br>• Development velocity is declining rapidly<br>• Team productivity is decreasing significantly<br>• Project momentum is strongly negative<br>• May indicate serious project issues<br><br>🔧 <strong>Improvement Actions:</strong><br>• Immediately investigate root causes<br>• Review team capacity and workload<br>• Address any blockers or technical issues<br>• Consider process improvements or changes<br>• Implement regular support and check-ins<br>• Evaluate if project needs restructuring<br>• Consider if decline is appropriate for project phase`;
  }
  
  return content;
};

const TrendAnalysisChart: React.FC<TrendAnalysisChartProps> = ({ commitActivity, firstDayOfWeek = 'sunday' }) => {
  const [analysisType, setAnalysisType] = useState<'commits' | 'velocity' | 'productivity' | 'patterns'>('commits');

  const trendAnalysis = useMemo(() => {
    return calculateTrendAnalysis(commitActivity, firstDayOfWeek);
  }, [commitActivity, firstDayOfWeek]);

  if (!commitActivity || commitActivity.length === 0) {
    return <p className="trend-analysis-error">No data available for trend analysis.</p>;
  }

  const renderChart = () => {
    switch (analysisType) {
      case 'commits':
        return renderCommitTrendChart();
      case 'velocity':
        return renderVelocityChart();
      case 'productivity':
        return renderProductivityChart();
      case 'patterns':
        return renderPatternAnalysis();
      default:
        return renderCommitTrendChart();
    }
  };

  const renderCommitTrendChart = () => {
    const data = {
      labels: commitActivity.map(d => d.date),
      datasets: [
        {
          label: 'Daily Commits',
          data: commitActivity.map(d => ({ x: d.date, y: d.count })),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Trend Line',
          data: trendAnalysis.prediction.map(p => ({ x: p.date, y: p.value })),
          borderColor: 'rgb(239, 68, 68)',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          pointRadius: 0,
          fill: false,
        },
        ...(trendAnalysis.anomalies.length > 0 ? [{
          label: 'Anomalies',
          data: trendAnalysis.anomalies.map(a => ({ x: a.date, y: a.value })),
          backgroundColor: trendAnalysis.anomalies.map(a => 
            a.type === 'high' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
          ),
          borderColor: 'transparent',
          pointRadius: 8,
          pointHoverRadius: 10,
          showLine: false,
        }] : [])
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top' as const,
          labels: { color: '#cbd5e1' }
        },
        title: {
          display: true,
          text: 'Commit Trend Analysis with Anomaly Detection',
          color: '#e2e8f0',
        },
        tooltip: {
          callbacks: {
            afterLabel: (context: any) => {
              if (context.datasetIndex === 2 && trendAnalysis.anomalies.length > 0) { // Anomalies dataset
                const anomaly = trendAnalysis.anomalies.find(a => a.date === context.parsed.x);
                return anomaly ? `${anomaly.type === 'high' ? '🔥' : '❄️'} ${anomaly.type} activity anomaly` : '';
              }
              return '';
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: {
            unit: 'day' as const,
            displayFormats: { day: 'MMM d' }
          },
          title: { display: true, text: 'Date', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' }
        },
        y: {
          title: { display: true, text: 'Commits', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' },
          beginAtZero: true
        }
      }
    };

    return (
      <div style={{ height: '300px' }}>
        <Line data={data} options={options} />
      </div>
    );
  };

  const renderVelocityChart = () => {
    // Calculate weekly velocity
    const weeklyData = groupByWeek(commitActivity, firstDayOfWeek);
    
    const data = {
      labels: weeklyData.map(w => w.week),
      datasets: [
        {
          label: 'Weekly Velocity (Commits)',
          data: weeklyData.map(w => w.commits),
          backgroundColor: 'rgba(139, 92, 246, 0.8)',
          borderColor: 'rgb(139, 92, 246)',
          borderWidth: 1,
        },
        {
          label: 'Active Contributors',
          data: weeklyData.map(w => w.contributors),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          borderColor: 'rgb(34, 197, 94)',
          borderWidth: 1,
          yAxisID: 'y1',
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' as const, labels: { color: '#cbd5e1' } },
        title: { display: true, text: 'Development Velocity Analysis', color: '#e2e8f0' }
      },
      scales: {
        x: {
          title: { display: true, text: 'Week', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' }
        },
        y: {
          type: 'linear' as const,
          display: true,
          position: 'left' as const,
          title: { display: true, text: 'Commits', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: { display: true, text: 'Contributors', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { drawOnChartArea: false }
        }
      }
    };

    return (
      <div style={{ height: '300px' }}>
        <Bar data={data} options={options} />
      </div>
    );
  };

  const renderProductivityChart = () => {
    const productivityData = commitActivity.map(d => ({
      date: d.date,
      linesPerCommit: d.count > 0 ? (d.linesAdded + d.linesDeleted) / d.count : 0,
      netContribution: d.linesAdded - d.linesDeleted,
      efficiency: d.count > 0 && d.contributorCount > 0 ? d.count / d.contributorCount : 0
    }));

    const data = {
      labels: productivityData.map(d => d.date),
      datasets: [
        {
          label: 'Lines per Commit',
          data: productivityData.map(d => ({ x: d.date, y: d.linesPerCommit })),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Net Contribution',
          data: productivityData.map(d => ({ x: d.date, y: d.netContribution })),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.3,
          yAxisID: 'y1',
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' as const, labels: { color: '#cbd5e1' } },
        title: { display: true, text: 'Code Productivity Analysis', color: '#e2e8f0' }
      },
      scales: {
        x: {
          type: 'time' as const,
          time: { unit: 'day' as const, displayFormats: { day: 'MMM d' } },
          title: { display: true, text: 'Date', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' }
        },
        y: {
          title: { display: true, text: 'Lines per Commit', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' }
        },
        y1: {
          type: 'linear' as const,
          display: true,
          position: 'right' as const,
          title: { display: true, text: 'Net Lines', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { drawOnChartArea: false }
        }
      }
    };

    return (
      <div style={{ height: '300px' }}>
        <Line data={data} options={options} />
      </div>
    );
  };

  const renderPatternAnalysis = () => {
    // Helper function to get day labels based on firstDayOfWeek
    const getDayLabels = (firstDay: 'sunday' | 'monday') => {
      if (firstDay === 'monday') {
        return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      } else {
        return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      }
    };

    // Helper function to get day colors based on firstDayOfWeek
    const getDayColors = (firstDay: 'sunday' | 'monday') => {
      if (firstDay === 'monday') {
        return {
          backgroundColor: [
            'rgba(34, 197, 94, 0.8)',   // Monday - Green
            'rgba(59, 130, 246, 0.8)',  // Tuesday - Blue
            'rgba(168, 85, 247, 0.8)',  // Wednesday - Purple
            'rgba(245, 158, 11, 0.8)',  // Thursday - Yellow
            'rgba(20, 184, 166, 0.8)',  // Friday - Teal
            'rgba(156, 163, 175, 0.8)', // Saturday - Gray
            'rgba(239, 68, 68, 0.8)'    // Sunday - Red
          ],
          borderColor: [
            'rgb(34, 197, 94)',
            'rgb(59, 130, 246)',
            'rgb(168, 85, 247)',
            'rgb(245, 158, 11)',
            'rgb(20, 184, 166)',
            'rgb(156, 163, 175)',
            'rgb(239, 68, 68)'
          ]
        };
      } else {
        return {
          backgroundColor: [
            'rgba(239, 68, 68, 0.8)',   // Sunday - Red
            'rgba(34, 197, 94, 0.8)',   // Monday - Green
            'rgba(59, 130, 246, 0.8)',  // Tuesday - Blue
            'rgba(168, 85, 247, 0.8)',  // Wednesday - Purple
            'rgba(245, 158, 11, 0.8)',  // Thursday - Yellow
            'rgba(20, 184, 166, 0.8)',  // Friday - Teal
            'rgba(156, 163, 175, 0.8)'  // Saturday - Gray
          ],
          borderColor: [
            'rgb(239, 68, 68)',
            'rgb(34, 197, 94)',
            'rgb(59, 130, 246)',
            'rgb(168, 85, 247)',
            'rgb(245, 158, 11)',
            'rgb(20, 184, 166)',
            'rgb(156, 163, 175)'
          ]
        };
      }
    };

    // Create ordered day data based on firstDayOfWeek
    const dayLabels = getDayLabels(firstDayOfWeek);
    const dayColors = getDayColors(firstDayOfWeek);
    
    // Create ordered data array
    const orderedDayData = dayLabels.map((dayLabel, index) => {
      const dayKey = index.toString();
      const average = trendAnalysis.seasonality.dayOfWeek[dayKey] || 0;
      return {
        day: dayLabel,
        average: average
      };
    });

    const data = {
      labels: orderedDayData.map(d => d.day),
      datasets: [
        {
          label: 'Average Commits by Day of Week',
          data: orderedDayData.map(d => d.average),
          backgroundColor: dayColors.backgroundColor,
          borderColor: dayColors.borderColor,
          borderWidth: 2,
        }
      ]
    };

    const options = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: true, text: 'Development Patterns by Day of Week', color: '#e2e8f0' }
      },
      scales: {
        x: {
          title: { display: true, text: 'Day of Week', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' }
        },
        y: {
          title: { display: true, text: 'Average Commits', color: '#94a3b8' },
          ticks: { color: '#cbd5e1' },
          grid: { color: '#374151' },
          beginAtZero: true
        }
      }
    };

    return (
      <div style={{ height: '300px' }}>
        <Bar data={data} options={options} />
      </div>
    );
  };

  return (
    <div className="trend-analysis-chart">
      <div className="trend-analysis-header">
        <div className="trend-analysis-title-section">
          <h3 className="trend-analysis-title">Advanced Trend Analysis</h3>
          <InfoIcon content="Advanced statistical analysis of development patterns:<br><br>📈 <strong>Trend Analysis:</strong><br>• Linear regression to identify growth/decline patterns<br>• Anomaly detection highlights unusual activity spikes or drops<br>• Predictive trend line shows expected future activity<br><br>📊 <strong>Velocity Analysis:</strong><br>• Weekly development velocity tracking<br>• Team size correlation with output<br>• Efficiency metrics over time<br><br>🎯 <strong>Productivity Analysis:</strong><br>• Code quality metrics (lines per commit)<br>• Net contribution trends (growth vs refactoring)<br>• Developer efficiency patterns<br><br>🔄 <strong>Pattern Analysis:</strong><br>• Day-of-week activity patterns<br>• Seasonal development cycles<br>• Team working rhythm identification<br><br>Use the tabs to explore different analytical perspectives of your development data." />
        </div>
      </div>

      {/* Trend Summary */}
      <div className="trend-analysis-pattern-section">
        <div className="trend-analysis-pattern-header">
          <div className="trend-analysis-pattern-title">Trend Analysis Overview</div>
          <div className="trend-analysis-pattern-description">
            Key metrics from statistical analysis of development patterns
          </div>
        </div>
                 <div className="trend-analysis-pattern-grid">
           <div className={`trend-analysis-pattern-card ${getTrendDirectionStatus(trendAnalysis.trend)}`}>
             <div className="trend-analysis-pattern-card-header">
               <div className="trend-analysis-pattern-card-title">Trend Direction</div>
               <div className="trend-analysis-pattern-card-icon">
                 {trendAnalysis.trend === 'increasing' ? '📈' :
                  trendAnalysis.trend === 'decreasing' ? '📉' : '➡️'}
               </div>
             </div>
             <div className={`trend-analysis-pattern-card-value ${
               trendAnalysis.trend === 'increasing' ? 'trend-analysis-trend-indicator increasing' :
               trendAnalysis.trend === 'decreasing' ? 'trend-analysis-trend-indicator decreasing' :
               'trend-analysis-trend-indicator stable'
             }`}>
               {trendAnalysis.trend === 'increasing' ? 'Rising' :
                trendAnalysis.trend === 'decreasing' ? 'Declining' : 'Stable'}
             </div>
             <div className="trend-analysis-pattern-card-description">
               Overall development activity trend
             </div>
             <div className="trend-analysis-pattern-card-actions">
               <MoreInfoButton
                 status={getTrendDirectionStatus(trendAnalysis.trend)}
                 title="Trend Direction Analysis"
                 content={getTrendDirectionAnalysis(trendAnalysis.trend, trendAnalysis.slope)}
               />
             </div>
           </div>
           
           <div className={`trend-analysis-pattern-card ${getVolatilityStatus(trendAnalysis.volatility)}`}>
             <div className="trend-analysis-pattern-card-header">
               <div className="trend-analysis-pattern-card-title">Volatility</div>
               <div className="trend-analysis-pattern-card-icon">
                 {trendAnalysis.volatility > 0.5 ? '🌊' :
                  trendAnalysis.volatility > 0.3 ? '〰️' : '📏'}
               </div>
             </div>
             <div className={`trend-analysis-pattern-card-value ${
               trendAnalysis.volatility > 0.5 ? 'trend-analysis-trend-indicator high-volatility' :
               trendAnalysis.volatility > 0.3 ? 'trend-analysis-trend-indicator stable' :
               'trend-analysis-trend-indicator low-volatility'
             }`}>
               {trendAnalysis.volatility > 0.5 ? 'High' :
                trendAnalysis.volatility > 0.3 ? 'Medium' : 'Low'}
             </div>
             <div className="trend-analysis-pattern-card-description">
               Activity consistency level
             </div>
             <div className="trend-analysis-pattern-card-actions">
               <MoreInfoButton
                 status={getVolatilityStatus(trendAnalysis.volatility)}
                 title="Volatility Analysis"
                 content={getVolatilityAnalysis(trendAnalysis.volatility)}
               />
             </div>
           </div>
           
           <div className={`trend-analysis-pattern-card ${getAnomaliesStatus(trendAnalysis.anomalies.length)}`}>
             <div className="trend-analysis-pattern-card-header">
               <div className="trend-analysis-pattern-card-title">Anomalies</div>
               <div className="trend-analysis-pattern-card-icon">🔍</div>
             </div>
             <div className="trend-analysis-pattern-card-value">
               {trendAnalysis.anomalies.length} events
             </div>
             <div className="trend-analysis-pattern-card-description">
               Unusual activity detected
             </div>
             <div className="trend-analysis-pattern-card-actions">
               <MoreInfoButton
                 status={getAnomaliesStatus(trendAnalysis.anomalies.length)}
                 title="Anomaly Detection"
                 content={getAnomaliesAnalysis(trendAnalysis.anomalies)}
               />
             </div>
           </div>
           
           <div className={`trend-analysis-pattern-card ${getSlopeStatus(trendAnalysis.slope)}`}>
             <div className="trend-analysis-pattern-card-header">
               <div className="trend-analysis-pattern-card-title">Slope</div>
               <div className="trend-analysis-pattern-card-icon">
                 {trendAnalysis.slope > 0 ? '📈' : trendAnalysis.slope < 0 ? '📉' : '➡️'}
               </div>
             </div>
             <div className="trend-analysis-pattern-card-value">
               {trendAnalysis.slope > 0 ? '+' : ''}{trendAnalysis.slope.toFixed(3)}
             </div>
             <div className="trend-analysis-pattern-card-description">
               Linear regression slope
             </div>
             <div className="trend-analysis-pattern-card-actions">
               <MoreInfoButton
                 status={getSlopeStatus(trendAnalysis.slope)}
                 title="Slope Analysis"
                 content={getSlopeAnalysis(trendAnalysis.slope)}
               />
             </div>
           </div>
         </div>
      </div>


      <div className="trend-analysis-chart-container">

        <div className="trend-analysis-chart-header">
          <div>
            <div className="trend-analysis-chart-title">
              {analysisType === 'commits' ? 'Commit Activity Trends' :
               analysisType === 'velocity' ? 'Development Velocity' :
               analysisType === 'productivity' ? 'Productivity Metrics' : 'Pattern Analysis'}
            </div>
            <div className="trend-analysis-chart-subtitle">
              {analysisType === 'commits' ? 'Daily commit activity with trend analysis' :
               analysisType === 'velocity' ? 'Weekly development velocity patterns' :
               analysisType === 'productivity' ? 'Lines of code and efficiency metrics' : 'Seasonal and weekly patterns'}
            </div>
          </div>
          <div className="trend-analysis-controls">
        <select 
          value={analysisType} 
          onChange={(e) => setAnalysisType(e.target.value as 'commits' | 'velocity' | 'productivity' | 'patterns')}
          className="trend-analysis-select"
        >
          <option value="commits">📈 Commit Trends</option>
          <option value="velocity">⚡ Velocity Analysis</option>
          <option value="productivity">🎯 Productivity</option>
          <option value="patterns">🔄 Patterns</option>
        </select>
      </div>

        </div>
        <div className="trend-analysis-chart-wrapper">
          {renderChart()}
        </div>
      </div>
    </div>
  );
};

// Helper functions
function calculateTrendAnalysis(data: TrendData[], firstDayOfWeek: 'sunday' | 'monday' = 'sunday'): TrendAnalysis {
  if (data.length < 2) {
    return {
      slope: 0,
      trend: 'stable',
      volatility: 0,
      anomalies: [],
      prediction: [],
      seasonality: { dayOfWeek: {}, monthOfYear: {} }
    };
  }

  // Calculate linear regression
  const commits = data.map(d => d.count);
  const n = commits.length;
  const x = Array.from({length: n}, (_, i) => i);
  const y = commits;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Determine trend
  let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
  if (Math.abs(slope) > 0.1) {
    trend = slope > 0 ? 'increasing' : 'decreasing';
  }

  // Calculate volatility (coefficient of variation)
  const mean = sumY / n;
  const variance = y.reduce((sum, yi) => sum + Math.pow(yi - mean, 2), 0) / n;
  const volatility = mean > 0 ? Math.sqrt(variance) / mean : 0;

  // Detect anomalies (values > 2 standard deviations from trend line)
  const stdDev = Math.sqrt(variance);
  const threshold = 2 * stdDev;
  const anomalies: { date: string; value: number; type: 'high' | 'low' }[] = [];

  data.forEach((d, i) => {
    const predicted = slope * i + intercept;
    const difference = d.count - predicted;
    if (Math.abs(difference) > threshold) {
      anomalies.push({
        date: d.date,
        value: d.count,
        type: difference > 0 ? 'high' : 'low'
      });
    }
  });

  // Generate prediction (next 7 days)
  const prediction = Array.from({length: 7}, (_, i) => {
    const nextIndex = n + i;
    const predictedValue = Math.max(0, slope * nextIndex + intercept);
    const nextDate = new Date(data[data.length - 1].date);
    nextDate.setDate(nextDate.getDate() + i + 1);
    return {
      date: nextDate.toISOString().split('T')[0],
      value: Math.round(predictedValue * 100) / 100
    };
  });

  // Calculate seasonality patterns with firstDayOfWeek consideration
  const dayOfWeek: Record<string, number[]> = {};
  const monthOfYear: Record<string, number[]> = {};

  data.forEach(d => {
    const date = new Date(d.date);
    let dow = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Adjust day of week based on firstDayOfWeek setting
    if (firstDayOfWeek === 'monday') {
      // Convert to Monday-based: 0 (Sunday) becomes 6, 1 (Monday) becomes 0, etc.
      dow = dow === 0 ? 6 : dow - 1;
    }
    
    const dowKey = dow.toString();
    const moy = date.getMonth().toString();

    if (!dayOfWeek[dowKey]) dayOfWeek[dowKey] = [];
    if (!monthOfYear[moy]) monthOfYear[moy] = [];

    dayOfWeek[dowKey].push(d.count);
    monthOfYear[moy].push(d.count);
  });

  // Calculate averages
  const avgDayOfWeek: Record<string, number> = {};
  const avgMonthOfYear: Record<string, number> = {};

  Object.entries(dayOfWeek).forEach(([day, values]) => {
    avgDayOfWeek[day] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  Object.entries(monthOfYear).forEach(([month, values]) => {
    avgMonthOfYear[month] = values.reduce((a, b) => a + b, 0) / values.length;
  });

  return {
    slope: Math.round(slope * 1000) / 1000,
    trend,
    volatility: Math.round(volatility * 100) / 100,
    anomalies,
    prediction,
    seasonality: {
      dayOfWeek: avgDayOfWeek,
      monthOfYear: avgMonthOfYear
    }
  };
}

function groupByWeek(data: TrendData[], firstDayOfWeek: 'sunday' | 'monday' = 'sunday'): { week: string; commits: number; contributors: number }[] {
  const weeklyData: Record<string, { commits: number; contributors: Set<number> }> = {};

  data.forEach(d => {
    const date = new Date(d.date);
    const startOfWeek = new Date(date);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const firstDayOffset = firstDayOfWeek === 'monday' ? (dayOfWeek === 0 ? 6 : dayOfWeek - 1) : dayOfWeek;
    startOfWeek.setDate(date.getDate() - firstDayOffset);
    const weekKey = startOfWeek.toISOString().split('T')[0];

    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = { commits: 0, contributors: new Set() };
    }

    weeklyData[weekKey].commits += d.count;
    if (d.contributorCount > 0) {
      weeklyData[weekKey].contributors.add(d.contributorCount);
    }
  });

  return Object.entries(weeklyData)
    .map(([week, data]) => ({
      week,
      commits: data.commits,
      contributors: Math.max(...Array.from(data.contributors), 0)
    }))
    .sort((a, b) => a.week.localeCompare(b.week));
}

export default TrendAnalysisChart; 