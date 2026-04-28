# Game Control Script Usage

## Quick Start

```bash
# Start the game server
./game.sh start

# Stop the game server
./game.sh stop

# Restart the game server
./game.sh restart

# Check server status
./game.sh status

# Show help
./game.sh help
```

## Features

### Automatic Browser Launch

When you start the server, it will automatically try to open your default browser to the game URL.

### Process Management

- Server runs in the background
- PID tracked in `/tmp/remote_command.pid`
- Logs saved to `/tmp/remote_command.log`

### Smart Port Management

- Default port: 5500
- Automatically detects if server is already running
- Force kills stuck processes on stop

### Status Monitoring

Use `./game.sh status` to see:

- Whether server is running
- Process ID
- Server URL
- Recent log entries

## Troubleshooting

### Port Already in Use

If port 5500 is in use, edit `game.sh` and change the `PORT` variable at the top.

### Server Won't Stop

```bash
# Force kill all python http servers
killall python3
```

### Permission Denied

```bash
# Make script executable
chmod +x game.sh
```

### View Full Logs

```bash
tail -f /tmp/remote_command.log
```

## Manual Server Start (Alternative)

If you prefer to run the server manually:

```bash
python3 -m http.server 5500
```

Then open http://localhost:5500 in your browser.
