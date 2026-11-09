import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const sessionQuery = {
  queryKey: ["session"],
  queryFn: () => api.auth.getSession(),
  staleTime: 60_000,
  retry: false,
} as const;

export function useSession() {
  return useQuery(sessionQuery);
}
