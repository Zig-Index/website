import { 
  GitHubRepoSchema,
  convertGitHubRepoToLiveStats,
  type LiveStats,
  type RepoStatus
} from "./schemas";
import { marked } from "marked";
import DOMPurify from "dompurify";

// GitHub API base URL
const GITHUB_API_BASE = "https://api.github.com";

// README cache type
export interface ReadmeCache {
  fullName: string;
  readme_html: string | null;
  readme_excerpt: string | null;
  image_url: string | null;
  lastFetched: number;
}

// Rate limit info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
}

// Parse rate limit headers
function parseRateLimitHeaders(headers: Headers): RateLimitInfo | null {
  const limit = headers.get("X-RateLimit-Limit");
  const remaining = headers.get("X-RateLimit-Remaining");
  const reset = headers.get("X-RateLimit-Reset");
  const used = headers.get("X-RateLimit-Used");

  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10) * 1000,
      used: used ? parseInt(used, 10) : 0,
    };
  }
  return null;
}

// Get auth headers
// Token can be set via:
// 1. Environment variable GITHUB_TOKEN (set in .env file)
// 2. localStorage "github_token" (for user-provided tokens)
//
// To get a GitHub token:
// 1. Go to https://github.com/settings/tokens
// 2. Generate a new token with "public_repo" scope
// 3. Copy to .env file as GITHUB_TOKEN=your_token
// See .env.example for details
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Accept": "application/vnd.github.v3+json",
  };
  
  // First check environment variable (build-time or SSR)
  const envToken = import.meta.env.GITHUB_TOKEN;
  if (envToken) {
    headers["Authorization"] = `Bearer ${envToken}`;
    return headers;
  }
  
  // Fallback: Check localStorage for user-provided token (client-side only)
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("github_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  
  return headers;
}

// Fetch live stats for a single repo - returns fresh data from GitHub API
export async function fetchRepoStats(
  owner: string,
  repo: string
): Promise<{ stats: LiveStats | null; rateLimit: RateLimitInfo | null; status: RepoStatus; error?: string }> {
  const fullName = `${owner}/${repo}`;
  const headers = getAuthHeaders();
  
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}`;
    const response = await fetch(url, { headers });
    
    const rateLimit = parseRateLimitHeaders(response.headers);
    
    if (response.status === 403 && rateLimit?.remaining === 0) {
      return {
        stats: null,
        rateLimit,
        status: "unknown",
        error: `Rate limit exceeded. Resets at ${new Date(rateLimit.reset).toLocaleTimeString()}`,
      };
    }
    
    // Handle 404 - repository has been deleted or renamed
    if (response.status === 404) {
      return { stats: null, rateLimit, status: "deleted", error: "Repository not found" };
    }
    
    if (!response.ok) {
      return { stats: null, rateLimit, status: "unknown", error: `GitHub API error: ${response.status}` };
    }
    
    const data = await response.json();
    const parsed = GitHubRepoSchema.safeParse(data);
    
    if (!parsed.success) {
      return { stats: null, rateLimit, status: "unknown", error: "Invalid response format" };
    }
    
    const stats = convertGitHubRepoToLiveStats(parsed.data);
    
    return { stats, rateLimit, status: "exists" };
  } catch (error) {
    return { 
      stats: null, 
      rateLimit: null, 
      status: "unknown",
      error: error instanceof Error ? error.message : "Network error" 
    };
  }
}

// Fetch stats for multiple repos with rate limiting
// Returns a Map with stats and status info
export async function fetchMultipleRepoStats(
  repos: { owner: string; repo: string }[],
  concurrency: number = 3
): Promise<Map<string, { stats: LiveStats | null; status: RepoStatus }>> {
  const results = new Map<string, { stats: LiveStats | null; status: RepoStatus }>();
  
  // Process in batches
  for (let i = 0; i < repos.length; i += concurrency) {
    const batch = repos.slice(i, i + concurrency);
    const promises = batch.map(async ({ owner, repo }) => {
      const fullName = `${owner}/${repo}`;
      const result = await fetchRepoStats(owner, repo);
      results.set(fullName, { stats: result.stats, status: result.status });
    });
    
    await Promise.all(promises);
    
    // Small delay between batches to avoid rate limits
    if (i + concurrency < repos.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

// Fetch README for a repo
export async function fetchRepoReadme(
  owner: string,
  repo: string
): Promise<{ readme: ReadmeCache | null; error?: string }> {
  const fullName = `${owner}/${repo}`;
  const headers = getAuthHeaders();
  headers["Accept"] = "application/vnd.github.v3.raw";
  
  try {
    const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/readme`;
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      if (response.status === 404) {
        const emptyCache: ReadmeCache = {
          fullName,
          readme_html: null,
          readme_excerpt: null,
          image_url: null,
          lastFetched: Date.now(),
        };
        return { readme: emptyCache };
      }
      return { readme: null, error: `Failed to fetch README: ${response.status}` };
    }
    
    const markdown = await response.text();
    
    // Convert markdown to HTML
    const rawHtml = await marked(markdown, {
      gfm: true,
      breaks: true,
    });
    
    // Sanitize HTML
    const readme_html = DOMPurify.sanitize(rawHtml, {
      ADD_TAGS: ["iframe"],
      ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
    });
    
    // Extract excerpt (first 300 chars of text)
    const textContent = readme_html.replace(/<[^>]*>/g, " ").trim();
    const readme_excerpt = textContent.slice(0, 300) + (textContent.length > 300 ? "..." : "");
    
    // Extract first image
    const imgMatch = readme_html.match(/<img[^>]+src=["']([^"']+)["']/);
    const image_url = imgMatch ? imgMatch[1] : null;
    
    const cache: ReadmeCache = {
      fullName,
      readme_html,
      readme_excerpt,
      image_url,
      lastFetched: Date.now(),
    };
    
    return { readme: cache };
  } catch (error) {
    return { 
      readme: null, 
      error: error instanceof Error ? error.message : "Network error" 
    };
  }
}

// Check rate limit
export async function checkRateLimit(): Promise<RateLimitInfo | null> {
  const headers = getAuthHeaders();
  
  try {
    const response = await fetch(`${GITHUB_API_BASE}/rate_limit`, { headers });
    return parseRateLimitHeaders(response.headers);
  } catch {
    return null;
  }
}
