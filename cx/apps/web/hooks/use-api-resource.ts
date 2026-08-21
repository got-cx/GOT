"use client"

import { useQuery, type QueryKey } from "@tanstack/react-query"

export function useAPIResource<T>(
  queryKey: QueryKey,
  load: () => Promise<T>,
  enabled = true
) {
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["got-api", ...queryKey],
    queryFn: load,
    enabled,
  })

  return {
    data,
    error:
      error instanceof Error
        ? error.message
        : error
          ? "Unable to load data."
          : null,
    isLoading,
    retry: () => void refetch(),
  }
}
