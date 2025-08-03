'use client';

import React from 'react';

interface ConfigurationButtonProps {
  onClick: () => void;
  title?: string;
}

const ConfigurationButton: React.FC<ConfigurationButtonProps> = ({ 
  onClick, 
  title = "Global Configuration" 
}) => {
  return (
    <button
      onClick={onClick}
      className="config-button"
      title={title}
      aria-label={title}
    >
      ⚙️
    </button>
  );
};

export default ConfigurationButton; 