import { RateLimiterPrisma } from "rate-limiter-flexible";
import { prisma } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";

export const FREE_POINTS = 5;
export const PRO_POINTS = 100;
export const DURATION = 30 * 24 * 60 * 60;
export const GENERATION_COST = 1;

export async function getUsageTracker() {
  const { has } = await auth();
  const hasProAccess = has({ plan: "pro" });

  return new RateLimiterPrisma({
    storeClient: prisma,
    tableName: "Usage",
    points: hasProAccess ? PRO_POINTS : FREE_POINTS,
    duration: DURATION,
  });
}

export async function consumeCredits() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");
  const usageTracker = await getUsageTracker();
  return usageTracker.consume(userId, GENERATION_COST);
}
