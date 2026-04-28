# Development Guide

## Quick Start

### Using the Management Script (Recommended)

```bash
# Start development server (hot reload)
./dev.sh dev

# Build and preview production version
./dev.sh preview

# Stop all servers
./dev.sh stop

# Check server status
./dev.sh status

# Restart server
./dev.sh restart

# Build only (no server)
./dev.sh build
```

### Using npm Scripts Directly

```bash
# Development server (hot reload, port 3000)
npm run dev

# Build for production
npm run build

# Preview production build (port 4173)
npm run preview
```

## Development Workflow

### Daily Development
1. `./dev.sh dev` - Start the dev server
2. Open http://localhost:3000
3. Make changes - they'll hot reload automatically
4. `./dev.sh stop` when done

### Testing Production Build
1. `./dev.sh preview` - Builds and serves production version
2. Open http://localhost:4173
3. Test the optimized/minified version

### Before Deploying
```bash
# Test production build locally
./dev.sh preview

# If everything works, commit and push
git add .
git commit -m "Your changes"
git push origin main
```

## Important Notes

⚠️ **You can no longer use `http://localhost:5500` or open `index.html` directly**

The project uses ES modules and a Vite build/dev pipeline, so you must use either:
- `./dev.sh dev` for development
- `./dev.sh preview` for production testing

## Server Ports

- **Development**: http://localhost:3000
- **Production Preview**: http://localhost:4173

## Troubleshooting

### "A server is already running"
```bash
./dev.sh stop
./dev.sh dev
```

### Build fails
```bash
# Check for errors
npm run build

# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Changes not showing
- In dev mode: Changes should hot reload automatically
- If stuck: Stop and restart: `./dev.sh restart`

### Port already in use
```bash
# Kill any process using the port
lsof -ti:3000 | xargs kill -9
# or
lsof -ti:4173 | xargs kill -9
```

## Project Structure

```
scorched_earth/
├── js/                    # Game source code
│   ├── init.js           # Entry point (loads all deps)
│   ├── deps.js           # Third-party libs (Pixi, GSAP, Howler)
│   ├── sidebar.js        # Vanilla JS sidebar/debug UI staging
│   └── main.js           # Main game code
├── public/               # Static assets (copied to dist/)
│   └── _headers          # CloudFlare security headers
├── dist/                 # Build output (gitignored)
├── styles.css            # Game styles
├── index.html            # Main page
├── vite.config.js        # Vite build config
├── dev.sh                # Server management script
└── package.json          # Dependencies and scripts
```

## CloudFlare Deployment

The project auto-deploys when you push to `main`:

1. Make changes locally
2. Test with `./dev.sh preview`
3. Commit and push
4. CloudFlare Pages builds and deploys automatically

Build settings (already configured):
- **Build command**: `npm run build`
- **Build output**: `dist`
- **Framework**: Vite

See [DEPLOYMENT.md](DEPLOYMENT.md) for full deployment guide.
