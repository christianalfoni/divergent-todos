export declare const BASE_CONTEXT = "## Environment Context\n\nYou are operating in a sandbox workspace at `/project/workspace`. This is NOT necessarily the target repository:\n\n- The workspace may contain a `.git` folder for sandbox/agent state - this is NOT your target repo\n- The workspace may have starter files or templates - these may or may not be relevant\n- Do NOT assume the current workspace is where you should work\n- Clone repositories mentioned in task files into the workspace\n\n## Context Files\n\n**Before starting your task, read ALL files in `.agent-context/`**\n\nThis folder contains context from previous agent contributions. Files are numbered in recommended reading order (e.g., `01_RESEARCH.md`, `02_PROTOTYPE.md`). Read them all to understand the full context before proceeding.\n\n**Decision flow:**\n1. List and read all files in `.agent-context/`\n2. If files reference a GitHub repo/PR \u2192 clone it and work there\n3. If files describe local changes only \u2192 work in the current workspace\n\n---\n\n";
/**
 * Generate a complete system prompt for an agent.
 * Combines base context + agent-specific instructions.
 *
 * @param agentPrompt - The agent-specific system prompt
 * @returns The complete system prompt with base context prepended
 */
export declare function generateSystemPrompt(agentPrompt: string): string;
//# sourceMappingURL=config.d.ts.map