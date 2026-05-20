export const SANDBOX_ROOT = "/home/user";
export const SANDBOX_PAGE_PATH = SANDBOX_ROOT + "/app/page.tsx";

/** Resolve agent paths to the E2B Next.js project root (/home/user). */
export function toSandboxPath(path: string): string {
    const trimmed = path.trim().replace(/\\/g, "/");
    if (trimmed.startsWith(SANDBOX_ROOT + "/")) return trimmed;
    if (trimmed.startsWith(SANDBOX_ROOT)) return trimmed;
    if (trimmed.startsWith("/")) return SANDBOX_ROOT + trimmed;
    return SANDBOX_ROOT + "/" + trimmed.replace(/^\.\//, "");
}

const DEFAULT_PAGE_MARKERS = [
    "Get started by editing",
    "To get started, edit",
    "Create Next App",
    "/next.svg",
    "Deploy now",
    "Read our docs",
];

export function isDefaultNextStarterPage(content: string): boolean {
    const hits = DEFAULT_PAGE_MARKERS.filter((m) => content.includes(m)).length;
    return hits >= 2;
}

export function countFileWriteToolCalls(
    toolCalls: Array<{ tool?: { name?: string } }>
): number {
    return toolCalls.filter((tc) => tc.tool?.name === "createOrUpdateFile").length;
}
