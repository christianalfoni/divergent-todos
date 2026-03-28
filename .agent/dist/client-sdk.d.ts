import type { SimplifiedEvent } from './types.js';
export type ExecEvent = {
    type: 'stdout';
    data: string;
} | {
    type: 'stderr';
    data: string;
} | {
    type: 'exit';
    code: number;
};
export declare class AgentClient {
    readonly sandboxId: string;
    readonly hostToken: string;
    private readonly port;
    constructor(options: {
        sandboxId: string;
        hostToken: string;
        port?: number;
    });
    private buildUrl;
    /**
     * Get the authenticated URL for a given port on this sandbox
     */
    getPortUrl(port: number): string;
    /**
     * Get the authenticated URL for an artifact path (file or folder) served by the agent
     */
    getArtifactUrl(artifactPath: string): string;
    /**
     * Send a prompt to the agent (fire and forget — processing happens in the background)
     */
    query(prompt: string, options?: {
        images?: Array<{
            type: "image";
            source: {
                type: "base64";
                mediaType: string;
                data: string;
            };
        }>;
    }): Promise<{
        sessionId: string;
    }>;
    /**
     * Switch the agent's mode — resets the pi session with a new system prompt.
     * Events are preserved across the switch.
     */
    switchMode(systemPrompt: string, agentMode: string | null): Promise<{
        sessionId: string;
    }>;
    /**
     * Connect to the agent's SSE stream, receiving historical events followed by live ones
     */
    stream(options?: {
        lastMessageId?: number;
        signal?: AbortSignal;
    }): AsyncIterableIterator<SimplifiedEvent>;
    /**
     * Get persisted messages from the agent, optionally starting after a given ID
     */
    getMessages(options?: {
        lastMessageId?: number;
    }): Promise<SimplifiedEvent[]>;
    /**
     * Read a file from the agent's working directory
     */
    readFile(filePath: string): Promise<string>;
    /**
     * Get the current git branch from the agent's working directory
     */
    getBranch(): Promise<string | undefined>;
    /**
     * Write a file to the agent's working directory
     */
    execCommand(command: string, options?: {
        signal?: AbortSignal;
    }): AsyncIterableIterator<ExecEvent>;
    writeFile(filePath: string, content: string): Promise<void>;
}
//# sourceMappingURL=client-sdk.d.ts.map