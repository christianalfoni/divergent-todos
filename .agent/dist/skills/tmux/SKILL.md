---
name: tmux
description: Terminal multiplexer for running and managing long-running processes. Use when you need to execute commands that should continue running after the session ends, or when managing multiple terminal sessions.
---

# tmux

tmux is a terminal multiplexer that allows you to create persistent terminal sessions. This is essential for running long-running processes that should continue even when you disconnect.

## Prerequisites

Install tmux:
```bash
# Linux (Debian/Ubuntu)
sudo apt install tmux

# Linux (Fedora)
sudo dnf install tmux
```

## Core Concepts

- **Session**: A named container for windows and panes. Sessions persist after disconnection.
- **Window**: A tab within a session (like browser tabs).
- **Pane**: A split within a window (vertical or horizontal splits).

## Common Commands

### Session Management

```bash
# Start a new named session
tmux new -s <session-name>

# Start a new session with a command
tmux new -s <session-name> "<command>"

# List all sessions
tmux ls

# Attach to a session
tmux attach -t <session-name>
tmux a -t <session-name>  # shorthand

# Detach from current session (inside tmux)
# Press: Ctrl+b then d

# Kill a session
tmux kill-session -t <session-name>

# Kill all sessions
tmux kill-server
```

### Running Long-Running Processes

```bash
# Start a dev server in a named session
tmux new -s devserver "npm run dev"

# Start a background process and detach immediately
tmux new -d -s backend "python server.py"

# Run a build that takes hours
tmux new -s build "npm run build"

# Start multiple services
tmux new -s api "python api.py"
tmux new -s worker "python worker.py"
tmux new -s redis "redis-server"
```

### Window and Pane Management

```bash
# Inside tmux, press Ctrl+b then:

# Window management
c          # Create new window
n          # Next window
p          # Previous window
0-9        # Switch to window by number
,          # Rename window
&          # Kill window

# Pane management
%          # Split pane vertically
"          # Split pane horizontally
<arrow>    # Navigate between panes
x          # Kill current pane
z          # Toggle pane zoom (maximize/restore)
```

### Sending Commands to Running Sessions

```bash
# Send a command to a running session
tmux send-keys -t <session-name> "<command>" Enter

# Send Ctrl+C to stop a process
tmux send-keys -t <session-name> C-c

# Check if a session exists
tmux has-session -t <session-name> 2>/dev/null && echo "exists" || echo "not found"
```

## Use Cases

### Development Servers
```bash
# Start frontend and backend in separate sessions
tmux new -d -s frontend "npm run dev"
tmux new -d -s backend "cd api && python manage.py runserver"
```

### Long Builds/Tests
```bash
# Run a long test suite
tmux new -s tests "npm test"

# Check on it later
tmux attach -t tests
```

### Background Workers
```bash
# Start a worker process
tmux new -d -s worker "celery -A tasks worker"

# Monitor logs
tmux attach -t worker
```

### Scripted Session Setup
```bash
# Create a development environment script
tmux new-session -d -s dev
tmux send-keys -t dev "cd ~/projects/myapp" Enter
tmux send-keys -t dev "vim ." Enter
tmux split-window -h -t dev
tmux send-keys -t dev "npm run dev" Enter
tmux attach -t dev
```

## Best Practices

1. **Use descriptive session names**: `tmux new -s myproject-api` instead of just `tmux`
2. **Check for existing sessions first**: `tmux has-session -t <name>` before creating
3. **Kill sessions when done**: `tmux kill-session -t <name>` to clean up
4. **Use `-d` flag for background tasks**: Start detached when you don't need immediate interaction

## When to Use This Skill

Use tmux when you need to:
- Run development servers that should persist
- Execute long-running builds or tests
- Manage multiple background processes
- Keep processes running after SSH disconnection
- Organize multiple terminal sessions for a project
