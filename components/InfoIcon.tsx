'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

interface InfoIconProps {
  content: string | React.ReactNode;
  className?: string;
}

const InfoIcon: React.FC<InfoIconProps> = ({ content, className = '' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 10, // Position above the button
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const handleClick = () => {
    updatePosition();
    setIsVisible(!isVisible);
  };

  const renderContent = () => {
    if (typeof content !== 'string') {
      return content;
    }

    // Display HTML content as-is, without processing
    return (
      <div 
        dangerouslySetInnerHTML={{ __html: content }}
        className="info-tooltip-content-text"
        style={{ lineHeight: 1.4 }}
      />
    );
  };

  const popup = isVisible && mounted ? createPortal(
    <div 
      className="info-tooltip"
      style={{ 
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%)',
        zIndex: 9999 // Ensure it's above the modal
      }}
    >
      <div className="info-tooltip-content">
        {renderContent()}
        {/* Arrow pointing down */}
        <div className="info-tooltip-arrow" />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div className={`info-icon-container ${className}`}>
        <button
          ref={buttonRef}
          type="button"
          className="info-icon-button"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          aria-label="More information"
        >
          <svg 
            className="info-icon-svg" 
            fill="currentColor" 
            viewBox="0 0 24 24"
          >
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
          </svg>
        </button>
      </div>
      {popup}
    </>
  );
};

export default InfoIcon; 