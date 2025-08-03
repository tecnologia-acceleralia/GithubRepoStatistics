# CSS Architecture for Local Git Repository Statistics

This document describes the CSS architecture and styling system used in the Local Git Repository Statistics application.

## Overview

The application uses a custom CSS system with CSS variables for consistent theming, component-specific stylesheets, and responsive design patterns. The system is designed to be maintainable, scalable, and accessible.

## File Structure

```
app/styles/
├── README.md                    # This documentation
├── main.css                     # Main CSS file that imports all styles
├── base.css                     # Base styles, utilities, and CSS variables
└── components/                  # Component-specific styles
    ├── layout.css               # Layout and page structure styles
    ├── repository-selector.css  # Repository selector component styles
    ├── contributor-stats-table.css # Table component styles
    ├── charts.css               # Chart and visualization styles
    └── filters.css              # Filter component styles
```

## CSS Variables System

### Color Palette

The application uses a comprehensive color system with CSS variables:

```css
/* Primary Colors */
--color-primary: #3b82f6;        /* Blue */
--color-primary-hover: #2563eb;   /* Darker blue */
--color-secondary: #10b981;       /* Green */
--color-success: #10b981;         /* Success green */
--color-danger: #ef4444;          /* Error red */
--color-warning: #f59e0b;         /* Warning amber */

/* Background Colors */
--color-background: #ffffff;      /* Main background */
--color-background-secondary: #f9fafb; /* Secondary background */
--color-background-card: #ffffff; /* Card background */

/* Text Colors */
--color-text-primary: #111827;    /* Primary text */
--color-text-secondary: #374151;  /* Secondary text */
--color-text-tertiary: #6b7280;   /* Tertiary text */
--color-text-muted: #9ca3af;      /* Muted text */
```

### Spacing System

Consistent spacing using CSS variables:

```css
--spacing-xs: 0.25rem;  /* 4px */
--spacing-sm: 0.5rem;   /* 8px */
--spacing-md: 1rem;     /* 16px */
--spacing-lg: 1.5rem;   /* 24px */
--spacing-xl: 2rem;     /* 32px */
```

### Typography

Font sizes and weights are standardized:

```css
--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-lg: 1.125rem;   /* 18px */
--font-size-xl: 1.25rem;    /* 20px */
--font-size-2xl: 1.5rem;    /* 24px */
```

## Component Styles

### Layout Components

- `.main-container` - Main page container
- `.header-section` - Page header
- `.content-container` - Content wrapper
- `.repo-info-section` - Repository information display

### Repository Selector

- `.repository-selector` - Main container
- `.repository-input` - Path input field
- `.select-repo-button` - Validation button
- `.recent-repo-button` - Recent repository buttons

### Contributor Stats Table

- `.contributor-stats-table` - Table container
- `.contributor-table` - Table element
- `.contributor-link` - Clickable contributor names
- `.sort-header` - Sortable column headers

### Charts

- `.chart-container` - Chart wrapper
- `.chart-header` - Chart title and controls
- `.chart-canvas-container` - Chart canvas wrapper
- `.chart-period-selector` - Time period dropdown

### Filters

- `.filter-container` - Filter section
- `.filter-form` - Filter form
- `.filter-input` - Input fields
- `.filter-button` - Action buttons

## Utility Classes

The system includes utility classes for common patterns:

```css
/* Spacing */
.m-xs, .m-sm, .m-md, .m-lg, .m-xl
.mt-xs, .mt-sm, .mt-md, .mt-lg, .mt-xl
.mb-xs, .mb-sm, .mb-md, .mb-lg, .mb-xl

/* Text */
.text-primary, .text-secondary, .text-tertiary
.text-success, .text-danger, .text-warning

/* Layout */
.flex, .flex-col, .flex-row
.items-center, .justify-center, .justify-between

/* Display */
.hidden, .block, .inline, .inline-block
```

## Dark Mode Support

The application supports both automatic and manual dark mode:

```css
/* Automatic dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0a0a0a;
    --color-text-primary: #f9fafb;
    /* ... other dark mode variables */
  }
}

/* Manual dark mode */
.dark {
  --color-background: #0a0a0a;
  --color-text-primary: #f9fafb;
  /* ... other dark mode variables */
}
```

## Responsive Design

The CSS system includes responsive breakpoints:

```css
/* Mobile first approach */
@media (min-width: 640px) { /* sm */ }
@media (min-width: 768px) { /* md */ }
@media (min-width: 1024px) { /* lg */ }
@media (min-width: 1280px) { /* xl */ }
```

## Accessibility Features

- High contrast mode support
- Reduced motion preferences
- Focus indicators
- Screen reader support
- Keyboard navigation

## Usage Guidelines

### Adding New Components

1. Create a new CSS file in `app/styles/components/`
2. Import it in `app/styles/main.css`
3. Use semantic class names
4. Follow the existing naming conventions

### Modifying Colors

1. Update variables in `app/styles/base.css`
2. Test in both light and dark modes
3. Ensure sufficient contrast ratios

### Adding New Utilities

1. Add to `app/styles/base.css`
2. Follow the existing naming pattern
3. Include responsive variants if needed

## Best Practices

1. **Use CSS variables** for colors, spacing, and typography
2. **Follow BEM methodology** for component naming
3. **Mobile-first** responsive design
4. **Accessibility first** - ensure all interactive elements are keyboard accessible
5. **Performance** - minimize CSS bundle size
6. **Maintainability** - keep styles organized and documented

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Grid and Flexbox support required
- CSS Custom Properties (variables) support required
- No IE11 support

## Custom CSS system:

- Provides better control over styling
- Reduces bundle size
- Improves maintainability
- Offers better theming capabilities
- Maintains responsive design patterns

## Future Enhancements

- CSS-in-JS integration for dynamic styles
- CSS Modules for better encapsulation
- PostCSS plugins for advanced features
- Design system documentation
- Component library integration 