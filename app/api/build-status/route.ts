import { readBuildStatus } from "@/lib/build-status";
import { NextResponse } from "next/server";

export async function GET() {
    const status = await readBuildStatus();
    return NextResponse.json(status ?? { status: "idle" });
}
