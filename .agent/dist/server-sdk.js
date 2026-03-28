import { CodeSandbox } from '@codesandbox/sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
// ============================================================================
// Template ID (inlined from root package.json)
// ============================================================================
function getTemplateId() {
    // Read version from root package.json (3 levels up from this file)
    const rootPackageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../package.json');
    const rootPackageJson = JSON.parse(readFileSync(rootPackageJsonPath, 'utf-8'));
    const version = rootPackageJson.version;
    // Convert dots to hyphens: "0.1.0" -> "0-1-0"
    const normalizedVersion = version.replace(/\./g, '-');
    return `agent@${normalizedVersion}`;
}
// ============================================================================
// Agent Handle
// ============================================================================
export class AgentHandle {
    id;
    sessionId;
    hostToken;
    branch;
    _sandbox;
    _hostToken;
    _client = null;
    constructor(sandbox, hostToken, sessionId, branch) {
        this.id = sandbox.id;
        this.sessionId = sessionId;
        this.hostToken = hostToken.token;
        this.branch = branch;
        this._sandbox = sandbox;
        this._hostToken = hostToken;
    }
    /**
     * Get the AgentInfo needed to create a client-side AgentClient
     */
    getAgentInfo() {
        return {
            sandboxId: this.id,
            sessionId: this.sessionId,
            hostToken: this.hostToken,
            branch: this.branch,
        };
    }
    async _getClient() {
        if (!this._client) {
            this._client = await this._sandbox.connect({ hostToken: this._hostToken });
        }
        return this._client;
    }
    /**
     * Get all currently open ports with their authenticated URLs
     */
    async getPorts() {
        const client = await this._getClient();
        const ports = await client.ports.getAll();
        return ports.map(p => ({
            port: p.port,
            url: this._buildPortUrl(p.port),
        }));
    }
    /**
     * Listen for port open/close changes, receiving the full updated port list on each change.
     * @returns A cleanup function to remove the listeners
     */
    onPortsChanged(callback) {
        let openDisposable = null;
        let closeDisposable = null;
        this._getClient().then(client => {
            const handleChange = async () => {
                const ports = await this.getPorts();
                callback(ports);
            };
            openDisposable = client.ports.onDidPortOpen(() => { handleChange(); });
            closeDisposable = client.ports.onDidPortClose(() => { handleChange(); });
        });
        return () => {
            openDisposable?.dispose();
            closeDisposable?.dispose();
        };
    }
    /**
     * Get all tasks defined in the sandbox (from .codesandbox/tasks.json)
     */
    async getTasks() {
        const client = await this._getClient();
        const tasks = await client.tasks.getAll();
        return tasks.map(task => ({
            id: task.id,
            name: task.name,
            command: task.command,
            status: task.status,
        }));
    }
    /**
     * Run (or restart if already running) a task by its ID
     */
    async runTask(taskId) {
        const client = await this._getClient();
        const task = await client.tasks.get(taskId);
        if (!task)
            throw new Error(`Task not found: ${taskId}`);
        await task.run();
    }
    /**
     * Stop a running task by its ID
     */
    async stopTask(taskId) {
        const client = await this._getClient();
        const task = await client.tasks.get(taskId);
        if (!task)
            throw new Error(`Task not found: ${taskId}`);
        await task.stop();
    }
    /**
     * Restart a task by its ID
     */
    async restartTask(taskId) {
        const client = await this._getClient();
        const task = await client.tasks.get(taskId);
        if (!task)
            throw new Error(`Task not found: ${taskId}`);
        await task.restart();
    }
    /**
     * Wait for a task to open its port and return the authenticated URL.
     */
    async waitForTaskPort(taskId, timeout = 60000) {
        const client = await this._getClient();
        const task = await client.tasks.get(taskId);
        if (!task)
            return null;
        if (task.ports && task.ports.length > 0) {
            const openPort = task.ports[0];
            return { port: openPort.port, url: this._buildPortUrl(openPort.port).toString() };
        }
        const portResult = await task.waitForPort(timeout);
        return {
            port: portResult.port,
            url: this._buildPortUrl(portResult.port).toString(),
        };
    }
    /**
     * Subscribe to status changes across all tasks.
     * @returns A cleanup function to remove all listeners
     */
    async subscribeToTaskStatusChanges(callback) {
        const client = await this._getClient();
        const tasks = await client.tasks.getAll();
        const disposables = tasks.map(task => task.onStatusChange((status) => callback(task.id, status)));
        return () => { for (const d of disposables)
            d.dispose(); };
    }
    _buildPortUrl(port, path = '') {
        const url = new URL(`https://${this.id}-${port}.csb.app${path}`);
        url.searchParams.set('preview_token', this._hostToken.token);
        return url;
    }
}
// ============================================================================
// Server SDK
// ============================================================================
export class ServerSDK {
    sdk;
    hostTokens = new Map();
    constructor(csbApiKey) {
        this.sdk = new CodeSandbox(csbApiKey);
    }
    buildUrl(sandboxId, port, path = '') {
        const url = new URL(`https://${sandboxId}-${port}.csb.app${path}`);
        const hostToken = this.hostTokens.get(sandboxId);
        if (hostToken) {
            url.searchParams.set('preview_token', hostToken.token);
        }
        return url;
    }
    /**
     * Create a new sandbox agent and initialize it.
     * @returns An AgentHandle with sessionId, getPorts(), and onPortsChanged()
     */
    async createAgent(initOptions) {
        const templateId = initOptions?.templateId ?? getTemplateId();
        console.log(`📦 Using template: ${templateId}`);
        const sandbox = await this.sdk.sandboxes.create({
            id: templateId,
            privacy: 'private',
        });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);
        const hostToken = await this.sdk.hosts.createToken(sandbox.id, { expiresAt });
        this.hostTokens.set(sandbox.id, hostToken);
        if (!initOptions?.apiKey) {
            throw new Error('API key is required for initialization. Provide it in createAgent options.');
        }
        const { sessionId, branch } = await this.initializeAgent(sandbox.id, {
            ...initOptions,
            apiKey: initOptions.apiKey,
        });
        return new AgentHandle(sandbox, hostToken, sessionId, branch);
    }
    /**
     * Start a template build inside a new sandbox. Returns sandbox info for polling.
     * The actual build runs in the background on the sandbox's agent server.
     */
    async startTemplateBuild(options) {
        const baseTemplate = getTemplateId();
        console.log(`📦 Creating build sandbox from: ${baseTemplate}`);
        const sandbox = await this.sdk.sandboxes.create({
            id: baseTemplate,
            privacy: 'private',
        });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 1);
        const hostToken = await this.sdk.hosts.createToken(sandbox.id, { expiresAt });
        this.hostTokens.set(sandbox.id, hostToken);
        // Fire the build request to the sandbox's agent server
        const buildUrl = this.buildUrl(sandbox.id, 3000, '/build-template');
        console.log(`🔧 Starting template build at: ${buildUrl.toString()}`);
        const response = await fetch(buildUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                repoFullName: options.repoFullName,
                repoName: options.repoName,
                githubToken: options.githubToken,
                setupCommands: options.setupCommands,
                csbApiKey: process.env.CSB_API_KEY,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            await this.sdk.sandboxes.delete(sandbox.id).catch(() => { });
            throw new Error(`Failed to start template build: ${response.status} ${errorText}`);
        }
        return { sandboxId: sandbox.id, hostToken: hostToken.token };
    }
    /**
     * Permanently delete a sandbox.
     */
    async deleteSandbox(sandboxId) {
        await this.sdk.sandboxes.delete(sandboxId);
        this.hostTokens.delete(sandboxId);
    }
    /**
     * Initialize an existing sandbox agent
     */
    async initializeAgent(sandboxId, options) {
        const port = options.port || 3000;
        const initUrl = this.buildUrl(sandboxId, port, '/initialize');
        console.log(`🔧 Initializing agent at: ${initUrl.toString()}`);
        const commands = options.commands ?? (options.command ? [options.command] : undefined);
        const response = await fetch(initUrl.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                apiKey: options.apiKey,
                provider: options.provider,
                model: options.model,
                systemPrompt: options.systemPrompt,
                agentMode: options.agentMode,
                skills: options.skills,
                cwd: options.cwd,
                env: options.env,
                commands,
                files: options.files,
            }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to initialize agent: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        console.log(`✅ Agent initialized`);
        console.log(`🔑 Session ID: ${result.sessionId}`);
        if (result.branch)
            console.log(`🌿 Branch: ${result.branch}`);
        return { success: true, sessionId: result.sessionId, branch: result.branch, message: 'Agent initialized successfully' };
    }
}
// ============================================================================
// SDK Singleton
// ============================================================================
let sdkInstance = null;
/**
 * Get the SDK singleton instance. Creates one if it doesn't exist.
 * Uses CSB_API_KEY environment variable for authentication.
 */
export function getSDK() {
    if (!sdkInstance) {
        sdkInstance = new ServerSDK(process.env.CSB_API_KEY);
    }
    return sdkInstance;
}
//# sourceMappingURL=server-sdk.js.map