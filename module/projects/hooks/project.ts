"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createProject,
  getProjectById,
  getProjects,
} from "@/module/projects/actions";

export const useGetProjects = () =>
  useQuery({
    queryKey: ["projects"],
    queryFn: () => getProjects(),
  });

export const useCreateProject = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => createProject(value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
};

export const useGetProjectById = (projectId: string) =>
  useQuery({
    queryKey: ["project", projectId],
    queryFn: () => getProjectById(projectId),
    enabled: !!projectId,
  });
