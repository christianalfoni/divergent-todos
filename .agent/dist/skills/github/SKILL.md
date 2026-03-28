---
name: github
description: GitHub CLI (gh) operations for working with repositories, branches, and pull requests. Use this skill when you need to clone repos, checkout PRs, create branches, or manage pull requests.
---

# GitHub CLI (gh) Usage

This skill provides comprehensive guidance for using the GitHub CLI (`gh`) to work with repositories and pull requests.

## Prerequisites

The `gh` CLI must be installed and authenticated. Authentication is typically handled automatically when the agent starts.

## URL Parsing

### Parse a GitHub Repository URL
```bash
# From https://github.com/owner/repo or git@github.com:owner/repo.git
# Extract: owner, repo

# Example URL: https://github.com/facebook/react
# owner: facebook
# repo: react
```

### Parse a Pull Request URL
```bash
# From https://github.com/owner/repo/pull/123
# Extract: owner, repo, pr_number

# Example URL: https://github.com/facebook/react/pull/28349
# owner: facebook
# repo: react
# pr_number: 28349
```

## Repository Operations

### Clone a Repository
```bash
git clone https://github.com/owner/repo.git
cd repo
```

### View Repository Info
```bash
gh repo view
gh repo view owner/repo  # Specify owner/repo explicitly
```

## Pull Request Operations

### Checkout an Existing PR (IMPORTANT)
When given a PR URL, use `gh pr checkout` to work directly on the PR branch:

```bash
# Clone the repo first (if not already cloned)
git clone https://github.com/owner/repo.git
cd repo

# Checkout the PR branch - this creates a local branch tracking the PR
gh pr checkout 123

# Or with explicit owner/repo (works from anywhere)
gh pr checkout 123 --repo owner/repo
```

**This is the preferred way to work with an existing PR** because:
- It automatically fetches the PR's head branch
- It sets up tracking for the remote branch
- You can make changes and push directly to the PR

### View PR Details
```bash
# View current PR (when checked out on a PR branch)
gh pr view

# View specific PR by number
gh pr view 123

# View PR with full JSON output
gh pr view 123 --json url,number,title,body,state,isDraft,headRefName,baseRefName,author,additions,deletions,files

# View PR from another repo
gh pr view 123 --repo owner/repo
```

### View PR Changes
```bash
# View the diff of a PR
gh pr diff 123

# View diff with more context
gh pr diff 123 --color=always | less -R

# View diff for current branch's PR
gh pr diff
```

### View PR Files
```bash
# List files changed in a PR
gh pr view 123 --json files --jq '.files[].path'
```

## Branch Operations

### Create a New Branch
```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or from a specific base branch
git checkout -b feature/your-feature-name main
```

### Push a Branch
```bash
# Push and set upstream
git push -u origin feature/your-feature-name

# Push to an existing remote branch
git push origin feature/your-feature-name
```

### Update from Base Branch
```bash
# Merge latest changes from base branch
git fetch origin
git merge origin/main

# Or rebase
git fetch origin
git rebase origin/main
```

## Creating Pull Requests

### Create a New PR
```bash
# Create a draft PR (recommended for agent work)
gh pr create --title "feat: your feature description" --body "PR description here" --base main --draft

# Create with body from file
gh pr create --title "feat: feature" --body-file /path/to/description.md --base main

# Create ready for review (not draft)
gh pr create --title "feat: feature" --body "description" --base main
```

### PR Title Conventions
Use conventional commit style:
- `feat: add new feature`
- `fix: resolve bug in X`
- `refactor: improve Y`
- `docs: update documentation`
- `test: add tests for Z`

### PR Body Template
```markdown
## What
Brief description of what this PR does.

## Why
Context and motivation for this change.

## How
Key implementation details and decisions.

## Testing
How to test this change.

## Notes
Any additional considerations, follow-ups, or known issues.
```

## Commenting on PRs

### Add a Comment
```bash
# Add a general comment to a PR
gh pr comment 123 --body "Your comment here"

# Comment with markdown
gh pr comment 123 --body "## Summary\n\nYour **markdown** comment."
```

### Add Inline Code Comments
```bash
# Create a review comment on a specific line
gh api repos/{owner}/{repo}/pulls/{number}/comments \
  -f body="Your inline comment" \
  -f commit_id="$(gh pr view --json headRefOid --jq '.headRefOid')" \
  -f path="src/file.ts" \
  -f line=42 \
  -f side="RIGHT"
```

## Workflow Scenarios

### Scenario 1: Working on an Existing PR (Updating)
When you're given a PR URL and need to make changes:

```bash
# 1. Clone the repo
git clone https://github.com/owner/repo.git
cd repo

# 2. Checkout the PR branch
gh pr checkout 123

# 3. Make your changes
# ... edit files ...

# 4. Commit and push
git add .
git commit -m "fix: address review feedback"
git push

# 5. The PR is now updated (no need to create a new PR)
```

### Scenario 2: Creating a New PR from Scratch
When you need to implement new functionality:

```bash
# 1. Clone the repo
git clone https://github.com/owner/repo.git
cd repo

# 2. Create a feature branch
git checkout -b feature/my-feature

# 3. Make changes
# ... edit files ...

# 4. Commit and push
git add .
git commit -m "feat: add my feature"
git push -u origin feature/my-feature

# 5. Create the PR (draft)
gh pr create --title "feat: add my feature" --body "Description" --base main --draft
```

### Scenario 3: Reviewing a PR
When you need to review someone else's PR:

```bash
# 1. Clone the repo
git clone https://github.com/owner/repo.git
cd repo

# 2. Checkout the PR branch
gh pr checkout 123

# 3. Review the changes
gh pr view 123 --json title,body,files
gh pr diff 123

# 4. Read specific files
# Use the read tool to examine files of interest

# 5. Test locally (optional)
npm install && npm test

# 6. Post your review as a comment
gh pr comment 123 --body "Your review feedback here"
```

## Useful JSON Queries (jq)

```bash
# Get PR title
gh pr view 123 --json title --jq '.title'

# Get PR files changed
gh pr view 123 --json files --jq '.files[].path'

# Get PR additions/deletions
gh pr view 123 --json additions,deletions --jq '"+\(.additions) -\(.deletions)"'

# Get PR author
gh pr view 123 --json author --jq '.author.login'

# Get PR state
gh pr view 123 --json state --jq '.state'
```

## Common Pitfalls

1. **Don't create a new PR when updating an existing one** - Just push to the same branch
2. **Use `gh pr checkout` for existing PRs** - Don't manually figure out branch names
3. **Always specify `--repo owner/repo` when working outside a repo** - gh needs context
4. **Use `--draft` for agent-created PRs** - Let humans review before merging
5. **Include `repoPath` in your output files** - The system needs to know where to operate
