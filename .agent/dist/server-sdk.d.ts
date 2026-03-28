import { Sandbox } from '@codesandbox/sdk';
import type { HostToken } from '@codesandbox/sdk';
import type { InitializeOptions, AgentPort, AgentTask, AgentTaskStatus, AgentInfo } from './types.js';
export declare class AgentHandle {
    readonly id: string;
    readonly sessionId: string;
    readonly hostToken: string;
    readonly branch?: string;
    private readonly _sandbox;
    private readonly _hostToken;
    private _client;
    constructor(sandbox: Sandbox, hostToken: HostToken, sessionId: string, branch?: string);
    /**
     * Get the AgentInfo needed to create a client-side AgentClient
     */
    getAgentInfo(): AgentInfo & {
        branch?: string;
    };
    private _getClient;
    /**
     * Get all currently open ports with their authenticated URLs
     */
    getPorts(): Promise<AgentPort[]>;
    /**
     * Listen for port open/close changes, receiving the full updated port list on each change.
     * @returns A cleanup function to remove the listeners
     */
    onPortsChanged(callback: (ports: AgentPort[]) => void): () => void;
    /**
     * Get all tasks defined in the sandbox (from .codesandbox/tasks.json)
     */
    getTasks(): Promise<AgentTask[]>;
    /**
     * Run (or restart if already running) a task by its ID
     */
    runTask(taskId: string): Promise<void>;
    /**
     * Stop a running task by its ID
     */
    stopTask(taskId: string): Promise<void>;
    /**
     * Restart a task by its ID
     */
    restartTask(taskId: string): Promise<void>;
    /**
     * Wait for a task to open its port and return the authenticated URL.
     */
    waitForTaskPort(taskId: string, timeout?: number): Promise<{
        port: number;
        url: string;
    } | null>;
    /**
     * Subscribe to status changes across all tasks.
     * @returns A cleanup function to remove all listeners
     */
    subscribeToTaskStatusChanges(callback: (taskId: string, status: AgentTaskStatus) => void): Promise<() => void>;
    private _buildPortUrl;
}
export declare class ServerSDK {
    private sdk;
    private hostTokens;
    constructor(csbApiKey?: string);
    private buildUrl;
    /**
     * Create a new sandbox agent and initialize it.
     * @returns An AgentHandle with sessionId, getPorts(), and onPortsChanged()
     */
    createAgent(initOptions?: Omit<InitializeOptions, 'apiKey'> & {
        apiKey?: string;
        templateId?: string;
    }): Promise<AgentHandle>;
    /**
     * Start a template build inside a new sandbox. Returns sandbox info for polling.
     * The actual build runs in the background on the sandbox's agent server.
     */
    startTemplateBuild(options: {
        repoFullName: string;
        repoName: string;
        githubToken: string;
        setupCommands: string[];
    }): Promise<{
        sandboxId: string;
        hostToken: string;
    }>;
    /**
     * Permanently delete a sandbox.
     */
    deleteSandbox(sandboxId: string): Promise<void>;
    /**
     * Initialize an existing sandbox agent
     */
    initializeAgent(sandboxId: string, options: InitializeOptions): Promise<{
        success: boolean;
        sessionId: string;
        branch?: string;
        message: string;
    }>;
}
/**
 * Get the SDK singleton instance. Creates one if it doesn't exist.
 * Uses CSB_API_KEY environment variable for authentication.
 */
export declare function getSDK(): ServerSDK;
//# sourceMappingURL=server-sdk.d.ts.map