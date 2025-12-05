import { 
  GitHubRepoSchema,
  GitHubReleaseSchema,
  GitHubTagSchema,
  GitHubUserSchema,
  convertGitHubRepoToLiveStats,
  type LiveStats,
  type RepoStatus,
  type GitHubRelease,
  type GitHubTag,
  type RepoVersion,
  type ZigDependency,
  type ZonInfo,
  type UserProfile,
  type RepoIssuesInfo
} from "./schemas";
import { marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import DOMPurify from "dompurify";

// Register Zig language for highlight.js
// Based on Zig syntax - keywords, types, built-ins, and operators
hljs.registerLanguage('zig', function(hljs) {
  const KEYWORDS = {
    keyword: 'addrspace align allowzero and anyframe anytype asm async await break ' +
      'callconv catch comptime const continue defer else enum errdefer error export extern ' +
      'fn for if inline linksection noalias noinline nosuspend null opaque or orelse packed ' +
      'pub resume return struct suspend switch test threadlocal try undefined union unreachable ' +
      'var volatile while',
    literal: 'true false null undefined',
    built_in: '@addWithOverflow @alignCast @alignOf @as @asyncCall @atomicLoad @atomicRmw ' +
      '@atomicStore @bitCast @bitOffsetOf @bitReverse @bitSizeOf @boolToInt @breakpoint ' +
      '@byteSwap @call @cDefine @cImport @cInclude @clz @cmpxchgStrong @cmpxchgWeak ' +
      '@compileError @compileLog @ctz @divExact @divFloor @divTrunc @embedFile @enumToInt ' +
      '@errSetCast @errorName @errorReturnTrace @errorToInt @export @extern @fence @field ' +
      '@fieldParentPtr @floatCast @floatToInt @frame @Frame @frameAddress @frameSize ' +
      '@hasDecl @hasField @import @intCast @intToEnum @intToError @intToFloat @intToPtr ' +
      '@max @memcpy @memset @min @mod @mulAdd @mulWithOverflow @offsetOf @panic @popCount ' +
      '@prefetch @ptrCast @ptrToInt @reduce @rem @returnAddress @select @setAlignStack ' +
      '@setCold @setEvalBranchQuota @setFloatMode @setRuntimeSafety @shlExact @shlWithOverflow ' +
      '@shrExact @shuffle @sizeOf @splat @sqrt @src @subWithOverflow @tagName @This ' +
      '@trap @truncate @Type @typeInfo @typeName @TypeOf @unionInit @Vector @wasmMemoryGrow ' +
      '@wasmMemorySize'
  };
  
  const TYPES = {
    type: 'i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f16 f32 f64 f80 f128 ' +
      'bool void noreturn anyerror anyopaque c_char c_short c_ushort c_int c_uint c_long ' +
      'c_ulong c_longlong c_ulonglong c_longdouble comptime_int comptime_float type'
  };

  return {
    name: 'Zig',
    aliases: ['zig'],
    keywords: Object.assign({}, KEYWORDS, TYPES),
    contains: [
      hljs.C_LINE_COMMENT_MODE,
      hljs.COMMENT('/\\*', '\\*/', { contains: ['self'] }),
      {
        className: 'string',
        variants: [
          { begin: '"', end: '"', contains: [{ begin: '\\\\.' }] },
          { begin: "'", end: "'" }
        ]
      },
      {
        className: 'number',
        variants: [
          { begin: '\\b0x[0-9a-fA-F_]+' },
          { begin: '\\b0o[0-7_]+' },
          { begin: '\\b0b[01_]+' },
          { begin: '\\b[0-9][0-9_]*\\.?[0-9_]*(?:[eE][+-]?[0-9_]+)?' }
        ]
      },
      {
        className: 'function',
        beginKeywords: 'fn',
        end: '\\(',
        excludeEnd: true,
        contains: [hljs.UNDERSCORE_TITLE_MODE]
      },
      {
        className: 'meta',
        begin: '@[a-zA-Z_]\\w*'
      }
    ]
  };
});

// Configure marked with syntax highlighting
marked.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    // Normalize language name
    const normalizedLang = lang?.toLowerCase() || 'plaintext';
    
    // Check if language exists in hljs
    const language = hljs.getLanguage(normalizedLang) ? normalizedLang : 'plaintext';
    
    try {
      return hljs.highlight(code, { language }).value;
    } catch {
      return code;
    }
  }
}));

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
// 1. Environment variable GITHUB_TOKEN or GH_TOKEN (set in .env file or CI)
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
  
  // First check environment variables (build-time or SSR)
  // Check both GITHUB_TOKEN and GH_TOKEN for flexibility
  const envToken = import.meta.env.GITHUB_TOKEN || import.meta.env.GH_TOKEN;
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

// ============================================
// GitHub Releases & Tags
// ============================================

// Releases cache type
export interface ReleasesCache {
  fullName: string;
  versions: RepoVersion[];
  latestVersion: string | null;
  lastFetched: number;
}

/**
 * Fetch releases for a repository
 * Falls back to tags if no releases are found
 */
export async function fetchRepoReleases(
  owner: string,
  repo: string
): Promise<{ releases: ReleasesCache | null; error?: string }> {
  const fullName = `${owner}/${repo}`;
  const headers = getAuthHeaders();
  
  try {
    // First try to fetch releases
    const releasesUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/releases?per_page=30`;
    const releasesResponse = await fetch(releasesUrl, { headers });
    
    if (releasesResponse.ok) {
      const releasesData = await releasesResponse.json();
      
      if (Array.isArray(releasesData) && releasesData.length > 0) {
        const versions: RepoVersion[] = [];
        
        for (const release of releasesData) {
          const parsed = GitHubReleaseSchema.safeParse(release);
          if (parsed.success && !parsed.data.draft) {
            // Parse assets
            const assets = parsed.data.assets.map(asset => ({
              name: asset.name,
              downloadUrl: asset.browser_download_url,
              size: asset.size,
              contentType: asset.content_type,
              downloadCount: asset.download_count,
            }));
            
            versions.push({
              tag: parsed.data.tag_name,
              name: parsed.data.name,
              isPrerelease: parsed.data.prerelease,
              publishedAt: parsed.data.published_at,
              tarballUrl: parsed.data.tarball_url || `https://github.com/${owner}/${repo}/archive/refs/tags/${parsed.data.tag_name}.tar.gz`,
              zipballUrl: parsed.data.zipball_url || `https://github.com/${owner}/${repo}/archive/refs/tags/${parsed.data.tag_name}.zip`,
              assets,
              body: parsed.data.body || undefined,
            });
          }
        }
        
        if (versions.length > 0) {
          // Find latest non-prerelease version, or fall back to first version
          const latestStable = versions.find(v => !v.isPrerelease);
          const latestVersion = latestStable?.tag || versions[0]?.tag || null;
          
          return {
            releases: {
              fullName,
              versions,
              latestVersion,
              lastFetched: Date.now(),
            },
          };
        }
      }
    }
    
    // Fallback to tags if no releases found
    const tagsUrl = `${GITHUB_API_BASE}/repos/${owner}/${repo}/tags?per_page=30`;
    const tagsResponse = await fetch(tagsUrl, { headers });
    
    if (!tagsResponse.ok) {
      return { releases: null, error: `Failed to fetch tags: ${tagsResponse.status}` };
    }
    
    const tagsData = await tagsResponse.json();
    
    if (!Array.isArray(tagsData) || tagsData.length === 0) {
      // No releases or tags - return empty but valid cache
      return {
        releases: {
          fullName,
          versions: [],
          latestVersion: null,
          lastFetched: Date.now(),
        },
      };
    }
    
    const versions: RepoVersion[] = [];
    
    for (const tag of tagsData) {
      const parsed = GitHubTagSchema.safeParse(tag);
      if (parsed.success) {
        versions.push({
          tag: parsed.data.name,
          name: null,
          isPrerelease: false,
          publishedAt: null,
          tarballUrl: parsed.data.tarball_url,
          zipballUrl: parsed.data.zipball_url,
          assets: [], // Tags don't have assets
        });
      }
    }
    
    const latestVersion = versions[0]?.tag || null;
    
    return {
      releases: {
        fullName,
        versions,
        latestVersion,
        lastFetched: Date.now(),
      },
    };
  } catch (error) {
    return {
      releases: null,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

/**
 * Generate zig fetch command URL for a specific version
 */
export function generateZigFetchUrl(owner: string, repo: string, tag: string): string {
  return `https://github.com/${owner}/${repo}/archive/refs/tags/${tag}.tar.gz`;
}

/**
 * Generate full zig fetch command
 */
export function generateZigFetchCommand(owner: string, repo: string, tag: string): string {
  const url = generateZigFetchUrl(owner, repo, tag);
  return `zig fetch --save ${url}`;
}

// ============================================
// Build.zig.zon Parsing
// ============================================

// Zon cache type
export interface ZonCache {
  fullName: string;
  hasZon: boolean;
  name?: string;
  version?: string;
  dependencies: ZigDependency[];
  minZigVersion?: string;
  lastFetched: number;
}

/**
 * Parse build.zig.zon content to extract dependencies
 * The format is a Zig struct literal, we need to parse it carefully
 */
function parseZonContent(content: string): { 
  name?: string; 
  version?: string; 
  dependencies: ZigDependency[];
  minZigVersion?: string;
} {
  const dependencies: ZigDependency[] = [];
  let name: string | undefined;
  let version: string | undefined;
  let minZigVersion: string | undefined;

  try {
    // Extract name - .name = "package-name"
    const nameMatch = content.match(/\.name\s*=\s*"([^"]+)"/);
    if (nameMatch) {
      name = nameMatch[1];
    }

    // Extract version - .version = "0.1.0"
    const versionMatch = content.match(/\.version\s*=\s*"([^"]+)"/);
    if (versionMatch) {
      version = versionMatch[1];
    }

    // Extract minimum_zig_version - .minimum_zig_version = "0.11.0"
    const minZigMatch = content.match(/\.minimum_zig_version\s*=\s*"([^"]+)"/);
    if (minZigMatch) {
      minZigVersion = minZigMatch[1];
    }

    // Find the dependencies block
    const depsBlockMatch = content.match(/\.dependencies\s*=\s*\.?\{([\s\S]*?)\}\s*,?\s*(?:\.paths|\.minimum_zig_version|\})/);
    
    if (depsBlockMatch) {
      const depsBlock = depsBlockMatch[1];
      
      // Match each dependency entry
      // Format: .dep_name = .{ .url = "...", .hash = "..." }
      // Or: .dep_name = .{ .path = "..." }
      const depRegex = /\.(\w+)\s*=\s*\.?\{([^}]+)\}/g;
      let match;
      
      while ((match = depRegex.exec(depsBlock)) !== null) {
        const depName = match[1];
        const depContent = match[2];
        
        // Extract URL
        const urlMatch = depContent.match(/\.url\s*=\s*"([^"]+)"/);
        if (urlMatch) {
          const dep: ZigDependency = {
            name: depName,
            url: urlMatch[1],
          };
          
          // Extract hash if present
          const hashMatch = depContent.match(/\.hash\s*=\s*"([^"]+)"/);
          if (hashMatch) {
            dep.hash = hashMatch[1];
          }
          
          dependencies.push(dep);
        }
      }
    }
  } catch (error) {
    console.warn('[Zon Parser] Error parsing zon content:', error);
  }

  return { name, version, dependencies, minZigVersion };
}

/**
 * Fetch and parse build.zig.zon from a repository
 */
export async function fetchRepoZon(
  owner: string,
  repo: string,
  branch: string = "main"
): Promise<{ zon: ZonCache | null; error?: string }> {
  const fullName = `${owner}/${repo}`;
  const headers = getAuthHeaders();
  headers["Accept"] = "application/vnd.github.v3.raw";
  
  // Try multiple possible default branches
  const branches = [branch, "master", "main", "develop"];
  
  for (const tryBranch of branches) {
    try {
      const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/build.zig.zon?ref=${tryBranch}`;
      const response = await fetch(url, { headers });
      
      if (response.status === 404) {
        continue; // Try next branch
      }
      
      if (!response.ok) {
        continue;
      }
      
      const content = await response.text();
      const parsed = parseZonContent(content);
      
      return {
        zon: {
          fullName,
          hasZon: true,
          name: parsed.name,
          version: parsed.version,
          dependencies: parsed.dependencies,
          minZigVersion: parsed.minZigVersion,
          lastFetched: Date.now(),
        },
      };
    } catch (error) {
      continue;
    }
  }
  
  // No build.zig.zon found in any branch
  return {
    zon: {
      fullName,
      hasZon: false,
      dependencies: [],
      lastFetched: Date.now(),
    },
  };
}

// ============================================
// User Profile Functions
// ============================================

export type UserProfileCache = UserProfile;

/**
 * Fetch GitHub user profile
 */
export async function fetchUserProfile(
  username: string
): Promise<{ user: UserProfile | null; error?: string }> {
  const headers = getAuthHeaders();
  
  try {
    const response = await fetch(`${GITHUB_API_BASE}/users/${username}`, { headers });
    
    if (response.status === 404) {
      return { user: null, error: "User not found" };
    }
    
    if (!response.ok) {
      return { user: null, error: `HTTP ${response.status}` };
    }
    
    const data = await response.json();
    const parsed = GitHubUserSchema.safeParse(data);
    
    if (!parsed.success) {
      return { user: null, error: "Failed to parse user data" };
    }
    
    const user = parsed.data;
    
    // Also fetch user README if they have one
    let readmeHtml: string | null = null;
    try {
      const readmeResponse = await fetch(
        `${GITHUB_API_BASE}/repos/${username}/${username}/readme`,
        { headers: { ...headers, Accept: "application/vnd.github.v3.raw" } }
      );
      if (readmeResponse.ok) {
        const readmeContent = await readmeResponse.text();
        const html = await marked(readmeContent);
        readmeHtml = typeof window !== 'undefined' ? DOMPurify.sanitize(html) : html;
      }
    } catch {
      // No README available
    }
    
    return {
      user: {
        login: user.login,
        id: user.id,
        avatarUrl: user.avatar_url,
        htmlUrl: user.html_url,
        name: user.name,
        company: user.company,
        blog: user.blog,
        location: user.location,
        email: user.email,
        bio: user.bio,
        twitterUsername: user.twitter_username,
        hireable: user.hireable,
        publicRepos: user.public_repos,
        publicGists: user.public_gists,
        followers: user.followers,
        following: user.following,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        readmeHtml,
        lastFetched: Date.now(),
      },
    };
  } catch (error) {
    return { user: null, error: String(error) };
  }
}

// ============================================
// Repository Issues/PR Counts
// ============================================

export type IssuesCache = RepoIssuesInfo;

/**
 * Fetch repository issues and PR counts
 */
export async function fetchRepoIssues(
  owner: string,
  repo: string
): Promise<{ issues: RepoIssuesInfo | null; error?: string }> {
  const fullName = `${owner}/${repo}`;
  const headers = getAuthHeaders();
  
  try {
    // Use GitHub search API to get counts
    // Search for open issues (not PRs)
    const openIssuesQuery = `repo:${owner}/${repo} is:issue is:open`;
    const closedIssuesQuery = `repo:${owner}/${repo} is:issue is:closed`;
    const openPRsQuery = `repo:${owner}/${repo} is:pr is:open`;
    const closedPRsQuery = `repo:${owner}/${repo} is:pr is:closed`;
    
    const [openIssuesRes, closedIssuesRes, openPRsRes, closedPRsRes] = await Promise.all([
      fetch(`${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(openIssuesQuery)}&per_page=1`, { headers }),
      fetch(`${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(closedIssuesQuery)}&per_page=1`, { headers }),
      fetch(`${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(openPRsQuery)}&per_page=1`, { headers }),
      fetch(`${GITHUB_API_BASE}/search/issues?q=${encodeURIComponent(closedPRsQuery)}&per_page=1`, { headers }),
    ]);
    
    if (!openIssuesRes.ok || !closedIssuesRes.ok || !openPRsRes.ok || !closedPRsRes.ok) {
      return { issues: null, error: "Failed to fetch issue counts" };
    }
    
    const [openIssuesData, closedIssuesData, openPRsData, closedPRsData] = await Promise.all([
      openIssuesRes.json(),
      closedIssuesRes.json(),
      openPRsRes.json(),
      closedPRsRes.json(),
    ]);
    
    return {
      issues: {
        fullName,
        openIssues: openIssuesData.total_count || 0,
        closedIssues: closedIssuesData.total_count || 0,
        openPullRequests: openPRsData.total_count || 0,
        closedPullRequests: closedPRsData.total_count || 0,
        lastFetched: Date.now(),
      },
    };
  } catch (error) {
    return { issues: null, error: String(error) };
  }
}
