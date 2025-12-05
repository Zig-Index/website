"use client";

import { useQuery } from "@tanstack/react-query";
import Fuse from "fuse.js";
import { useMemo, useEffect } from "react";
import {
  fetchRepoStatsWithCache,
  fetchMultipleRepoStatsWithCache,
  fetchRepoReadmeWithCache,
  fetchRepoReleasesWithCache,
  fetchRepoZonWithCache,
  checkRateLimit,
  initializeCache,
  type RateLimitInfo,
  type ReleasesCache,
  type ZonCache,
} from "@/lib/cachedFetcher";
import type { 
  RegistryEntryWithCategory, 
  CombinedRepoData, 
  LiveStats,
  Sort,
  RepoStatus,
} from "@/lib/schemas";

// Query Keys
export const registryQueryKeys = {
  stats: (fullName: string) => ["stats", fullName] as const,
  allStats: ["allStats"] as const,
  readme: (fullName: string) => ["readme", fullName] as const,
  releases: (fullName: string) => ["releases", fullName] as const,
  zon: (fullName: string) => ["zon", fullName] as const,
  rateLimit: ["rateLimit"] as const,
};

// Initialize IndexedDB cache on first use
let cacheInitialized = false;
async function ensureCacheInitialized() {
  if (typeof window === 'undefined' || cacheInitialized) return;
  cacheInitialized = true;
  await initializeCache();
}

// Hook: Fetch live stats for a single repo
// Uses IndexedDB cache with 1-hour expiry
export function useRepoStats(owner: string, repo: string, enabled: boolean = true) {
  // Initialize cache on mount
  useEffect(() => {
    ensureCacheInitialized();
  }, []);

  return useQuery({
    queryKey: registryQueryKeys.stats(`${owner}/${repo}`),
    queryFn: async () => {
      const result = await fetchRepoStatsWithCache(owner, repo);
      if (result.error && result.status !== "deleted") {
        throw new Error(result.error);
      }
      return { stats: result.stats, status: result.status, fromCache: result.fromCache };
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour - refresh data hourly
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in React Query cache for a week
    retry: false, // Don't retry on rate limit errors
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch if data exists in cache
  });
}

// Hook: Fetch README for a repo (only when enabled)
// Uses IndexedDB cache with 1-hour expiry
export function useRepoReadme(owner: string, repo: string, enabled: boolean = false) {
  return useQuery({
    queryKey: registryQueryKeys.readme(`${owner}/${repo}`),
    queryFn: async () => {
      const result = await fetchRepoReadmeWithCache(owner, repo);
      if (result.error) {
        throw new Error(result.error);
      }
      return result.readme;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour - refresh README hourly
    gcTime: 1000 * 60 * 60 * 24 * 14, // 14 days - keep READMEs cached for 2 weeks
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook: Fetch releases/tags for a repo (only when enabled)
// Uses IndexedDB cache with 1-hour expiry
export function useRepoReleases(owner: string, repo: string, enabled: boolean = false) {
  return useQuery({
    queryKey: registryQueryKeys.releases(`${owner}/${repo}`),
    queryFn: async () => {
      const result = await fetchRepoReleasesWithCache(owner, repo);
      if (result.error && !result.releases) {
        throw new Error(result.error);
      }
      return result.releases;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour - refresh releases hourly
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep releases cached for a week
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook: Fetch build.zig.zon for a repo (only when enabled)
// Uses IndexedDB cache with 1-hour expiry
export function useRepoZon(owner: string, repo: string, enabled: boolean = false) {
  return useQuery({
    queryKey: registryQueryKeys.zon(`${owner}/${repo}`),
    queryFn: async () => {
      const result = await fetchRepoZonWithCache(owner, repo);
      if (result.error && !result.zon) {
        throw new Error(result.error);
      }
      return result.zon;
    },
    enabled,
    staleTime: 1000 * 60 * 60, // 1 hour - refresh zon hourly
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep zon cached for a week
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

// Hook: Check GitHub API rate limit
export function useRateLimit() {
  return useQuery({
    queryKey: registryQueryKeys.rateLimit,
    queryFn: checkRateLimit,
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
  });
}

// Hook: Filter and sort registry entries
export function useFilteredRegistry(
  entries: RegistryEntryWithCategory[],
  options: {
    search?: string;
    type?: "all" | "package" | "application";
    categoryFilter?: string;
    statusFilter?: "all" | "exists" | "deleted";
    license?: string;
    sort?: Sort;
    page?: number;
    pageSize?: number;
  }
) {
  // Build search index
  const fuse = useMemo(() => {
    if (!entries || entries.length === 0) return null;
    return new Fuse(entries, {
      keys: [
        { name: "name", weight: 2 },
        { name: "fullName", weight: 1.5 },
        { name: "description", weight: 1 },
        { name: "category", weight: 1.5 },
        { name: "owner", weight: 0.8 },
      ],
      threshold: 0.3,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [entries]);

  return useMemo(() => {
    let filtered = [...entries];

    // Filter by type (package/application)
    if (options.type && options.type !== "all") {
      filtered = filtered.filter(e => e.type === options.type);
    }

    // Apply search using Fuse.js
    if (options.search && options.search.trim() && fuse) {
      const searchResults = fuse.search(options.search);
      const matchedNames = new Set(searchResults.map(r => r.item.fullName));
      filtered = filtered.filter(e => matchedNames.has(e.fullName));
    }

    // Filter by category
    if (options.categoryFilter) {
      filtered = filtered.filter(e => e.category === options.categoryFilter);
    }

    // Filter by license
    if (options.license) {
      filtered = filtered.filter(e => e.license === options.license);
    }

    // Paginate
    const page = options.page || 1;
    const pageSize = options.pageSize || 20;
    const startIndex = (page - 1) * pageSize;
    const paginatedItems = filtered.slice(startIndex, startIndex + pageSize);

    return {
      items: paginatedItems,
      totalItems: filtered.length,
      totalPages: Math.ceil(filtered.length / pageSize),
      currentPage: page,
    };
  }, [entries, options, fuse]);
}

// Hook: Combine registry entries with live stats
// Fetches all repo details at once using IndexedDB cache
export function useRegistryWithStats(
  entries: RegistryEntryWithCategory[],
  fetchStats: boolean = true,
  sort?: Sort
): {
  data: CombinedRepoData[];
  isLoading: boolean;
  statsMap: Map<string, { stats: LiveStats | null; status: RepoStatus }>;
  error?: string;
} {
  // Initialize cache on mount
  useEffect(() => {
    ensureCacheInitialized();
  }, []);

  // Generate a stable cache key based on all entry names
  const entriesKey = entries.map(e => e.fullName).sort().join(",");
  
  // Batch fetch stats for all entries at once with IndexedDB caching
  const { data: statsMap, isLoading, error, isError } = useQuery({
    queryKey: ["allRepoStats", entriesKey],
    queryFn: async () => {
      if (!fetchStats || entries.length === 0) {
        return new Map<string, { stats: LiveStats | null; status: RepoStatus }>();
      }
      // Fetch all repos at once - uses IndexedDB cache internally
      const repoList = entries.map(e => ({ owner: e.owner, repo: e.repo }));
      const result = await fetchMultipleRepoStatsWithCache(repoList, 5);
      
      // Convert to expected Map format (without fromCache property)
      const statsOnly = new Map<string, { stats: LiveStats | null; status: RepoStatus }>();
      for (const [key, value] of result) {
        statsOnly.set(key, { stats: value.stats, status: value.status });
      }
      return statsOnly;
    },
    enabled: fetchStats && entries.length > 0,
    staleTime: 1000 * 60 * 60, // 1 hour - refresh data hourly
    gcTime: 1000 * 60 * 60 * 24 * 7, // 7 days - keep in React Query cache for a week
    retry: false, // Don't retry on rate limit errors
    refetchOnWindowFocus: false, // Don't refetch when window refocuses
    refetchOnMount: false, // Don't refetch on component mount if data exists
    refetchOnReconnect: false, // Don't refetch on network reconnect
  });

  // Combine entries with stats and apply sorting
  // Always return entries even if stats loading/failed
  const combinedData = useMemo(() => {
    let result: CombinedRepoData[] = entries.map(entry => {
      const repoData = statsMap?.get(entry.fullName);
      return {
        ...entry,
        stats: repoData?.stats || undefined,
        status: repoData?.status || "unknown",
        readme_html: null,
        readme_excerpt: null,
      };
    });

    // Sort by stats if available
    if (sort && statsMap && statsMap.size > 0) {
      result.sort((a, b) => {
        const statsA = a.stats;
        const statsB = b.stats;

        let comparison = 0;

        switch (sort.field) {
          case "stars":
            comparison = (statsA?.stargazers_count || 0) - (statsB?.stargazers_count || 0);
            break;
          case "forks":
            comparison = (statsA?.forks_count || 0) - (statsB?.forks_count || 0);
            break;
          case "updated":
            const dateA = statsA?.pushed_at ? new Date(statsA.pushed_at).getTime() : 0;
            const dateB = statsB?.pushed_at ? new Date(statsB.pushed_at).getTime() : 0;
            comparison = dateA - dateB;
            break;
          case "name":
          default:
            comparison = a.name.localeCompare(b.name);
            break;
        }

        return sort.order === "desc" ? -comparison : comparison;
      });
    }

    return result;
  }, [entries, statsMap, sort]);

  // Return isLoading false if there's an error (so cards still show)
  return {
    data: combinedData,
    isLoading: isLoading && !isError,
    statsMap: statsMap || new Map(),
    error: error ? String(error) : undefined,
  };
}

// Get unique categories from all entries
export function getUniqueCategories(entries: RegistryEntryWithCategory[]): string[] {
  const categoriesSet = new Set<string>();
  for (const entry of entries) {
    if (entry.category) {
      categoriesSet.add(entry.category);
    }
  }
  return Array.from(categoriesSet).sort();
}

// Get unique licenses from entries (returns { key, name } format for Filters)
export function getUniqueLicenses(entries: RegistryEntryWithCategory[]): { key: string; name: string }[] {
  const licensesSet = new Set<string>();
  for (const entry of entries) {
    if (entry.license) {
      licensesSet.add(entry.license);
    }
  }
  return Array.from(licensesSet)
    .sort()
    .map(license => ({ key: license, name: license }));
}
