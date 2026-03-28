// ============================================================================
// Base Context - prepended to ALL agent system prompts
// ============================================================================
export const BASE_CONTEXT = `## Environment Context

You are operating in a sandbox workspace at \`/project/workspace\`. This is NOT necessarily the target repository:

- The workspace may contain a \`.git\` folder for sandbox/agent state - this is NOT your target repo
- The workspace may have starter files or templates - these may or may not be relevant
- Do NOT assume the current workspace is where you should work
- Clone repositories mentioned in task files into the workspace

## Context Files

**Before starting your task, read ALL files in \`.agent-context/\`**

This folder contains context from previous agent contributions. Files are numbered in recommended reading order (e.g., \`01_RESEARCH.md\`, \`02_PROTOTYPE.md\`). Read them all to understand the full context before proceeding.

**Decision flow:**
1. List and read all files in \`.agent-context/\`
2. If files reference a GitHub repo/PR → clone it and work there
3. If files describe local changes only → work in the current workspace

---

`;
// ============================================================================
// System Prompt Generator
// ============================================================================
/**
 * Generate a complete system prompt for an agent.
 * Combines base context + agent-specific instructions.
 *
 * @param agentPrompt - The agent-specific system prompt
 * @returns The complete system prompt with base context prepended
 */
export function generateSystemPrompt(agentPrompt) {
    return BASE_CONTEXT + agentPrompt;
}
//# sourceMappingURL=config.js.map