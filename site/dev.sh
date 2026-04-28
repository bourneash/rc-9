#!/bin/bash
# Development server management script for Scorched Earth

PIDFILE=".vite.pid"
DEV_PORT=5600
PREVIEW_PORT=5601
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if any vite server is running in this project
check_running() {
    # Look for vite process with this project's directory in the command
    # Pattern matches: /path/to/project/node_modules/.bin/vite
    if pgrep -f "$SCRIPT_DIR.*vite" > /dev/null; then
        return 0
    fi

    # Also check if PID file exists and process is still running
    if [ -f "$PIDFILE" ]; then
        PID=$(cat "$PIDFILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            # Verify it's actually a vite-related process
            if ps -p "$PID" -o cmd= | grep -q "vite\|npm run dev\|npm run preview"; then
                return 0
            fi
        fi
    fi

    return 1
}

# Stop all vite servers for this project
stop_server() {
    print_status "Stopping Vite servers..."

    if check_running; then
        # If we have a PID file, try to kill that process tree
        if [ -f "$PIDFILE" ]; then
            PID=$(cat "$PIDFILE")
            if ps -p "$PID" > /dev/null 2>&1; then
                print_status "Stopping process $PID and its children..."
                # Kill the npm process and all its children
                pkill -P "$PID" 2>/dev/null
                kill "$PID" 2>/dev/null
                sleep 1
            fi
        fi

        # Also try to kill any vite processes in this directory
        pkill -f "$SCRIPT_DIR.*vite" 2>/dev/null
        sleep 1

        if check_running; then
            print_warning "Servers didn't stop gracefully, forcing..."
            if [ -f "$PIDFILE" ]; then
                PID=$(cat "$PIDFILE")
                pkill -9 -P "$PID" 2>/dev/null
                kill -9 "$PID" 2>/dev/null
            fi
            pkill -9 -f "$SCRIPT_DIR.*vite" 2>/dev/null
        fi

        rm -f "$PIDFILE"
        print_success "Servers stopped"
    else
        print_warning "No servers running"
        rm -f "$PIDFILE"
    fi
}

# Start development server
start_dev() {
    if check_running; then
        print_error "A server is already running. Stop it first with: $0 stop"
        exit 1
    fi

    print_status "Starting development server on port $DEV_PORT..."
    npm run dev &
    NPM_PID=$!
    echo $NPM_PID > "$PIDFILE"

    # Wait for Vite to start (give it time to find an available port)
    sleep 3

    if check_running; then
        # Extract actual port from running process
        VITE_PID=$(pgrep -f "$SCRIPT_DIR.*vite" | head -n1)
        if [ -z "$VITE_PID" ]; then
            # Fallback: find vite child process of our npm process
            VITE_PID=$(pgrep -P $NPM_PID -f "vite" | head -n1)
        fi
        ACTUAL_PORT=$(lsof -Pan -p "$VITE_PID" -i 2>/dev/null | grep LISTEN | grep -oP ':\K\d+' | head -n1)
        if [ -n "$ACTUAL_PORT" ]; then
            print_success "Development server started at http://localhost:$ACTUAL_PORT"
        else
            print_success "Development server started"
        fi
        print_status "Run: $0 stop to stop the server"
    else
        print_error "Failed to start development server"
        rm -f "$PIDFILE"
        exit 1
    fi
}

# Start preview server (requires build first)
start_preview() {
    if check_running; then
        print_error "A server is already running. Stop it first with: $0 stop"
        exit 1
    fi

    print_status "Building production version..."
    npm run build

    if [ $? -ne 0 ]; then
        print_error "Build failed"
        exit 1
    fi

    print_status "Starting preview server on port $PREVIEW_PORT..."
    npm run preview &
    NPM_PID=$!
    echo $NPM_PID > "$PIDFILE"

    # Wait for Vite to start
    sleep 3

    if check_running; then
        # Extract actual port from running process
        VITE_PID=$(pgrep -f "$SCRIPT_DIR.*vite" | head -n1)
        if [ -z "$VITE_PID" ]; then
            # Fallback: find vite child process of our npm process
            VITE_PID=$(pgrep -P $NPM_PID -f "vite" | head -n1)
        fi
        ACTUAL_PORT=$(lsof -Pan -p "$VITE_PID" -i 2>/dev/null | grep LISTEN | grep -oP ':\K\d+' | head -n1)
        if [ -n "$ACTUAL_PORT" ]; then
            print_success "Preview server started at http://localhost:$ACTUAL_PORT"
        else
            print_success "Preview server started"
        fi
        print_status "Run: $0 stop to stop the server"
    else
        print_error "Failed to start preview server"
        rm -f "$PIDFILE"
        exit 1
    fi
}

# Show status
show_status() {
    if check_running; then
        print_success "Vite server is running"
        echo ""
        echo "Active processes:"
        pgrep -a -f "$SCRIPT_DIR.*vite" || ([ -f "$PIDFILE" ] && ps -p $(cat "$PIDFILE") -o pid,cmd)
        echo ""
        echo "Listening ports:"
        netstat -tlnp 2>/dev/null | grep -E ":($DEV_PORT|$PREVIEW_PORT)" || lsof -i :$DEV_PORT -i :$PREVIEW_PORT 2>/dev/null
    else
        print_warning "No Vite servers running"
    fi
}

# Restart server
restart() {
    MODE="$1"
    print_status "Restarting server..."
    stop_server
    sleep 1

    if [ "$MODE" = "preview" ]; then
        start_preview
    else
        start_dev
    fi
}

# Show usage
show_usage() {
    echo "Scorched Earth - Development Server Manager"
    echo ""
    echo "Usage: $0 {dev|preview|stop|restart|status|build}"
    echo ""
    echo "Commands:"
    echo "  dev        Start development server (hot reload, port $DEV_PORT)"
    echo "  preview    Build and start production preview (port $PREVIEW_PORT)"
    echo "  stop       Stop all running servers"
    echo "  restart    Restart development server"
    echo "  status     Show server status"
    echo "  build      Build production version only"
    echo ""
    echo "Examples:"
    echo "  $0 dev              # Start development server"
    echo "  $0 preview          # Build and preview production"
    echo "  $0 stop             # Stop all servers"
    echo "  $0 restart preview  # Restart in preview mode"
    echo ""
}

# Main command handling
case "$1" in
    dev|start)
        start_dev
        ;;
    preview)
        start_preview
        ;;
    stop)
        stop_server
        ;;
    restart)
        restart "$2"
        ;;
    status)
        show_status
        ;;
    build)
        print_status "Building production version..."
        npm run build
        ;;
    *)
        show_usage
        exit 1
        ;;
esac

exit 0
