import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { writeFileSync, mkdirSync, existsSync, readFileSync, appendFileSync, cpSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { exec, spawn } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { createAgentSession, DefaultResourceLoader, SettingsManager, } from "@mariozechner/pi-coding-agent";
import { AGENT_MODES } from "../modes.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = join(__dirname, "../skills");
const execAsync = promisify(exec);
// Copy skills from the agent package to the runtime .pi/agent directory
function copySkills(skills, agentDir) {
    if (skills.length === 0)
        return;
    const targetSkillsDir = join(agentDir, "skills");
    mkdirSync(targetSkillsDir, { recursive: true });
    for (const skillName of skills) {
        const sourceSkillDir = join(SKILLS_DIR, skillName);
        const targetSkillDir = join(targetSkillsDir, skillName);
        if (!existsSync(sourceSkillDir)) {
            console.warn(`⚠️  Skill '${skillName}' not found in ${SKILLS_DIR}`);
            continue;
        }
        mkdirSync(targetSkillDir, { recursive: true });
        cpSync(sourceSkillDir, targetSkillDir, { recursive: true });
        console.log(`📋 Copied skill: ${skillName}`);
    }
}
const subscribers = new Map();
// Message persistence
const MESSAGES_FILE = "/tmp/agent-messages.jsonl";
let messageCounter = 0;
const allEvents = [];
// Track session info
let currentSessionId = null;
let currentCwd = null;
let currentAgentMode = null;
let currentSystemPrompt = undefined;
// Template build state
let templateBuildState = { status: 'idle' };
// Track accumulated text per message (by timestamp as unique ID)
const messageTexts = new Map();
const messageThinking = new Map();
const messageUsage = new Map();
function broadcast(event) {
    const line = `data: ${JSON.stringify(event)}\n\n`;
    for (const send of subscribers.values()) {
        try {
            send(line);
        }
        catch (err) {
            console.error(`[broadcast] ❌ Failed to send to subscriber:`, err);
        }
    }
}
async function writeEvent(event) {
    // Only log important events (agent lifecycle, errors)
    if (event.type === 'agent.started' || event.type === 'agent.complete' || event.type === 'agent.error') {
        console.log(`[event] 📌 ${event.type}`);
    }
    allEvents.push(event);
    broadcast(event);
    try {
        appendFileSync(MESSAGES_FILE, JSON.stringify(event) + "\n", "utf-8");
    }
    catch (error) {
        console.error("[writeEvent] ❌ Failed to persist message:", error);
    }
}
function loadPersistedEvents() {
    if (!existsSync(MESSAGES_FILE))
        return;
    try {
        const data = readFileSync(MESSAGES_FILE, "utf-8");
        const lines = data.split("\n").filter((line) => line.trim());
        for (const line of lines) {
            const event = JSON.parse(line);
            allEvents.push(event);
        }
        if (allEvents.length > 0) {
            messageCounter = allEvents[allEvents.length - 1].id + 1;
            console.log(`📚 Restored ${allEvents.length} messages from file (next id: ${messageCounter})`);
        }
    }
    catch (error) {
        console.error("Failed to load persisted events:", error);
    }
}
// Start the pi agent session
async function startAgentSession(cwd, agentDir, systemPrompt) {
    // Pass systemPrompt directly to the resource loader instead of relying on
    // SYSTEM.md file discovery — this avoids the bug where a project-level
    // .pi/SYSTEM.md in the cloned repo would shadow the mode-specific prompt.
    const settingsManager = SettingsManager.create(cwd, agentDir);
    const resourceLoader = new DefaultResourceLoader({
        cwd,
        agentDir,
        settingsManager,
        ...(systemPrompt ? { systemPrompt } : {}),
    });
    await resourceLoader.reload();
    const result = await createAgentSession({ cwd, agentDir, resourceLoader, settingsManager });
    const session = result.session;
    currentSessionId = session.sessionId;
    console.log(`📊 Session: ${session.sessionId}, Model: ${session.agent.state.model?.provider}/${session.agent.state.model?.id}`);
    console.log(`📊 System prompt set: ${session.systemPrompt?.length ?? 0} chars`);
    console.log(`📊 System prompt preview: ${session.systemPrompt?.substring(0, 200)}...`);
    if (result.modelFallbackMessage) {
        console.log(`⚠️  ${result.modelFallbackMessage}`);
    }
    // Clear message tracking for new session
    messageTexts.clear();
    messageThinking.clear();
    messageUsage.clear();
    session.subscribe((event) => {
        switch (event.type) {
            case "agent_start":
                // Clear message tracking for new agent run
                messageTexts.clear();
                messageThinking.clear();
                messageUsage.clear();
                writeEvent({
                    id: messageCounter++,
                    type: "agent.started",
                    sessionId: currentSessionId,
                    agentMode: currentAgentMode,
                    timestamp: Date.now(),
                });
                break;
            case "message_start": {
                // New message starting - clear accumulation buffers
                const timestamp = event.message.timestamp;
                messageTexts.delete(timestamp);
                messageThinking.delete(timestamp);
                messageUsage.delete(timestamp);
                break;
            }
            case "message_update": {
                const e = event.assistantMessageEvent;
                const message = event.message;
                const timestamp = message.timestamp;
                // Track usage for this message
                if ('partial' in e && e.partial && e.partial.usage) {
                    messageUsage.set(timestamp, {
                        inputTokens: e.partial.usage.input,
                        outputTokens: e.partial.usage.output,
                    });
                }
                if (e.type === "text_delta") {
                    // Accumulate text (no broadcast - wait for message_end)
                    const existing = messageTexts.get(timestamp) || "";
                    messageTexts.set(timestamp, existing + (e.delta || ""));
                    // Log text content (truncated)
                    if (e.delta) {
                        console.log(`📝 Text: ${e.delta.slice(0, 200)}${e.delta.length > 200 ? '...' : ''}`);
                    }
                }
                if (e.type === "thinking_delta") {
                    // Accumulate thinking (no broadcast - wait for message_end)
                    const existing = messageThinking.get(timestamp) || "";
                    messageThinking.set(timestamp, existing + (e.delta || ""));
                }
                break;
            }
            case "message_end": {
                // Message complete - emit final accumulated text/thinking as single events
                const message = event.message;
                const timestamp = message.timestamp;
                const usage = messageUsage.get(timestamp);
                // Emit complete text if any
                const text = messageTexts.get(timestamp);
                if (text) {
                    writeEvent({
                        id: messageCounter++,
                        type: "agent.text",
                        text,
                        role: "assistant",
                        messageId: String(timestamp),
                        sessionId: currentSessionId,
                        timestamp,
                        ...(usage && { usage }),
                    });
                }
                // Emit complete thinking if any
                const thinking = messageThinking.get(timestamp);
                if (thinking) {
                    writeEvent({
                        id: messageCounter++,
                        type: "agent.thinking",
                        text: thinking,
                        messageId: String(timestamp),
                        sessionId: currentSessionId,
                        timestamp,
                        ...(usage && { usage }),
                    });
                }
                break;
            }
            case "tool_execution_start":
                console.log(`🔧 Tool start: ${event.toolName}`);
                if (event.args) {
                    console.log(`   Args: ${JSON.stringify(event.args, null, 2).slice(0, 500)}`);
                }
                writeEvent({
                    id: messageCounter++,
                    type: "agent.tool.start",
                    tool: event.toolName,
                    args: event.args,
                    callId: event.toolCallId,
                    sessionId: currentSessionId,
                    timestamp: Date.now(),
                });
                break;
            case "tool_execution_end":
                console.log(`✅ Tool complete: ${event.toolName}${event.isError ? ' (ERROR)' : ''}`);
                if (event.result) {
                    console.log(`   Output: ${String(event.result).slice(0, 500)}`);
                }
                writeEvent({
                    id: messageCounter++,
                    type: "agent.tool.complete",
                    tool: event.toolName,
                    callId: event.toolCallId,
                    output: event.result,
                    isError: event.isError,
                    sessionId: currentSessionId,
                    timestamp: Date.now(),
                });
                break;
            case "agent_end": {
                // Check if this was a successful completion or an error
                // Valid stop reasons: end_turn, stop_sequence, stop, tool_use
                // Error indicates failure (rate limit, overloaded, etc.)
                const lastAssistant = event.messages.filter(m => m.role === "assistant").pop();
                const stopReason = lastAssistant?.stopReason ?? "unknown";
                const errorMessage = lastAssistant?.errorMessage;
                const isSuccess = stopReason !== "error";
                console.log(`🏁 Agent end: stopReason=${stopReason}, success=${isSuccess}${errorMessage ? `, error=${errorMessage}` : ""}`);
                writeEvent({
                    id: messageCounter++,
                    type: "agent.complete",
                    sessionId: currentSessionId,
                    timestamp: Date.now(),
                    stopReason,
                    success: isSuccess,
                    error: errorMessage,
                });
                break;
            }
        }
    });
    return session;
}
async function main() {
    loadPersistedEvents();
    let session = null;
    const server = createServer((req, res) => {
        const url = new URL(req.url ?? "/", "http://localhost");
        // CORS headers for all responses
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        if (req.method === "OPTIONS") {
            res.writeHead(204);
            res.end();
            return;
        }
        // GET /messages - retrieve persisted messages (deduplicated text/thinking events)
        if (req.method === "GET" && url.pathname === "/messages") {
            const lastMessageId = url.searchParams.get("lastMessageId");
            const lastId = lastMessageId ? parseInt(lastMessageId, 10) : undefined;
            const events = lastId !== undefined
                ? allEvents.filter((msg) => msg.id > lastId)
                : allEvents;
            // Exclude context_usage events (not useful for chat display)
            const result = events.filter(event => event.type !== 'context_usage');
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ messages: result }));
            return;
        }
        // GET /stream - SSE stream
        if (req.method === "GET" && url.pathname === "/stream") {
            const id = randomUUID();
            const lastMessageId = url.searchParams.get("lastMessageId");
            const lastId = lastMessageId ? parseInt(lastMessageId, 10) : undefined;
            console.log(`[stream] 🔌 New SSE connection: ${id} (${subscribers.size + 1} total subscribers)`);
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            });
            const ping = setInterval(() => res.write(": ping\n\n"), 15_000);
            subscribers.set(id, (data) => res.write(data));
            // Send historical events
            const snapshot = lastId !== undefined
                ? allEvents.filter((e) => e.id > lastId)
                : allEvents.slice();
            for (const event of snapshot) {
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }
            req.on("close", () => {
                console.log(`[stream] ❌ Connection closed: ${id} (${subscribers.size - 1} remaining)`);
                clearInterval(ping);
                subscribers.delete(id);
            });
            return;
        }
        // POST /initialize
        if (req.method === "POST" && url.pathname === "/initialize") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { systemPrompt, agentMode = null, skills = [], files, model, provider = "together", env, commands, cwd, apiKey } = JSON.parse(body);
                    // Set environment variables
                    if (env && typeof env === "object") {
                        for (const [key, value] of Object.entries(env)) {
                            process.env[key] = String(value);
                        }
                    }
                    // Set provider-specific API key
                    if (apiKey) {
                        if (provider === "anthropic") {
                            process.env.ANTHROPIC_API_KEY = apiKey;
                        }
                        else {
                            process.env.TOGETHER_API_KEY = apiKey;
                        }
                    }
                    // Write files to workspace (e.g., .agent-context/TASK.md)
                    if (files && typeof files === "object") {
                        for (const [filePath, content] of Object.entries(files)) {
                            const fullPath = resolve(process.env.WORKSPACE ?? "/project/workspace", filePath);
                            mkdirSync(dirname(fullPath), { recursive: true });
                            writeFileSync(fullPath, content, "utf8");
                            console.log(`📄 Wrote file: ${filePath}`);
                        }
                    }
                    // Generate and write models.json based on selected provider
                    let modelsJson;
                    let defaultModelId;
                    if (provider === "anthropic") {
                        defaultModelId = model ?? "claude-sonnet-4-6";
                        // Use built-in model definitions — pi-ai's registry already has claude-sonnet-4-6,
                        // claude-opus-4-6, claude-haiku-4-5-20251001 with correct baseUrl and metadata.
                        // API key is picked up automatically from ANTHROPIC_API_KEY env var.
                        modelsJson = {
                            providers: {
                                anthropic: {
                                    baseUrl: "https://api.anthropic.com",
                                }
                            }
                        };
                    }
                    else {
                        defaultModelId = model ?? "zai-org/GLM-5";
                        modelsJson = {
                            providers: {
                                together: {
                                    baseUrl: "https://api.together.xyz/v1",
                                    api: "openai-completions",
                                    apiKey: "TOGETHER_API_KEY",
                                    models: [
                                        { id: defaultModelId }
                                    ]
                                }
                            }
                        };
                    }
                    // Use a fixed agent directory for config (separate from working directory)
                    // This allows pi to operate in a subdirectory while keeping config in one place
                    const agentDir = process.env.PI_CODING_AGENT_DIR ?? "/project/workspace/.pi/agent";
                    const modelsPath = `${agentDir}/models.json`;
                    mkdirSync(dirname(modelsPath), { recursive: true });
                    writeFileSync(modelsPath, JSON.stringify(modelsJson, null, 2), "utf8");
                    // Write settings.json to select the default model
                    const settingsJson = {
                        defaultProvider: provider,
                        defaultModel: defaultModelId,
                    };
                    const settingsPath = `${agentDir}/settings.json`;
                    writeFileSync(settingsPath, JSON.stringify(settingsJson, null, 2), "utf8");
                    // Store system prompt and agent mode
                    currentSystemPrompt = systemPrompt;
                    currentAgentMode = agentMode;
                    // Copy skills required by this agent
                    copySkills(skills, agentDir);
                    // Set PI_CODING_AGENT_DIR so pi knows where to find config
                    // This is separate from cwd which is where tools operate
                    process.env.PI_CODING_AGENT_DIR = agentDir;
                    // Run commands
                    if (commands?.length) {
                        const cmdEnv = { ...process.env };
                        for (const cmd of commands) {
                            console.log(`⚙️  Running: ${cmd}`);
                            try {
                                const { stdout, stderr } = await execAsync(cmd, { env: cmdEnv });
                                if (stdout)
                                    console.log(`📝 ${stdout.trim()}`);
                                if (stderr)
                                    console.error(`⚠️  ${stderr.trim()}`);
                            }
                            catch (err) {
                                console.error(`❌ Command failed: ${cmd}`, err.message);
                                // Return error response instead of continuing
                                res.writeHead(500, { "Content-Type": "application/json" });
                                res.end(JSON.stringify({
                                    error: `Command failed: ${cmd}`,
                                    message: err.message,
                                    stderr: err.stderr
                                }));
                                return;
                            }
                        }
                    }
                    // Start session
                    const resolvedCwd = cwd ?? process.env.WORKSPACE ?? process.cwd();
                    currentCwd = resolvedCwd;
                    session = await startAgentSession(resolvedCwd, agentDir, currentSystemPrompt);
                    // Detect current branch in cwd (if it's a git repo)
                    let branch;
                    try {
                        const { stdout } = await execAsync('git branch --show-current', { cwd: resolvedCwd });
                        const trimmed = stdout.trim();
                        if (trimmed)
                            branch = trimmed;
                    }
                    catch {
                        // Not a git repo or git not available — ignore
                    }
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true, sessionId: currentSessionId, branch }));
                }
                catch (err) {
                    console.error("Initialize error:", err);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
            });
            return;
        }
        // POST /switch-mode — reset session with new system prompt, preserve events
        if (req.method === "POST" && url.pathname === "/switch-mode") {
            if (!session) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Not initialized" }));
                return;
            }
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { systemPrompt, agentMode = null } = JSON.parse(body);
                    if (!systemPrompt) {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "systemPrompt is required" }));
                        return;
                    }
                    const agentDir = process.env.PI_CODING_AGENT_DIR ?? "/project/workspace/.pi/agent";
                    // Store system prompt and agent mode
                    currentSystemPrompt = systemPrompt;
                    currentAgentMode = agentMode;
                    // Create fresh pi session (events are preserved)
                    session = await startAgentSession(currentCwd, agentDir, currentSystemPrompt);
                    console.log(`🔄 Session reset for mode: ${agentMode ?? 'default'}`);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true, sessionId: currentSessionId }));
                }
                catch (err) {
                    console.error("Switch-mode error:", err);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
            });
            return;
        }
        // POST /query
        if (req.method === "POST" && url.pathname === "/query") {
            if (!session) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Not initialized" }));
                return;
            }
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { message, images } = JSON.parse(body);
                    console.log(`[query] 📩 Received query`);
                    console.log(`[query]   Message length: ${message?.length ?? 0} chars`);
                    console.log(`[query]   Agent mode: ${currentAgentMode}`);
                    // Clear old message tracking before starting new prompt
                    messageTexts.clear();
                    messageThinking.clear();
                    messageUsage.clear();
                    // Prepend a mode reminder so the LLM adheres to mode constraints
                    let effectiveMessage = message;
                    if (currentAgentMode) {
                        const modeConfig = AGENT_MODES.find(m => m.id === currentAgentMode);
                        if (modeConfig) {
                            effectiveMessage = `[Mode: ${modeConfig.title} — ${modeConfig.description}. Follow your system prompt instructions for this mode.]\n\n${message}`;
                        }
                    }
                    session
                        .prompt(effectiveMessage, images ? { images } : undefined)
                        .then(() => {
                        console.log(`[query] ✅ Prompt completed`);
                    })
                        .catch((err) => {
                        console.error(`[query] ❌ Prompt failed:`, err);
                        writeEvent({
                            id: messageCounter++,
                            type: "agent.error",
                            error: err.message ?? String(err),
                            sessionId: currentSessionId,
                            timestamp: Date.now(),
                        });
                    });
                    res.writeHead(202, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true, sessionId: currentSessionId }));
                }
                catch (err) {
                    console.error(`[query] ❌ Error parsing body:`, err);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
            });
            return;
        }
        // GET /branch - get current git branch
        if (req.method === "GET" && url.pathname === "/branch") {
            if (!currentCwd) {
                res.writeHead(503, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Not initialized" }));
                return;
            }
            execAsync('git branch --show-current', { cwd: currentCwd })
                .then(({ stdout }) => {
                const branch = stdout.trim() || undefined;
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ branch }));
            })
                .catch(() => {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ branch: undefined }));
            });
            return;
        }
        // GET /health
        if (req.method === "GET" && url.pathname === "/health") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, initialized: session !== null }));
            return;
        }
        // GET /file - read a file
        if (req.method === "GET" && url.pathname === "/file") {
            const filePath = url.searchParams.get("path");
            if (!filePath) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Missing required query param: path" }));
                return;
            }
            try {
                const content = readFileSync(filePath, "utf-8");
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ content }));
            }
            catch (err) {
                if (err.code === "ENOENT") {
                    res.writeHead(404, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "File not found", path: filePath }));
                }
                else {
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Failed to read file", message: err.message }));
                }
            }
            return;
        }
        // POST /file - write a file
        if (req.method === "POST" && url.pathname === "/file") {
            const filePath = url.searchParams.get("path");
            if (!filePath) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Missing required query param: path" }));
                return;
            }
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", () => {
                try {
                    const { content } = JSON.parse(body);
                    if (typeof content !== "string") {
                        res.writeHead(400, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "Missing or invalid 'content' in request body" }));
                        return;
                    }
                    // Ensure parent directory exists
                    const dir = dirname(filePath);
                    if (dir && !existsSync(dir)) {
                        mkdirSync(dir, { recursive: true });
                    }
                    writeFileSync(filePath, content, "utf-8");
                    console.log(`📝 Wrote file: ${filePath}`);
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true }));
                }
                catch (err) {
                    console.error(`Failed to write file ${filePath}:`, err);
                    res.writeHead(500, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "Failed to write file", message: err.message }));
                }
            });
            return;
        }
        // GET /exec?command=... - run a command and stream stdout/stderr/exit via SSE
        if (req.method === "GET" && url.pathname === "/exec") {
            const command = url.searchParams.get("command");
            if (!command) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "command query param is required" }));
                return;
            }
            const cwd = currentCwd ?? process.cwd();
            console.log(`[exec] Command: ${command}`);
            console.log(`[exec] CWD: ${cwd} (exists: ${existsSync(cwd)})`);
            console.log(`[exec] /bin/bash exists: ${existsSync("/bin/bash")}`);
            res.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            });
            const child = spawn("bash", ["-c", command], {
                cwd,
                env: process.env,
                stdio: ["ignore", "pipe", "pipe"],
            });
            console.log(`[exec] Spawned PID: ${child.pid ?? "undefined (spawn may have failed)"}`);
            child.stdout.on("data", (data) => {
                const text = data.toString();
                console.log(`[exec] stdout: ${text.slice(0, 500)}`);
                res.write(`data: ${JSON.stringify({ type: "stdout", data: text })}\n\n`);
            });
            child.stderr.on("data", (data) => {
                const text = data.toString();
                console.log(`[exec] stderr: ${text.slice(0, 500)}`);
                res.write(`data: ${JSON.stringify({ type: "stderr", data: text })}\n\n`);
            });
            child.on("error", (err) => {
                console.log(`[exec] spawn error: ${err.message}`);
                res.write(`data: ${JSON.stringify({ type: "stderr", data: err.message })}\n\n`);
                res.write(`data: ${JSON.stringify({ type: "exit", code: 1 })}\n\n`);
                res.end();
            });
            child.on("close", (code) => {
                console.log(`[exec] exited with code: ${code}`);
                res.write(`data: ${JSON.stringify({ type: "exit", code: code ?? 1 })}\n\n`);
                res.end();
            });
            req.on("close", () => {
                console.log(`[exec] client disconnected, killing process`);
                child.kill();
            });
            return;
        }
        // GET /artifacts/* - static file serving for artifact folders
        if (req.method === "GET" && url.pathname.startsWith("/artifacts/")) {
            const artifactsBase = resolve(currentCwd ?? process.cwd(), ".artifacts");
            const requestedPath = decodeURIComponent(url.pathname.slice("/artifacts/".length));
            const resolved = resolve(artifactsBase, requestedPath);
            // Directory traversal protection
            if (!resolved.startsWith(artifactsBase)) {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Forbidden" }));
                return;
            }
            try {
                let filePath = resolved;
                const stat = statSync(filePath);
                if (stat.isDirectory()) {
                    filePath = join(filePath, "index.html");
                }
                const mimeTypes = {
                    ".html": "text/html",
                    ".js": "application/javascript",
                    ".css": "text/css",
                    ".json": "application/json",
                    ".svg": "image/svg+xml",
                    ".png": "image/png",
                    ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg",
                    ".gif": "image/gif",
                    ".woff2": "font/woff2",
                    ".woff": "font/woff",
                };
                const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
                const contentType = mimeTypes[ext] ?? "application/octet-stream";
                const content = readFileSync(filePath);
                res.writeHead(200, { "Content-Type": contentType });
                res.end(content);
            }
            catch {
                res.writeHead(404, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "File not found" }));
            }
            return;
        }
        // POST /build-template — kick off a template build in the background
        if (req.method === "POST" && url.pathname === "/build-template") {
            let body = "";
            req.on("data", (chunk) => (body += chunk));
            req.on("end", async () => {
                try {
                    const { repoFullName, repoName, githubToken, setupCommands, csbApiKey } = JSON.parse(body);
                    if (templateBuildState.status === 'building') {
                        res.writeHead(409, { "Content-Type": "application/json" });
                        res.end(JSON.stringify({ error: "A build is already in progress" }));
                        return;
                    }
                    templateBuildState = { status: 'building' };
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true }));
                    // Run the build in the background
                    (async () => {
                        try {
                            const cmdEnv = { ...process.env };
                            // GitHub auth
                            if (githubToken) {
                                console.log(`[build-template] Setting up GitHub auth...`);
                                await execAsync(`echo "${githubToken}" | gh auth login --with-token`, { env: cmdEnv });
                                await execAsync('gh auth setup-git', { env: cmdEnv });
                            }
                            // Clone repo
                            console.log(`[build-template] Cloning ${repoFullName}...`);
                            await execAsync(`git clone https://github.com/${repoFullName}.git /project/workspace/${repoName}`, { env: cmdEnv });
                            // Run setup commands
                            if (setupCommands?.length) {
                                for (const cmd of setupCommands) {
                                    console.log(`[build-template] Running: ${cmd}`);
                                    const { stdout, stderr } = await execAsync(cmd, {
                                        env: cmdEnv,
                                        cwd: `/project/workspace/${repoName}`,
                                    });
                                    if (stdout)
                                        console.log(`[build-template] ${stdout.trim()}`);
                                    if (stderr)
                                        console.error(`[build-template] ${stderr.trim()}`);
                                }
                            }
                            // Run the SDK build
                            console.log(`[build-template] Running @codesandbox/sdk build...`);
                            const buildEnv = { ...cmdEnv, CSB_API_KEY: csbApiKey };
                            const { stdout: buildOutput } = await execAsync('npx @codesandbox/sdk build /project/sandbox --ports 3000 --ci', { env: buildEnv, timeout: 600_000 });
                            console.log(`[build-template] Build output:\n${buildOutput}`);
                            // Parse template tag from output
                            const tagMatch = buildOutput.match(/Template created with tag:\s+(\S+)/);
                            if (!tagMatch) {
                                throw new Error(`Could not parse template tag from build output:\n${buildOutput}`);
                            }
                            const templateTag = tagMatch[1];
                            console.log(`[build-template] Template built: ${templateTag}`);
                            templateBuildState = { status: 'done', templateTag };
                        }
                        catch (err) {
                            console.error(`[build-template] Build failed:`, err);
                            templateBuildState = { status: 'error', error: err.message ?? String(err) };
                        }
                    })();
                }
                catch (err) {
                    console.error("[build-template] Parse error:", err);
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: String(err) }));
                }
            });
            return;
        }
        // GET /build-template-status — poll for build progress
        if (req.method === "GET" && url.pathname === "/build-template-status") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(templateBuildState));
            return;
        }
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
    });
    const port = Number(process.env.PORT ?? 3000);
    server.listen(port, () => {
        console.log(`Agent server listening on :${port}`);
    });
}
main().catch(console.error);
//# sourceMappingURL=server.js.map