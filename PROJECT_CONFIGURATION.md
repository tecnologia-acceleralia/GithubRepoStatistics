# Project Configuration

This functionality allows you to configure how commit authors are processed in Git repository statistics.

## Features

### Grouped Authors

  - **Purpose**: To combine contributions from authors who have used different names or emails but are the same person.
  - **How it Works**: Define a primary name and its aliases (alternative names or emails).
  - **Result**: All contributions are grouped under the primary name in the statistics.

### Excluded Users

  - **Purpose**: To completely exclude contributions from certain users from all statistics.
  - **How it Works**: A list of names or emails that are completely ignored.
  - **Result**: Commits from these users do not appear in any statistics.

-----

## How to Use

1.  **Select Repository**: First, select a valid Git repository.
2.  **Access Configuration**: Click the "⚙️ Configure" button that appears after validating the repository.
3.  **Configure Grouped Authors**:
      - Click "+ Add Group".
      - Enter the author's primary name.
      - Add aliases (alternative names or emails) with "+ Add Alias".
      - Repeat for each group of authors.
4.  **Configure Excluded Users**:
      - Click "+ Add User".
      - Enter the name or email of the user to exclude.
      - Repeat for each user to exclude.
5.  **Save Configuration**: Click "Save Configuration".

-----

## Storage

  - The configuration is saved in **JSON files** in the `configs/` folder.
  - Each repository has its own configuration file.
  - **File naming**: Configuration files are named using the GitHub repository name when available.
    - **GitHub repositories**: Uses `owner_repo-name_config.json` format
    - **Local repositories**: Falls back to local path naming
  - The configuration is **automatically loaded** each time the repository is processed.
  - **Portable**: Same repository cloned in different locations will use the same config file.

-----

## Configuration File Naming

### GitHub Repository Naming
When a repository has a GitHub remote configured, the configuration file is named using the GitHub repository name:

**Examples:**
- Repository: `https://github.com/owner/my-project` → `owner_my-project_config.json`
- Repository: `https://github.com/company/test-repo` → `company_test-repo_config.json`

### Local Repository Naming
For repositories without a GitHub remote, the system falls back to using the local path:

**Examples:**
- Local path: `/path/to/local-repo` → `_path_to_local-repo_config.json`

### Benefits
- **Consistent naming**: Configuration files are named consistently regardless of local folder structure
- **Portable**: Same repository cloned in different locations will use the same config file
- **Readable**: Configuration file names are more meaningful and easier to identify
- **Backward compatible**: Falls back to old behavior when GitHub remote is not available

-----

## Usage Examples

### Grouped Authors

```
Primary Name: "Juan Pérez"
Aliases:
- "juan.perez@empresa.com"
- "juanp"
- "juan.perez@personal.com"
```

### Excluded Users

```
- "bot@ci.company.com"
- "noreply@github.com"
- "system@deploy.com"
```

-----

## Configuration File Format

```json
{
  "groupedAuthors": [
    {
      "primaryName": "Juan Pérez",
      "aliases": [
        "juan.perez@empresa.com",
        "juanp",
        "juan.perez@personal.com"
      ]
    }
  ],
  "excludedUsers": [
    "bot@ci.company.com",
    "noreply@github.com"
  ]
}
```

-----

## Important Notes

  - **Changes** to the configuration are applied **immediately** upon saving.
  - Statistics are **automatically recalculated** with the new configuration.
  - Configuration files are **repository-specific**.
  - Names and emails are compared **exactly** (case-sensitive).
  - **Excluded users** take priority over grouped authors.

-----

## Troubleshooting

### Configuration not saving

  - Verify that the repository is valid.
  - Check that you have write permissions in the project folder.
  - Check the browser console for errors.

### Changes not applying

  - Make sure to click "Save Configuration".
  - Verify that names/emails match exactly.
  - Reload the page and reload the statistics.

### Error loading configuration

  - The configuration file might be corrupt.
  - Delete the configuration file and create a new one.
  - Verify that the JSON format is valid.