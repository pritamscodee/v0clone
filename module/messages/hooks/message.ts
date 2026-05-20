"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { createMessage, getMessages } from "@/module/messages/actions";

export const prefetchMessages = async (
  queryClient: QueryClient,
  projectId: string
) => {
  await queryClient.prefetchQuery({
    queryKey: ["messages", projectId],
    queryFn: () => getMessages(projectId),
  });
};

export const useGetMessages = (projectId: string) =>
  useQuery({
    queryKey: ["messages", projectId],
    queryFn: () => getMessages(projectId),
    enabled: !!projectId,
    refetchInterval: (query) =>
      query.state.data?.some(
        (m) => m.role === "USER" && !query.state.data?.some(
          (a) => a.role === "ASSISTANT" && new Date(a.createdAt) > new Date(m.createdAt)
        )
      )
        ? 3000
        : false,
  });

export const useCreateMessage = (projectId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: string) => createMessage(value, projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages", projectId] });
    },
  });
};
