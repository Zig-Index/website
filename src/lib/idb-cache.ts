/**
 * IndexedDB Cache for GitHub Repository Data
 * Uses Dexie.js as the ORM for persistent client-side storage
 * 
 * Features:
 * - Caches repo stats, README, and releases data PERMANENTLY
 * - Data is stored indefinitely until browser data is cleared
 * - On revisit: tries to refresh if data > 1 hour old
 * - If refresh fails (rate limit/network): falls back to stored data
 * - Handles duplicates correctly (upserts)
 * - NEVER auto-deletes cached data - always keeps for fallback
 */

import Dexie, { type Table } from 'dexie';
import type { LiveStats, RepoStatus, RepoVersion, ZigDependency, UserProfile, RepoIssuesInfo } from './schemas';
import type { ReadmeCache, ReleasesCache, ZonCache } from './githubFetcher';

// Cache expiry time: 1 hour in milliseconds
export const CACHE_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// ============================================
// Database Schema Types
// ============================================

export interface CachedRepoStats {
  fullName: string; // Primary key: "owner/repo"
  stats: LiveStats | null;
  status: RepoStatus;
  lastFetched: number; // Unix timestamp
  lastUpdated: number; // When the data was last updated from API
}

export interface CachedReadme {
  fullName: string; // Primary key: "owner/repo"
  readme_html: string | null;
  readme_excerpt: string | null;
  image_url: string | null;
  lastFetched: number; // Unix timestamp
}

export interface CacheMetadata {
  key: string; // Primary key
  value: string | number | boolean;
  updatedAt: number;
}

export interface CachedReleases {
  fullName: string; // Primary key: "owner/repo"
  versions: RepoVersion[];
  latestVersion: string | null;
  lastFetched: number; // Unix timestamp
}

export interface CachedZon {
  fullName: string; // Primary key: "owner/repo"
  hasZon: boolean;
  name?: string;
  version?: string;
  dependencies: ZigDependency[];
  minZigVersion?: string;
  lastFetched: number; // Unix timestamp
}

export interface CachedUser {
  login: string; // Primary key: username
  profile: UserProfile;
  lastFetched: number; // Unix timestamp
}

export interface CachedIssues {
  fullName: string; // Primary key: "owner/repo"
  openIssues: number;
  closedIssues: number;
  openPullRequests: number;
  closedPullRequests: number;
  lastFetched: number; // Unix timestamp
}

// ============================================
// Dexie Database Class
// ============================================

class ZigIndexDB extends Dexie {
  repoStats!: Table<CachedRepoStats, string>;
  readmeCache!: Table<CachedReadme, string>;
  releasesCache!: Table<CachedReleases, string>;
  zonCache!: Table<CachedZon, string>;
  userCache!: Table<CachedUser, string>;
  issuesCache!: Table<CachedIssues, string>;
  metadata!: Table<CacheMetadata, string>;

  constructor() {
    super('ZigIndexDB');
    
    // Define database schema
    // Version 1: Initial schema
    this.version(1).stores({
      repoStats: 'fullName, lastFetched, lastUpdated, status',
      readmeCache: 'fullName, lastFetched',
      metadata: 'key, updatedAt',
    });
    
    // Version 2: Add releases cache
    this.version(2).stores({
      repoStats: 'fullName, lastFetched, lastUpdated, status',
      readmeCache: 'fullName, lastFetched',
      releasesCache: 'fullName, lastFetched',
      metadata: 'key, updatedAt',
    });
    
    // Version 3: Add zon cache for build.zig.zon parsing
    this.version(3).stores({
      repoStats: 'fullName, lastFetched, lastUpdated, status',
      readmeCache: 'fullName, lastFetched',
      releasesCache: 'fullName, lastFetched',
      zonCache: 'fullName, lastFetched',
      metadata: 'key, updatedAt',
    });
    
    // Version 4: Add user and issues cache
    this.version(4).stores({
      repoStats: 'fullName, lastFetched, lastUpdated, status',
      readmeCache: 'fullName, lastFetched',
      releasesCache: 'fullName, lastFetched',
      zonCache: 'fullName, lastFetched',
      userCache: 'login, lastFetched',
      issuesCache: 'fullName, lastFetched',
      metadata: 'key, updatedAt',
    });
  }
}

// Singleton database instance
let db: ZigIndexDB | null = null;

/**
 * Get the database instance (creates if not exists)
 * Only works in browser environment
 */
export function getDB(): ZigIndexDB | null {
  if (typeof window === 'undefined') {
    return null;
  }
  
  if (!db) {
    db = new ZigIndexDB();
  }
  
  return db;
}

// ============================================
// Cache Helper Functions
// ============================================

/**
 * Check if cached data is still fresh (less than 1 hour old)
 */
export function isCacheFresh(lastFetched: number): boolean {
  const now = Date.now();
  return (now - lastFetched) < CACHE_EXPIRY_MS;
}

/**
 * Get time until cache expires in human-readable format
 */
export function getCacheExpiryTime(lastFetched: number): string {
  const expiresAt = lastFetched + CACHE_EXPIRY_MS;
  const now = Date.now();
  const remaining = expiresAt - now;
  
  if (remaining <= 0) return 'Expired';
  
  const minutes = Math.floor(remaining / (60 * 1000));
  if (minutes < 60) return `${minutes}m`;
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

// ============================================
// Repo Stats Cache Operations
// ============================================

/**
 * Get cached repo stats by fullName
 * Returns null if not cached or cache is expired (when checkExpiry is true)
 */
export async function getCachedRepoStats(
  fullName: string,
  checkExpiry: boolean = true
): Promise<CachedRepoStats | null> {
  const database = getDB();
  if (!database) return null;
  
  try {
    const cached = await database.repoStats.get(fullName);
    
    if (!cached) return null;
    
    // Return null if expired and checkExpiry is true
    if (checkExpiry && !isCacheFresh(cached.lastFetched)) {
      return null;
    }
    
    return cached;
  } catch (error) {
    console.warn('[IDB Cache] Error getting cached stats:', error);
    return null;
  }
}

/**
 * Get multiple cached repo stats
 * Returns a Map with fullName as key
 */
export async function getCachedMultipleRepoStats(
  fullNames: string[],
  checkExpiry: boolean = true
): Promise<Map<string, CachedRepoStats>> {
  const database = getDB();
  const result = new Map<string, CachedRepoStats>();
  
  if (!database || fullNames.length === 0) return result;
  
  try {
    const cached = await database.repoStats
      .where('fullName')
      .anyOf(fullNames)
      .toArray();
    
    for (const item of cached) {
      if (!checkExpiry || isCacheFresh(item.lastFetched)) {
        result.set(item.fullName, item);
      }
    }
    
    return result;
  } catch (error) {
    console.warn('[IDB Cache] Error getting multiple cached stats:', error);
    return result;
  }
}

/**
 * Save or update repo stats in cache (upsert)
 */
export async function setCachedRepoStats(
  fullName: string,
  stats: LiveStats | null,
  status: RepoStatus
): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  const now = Date.now();
  
  try {
    await database.repoStats.put({
      fullName,
      stats,
      status,
      lastFetched: now,
      lastUpdated: now,
    });
  } catch (error) {
    console.warn('[IDB Cache] Error saving cached stats:', error);
  }
}

/**
 * Save multiple repo stats in cache (bulk upsert)
 */
export async function setCachedMultipleRepoStats(
  entries: Array<{ fullName: string; stats: LiveStats | null; status: RepoStatus }>
): Promise<void> {
  const database = getDB();
  if (!database || entries.length === 0) return;
  
  const now = Date.now();
  
  try {
    const items: CachedRepoStats[] = entries.map(entry => ({
      fullName: entry.fullName,
      stats: entry.stats,
      status: entry.status,
      lastFetched: now,
      lastUpdated: now,
    }));
    
    await database.repoStats.bulkPut(items);
  } catch (error) {
    console.warn('[IDB Cache] Error saving multiple cached stats:', error);
  }
}

/**
 * Get all cached repo stats (for debugging/stats)
 */
export async function getAllCachedRepoStats(): Promise<CachedRepoStats[]> {
  const database = getDB();
  if (!database) return [];
  
  try {
    return await database.repoStats.toArray();
  } catch (error) {
    console.warn('[IDB Cache] Error getting all cached stats:', error);
    return [];
  }
}

// ============================================
// README Cache Operations
// ============================================

/**
 * Get cached README by fullName
 */
export async function getCachedReadme(
  fullName: string,
  checkExpiry: boolean = true
): Promise<CachedReadme | null> {
  const database = getDB();
  if (!database) return null;
  
  try {
    const cached = await database.readmeCache.get(fullName);
    
    if (!cached) return null;
    
    if (checkExpiry && !isCacheFresh(cached.lastFetched)) {
      return null;
    }
    
    return cached;
  } catch (error) {
    console.warn('[IDB Cache] Error getting cached README:', error);
    return null;
  }
}

/**
 * Save or update README in cache (upsert)
 */
export async function setCachedReadme(readme: ReadmeCache): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  try {
    await database.readmeCache.put({
      fullName: readme.fullName,
      readme_html: readme.readme_html,
      readme_excerpt: readme.readme_excerpt,
      image_url: readme.image_url,
      lastFetched: readme.lastFetched,
    });
  } catch (error) {
    console.warn('[IDB Cache] Error saving cached README:', error);
  }
}

// ============================================
// Releases Cache Operations
// ============================================

/**
 * Get cached releases by fullName
 */
export async function getCachedReleases(
  fullName: string,
  checkExpiry: boolean = true
): Promise<CachedReleases | null> {
  const database = getDB();
  if (!database) return null;
  
  try {
    const cached = await database.releasesCache.get(fullName);
    
    if (!cached) return null;
    
    if (checkExpiry && !isCacheFresh(cached.lastFetched)) {
      return null;
    }
    
    return cached;
  } catch (error) {
    console.warn('[IDB Cache] Error getting cached releases:', error);
    return null;
  }
}

/**
 * Save or update releases in cache (upsert)
 */
export async function setCachedReleases(releases: ReleasesCache): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  try {
    await database.releasesCache.put({
      fullName: releases.fullName,
      versions: releases.versions,
      latestVersion: releases.latestVersion,
      lastFetched: releases.lastFetched,
    });
  } catch (error) {
    console.warn('[IDB Cache] Error saving cached releases:', error);
  }
}

// ============================================
// Zon Cache Operations (build.zig.zon parsing)
// ============================================

/**
 * Get cached zon data by fullName
 */
export async function getCachedZon(
  fullName: string,
  checkExpiry: boolean = true
): Promise<CachedZon | null> {
  const database = getDB();
  if (!database) return null;
  
  try {
    const cached = await database.zonCache.get(fullName);
    
    if (!cached) return null;
    
    if (checkExpiry && !isCacheFresh(cached.lastFetched)) {
      return null;
    }
    
    return cached;
  } catch (error) {
    console.warn('[IDB Cache] Error getting cached zon:', error);
    return null;
  }
}

/**
 * Save or update zon data in cache (upsert)
 */
export async function setCachedZon(zon: CachedZon): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  try {
    await database.zonCache.put(zon);
  } catch (error) {
    console.warn('[IDB Cache] Error saving cached zon:', error);
  }
}

// ============================================
// User Cache Operations
// ============================================

/**
 * Get cached user profile by login
 */
export async function getCachedUser(
  login: string,
  checkExpiry: boolean = true
): Promise<CachedUser | null> {
  const database = getDB();
  if (!database) return null;
  
  try {
    const cached = await database.userCache.get(login);
    
    if (!cached) return null;
    
    if (checkExpiry && !isCacheFresh(cached.lastFetched)) {
      return null;
    }
    
    return cached;
  } catch (error) {
    console.warn('[IDB Cache] Error getting cached user:', error);
    return null;
  }
}

/**
 * Save or update user profile in cache (upsert)
 */
export async function setCachedUser(user: CachedUser): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  try {
    await database.userCache.put(user);
  } catch (error) {
    console.warn('[IDB Cache] Error saving cached user:', error);
  }
}

// ============================================
// Issues Cache Operations
// ============================================

/**
 * Get cached issues by fullName
 */
export async function getCachedIssues(
  fullName: string,
  checkExpiry: boolean = true
): Promise<CachedIssues | null> {
  const database = getDB();
  if (!database) return null;
  
  try {
    const cached = await database.issuesCache.get(fullName);
    
    if (!cached) return null;
    
    if (checkExpiry && !isCacheFresh(cached.lastFetched)) {
      return null;
    }
    
    return cached;
  } catch (error) {
    console.warn('[IDB Cache] Error getting cached issues:', error);
    return null;
  }
}

/**
 * Save or update issues in cache (upsert)
 */
export async function setCachedIssues(issues: CachedIssues): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  try {
    await database.issuesCache.put(issues);
  } catch (error) {
    console.warn('[IDB Cache] Error saving cached issues:', error);
  }
}

// ============================================
// Metadata Operations
// ============================================

/**
 * Get metadata value by key
 */
export async function getMetadata(key: string): Promise<CacheMetadata | null> {
  const database = getDB();
  if (!database) return null;
  
  try {
    return await database.metadata.get(key) || null;
  } catch (error) {
    console.warn('[IDB Cache] Error getting metadata:', error);
    return null;
  }
}

/**
 * Set metadata value
 */
export async function setMetadata(
  key: string,
  value: string | number | boolean
): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  try {
    await database.metadata.put({
      key,
      value,
      updatedAt: Date.now(),
    });
  } catch (error) {
    console.warn('[IDB Cache] Error setting metadata:', error);
  }
}

// ============================================
// Cache Management
// ============================================

/**
 * Clear all cached data
 */
export async function clearAllCache(): Promise<void> {
  const database = getDB();
  if (!database) return;
  
  try {
    await Promise.all([
      database.repoStats.clear(),
      database.readmeCache.clear(),
      database.releasesCache.clear(),
      database.zonCache.clear(),
      database.userCache.clear(),
      database.issuesCache.clear(),
      database.metadata.clear(),
    ]);
    console.log('[IDB Cache] All cache cleared');
  } catch (error) {
    console.warn('[IDB Cache] Error clearing cache:', error);
  }
}

/**
 * Clear only expired cache entries
 * WARNING: This function should NOT be called automatically!
 * Expired data is still valuable as fallback when API fails.
 * Only call this manually when user explicitly wants to clear cache.
 */
export async function clearExpiredCache(): Promise<number> {
  const database = getDB();
  if (!database) return 0;
  
  const expiryTime = Date.now() - CACHE_EXPIRY_MS;
  let cleared = 0;
  
  try {
    // Clear expired repo stats
    const expiredStats = await database.repoStats
      .where('lastFetched')
      .below(expiryTime)
      .primaryKeys();
    await database.repoStats.bulkDelete(expiredStats);
    cleared += expiredStats.length;
    
    // Clear expired READMEs
    const expiredReadmes = await database.readmeCache
      .where('lastFetched')
      .below(expiryTime)
      .primaryKeys();
    await database.readmeCache.bulkDelete(expiredReadmes);
    cleared += expiredReadmes.length;
    
    // Clear expired releases
    const expiredReleases = await database.releasesCache
      .where('lastFetched')
      .below(expiryTime)
      .primaryKeys();
    await database.releasesCache.bulkDelete(expiredReleases);
    cleared += expiredReleases.length;
    
    // Clear expired zon data
    const expiredZon = await database.zonCache
      .where('lastFetched')
      .below(expiryTime)
      .primaryKeys();
    await database.zonCache.bulkDelete(expiredZon);
    cleared += expiredZon.length;
    
    // Clear expired user profiles
    const expiredUsers = await database.userCache
      .where('lastFetched')
      .below(expiryTime)
      .primaryKeys();
    await database.userCache.bulkDelete(expiredUsers);
    cleared += expiredUsers.length;
    
    // Clear expired issues
    const expiredIssues = await database.issuesCache
      .where('lastFetched')
      .below(expiryTime)
      .primaryKeys();
    await database.issuesCache.bulkDelete(expiredIssues);
    cleared += expiredIssues.length;
    
    if (cleared > 0) {
      console.log(`[IDB Cache] Cleared ${cleared} expired entries`);
    }
    
    return cleared;
  } catch (error) {
    console.warn('[IDB Cache] Error clearing expired cache:', error);
    return 0;
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalRepoStats: number;
  totalReadmes: number;
  totalReleases: number;
  totalZon: number;
  totalUsers: number;
  totalIssues: number;
  freshRepoStats: number;
  expiredRepoStats: number;
}> {
  const database = getDB();
  if (!database) {
    return {
      totalRepoStats: 0,
      totalReadmes: 0,
      totalReleases: 0,
      totalZon: 0,
      totalUsers: 0,
      totalIssues: 0,
      freshRepoStats: 0,
      expiredRepoStats: 0,
    };
  }
  
  try {
    const expiryTime = Date.now() - CACHE_EXPIRY_MS;
    
    const [totalRepoStats, totalReadmes, totalReleases, totalZon, totalUsers, totalIssues, expiredRepoStats] = await Promise.all([
      database.repoStats.count(),
      database.readmeCache.count(),
      database.releasesCache.count(),
      database.zonCache.count(),
      database.userCache.count(),
      database.issuesCache.count(),
      database.repoStats.where('lastFetched').below(expiryTime).count(),
    ]);
    
    return {
      totalRepoStats,
      totalReadmes,
      totalReleases,
      totalZon,
      totalUsers,
      totalIssues,
      freshRepoStats: totalRepoStats - expiredRepoStats,
      expiredRepoStats,
    };
  } catch (error) {
    console.warn('[IDB Cache] Error getting cache stats:', error);
    return {
      totalRepoStats: 0,
      totalReadmes: 0,
      totalReleases: 0,
      totalZon: 0,
      totalUsers: 0,
      totalIssues: 0,
      freshRepoStats: 0,
      expiredRepoStats: 0,
    };
  }
}

/**
 * Check if repo needs refresh (data older than 1 hour)
 */
export async function needsRefresh(fullName: string): Promise<boolean> {
  const cached = await getCachedRepoStats(fullName, false);
  if (!cached) return true;
  return !isCacheFresh(cached.lastFetched);
}

/**
 * Get repos that need refresh from a list
 */
export async function getReposNeedingRefresh(fullNames: string[]): Promise<string[]> {
  const database = getDB();
  if (!database) return fullNames;
  
  try {
    const cached = await getCachedMultipleRepoStats(fullNames, false);
    const needRefresh: string[] = [];
    
    for (const fullName of fullNames) {
      const item = cached.get(fullName);
      if (!item || !isCacheFresh(item.lastFetched)) {
        needRefresh.push(fullName);
      }
    }
    
    return needRefresh;
  } catch (error) {
    return fullNames;
  }
}

export default {
  getDB,
  isCacheFresh,
  getCacheExpiryTime,
  getCachedRepoStats,
  getCachedMultipleRepoStats,
  setCachedRepoStats,
  setCachedMultipleRepoStats,
  getAllCachedRepoStats,
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
  getMetadata,
  setMetadata,
  clearAllCache,
  clearExpiredCache,
  getCacheStats,
  needsRefresh,
  getReposNeedingRefresh,
  CACHE_EXPIRY_MS,
};
