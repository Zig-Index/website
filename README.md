# Zig Index

A curated registry for discovering Zig packages and applications.

**[Live Site](https://zig-index.github.io)** · **[Add Your Project](https://zig-index.github.io/how-to-add)** · **[Registry](https://github.com/Zig-Index/registry)**

## Features

- 📦 **Curated Registry** - Quality-focused collection of Zig projects
- ⚡ **Fast** - Static site with on-demand GitHub stats
- 🔍 **Search & Filter** - Find packages by topic, license, or text search
- 💾 **Aggressive Caching** - Stats cached client-side for fast repeat visits
- ⭐ **Live Stats** - Stars, forks, and watchers from GitHub
- 🎨 **Dark Mode** - Beautiful light and dark themes
- 📱 **Responsive** - Works great on all devices

## Repository Structure

This is the main website repository. The registry data is maintained separately:

- **Website**: https://github.com/Zig-Index/zig-index.github.io (this repo)
- **Registry**: https://github.com/Zig-Index/registry (submodule at `src/registry`)

## Add Your Project

To add your project to Zig Index:

1. Fork the [registry repository](https://github.com/Zig-Index/registry)
2. Create a JSON file in `repositories/packages/` or `repositories/applications/`
3. Submit a Pull Request

See the [registry README](https://github.com/Zig-Index/registry) for details.

### JSON Schema

```json
{
  "name": "logly",
  "owner": "muhammad-fiaz",
  "repo": "logly.zig",
  "description": "High-performance, structured logging library for Zig.",
  "homepage": "https://muhammad-fiaz.github.io/logly.zig",
  "license": "MIT",
  "category": "development-tools"
}
```

## Development

### Prerequisites

- Node.js 18+
- npm or pnpm

### Setup

```bash
# Clone with submodules
git clone --recurse-submodules https://github.com/Zig-Index/zig-index.github.io.git
cd zig-index.github.io

# Or if already cloned, initialize submodules
git submodule update --init --recursive

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file (see `.env.example`):

```env
# Optional: GitHub token for higher API rate limits
# Get one at https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here
```

## Tech Stack

- [Astro](https://astro.build) - Static site generator
- [React](https://react.dev) - UI components
- [Tailwind CSS](https://tailwindcss.com) - Styling
- [TanStack Query](https://tanstack.com/query) - Data fetching & caching
- [Framer Motion](https://framer.com/motion) - Animations
- [Fuse.js](https://fusejs.io) - Fuzzy search

## License

MIT License - see [LICENSE](LICENSE) file.

## Links

- **Website**: https://zig-index.github.io
- **Registry**: https://github.com/Zig-Index/registry
- **Zig Language**: https://ziglang.org
