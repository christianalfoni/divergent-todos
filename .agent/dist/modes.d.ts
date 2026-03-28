import type { AgentModeConfig } from './types.js';
export declare const AGENT_MODES: AgentModeConfig[];
export declare const DEFAULT_SYSTEM_PROMPT = "You are a helpful coding assistant working in a sandbox environment.\n\nHelp the user with their tasks \u2014 answer questions, write code, debug issues, and explain concepts.\nUse the available tools to read files, run commands, and make changes as needed.\n\nBe concise and direct. Focus on solving the user's problem.\n\nIMPORTANT: Never push code or create pull requests. The user will explicitly use pull request mode for that.";
export declare function generateModeSystemPrompt(mode: AgentModeConfig): string;
//# sourceMappingURL=modes.d.ts.map