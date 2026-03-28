export type SimplifiedEvent = AgentStartedEvent | AgentStatusEvent | AgentTextEvent | AgentThinkingEvent | AgentToolStartEvent | AgentToolCompleteEvent | AgentToolErrorEvent | AgentTodoUpdatedEvent | AgentPermissionRequestedEvent | AgentPermissionRespondedEvent | AgentErrorEvent | AgentCompleteEvent | AgentDiffEvent;
export interface AgentStartedEvent {
    id: number;
    type: 'agent.started';
    sessionId: string;
    agentMode: AgentModeId | null;
    timestamp: number;
}
export interface AgentStatusEvent {
    id: number;
    type: 'agent.status';
    status: 'thinking' | 'idle' | 'error';
    sessionId: string;
    timestamp: number;
}
export interface AgentTextEvent {
    id: number;
    type: 'agent.text';
    text: string;
    role: 'user' | 'assistant';
    messageId: string;
    sessionId: string;
    timestamp: number;
}
export interface AgentThinkingEvent {
    id: number;
    type: 'agent.thinking';
    text: string;
    messageId: string;
    sessionId: string;
    timestamp: number;
}
export interface AgentToolStartEvent {
    id: number;
    type: 'agent.tool.start';
    tool: string;
    callId: string;
    input: any;
    description?: string;
    messageId: string;
    sessionId: string;
    timestamp: number;
}
export interface AgentToolCompleteEvent {
    id: number;
    type: 'agent.tool.complete';
    tool: string;
    callId: string;
    output: string;
    duration: number;
    messageId: string;
    sessionId: string;
    timestamp: number;
}
export interface AgentToolErrorEvent {
    id: number;
    type: 'agent.tool.error';
    tool: string;
    callId: string;
    error: string;
    code?: string;
    messageId: string;
    sessionId: string;
    timestamp: number;
}
export interface AgentTodoUpdatedEvent {
    id: number;
    type: 'agent.todo.updated';
    todos: Array<{
        id: string;
        content: string;
        status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
        priority: 'high' | 'medium' | 'low';
    }>;
    sessionId: string;
    timestamp: number;
}
export interface AgentPermissionRequestedEvent {
    id: number;
    type: 'agent.permission.requested';
    permissionId: string;
    permission: string;
    title: string;
    patterns: string[];
    callId?: string;
    sessionId: string;
    timestamp: number;
}
export interface AgentPermissionRespondedEvent {
    id: number;
    type: 'agent.permission.responded';
    permissionId: string;
    response: 'once' | 'always' | 'reject';
    sessionId: string;
    timestamp: number;
}
export interface AgentErrorEvent {
    id: number;
    type: 'agent.error';
    error: string;
    code?: string;
    sessionId: string;
    timestamp: number;
}
export interface AgentCompleteEvent {
    id: number;
    type: 'agent.complete';
    sessionId: string;
    stopReason?: string;
    success?: boolean;
    error?: string;
    stats?: {
        tokens: number;
        cost: number;
        duration: number;
    };
    timestamp: number;
}
export interface FileDiffInfo {
    file: string;
    additions: number;
    deletions: number;
    status?: 'added' | 'deleted' | 'modified';
}
export interface AgentDiffEvent {
    id: number;
    type: 'agent.diff';
    files: FileDiffInfo[];
    sessionId: string;
    timestamp: number;
}
export interface InitializeOptions {
    apiKey: string;
    provider?: 'together' | 'anthropic';
    model?: string;
    systemPrompt?: string;
    agentMode?: AgentModeId | null;
    skills?: string[];
    cwd?: string;
    env?: Record<string, string>;
    command?: string;
    commands?: string[];
    files?: Record<string, string>;
    port?: number;
}
export interface AgentPort {
    port: number;
    url: URL;
}
export type AgentTaskStatus = 'IDLE' | 'RUNNING' | 'FINISHED' | 'ERROR' | 'KILLED' | 'RESTARTING';
export interface AgentTask {
    id: string;
    name: string;
    command: string;
    status: AgentTaskStatus;
}
export interface AgentInfo {
    sandboxId: string;
    sessionId: string;
}
export type AgentModeId = 'research' | 'plan' | 'kanban' | 'pull_request' | 'review' | 'guide' | 'testing_strategy' | 'linear_issues' | 'visualizer' | 'repository_setup';
export interface AgentModeConfig {
    id: AgentModeId;
    title: string;
    color: string;
    description: string;
    artifactReference: string;
}
//# sourceMappingURL=types.d.ts.map