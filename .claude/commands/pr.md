You are executing the /pr command for claude-debrief. Your job is to:
1. Synthesize a rich PR description from session transcripts + git diff
2. Create or update the GitHub PR
3. Evaluate the agent's performance and print it to the terminal

---

## Step 1: Gather context

Run these in parallel:
- `git branch --show-current` → branch name
- `pwd` → working directory
- `gh pr view --json number,url,body 2>/dev/null || echo "NO_PR"` → existing PR

Derive the workspace key from pwd: replace every `/` with `-`
(e.g. `/Users/foo/my-project` → `-Users-foo-my-project`)

---

## Step 2: Read config files

Read `.claude-debrief/pr-template.md`.
If missing → stop with: "Missing .claude-debrief/pr-template.md — run `claude-debrief init` first."

Read `.claude-debrief/evaluation-prompt.md`.
If missing → stop with: "Missing .claude-debrief/evaluation-prompt.md — run `claude-debrief init` first."

---

## Step 3: Read session files

List all `.md` files in `~/.claude-debrief/sessions/<workspace>/<branch>/`.

If none exist → inform the user: "No sessions found for branch <branch>. Sessions are captured automatically — start a Claude Code session on this branch first."

Read all session files.

---

## Step 4: Get the diff

Run:
```
git diff $(git merge-base HEAD origin/main 2>/dev/null || git merge-base HEAD main 2>/dev/null || echo "HEAD~1")..HEAD
```

If the diff is very long, summarise the most significant changes rather than including it all verbatim.

---

## Step 5: Synthesize PR description

Using pr-template.md as your structure, write a rich PR description by synthesising the sessions and diff. Rules:
- **Title** — write as consumer value (what the user gains), not as a technical description
- **Current / New behavior** — use ASCII UI mockups, code blocks, or Mermaid diagrams (5–7 nodes max) to show before/after. For UI changes prefer ASCII mockups of panels/dialogs over internal code.
- **Decisions** — extract key choices from the sessions, one line each
- **Discussions** — only include if the approach changed direction mid-session; omit otherwise
- **References** — list only files directly read or edited during the session
- Skip mechanical housekeeping: git ops, version bumps, env/tooling setup
- If there are multiple user stories, repeat the full block per story
- The sessions give you the reasoning that no diff alone can show — use them

---

## Step 6: Create or update the PR

If no PR exists:
- Derive a concise, descriptive title from the changes (under 70 chars)
- Run: `gh pr create --title "<title>" --body "<description>"`

If PR already exists:
- Run: `gh pr edit --body "<description>"`

Print the PR URL.

---

## Step 7: Evaluate the sessions

Using evaluation-prompt.md as your instructions, evaluate all the session transcripts. Approach this as an independent reviewer — assess how well the agent performed, not just what it did.

Print the full evaluation to the terminal. Remind the user to review it before adding reviewers to the PR.
