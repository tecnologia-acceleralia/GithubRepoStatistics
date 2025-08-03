'use client';

import React from 'react';

interface SortIconProps {
  isActive: boolean;
  direction: 'asc' | 'desc' | null;
  className?: string;
}

const SortIcon: React.FC<SortIconProps> = ({ isActive, direction, className = '' }) => {
  const getIcon = () => {
    if (!isActive) {
      return '⇅';
    }
    return direction === 'asc' ? '↑' : '↓';
  };

  const iconClass = isActive ? 'sort-icon active' : 'sort-icon';

  return (
    <span className={`${iconClass} ${className}`}>
      {getIcon()}
    </span>
  );
};

export default SortIcon; 