'use client';

import React, { useState, useRef, useEffect } from 'react';

interface MoreInfoButtonProps {
  status: 'success' | 'warning' | 'danger' | 'neutral';
  content: string;
  title: string;
}

const MoreInfoButton: React.FC<MoreInfoButtonProps> = ({ status, content, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const getStatusColor = () => {
    switch (status) {
      case 'success': return 'var(--color-success)';
      case 'warning': return 'var(--color-warning)';
      case 'danger': return 'var(--color-danger)';
      case 'neutral': return 'var(--color-primary)';
      default: return 'var(--color-primary)';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'success': return 'Good';
      case 'warning': return 'Warning';
      case 'danger': return 'Critical';
      case 'neutral': return 'Neutral';
      default: return 'Info';
    }
  };

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && buttonRef.current && popupRef.current) {
        const target = event.target as Node;
        if (!buttonRef.current.contains(target) && !popupRef.current.contains(target)) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Close popup on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (isOpen && event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className="more-info-container">
      <button
        ref={buttonRef}
        className="more-info-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Show more information about ${title}`}
      >
        <div 
          className="more-info-triangle"
          style={{ borderBottomColor: getStatusColor() }}
        />
        <span className="more-info-text">More info</span>
      </button>

      {isOpen && (
        <div ref={popupRef} className="more-info-popup more-info-popup-top">
          <div className="more-info-popup-header">
            <div className="more-info-popup-status">
              <div 
                className="more-info-popup-triangle"
                style={{ borderBottomColor: getStatusColor() }}
              />
              <span className="more-info-popup-status-text">{getStatusText()}</span>
            </div>
            <button
              className="more-info-popup-close"
              onClick={() => setIsOpen(false)}
              aria-label="Close popup"
            >
              ×
            </button>
          </div>
          <div className="more-info-popup-content">
            <h4 className="more-info-popup-title">{title}</h4>
            <div 
              className="more-info-popup-description"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MoreInfoButton; 