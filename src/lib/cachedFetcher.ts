/**
 * Cached GitHub Fetcher
 * Wraps githubFetcher with IndexedDB caching for persistent client-side storage
 * 
 * Features:
 * - Returns cached data immediately if fresh (< 1 hour old)
 * - Fetches fresh data in background if cache is stale
 * - Stores all fetched data in IndexedDB for offline access
 * - Handles duplicates via upsert operations
 */

import {
  fetchRepoStats as fetchRepoStatsAPI,
  fetchMultipleRepoStats as fetchMultipleRepoStatsAPI,
  fetchRepoReadme as fetchRepoReadmeAPI,
  fetchRepoReleases as fetchRepoReleasesAPI,
  fetchRepoZon as fetchRepoZonAPI,
  fetchUserProfile as fetchUserProfileAPI,
  fetchRepoIssues as fetchRepoIssuesAPI,
  generateZigFetchCommand,
  generateZigFetchUrl,
  checkRateLimit,
  type ReadmeCache,
  type RateLimitInfo,
  type ReleasesCache,
  type ZonCache,
  type UserProfileCache,
  type IssuesCache,
} from './githubFetcher';

import {
  getCachedRepoStats,
  getCachedMultipleRepoStats,
  setCachedRepoStats,
  setCachedMultipleRepoStats,
  getCachedReadme,
  setCachedReadme,
  getCachedReleases,
  setCachedReleases,
  getCachedZon,
  setCachedZon,
  getCachedUser,
  setCachedUser,
  getCachedIssues,
  setCachedIssues,
  isCacheFresh,
  getReposNeedingRefresh,
  clearExpiredCache,
  getCacheStats,
  type CachedRepoStats,
  type CachedReleases,
  type CachedZon,
  type CachedUser,
  type CachedIssues,
} from './idb-cache';

import type { LiveStats, RepoStatus, RepoVersion, UserProfile, RepoIssuesInfo } from './schemas';

// ============================================
// Cached Fetch Functions
// ============================================

/**
 * Fetch repo stats with IndexedDB caching
 * Returns cached data if fresh, otherwise fetches from API and caches
 * Falls back to stale cached data if API fails (rate limit, network error)
 */
export async function fetchRepoStatsWithCache(
  owner: string,
  repo: string,
  forceRefresh: boolean = false
): Promise<{ 
  stats: LiveStats | null; 
  status: RepoStatus; 
  fromCache: boolean;
  rateLimit: RateLimitInfo | null;
  error?: string;
  isStale?: boolean;
}> {
  const fullName = `${owner}/${repo}`;
  
  // Try to get fresh cached data first (unless force refresh)
  if (!forceRefresh) {
    const cached = await getCachedRepoStats(fullName, true);
    if (cached) {
      return {
        stats: cached.stats,
        status: cached.status,
        fromCache: true,
        rateLimit: null,
        isStale: false,
      };
    }
  }
  
  // Get stale cached data as fallback (don't check expiry)
  const staleCached = await getCachedRepoStats(fullName, false);
  
  // Fetch from API
  const result = await fetchRepoStatsAPI(owner, repo);
  
  // If API fetch succeeded, cache and return fresh data
  if (result.stats || result.status === 'deleted') {
    await setCachedRepoStats(fullName, result.stats, result.status);
    return {
      stats: result.stats,
      status: result.status,
      fromCache: false,
      rateLimit: result.rateLimit,
      error: result.error,
      isStale: false,
    };
  }
  
  // API failed - fall back to stale cached data if available
  if (result.error && staleCached) {
    console.log(`[Cache] API failed for ${fullName}, using stale cached data`);
    return {
      stats: staleCached.stats,
      status: staleCached.status,
      fromCache: true,
      rateLimit: result.rateLimit,
      error: result.error,
      isStale: true, // Indicate data is stale
    };
  }
  
  // No cached data available, return the error
  return {
    stats: result.stats,
    status: result.status,
    fromCache: false,
    rateLimit: result.rateLimit,
    error: result.error,
    isStale: false,
  };
}

/**
 * Fetch multiple repo stats with IndexedDB caching
 * Efficiently fetches only repos that need refresh
 * Falls back to stale cached data if API fails
 */
export async function fetchMultipleRepoStatsWithCache(
  repos: { owner: string; repo: string }[],
  concurrency: number = 3,
  forceRefresh: boolean = false
): Promise<Map<string, { stats: LiveStats | null; status: RepoStatus; fromCache: boolean }>> {
  const results = new Map<string, { stats: LiveStats | null; status: RepoStatus; fromCache: boolean }>();
  
  if (repos.length === 0) return results;
  
  const fullNames = repos.map(r => `${r.owner}/${r.repo}`);
  
  // Get all cached data first (fresh only, unless force refresh)
  const cachedData = await getCachedMultipleRepoStats(fullNames, !forceRefresh);
  
  // Also get stale cached data as fallback (don't check expiry)
  const staleCachedData = await getCachedMultipleRepoStats(fullNames, false);
  
  // Determine which repos need fresh data
  const reposToFetch: { owner: string; repo: string }[] = [];
  
  for (const { owner, repo } of repos) {
    const fullName = `${owner}/${repo}`;
    const cached = cachedData.get(fullName);
    
    if (cached && !forceRefresh) {
      // Use cached data
      results.set(fullName, {
        stats: cached.stats,
        status: cached.status,
        fromCache: true,
      });
    } else {
      // Need to fetch
      reposToFetch.push({ owner, repo });
    }
  }
  
  // Fetch missing/stale repos from API
  if (reposToFetch.length > 0) {
    const freshData = await fetchMultipleRepoStatsAPI(reposToFetch, concurrency);
    
    // Cache and add to results
    const toCache: Array<{ fullName: string; stats: LiveStats | null; status: RepoStatus }> = [];
    
    for (const [fullName, data] of freshData) {
      // If API returned valid data, use it
      if (data.stats || data.status === 'deleted') {
        results.set(fullName, {
          stats: data.stats,
          status: data.status,
          fromCache: false,
        });
        toCache.push({
          fullName,
          stats: data.stats,
          status: data.status,
        });
      } else {
        // API failed - fall back to stale cached data if available
        const staleCached = staleCachedData.get(fullName);
        if (staleCached) {
          console.log(`[Cache] API failed for ${fullName}, using stale cached data`);
          results.set(fullName, {
            stats: staleCached.stats,
            status: staleCached.status,
            fromCache: true,
          });
        } else {
          // No cached data, add with error status
          results.set(fullName, {
            stats: null,
            status: data.status,
            fromCache: false,
          });
        }
      }
    }
    
    // Bulk cache only the fresh data (not the fallbacks)
    if (toCache.length > 0) {
      await setCachedMultipleRepoStats(toCache);
    }
  }
  
  return results;
}

/**
 * Fetch README with IndexedDB caching
 * Falls back to stale cached data if API fails (rate limit, network error)
 */
export async function fetchRepoReadmeWithCache(
  owner: string,
  repo: string,
  forceRefresh: boolean = false
): Promise<{ 
  readme: ReadmeCache | null; 
  fromCache: boolean;
  error?: string;
  isStale?: boolean;
}> {
  const fullName = `${owner}/${repo}`;
  
  // Try to get fresh cached data first
  if (!forceRefresh) {
    const cached = await getCachedReadme(fullName, true);
    if (cached) {
      return {
        readme: {
          fullName: cached.fullName,
          readme_html: cached.readme_html,
          readme_excerpt: cached.readme_excerpt,
          image_url: cached.image_url,
          lastFetched: cached.lastFetched,
        },
        fromCache: true,
        isStale: false,
      };
    }
  }
  
  // Get stale cached data as fallback (don't check expiry)
  const staleCached = await getCachedReadme(fullName, false);
  
  // Fetch from API
  const result = await fetchRepoReadmeAPI(owner, repo);
  
  // If API fetch succeeded, cache and return fresh data
  if (result.readme) {
    await setCachedReadme(result.readme);
    return {
      readme: result.readme,
      fromCache: false,
      isStale: false,
    };
  }
  
  // API failed - fall back to stale cached data if available
  if (result.error && staleCached) {
    console.log(`[Cache] README API failed for ${fullName}, using stale cached data`);
    return {
      readme: {
        fullName: staleCached.fullName,
        readme_html: staleCached.readme_html,
        readme_excerpt: staleCached.readme_excerpt,
        image_url: staleCached.image_url,
        lastFetched: staleCached.lastFetched,
      },
      fromCache: true,
      error: result.error,
      isStale: true,
    };
  }
  
  // No cached data available, return the error
  return {
    readme: result.readme,
    fromCache: false,
    error: result.error,
    isStale: false,
  };
}

/**
 * Fetch releases/tags with IndexedDB caching
 * Falls back to stale cached data if API fails
 */
export async function fetchRepoReleasesWithCache(
  owner: string,
  repo: string,
  forceRefresh: boolean = false
): Promise<{ 
  releases: ReleasesCache | null; 
  fromCache: boolean;
  error?: string;
  isStale?: boolean;
}> {
  const fullName = `${owner}/${repo}`;
  
  // Try to get fresh cached data first
  if (!forceRefresh) {
    const cached = await getCachedReleases(fullName, true);
    if (cached) {
      return {
        releases: {
          fullName: cached.fullName,
          versions: cached.versions,
          latestVersion: cached.latestVersion,
          lastFetched: cached.lastFetched,
        },
        fromCache: true,
        isStale: false,
      };
    }
  }
  
  // Get stale cached data as fallback (don't check expiry)
  const staleCached = await getCachedReleases(fullName, false);
  
  // Fetch from API
  const result = await fetchRepoReleasesAPI(owner, repo);
  
  // If API fetch succeeded, cache and return fresh data
  if (result.releases) {
    await setCachedReleases(result.releases);
    return {
      releases: result.releases,
      fromCache: false,
      isStale: false,
    };
  }
  
  // API failed - fall back to stale cached data if available
  if (result.error && staleCached) {
    console.log(`[Cache] Releases API failed for ${fullName}, using stale cached data`);
    return {
      releases: {
        fullName: staleCached.fullName,
        versions: staleCached.versions,
        latestVersion: staleCached.latestVersion,
        lastFetched: staleCached.lastFetched,
      },
      fromCache: true,
      error: result.error,
      isStale: true,
    };
  }
  
  // No cached data available, return the error
  return {
    releases: result.releases,
    fromCache: false,
    error: result.error,
    isStale: false,
  };
}

/**
 * Fetch build.zig.zon with IndexedDB caching
 * Falls back to stale cached data if API fails
 */
export async function fetchRepoZonWithCache(
  owner: string,
  repo: string,
  forceRefresh: boolean = false
): Promise<{ 
  zon: ZonCache | null; 
  fromCache: boolean;
  error?: string;
  isStale?: boolean;
}> {
  const fullName = `${owner}/${repo}`;
  
  // Try to get fresh cached data first
  if (!forceRefresh) {
    const cached = await getCachedZon(fullName, true);
    if (cached) {
      return {
        zon: {
          fullName: cached.fullName,
          hasZon: cached.hasZon,
          name: cached.name,
          version: cached.version,
          dependencies: cached.dependencies,
          minZigVersion: cached.minZigVersion,
          lastFetched: cached.lastFetched,
        },
        fromCache: true,
        isStale: false,
      };
    }
  }
  
  // Get stale cached data as fallback (don't check expiry)
  const staleCached = await getCachedZon(fullName, false);
  
  // Fetch from API
  const result = await fetchRepoZonAPI(owner, repo);
  
  // If API fetch succeeded, cache and return fresh data
  if (result.zon) {
    await setCachedZon(result.zon);
    return {
      zon: result.zon,
      fromCache: false,
      isStale: false,
    };
  }
  
  // API failed - fall back to stale cached data if available
  if (result.error && staleCached) {
    console.log(`[Cache] Zon API failed for ${fullName}, using stale cached data`);
    return {
      zon: {
        fullName: staleCached.fullName,
        hasZon: staleCached.hasZon,
        name: staleCached.name,
        version: staleCached.version,
        dependencies: staleCached.dependencies,
        minZigVersion: staleCached.minZigVersion,
        lastFetched: staleCached.lastFetched,
      },
      fromCache: true,
      error: result.error,
      isStale: true,
    };
  }
  
  // No cached data available, return the error
  return {
    zon: result.zon,
    fromCache: false,
    error: result.error,
    isStale: false,
  };
}

/**
 * Fetch user profile with IndexedDB caching
 * Falls back to stale cached data if API fails
 */
export async function fetchUserProfileWithCache(
  username: string,
  forceRefresh: boolean = false
): Promise<{ 
  user: UserProfile | null; 
  fromCache: boolean;
  error?: string;
  isStale?: boolean;
}> {
  // Try to get fresh cached data first
  if (!forceRefresh) {
    const cached = await getCachedUser(username, true);
    if (cached) {
      return {
        user: cached.profile,
        fromCache: true,
        isStale: false,
      };
    }
  }
  
  // Get stale cached data as fallback (don't check expiry)
  const staleCached = await getCachedUser(username, false);
  
  // Fetch from API
  const result = await fetchUserProfileAPI(username);
  
  // If API fetch succeeded, cache and return fresh data
  if (result.user) {
    await setCachedUser({
      login: username,
      profile: result.user,
      lastFetched: Date.now(),
    });
    return {
      user: result.user,
      fromCache: false,
      isStale: false,
    };
  }
  
  // API failed - fall back to stale cached data if available
  if (result.error && staleCached) {
    console.log(`[Cache] User API failed for ${username}, using stale cached data`);
    return {
      user: staleCached.profile,
      fromCache: true,
      error: result.error,
      isStale: true,
    };
  }
  
  // No cached data available, return the error
  return {
    user: result.user,
    fromCache: false,
    error: result.error,
    isStale: false,
  };
}

/**
 * Fetch repo issues/PR counts with IndexedDB caching
 * Falls back to stale cached data if API fails
 */
export async function fetchRepoIssuesWithCache(
  owner: string,
  repo: string,
  forceRefresh: boolean = false
): Promise<{ 
  issues: RepoIssuesInfo | null; 
  fromCache: boolean;
  error?: string;
  isStale?: boolean;
}> {
  const fullName = `${owner}/${repo}`;
  
  // Try to get fresh cached data first
  if (!forceRefresh) {
    const cached = await getCachedIssues(fullName, true);
    if (cached) {
      return {
        issues: {
          fullName: cached.fullName,
          openIssues: cached.openIssues,
          closedIssues: cached.closedIssues,
          openPullRequests: cached.openPullRequests,
          closedPullRequests: cached.closedPullRequests,
          lastFetched: cached.lastFetched,
        },
        fromCache: true,
        isStale: false,
      };
    }
  }
  
  // Get stale cached data as fallback (don't check expiry)
  const staleCached = await getCachedIssues(fullName, false);
  
  // Fetch from API
  const result = await fetchRepoIssuesAPI(owner, repo);
  
  // If API fetch succeeded, cache and return fresh data
  if (result.issues) {
    await setCachedIssues(result.issues);
    return {
      issues: result.issues,
      fromCache: false,
      isStale: false,
    };
  }
  
  // API failed - fall back to stale cached data if available
  if (result.error && staleCached) {
    console.log(`[Cache] Issues API failed for ${fullName}, using stale cached data`);
    return {
      issues: {
        fullName: staleCached.fullName,
        openIssues: staleCached.openIssues,
        closedIssues: staleCached.closedIssues,
        openPullRequests: staleCached.openPullRequests,
        closedPullRequests: staleCached.closedPullRequests,
        lastFetched: staleCached.lastFetched,
      },
      fromCache: true,
      error: result.error,
      isStale: true,
    };
  }
  
  // No cached data available, return the error
  return {
    issues: result.issues,
    fromCache: false,
    error: result.error,
    isStale: false,
  };
}

// ============================================
// Background Refresh Functions
// ============================================

/**
 * Refresh stale cache entries in background
 * Call this on page load to update old data
 */
export async function refreshStaleCacheInBackground(
  repos: { owner: string; repo: string }[]
): Promise<void> {
  if (repos.length === 0) return;
  
  const fullNames = repos.map(r => `${r.owner}/${r.repo}`);
  const staleRepos = await getReposNeedingRefresh(fullNames);
  
  if (staleRepos.length === 0) return;
  
  // Convert back to owner/repo format
  const reposToRefresh = staleRepos.map(fullName => {
    const [owner, ...repoParts] = fullName.split('/');
    return { owner, repo: repoParts.join('/') };
  });
  
  console.log(`[Cache] Refreshing ${reposToRefresh.length} stale entries in background...`);
  
  // Fetch in background with lower concurrency to not block UI
  await fetchMultipleRepoStatsWithCache(reposToRefresh, 2, true);
  
  console.log(`[Cache] Background refresh complete`);
}

/**
 * Initialize cache on page load
 * Does NOT clear expired entries - keeps all data for fallback
 * Only returns cache stats
 */
export async function initializeCache(): Promise<{
  totalCached: number;
  staleCount: number;
}> {
  // Get current stats - don't clear anything, keep all data for fallback
  const stats = await getCacheStats();
  
  console.log(`[Cache] Initialized: ${stats.totalRepoStats} repos cached, ${stats.totalReadmes} READMEs, ${stats.totalReleases} releases, ${stats.totalZon} zons, ${stats.expiredRepoStats} stale (kept for fallback)`);
  
  return {
    totalCached: stats.totalRepoStats,
    staleCount: stats.expiredRepoStats,
  };
}

// ============================================
// Re-export original functions and types
// ============================================

export {
  checkRateLimit,
  generateZigFetchCommand,
  generateZigFetchUrl,
  type ReadmeCache,
  type RateLimitInfo,
  type ReleasesCache,
  type ZonCache,
  type UserProfileCache,
  type IssuesCache,
};

// Re-export cache utilities
export {
  getCachedRepoStats,
  getCachedMultipleRepoStats,
  getCachedReadme,
  getCachedReleases,
  getCachedZon,
  getCachedUser,
  getCachedIssues,
  getCacheStats,
  clearExpiredCache,
  isCacheFresh,
  type CachedRepoStats,
  type CachedReleases,
  type CachedZon,
  type CachedUser,
  type CachedIssues,
};
