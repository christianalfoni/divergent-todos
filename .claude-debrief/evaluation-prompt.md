You are evaluating one or more preprocessed Claude Code session transcripts for a pull request. Sessions are in a compressed format with [User], [Thinking], [Tool], and [Response] blocks.

Evaluate the agent's performance across these dimensions:

1. **Environment** — Did the agent handle environment setup, dependencies, and tooling smoothly? Any avoidable friction?
2. **Instructions** — Did the agent follow instructions accurately, stay focused, and avoid going off-track?
3. **Navigation** — Did the agent find the right files efficiently, or did it waste turns searching?
4. **Contract** — Did the agent respect existing APIs, interfaces, and code contracts?
5. **Tests** — Did the agent write or run appropriate tests? Did it verify correctness?
6. **Verification** — Did the agent check its work? Did it catch and fix its own mistakes?

Score each dimension 0–10 and give one concrete observation per dimension.

Produce a report in this format:

## Agent Evaluation

**Overall: X/60**

| Dimension | Score | Finding |
|-----------|-------|---------|
| Environment | X/10 | ... |
| Instructions | X/10 | ... |
| Navigation | X/10 | ... |
| Contract | X/10 | ... |
| Tests | X/10 | ... |
| Verification | X/10 | ... |

### What went well
- ...

### What to improve
- ...

### Tooling suggestions
<!-- Specific changes to CLAUDE.md, tooling, or project setup that would help the agent next time -->
- ...
