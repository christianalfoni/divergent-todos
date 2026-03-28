// ============================================================================
// Agent Client — browser-safe SDK for communicating with a running agent
// ============================================================================
export class AgentClient {
    sandboxId;
    previewToken;
    port;
    constructor(options) {
        this.sandboxId = options.sandboxId;
        this.previewToken = options.previewToken;
        this.port = options.port ?? 3000;
    }
    buildUrl(path = '') {
        let url;
        // In development, proxy through vite to avoid CORS issues
        if (typeof globalThis !== 'undefined' && 'location' in globalThis) {
            const loc = globalThis.location;
            if (loc?.hostname === 'localhost') {
                url = new URL(`/sandbox-proxy/${this.sandboxId}-${this.port}${path}`, loc.origin);
                if (this.previewToken)
                    url.searchParams.set('preview_token', this.previewToken);
                return url;
            }
        }
        url = new URL(`https://${this.sandboxId}-${this.port}.csb.app${path}`);
        if (this.previewToken)
            url.searchParams.set('preview_token', this.previewToken);
        return url;
    }
    /**
     * Get the authenticated URL for a given port on this sandbox
     */
    getPortUrl(port) {
        const url = new URL(`https://${this.sandboxId}-${port}.csb.app`);
        if (this.previewToken)
            url.searchParams.set('preview_token', this.previewToken);
        return url.toString();
    }
    /**
     * Get the authenticated URL for an artifact path (file or folder) served by the agent
     */
    getArtifactUrl(artifactPath) {
        const url = new URL(`https://${this.sandboxId}-${this.port}.csb.app/artifacts/${artifactPath}`);
        if (this.previewToken)
            url.searchParams.set('preview_token', this.previewToken);
        return url.toString();
    }
    /**
     * Send a prompt to the agent (fire and forget — processing happens in the background)
     */
    async query(prompt, options) {
        const url = this.buildUrl('/query');
        const body = { message: prompt };
        if (options?.images) {
            body.images = options.images;
        }
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Query request failed: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        return { sessionId: result.sessionId };
    }
    /**
     * Switch the agent's mode — resets the pi session with a new system prompt.
     * Events are preserved across the switch.
     */
    async switchMode(systemPrompt, agentMode) {
        const url = this.buildUrl('/switch-mode');
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ systemPrompt, agentMode }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Switch-mode request failed: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        return { sessionId: result.sessionId };
    }
    async reset() {
        const url = this.buildUrl('/reset');
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Reset request failed: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        return { sessionId: result.sessionId };
    }
    /**
     * Connect to the agent's SSE stream, receiving historical events followed by live ones
     */
    async *stream(options) {
        const url = this.buildUrl('/stream');
        if (options?.lastMessageId !== undefined) {
            url.searchParams.set('lastMessageId', String(options.lastMessageId));
        }
        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'text/event-stream' },
            signal: options?.signal,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Stream request failed: ${response.status} ${errorText}`);
        }
        if (!response.body) {
            throw new Error('Response body is null');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                if (options?.signal?.aborted)
                    break;
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        try {
                            yield JSON.parse(data);
                        }
                        catch {
                            // Skip malformed events
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    /**
     * Get persisted messages from the agent, optionally starting after a given ID
     */
    async getMessages(options) {
        const url = this.buildUrl('/messages');
        if (options?.lastMessageId !== undefined) {
            url.searchParams.set('lastMessageId', String(options.lastMessageId));
        }
        const response = await fetch(url.toString(), {});
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get messages: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        return result.messages;
    }
    /**
     * Read a file from the agent's working directory
     */
    async readFile(filePath) {
        const url = this.buildUrl('/file');
        url.searchParams.set('path', filePath);
        const response = await fetch(url.toString(), {});
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to read file: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        return result.content;
    }
    /**
     * Get the current git branch from the agent's working directory
     */
    async getBranch() {
        const url = this.buildUrl('/branch');
        const response = await fetch(url.toString(), {});
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get branch: ${response.status} ${errorText}`);
        }
        const result = await response.json();
        return result.branch;
    }
    /**
     * Execute a command in the agent's sandbox
     */
    async *execCommand(command, options) {
        const url = this.buildUrl('/exec');
        url.searchParams.set('command', command);
        const response = await fetch(url.toString(), {
            headers: { 'Accept': 'text/event-stream' },
            signal: options?.signal,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Exec request failed: ${response.status} ${errorText}`);
        }
        if (!response.body) {
            throw new Error('Response body is null');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                if (options?.signal?.aborted)
                    break;
                const { done, value } = await reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            yield JSON.parse(line.slice(6));
                        }
                        catch {
                            // Skip malformed events
                        }
                    }
                }
            }
        }
        finally {
            reader.releaseLock();
        }
    }
    async writeFile(filePath, content) {
        const url = this.buildUrl('/file');
        url.searchParams.set('path', filePath);
        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to write file: ${response.status} ${errorText}`);
        }
    }
}
//# sourceMappingURL=client-sdk.js.map