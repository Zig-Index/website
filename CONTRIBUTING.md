# Contributing to Zig Index

Thank you for your interest in contributing to Zig Index! This guide will help you add your Zig project to the registry.

## Adding Your Project

Project submissions are made to the **registry repository**, not this website repository:

📦 **Registry**: https://github.com/Zig-Index/registry

### Prerequisites

Your project should:
- Be related to the Zig programming language
- Have a public GitHub repository
- Include a README with description and usage instructions
- Have a license file

### Step 1: Fork the Registry

```bash
git clone https://github.com/YOUR_USERNAME/registry.git
cd registry
```

### Step 2: Create a JSON File

Create a new file in the appropriate directory:

- **Libraries/Packages**: `repositories/packages/your-package.json`
- **Applications/Tools**: `repositories/applications/your-app.json`

### Step 3: Add Your Project Info

```json
{
  "name": "Your Package Name",
  "owner": "github-username",
  "repo": "repository-name",
  "description": "A brief description of what your project does",
  "homepage": "https://your-docs-site.com",
  "license": "MIT",
  "topics": ["networking", "async", "io"]
}
```

#### Required Fields

| Field | Description |
|-------|-------------|
| `name` | Display name for your project |
| `owner` | GitHub username or organization |
| `repo` | Repository name (not the full URL) |
| `description` | Short description (max 200 characters recommended) |

#### Optional Fields

| Field | Description |
|-------|-------------|
| `homepage` | Documentation or project website URL |
| `license` | SPDX license identifier (e.g., "MIT", "Apache-2.0") |
| `topics` | Array of relevant tags for categorization |

### Step 4: Submit a Pull Request

1. Commit your changes
2. Push to your fork
3. Open a Pull Request to the registry repository

## Contributing to the Website

For website improvements:

1. Fork https://github.com/Zig-Index/website
2. Create a feature branch
3. Make your changes
4. Submit a Pull Request

### Development Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/Zig-Index/website.git
cd website

# Install dependencies
npm install

# Start dev server
npm run dev
```

## Guidelines

### Topics/Tags

Use existing topics when possible. Common ones include:

- `networking`, `async`, `io` - Network and I/O related
- `gui`, `ui`, `graphics` - User interface
- `gamedev`, `game-engine` - Game development
- `compiler`, `parser` - Language tools
- `database`, `storage` - Data persistence
- `testing`, `debugging` - Development tools
- `learning`, `tutorial` - Educational resources

### Description Best Practices

- Keep it concise (under 200 characters)
- Describe what the project does, not what it is
- Include key features or use cases
- Avoid marketing language

## Questions?

- Open an issue on [GitHub](https://github.com/Zig-Index/website/issues)
- Check the [FAQ](https://zig-index.github.io/how-to-add)

Thank you for contributing to the Zig ecosystem! 🚀
