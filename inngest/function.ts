import { inngest } from "./client";
import { openai, createAgent, createTool, type AgentResult } from "@inngest/agent-kit";
import { Sandbox } from "e2b";
import z from "zod";
import { PROMPT } from "@/prompt";
import { lastAssistantTextMessageContent } from "./utils";
import { writeBuildStatus } from "@/lib/build-status";
import {
    SANDBOX_PAGE_PATH,
    SANDBOX_ROOT,
    countFileWriteToolCalls,
    isDefaultNextStarterPage,
    toSandboxPath,
} from "./sandbox-paths";

type CodeAgentEventData = {
    prompt?: string;
    value?: string;
    projectId?: string;
};

const TOOL_USE_RULES = `
Tool calling (critical):
- Invoke tools only through native API tool calls. Never write <function=...>, XML tags, or raw code in chat as a substitute for tools.
- You MUST call createOrUpdateFile to write app/page.tsx (and supporting files under app/) before finishing.
- File paths: use "app/page.tsx", "app/components/foo.tsx" (relative to /home/user). Never use components/ at project root.
- Read files: readFile with full path /home/user/app/page.tsx (never @/ aliases).
- Shell: terminal with { command }; commands run in /home/user.
`;

const AGENT_USER_PREFIX = `Build this in the sandbox Next.js app. You MUST update app/page.tsx via createOrUpdateFile before ending.

User request:
`;

function createCodeAgent(sandboxId: string) {
    return createAgent({
        name: "code-agent",
        description: "An expert coding agent",
        system: `${PROMPT}\n${TOOL_USE_RULES}`,
        // OpenRouter only supports tool_choice: "auto"
        tool_choice: "auto",
        model: openai({
            model: process.env.OPENROUTER_MODEL ?? "openrouter/free",
            baseUrl: "https://openrouter.ai/api/v1",
            apiKey: process.env.OPENROUTER_API_KEY || "",
        }),
        tools: [
            createTool({
                name: "terminal",
                description: "Run shell commands in /home/user (npm install, etc.)",
                parameters: z.object({
                    command: z.string(),
                }),
                handler: async ({ command }, { step: agentStep }) => {
                    return await agentStep?.run("terminal", async () => {
                        const buffers = { stdout: "", stderr: "" };
                        try {
                            const sandbox = await Sandbox.connect(sandboxId);
                            const result = await sandbox.commands.run(command, {
                                cwd: SANDBOX_ROOT,
                                onStdout: (data) => {
                                    buffers.stdout += data;
                                },
                                onStderr: (data) => {
                                    buffers.stderr += data;
                                },
                            });
                            return result.stdout;
                        } catch (error) {
                            console.log(
                                `Command failed ${error} \n stdout: ${buffers.stdout}\n stderr:${buffers.stderr}`
                            );
                            return `Command failed ${error} \n stdout: ${buffers.stdout}\n stderr:${buffers.stderr}`;
                        }
                    });
                },
            }),
            createTool({
                name: "createOrUpdateFile",
                description:
                    "Write files under /home/user. Required: app/page.tsx. Args: { files: [{ path, content }] } with paths like app/page.tsx.",
                parameters: z.object({
                    files: z.array(
                        z.object({
                            path: z.string(),
                            content: z.string(),
                        })
                    ),
                }),
                handler: async ({ files }, { step: agentStep }) => {
                    return await agentStep?.run("createOrUpdateFile", async () => {
                        const sandbox = await Sandbox.connect(sandboxId);
                        const written = await Promise.all(
                            files.map(async ({ path, content }) => {
                                const fullPath = toSandboxPath(path);
                                await sandbox.files.write(fullPath, content);
                                return fullPath;
                            })
                        );
                        return { success: true, files: written };
                    });
                },
            }),
            createTool({
                name: "readFile",
                description: "Read a file. Use /home/user/app/page.tsx style paths.",
                parameters: z.object({
                    path: z.string(),
                }),
                handler: async ({ path }, { step: agentStep }) => {
                    return await agentStep?.run("readFile", async () => {
                        const sandbox = await Sandbox.connect(sandboxId);
                        const content = await sandbox.files.read(toSandboxPath(path));
                        return { content };
                    });
                },
            }),
        ],
    });
}

async function readSandboxPage(sandboxId: string): Promise<string> {
    const sandbox = await Sandbox.connect(sandboxId);
    return sandbox.files.read(SANDBOX_PAGE_PATH);
}

function collectWrittenFiles(results: AgentResult[]): string[] {
    const paths: string[] = [];
    for (const run of results) {
        for (const tc of run.toolCalls) {
            if (tc.tool?.name !== "createOrUpdateFile") continue;
            const payload = tc.content as { files?: string[] } | undefined;
            if (payload?.files?.length) paths.push(...payload.files);
        }
    }
    return paths;
}

export const codeAgentFunction = inngest.createFunction(
    {
        id: "code-agent",
        triggers: [{ event: "code-agent/run" }],
    },
    async ({ event, step }) => {
        const eventData = event.data as CodeAgentEventData | undefined;
        const userPrompt =
            eventData?.value?.trim() ||
            eventData?.prompt?.trim() ||
            "Say Hello to the user!";

        if (!process.env.OPENROUTER_API_KEY) {
            throw new Error(
                "OPENROUTER_API_KEY is missing. Add it to .env and restart npm run dev and npm run inngest."
            );
        }

        await writeBuildStatus({
            status: "building",
            message: "Starting sandbox…",
            updatedAt: new Date().toISOString(),
        });

        const sandboxId = await step.run("get-sandbox-id", async () => {
            const sandbox = await Sandbox.create("v0clone");
            return sandbox.sandboxId;
        });

        const codeAgent = createCodeAgent(sandboxId);

        let result = await codeAgent.run(`${AGENT_USER_PREFIX}${userPrompt}`, {
            maxIter: 15,
        });

        let pageContent = await step.run("read-page-after-agent", async () =>
            readSandboxPage(sandboxId)
        );

        let agentRuns: AgentResult[] = [result];

        if (
            isDefaultNextStarterPage(pageContent) &&
            countFileWriteToolCalls(result.toolCalls) === 0
        ) {
            const retryAgent = createCodeAgent(sandboxId);
            result = await retryAgent.run(
                `You MUST call createOrUpdateFile first. Write a complete app/page.tsx (use "use client", Tailwind, Shadcn from @/components/ui/*) implementing:\n${userPrompt}\n\nAlso add any needed files under app/.`,
                { maxIter: 10 }
            );
            agentRuns.push(result);
            pageContent = await step.run("read-page-after-retry", async () =>
                readSandboxPage(sandboxId)
            );
        }

        await step.run("refresh-next-dev", async () => {
            const sandbox = await Sandbox.connect(sandboxId);
            await sandbox.commands.run(`touch ${SANDBOX_PAGE_PATH}`, {
                cwd: SANDBOX_ROOT,
            });
            await sandbox.commands.run("curl -s -o /dev/null http://127.0.0.1:3000/ || true", {
                cwd: SANDBOX_ROOT,
            });
        });

        const filesWritten = collectWrittenFiles(agentRuns);

        if (isDefaultNextStarterPage(pageContent)) {
            const err =
                "Agent finished but app/page.tsx is still the default Next.js starter. The model may not have called createOrUpdateFile.";
            await writeBuildStatus({
                status: "failed",
                error: err,
                filesWritten,
                updatedAt: new Date().toISOString(),
            });
            throw new Error(err);
        }

        const sandboxUrl = await step.run("get-sandbox-url", async () => {
            const sandbox = await Sandbox.connect(sandboxId);
            const host = sandbox.getHost(3000);
            return `https://${host}`;
        });

        const content = lastAssistantTextMessageContent(result) ?? "";

        await writeBuildStatus({
            status: "completed",
            sandboxUrl,
            message: content,
            filesWritten,
            updatedAt: new Date().toISOString(),
        });

        return {
            message: content,
            sandboxUrl,
            filesWritten,
        };
    }
);
