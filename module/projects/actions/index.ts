"use server";

import { inngest } from "@/inngest/client";
import { prisma } from "@/lib/prisma";
import { consumeCredits } from "@/lib/usage";
import { getCurrentUser, onBoardUser } from "@/module/auth/actions";
import { generateSlug } from "random-word-slugs";

export const createProject = async (value: string) => {
  await onBoardUser();
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    await consumeCredits();
  } catch {
    throw new Error("Rate limit exceeded. Try again later.");
  }

  const project = await prisma.project.create({
    data: {
      name: generateSlug(2, { format: "kebab" }),
      userId: user.id,
      messages: {
        create: {
          content: value,
          role: "USER",
          type: "RESULT",
        },
      },
    },
  });

  await inngest.send({
    name: "code-agent/run",
    data: { value, projectId: project.id },
  });

  return project;
};

export const getProjects = async () => {
  const user = await getCurrentUser();
  if (!user) return [];

  return prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
};

export const getProjectById = async (projectId: string) => {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const project = await prisma.project.findFirst({
    where: { id: projectId, userId: user.id },
  });

  if (!project) throw new Error("Project not found");
  return project;
};
