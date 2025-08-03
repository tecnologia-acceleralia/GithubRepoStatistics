# Local Git Stats

A Next.js application that provides detailed statistics and visualizations for local Git repositories. The app allows you to analyze commit history, contributor activity, and generate CSV exports of repository statistics.

## Features

- **Repository Selection**: Browse and select local Git repositories
- **Contributor Statistics**: View detailed stats per contributor including:
  - Number of commits
  - Lines added/deleted
  - Files changed
- **Commit Activity Visualization**: Interactive chart showing commit activity over time
- **Filtering Capabilities**:
  - Filter by date range
  - Filter by specific contributor
  - Click on contributor names to filter their activity
- **CSV Export**: Download detailed daily statistics in CSV format
- **Global Configuration**: Configure application-wide settings like week start day
- **Project Configuration**: Configure author grouping and exclusions per repository

## Global Configuration

The application includes a global configuration system that allows you to customize application-wide settings:

### Available Settings

- **First Day of Week**: Choose between Sunday or Monday as the start of the week for charts and statistics
  - **Sunday**: Traditional start of the week (default)
  - **Monday**: Common in European countries

### How to Access

1. Look for the global configuration button (⚙️) in the application interface
2. Click to open the global configuration modal
3. Modify the settings as needed
4. Click "Save Configuration" to apply changes

### Storage

- Global configuration is stored in `configs/global_config.json`
- Settings are automatically loaded when the application starts
- Changes apply immediately to all charts and statistics

> **Note**: For repository-specific configuration (author grouping, exclusions), see [PROJECT_CONFIGURATION.md](PROJECT_CONFIGURATION.md) for detailed documentation.

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Technical Details

- Built with Next.js 14 and TypeScript
- Uses React for the frontend
- Implements server-side API routes for Git operations
- Features responsive design with dark mode support
- Uses modern web technologies for data visualization

## Project Structure

- `/app`: Next.js app router pages and API routes
- `/components`: Reusable React components
  - `RepositorySelector`: Repository selection interface
  - `ContributorStatsTable`: Tabular display of contributor statistics
  - `CommitActivityChart`: Visualization of commit activity
  - `Filters`: Date and contributor filtering interface
- `/lib`: Utility functions and shared code

## Development

The application is built with modern web development practices and can be extended with additional features. The main entry point is `app/page.tsx`, which handles the core application logic and state management.
