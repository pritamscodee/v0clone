"use server";

import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { consumeCredits } from "@/lib/usage";
import { getCurrentUser } from "@/module/auth/actions";

export const createMessage = async (value: string, projectId: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new Error("Project not found");

  try {
    await consumeCredits();
  } catch {
    throw new Error("Rate limit exceeded. Try again later.");
  }

  const message = await prisma.message.create({
    data: {
      projectId,
      content: value,
      role: "USER",
      type: "RESULT",
    },
  });

  await inngest.send({
    name: "code-agent/run",
    data: { value, projectId },
  });

  return message;
};

export const getMessages = async (projectId: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });
  if (!project) throw new Error("Project not found");

  return prisma.message.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
    include: { fragments: true },
  });
};
