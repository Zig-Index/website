import { z } from "zod";

// ============================================
// Registry Entry Schema (JSON files at build time)
// ============================================

export const RegistryEntrySchema = z.object({
  name: z.string(),
  owner: z.string(),
  repo: z.string(),
  description: z.string(),
  homepage: z.string().optional(),
  license: z.string().optional(),
  category: z.string().optional(),
});

export type RegistryEntry = z.infer<typeof RegistryEntrySchema>;

// Type for registry entry with category
export type RegistryEntryWithCategory = RegistryEntry & {
  type: "package" | "application";
  fullName: string;
  htmlUrl: string;
};

// ============================================
// Live Stats Schema (fetched on-demand from GitHub API)
// ============================================

export const LiveStatsSchema = z.object({
  fullName: z.string(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  watchers_count: z.number(),
  language: z.string().nullable(),
  pushed_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  open_issues_count: z.number().default(0),
  archived: z.boolean().default(false),
  lastFetched: z.number(),
});

export type LiveStats = z.infer<typeof LiveStatsSchema>;

// ============================================
// Combined Repo Data (Registry + Live Stats)
// ============================================

// Status indicates if the repository still exists on GitHub
export type RepoStatus = "exists" | "deleted" | "unknown";

export type CombinedRepoData = RegistryEntryWithCategory & {
  stats?: LiveStats;
  status: RepoStatus;
  readme_html?: string | null;
  readme_excerpt?: string | null;
};

// ============================================
// GitHub API response schemas
// ============================================

export const GitHubOwnerSchema = z.object({
  login: z.string(),
  id: z.number(),
  avatar_url: z.string().url().optional(),
});

export const GitHubLicenseSchema = z.object({
  key: z.string(),
  name: z.string(),
});

export const GitHubRepoSchema = z.object({
  id: z.number(),
  full_name: z.string(),
  name: z.string(),
  owner: GitHubOwnerSchema,
  description: z.string().nullable(),
  html_url: z.string().url(),
  homepage: z.string().nullable().optional(),
  topics: z.array(z.string()).optional().default([]),
  license: GitHubLicenseSchema.nullable().optional(),
  stargazers_count: z.number(),
  forks_count: z.number(),
  watchers_count: z.number().optional().default(0),
  language: z.string().nullable(),
  pushed_at: z.string().optional(),
  updated_at: z.string().optional(),
  open_issues_count: z.number().optional().default(0),
  archived: z.boolean().optional().default(false),
});

export type GitHubRepo = z.infer<typeof GitHubRepoSchema>;

// ============================================
// UI Filter & Sort Schemas
// ============================================

export const FilterSchema = z.object({
  search: z.string().optional(),
  categoryFilter: z.string().optional(),
  statusFilter: z.enum(["all", "exists", "deleted"]).optional(),
  minStars: z.number().min(0).optional(),
  license: z.string().optional(),
  language: z.string().optional(),
  type: z.enum(["all", "package", "application"]).optional(),
  updatedWithin: z.enum(["all", "day", "week", "month", "year"]).optional(),
});

export const SortSchema = z.object({
  field: z.enum(["stars", "name", "forks", "updated"]),
  order: z.enum(["asc", "desc"]),
});

export const PaginationSchema = z.object({
  page: z.number().min(1),
  pageSize: z.number().min(1).max(100),
});

export type Filter = z.infer<typeof FilterSchema>;
export type Sort = z.infer<typeof SortSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;

// ============================================
// Helper Functions
// ============================================

// Convert GitHub API repo to live stats
export function convertGitHubRepoToLiveStats(repo: GitHubRepo): LiveStats {
  return {
    fullName: repo.full_name,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    watchers_count: repo.watchers_count || 0,
    language: repo.language,
    pushed_at: repo.pushed_at || null,
    updated_at: repo.updated_at || null,
    open_issues_count: repo.open_issues_count || 0,
    archived: repo.archived || false,
    lastFetched: Date.now(),
  };
}

// Convert registry entry to combined format
export function convertRegistryEntryToCombined(
  entry: RegistryEntry,
  type: "package" | "application"
): RegistryEntryWithCategory {
  return {
    ...entry,
    type,
    fullName: `${entry.owner}/${entry.repo}`,
    htmlUrl: `https://github.com/${entry.owner}/${entry.repo}`,
  };
}

// Safe parse helper
export function safeParseRepo(data: unknown): GitHubRepo | null {
  const result = GitHubRepoSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn("Failed to parse repo:", result.error.issues);
  return null;
}
