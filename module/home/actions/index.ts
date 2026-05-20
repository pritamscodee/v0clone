"use server"

import { inngest } from "@/inngest/client"
import { writeBuildStatus } from "@/lib/build-status"

export type InvokeBuildResult = {
    started: true
}

export const onInvoke = async (prompt: string): Promise<InvokeBuildResult> => {
    await writeBuildStatus({
        status: "building",
        message: "Queued…",
        updatedAt: new Date().toISOString(),
    })

    await inngest.send({
        name: "code-agent/run",
        data: { prompt },
    })

    return { started: true }
}