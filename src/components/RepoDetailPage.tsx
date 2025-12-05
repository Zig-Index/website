"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { 
  Star, 
  GitFork, 
  Eye,
  ExternalLink, 
  Github, 
  Calendar, 
  Scale,
  Code,
  FileText,
  Home,
  Package,
  Cpu,
  AlertTriangle,
  Copy,
  Check,
  Tag,
  Download,
  GitPullRequest,
  CircleDot,
  User,
  Hash,
  FileDown,
  FolderOpen,
  ChevronDown,
  Monitor,
  Apple,
  Terminal
} from "lucide-react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { EmptyState } from "./SyncStatus";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./ui/dropdown-menu";
import { 
  fetchRepoStatsWithCache, 
  fetchRepoReadmeWithCache, 
  fetchRepoReleasesWithCache,
  fetchRepoZonWithCache,
  fetchRepoIssuesWithCache,
  initializeCache 
} from "@/lib/cachedFetcher";
import type { RegistryEntryWithCategory, RepoVersion, ZigDependency, RepoIssuesInfo } from "@/lib/schemas";

// Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
    },
  },
});

interface RepoDetailPageProps {
  owner: string;
  name: string;
  entry?: RegistryEntryWithCategory;
}

// Copyable command component
function CopyableCommand({ command, label }: { command: string; label?: string }) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-muted/50 rounded-lg p-2 sm:p-3 border">
      {label && <span className="text-xs text-muted-foreground shrink-0 hidden sm:inline">{label}</span>}
      <code className="flex-1 text-xs sm:text-sm font-mono text-foreground break-all">
        {command}
      </code>
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 h-7 w-7 sm:h-8 sm:w-8"
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy to clipboard"}
      >
        {copied ? (
          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
        ) : (
          <Copy className="w-3 h-3 sm:w-4 sm:h-4" />
        )}
      </Button>
    </div>
  );
}

// Installation commands section
function InstallationCommands({ 
  owner, 
  repo, 
  version, 
  isPackage,
  zonLoading,
  hasReleases
}: { 
  owner: string; 
  repo: string; 
  version?: string | null; 
  isPackage: boolean;
  zonLoading: boolean;
  hasReleases: boolean;
}) {
  // Show loading state while checking zon
  if (zonLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
        <Skeleton className="h-8 sm:h-10 w-full" />
      </div>
    );
  }

  // For packages, show zig fetch command
  if (isPackage) {
    // If has releases/tags, use versioned URL
    // Otherwise, use main branch URL
    const tarGzUrl = hasReleases && version
      ? `https://github.com/${owner}/${repo}/archive/refs/tags/${version}.tar.gz`
      : `https://github.com/${owner}/${repo}/archive/refs/heads/main.tar.gz`;
    const zipUrl = hasReleases && version
      ? `https://github.com/${owner}/${repo}/archive/refs/tags/${version}.zip`
      : `https://github.com/${owner}/${repo}/archive/refs/heads/main.zip`;
    
    const zigFetchTarGz = `zig fetch --save ${tarGzUrl}`;
    const zigFetchZip = `zig fetch --save ${zipUrl}`;
    
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">Install with zig fetch</p>
        <div className="grid gap-2">
          <CopyableCommand command={zigFetchTarGz} label=".tar.gz" />
          <CopyableCommand command={zigFetchZip} label=".zip" />
        </div>
        <p className="text-xs text-muted-foreground">
          {hasReleases && version ? `Version: ${version}` : 'Latest commit (main branch)'}
        </p>
      </div>
    );
  }

  // For applications, just show the version info (download button is elsewhere)
  return null;
}

// Dependency type detection
type DependencyType = 'github' | 'url' | 'path' | 'hash';

function getDependencyInfo(dep: ZigDependency): { 
  name: string; 
  repoUrl: string | null; 
  type: DependencyType;
  displayUrl: string;
} {
  const name = dep.name;
  const url = dep.url;
  
  // Check for path-based dependency (starts with . or relative path)
  if (url.startsWith('.') || url.startsWith('/') || /^[a-zA-Z]:[/\\]/.test(url)) {
    return {
      name,
      repoUrl: null,
      type: 'path',
      displayUrl: url,
    };
  }
  
  // Check for hash-only dependency (no URL, just hash provided)
  if (!url || url === '' || dep.hash && !url.startsWith('http')) {
    return {
      name,
      repoUrl: null,
      type: 'hash',
      displayUrl: dep.hash ? `hash: ${dep.hash.slice(0, 12)}...` : 'local',
    };
  }
  
  // Try to extract GitHub repo URL from dependency URL
  // URL formats:
  // - https://github.com/owner/repo/archive/refs/tags/v1.0.0.tar.gz
  // - https://github.com/owner/repo/archive/refs/heads/main.tar.gz
  // - https://github.com/owner/repo.git
  // - git+https://github.com/owner/repo.git
  const githubMatch = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (githubMatch) {
    const owner = githubMatch[1];
    let repo = githubMatch[2];
    // Remove .git suffix if present
    repo = repo.replace(/\.git$/, '');
    // Remove /archive/ suffix if present
    repo = repo.split('/archive')[0];
    return {
      name,
      repoUrl: `https://github.com/${owner}/${repo}`,
      type: 'github',
      displayUrl: `${owner}/${repo}`,
    };
  }
  
  // Generic URL
  return { 
    name, 
    repoUrl: url.startsWith('http') ? url : null, 
    type: 'url',
    displayUrl: url.length > 40 ? '...' + url.slice(-35) : url,
  };
}

// Dependencies display card
function DependenciesCard({ 
  dependencies, 
  minZigVersion, 
  isLoading,
  error
}: { 
  dependencies: ZigDependency[]; 
  minZigVersion?: string;
  isLoading: boolean;
  error?: string;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Dependencies
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-5 sm:h-6 w-full" />
            <Skeleton className="h-5 sm:h-6 w-2/3 sm:w-3/4" />
            <Skeleton className="h-5 sm:h-6 w-1/2 sm:w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="w-4 h-4" />
          Dependencies
          {dependencies.length > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {dependencies.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Show error message if there's an error and no data */}
        {error && !minZigVersion && dependencies.length === 0 && (
          <div className="text-center py-3">
            <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-yellow-500 opacity-75" />
            {error.includes('Rate limit') ? (
              <>
                <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Rate Limit Exceeded</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">Failed to load dependencies</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </>
            )}
          </div>
        )}
        {minZigVersion && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Min Zig Version</span>
              <Badge variant="outline" className="font-mono">{minZigVersion}</Badge>
            </div>
            {dependencies.length > 0 && <Separator />}
          </>
        )}
        {dependencies.length > 0 ? (
          <ScrollArea className="h-[150px] pr-4">
            <div className="space-y-2">
              {dependencies.map((dep, index) => {
                const depInfo = getDependencyInfo(dep);
                return (
                  <div key={index} className="flex items-center justify-between text-sm p-1.5 rounded hover:bg-muted/50">
                    <span className="font-mono text-foreground">{depInfo.name}</span>
                    <div className="flex items-center gap-2">
                      {depInfo.type === 'github' && depInfo.repoUrl && (
                        <a 
                          href={depInfo.repoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          title={`View ${depInfo.name} on GitHub`}
                        >
                          <Github className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {depInfo.type === 'url' && depInfo.repoUrl && (
                        <a 
                          href={depInfo.repoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                          title={`Download from ${depInfo.displayUrl}`}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {depInfo.type === 'path' && (
                        <span 
                          className="flex items-center gap-1 text-muted-foreground"
                          title={`Local path: ${depInfo.displayUrl}`}
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {depInfo.type === 'hash' && (
                        <span 
                          className="flex items-center gap-1 text-muted-foreground"
                          title={depInfo.displayUrl}
                        >
                          <Hash className="w-3.5 h-3.5" />
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={dep.url || dep.hash}>
                        {depInfo.type === 'github' ? depInfo.displayUrl : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : !minZigVersion && !error ? (
          <div className="text-center py-3 text-muted-foreground text-sm">
            <Package className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>No dependencies</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Get asset icon based on file extension/type
function getAssetIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.exe') || lower.endsWith('.msi')) return '💻';
  if (lower.endsWith('.dmg') || lower.endsWith('.pkg')) return '🍎';
  if (lower.endsWith('.deb') || lower.endsWith('.rpm') || lower.endsWith('.AppImage')) return '🐧';
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tar.xz') || lower.endsWith('.tgz')) return '📦';
  if (lower.endsWith('.zip')) return '🗜️';
  if (lower.endsWith('.wasm')) return '🌐';
  if (lower.includes('linux')) return '🐧';
  if (lower.includes('windows') || lower.includes('win')) return '💻';
  if (lower.includes('macos') || lower.includes('darwin')) return '🍎';
  return '📄';
}

// Version Card with expandable assets
function VersionCard({ 
  version, 
  isLatest 
}: { 
  version: RepoVersion; 
  isLatest: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const hasAssets = version.assets && version.assets.length > 0;

  return (
    <div 
      className={`rounded-lg border transition-all ${
        isLatest 
          ? "bg-primary/5 border-primary/30" 
          : "border-border hover:border-border/80 hover:bg-muted/30"
      }`}
    >
      {/* Version Header */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div
        onClick={() => hasAssets && setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-3 text-sm select-none ${
          hasAssets ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-mono font-medium">{version.tag}</span>
          {isLatest && (
            <Badge variant="default" className="text-xs py-0">Latest</Badge>
          )}
          {version.isPrerelease && (
            <Badge variant="outline" className="text-xs py-0 text-yellow-600 dark:text-yellow-400">
              Pre
            </Badge>
          )}
          {hasAssets && (
            <Badge variant="secondary" className="text-xs py-0">
              {version.assets!.length} {version.assets!.length === 1 ? 'asset' : 'assets'}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {version.publishedAt && (
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {formatDate(version.publishedAt)}
            </span>
          )}
          <a 
            href={version.tarballUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            title={`Download source ${version.tag}`}
            onClick={(e) => e.stopPropagation()}
          >
            <Download className="w-4 h-4" />
          </a>
          {hasAssets && (
            <motion.div
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          )}
        </div>
      </div>

      {/* Expandable Assets Section */}
      {hasAssets && isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-border"
        >
          <div className="p-3 pt-2 space-y-2">
            <div className="text-xs text-muted-foreground mb-2">Release Assets</div>
            <div className="grid gap-2">
              {version.assets!.map((asset, idx) => (
                <a
                  key={idx}
                  href={asset.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <span className="text-lg" title={asset.contentType}>
                    {getAssetIcon(asset.name)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-xs truncate group-hover:text-primary transition-colors">
                      {asset.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(asset.size)}</span>
                      {asset.downloadCount > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatNumber(asset.downloadCount)} downloads</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + "k";
  }
  return num.toString();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function RepoDetailPageContent({ owner, name, entry }: RepoDetailPageProps) {
  const fullName = `${owner}/${name}`;

  // Initialize IndexedDB cache on mount
  React.useEffect(() => {
    initializeCache();
  }, []);

  // Fetch stats with IndexedDB caching
  const { data: statsResult, isLoading: statsLoading } = useQuery({
    queryKey: ["repoStats", fullName],
    queryFn: async () => {
      const result = await fetchRepoStatsWithCache(owner, name);
      return { stats: result.stats, status: result.status, fromCache: result.fromCache, isStale: result.isStale };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch README with IndexedDB caching
  const { data: readmeResult, isLoading: readmeLoading, refetch: refetchReadme } = useQuery({
    queryKey: ["repoReadme", fullName],
    queryFn: async () => {
      const result = await fetchRepoReadmeWithCache(owner, name);
      return { readme: result.readme, isStale: result.isStale, error: result.error };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch releases/tags with IndexedDB caching
  const { data: releasesResult, isLoading: releasesLoading } = useQuery({
    queryKey: ["repoReleases", fullName],
    queryFn: async () => {
      const result = await fetchRepoReleasesWithCache(owner, name);
      return { releases: result.releases, isStale: result.isStale, error: result.error };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch build.zig.zon with IndexedDB caching
  const { data: zonResult, isLoading: zonLoading } = useQuery({
    queryKey: ["repoZon", fullName],
    queryFn: async () => {
      const result = await fetchRepoZonWithCache(owner, name);
      return { zon: result.zon, isStale: result.isStale, error: result.error };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch issues/PR counts with IndexedDB caching
  const { data: issuesResult, isLoading: issuesLoading } = useQuery({
    queryKey: ["repoIssues", fullName],
    queryFn: async () => {
      const result = await fetchRepoIssuesWithCache(owner, name);
      return { issues: result.issues, isStale: result.isStale, error: result.error };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const stats = statsResult?.stats;
  const repoStatus = statsResult?.status || "unknown";
  const readme = readmeResult?.readme;
  const readmeError = readmeResult?.error;
  const releases = releasesResult?.releases;
  const releasesError = releasesResult?.error;
  const zon = zonResult?.zon;
  const zonError = zonResult?.error;
  const issuesInfo = issuesResult?.issues;
  const issuesError = issuesResult?.error;
  const latestVersion = releases?.latestVersion;
  const versions = releases?.versions || [];
  const isDeleted = repoStatus === "deleted";
  const hasZon = zon?.hasZon ?? false;
  const dependencies = zon?.dependencies || [];
  const minZigVersion = zon?.minZigVersion;

  // Add copy buttons to code blocks when README loads
  React.useEffect(() => {
    if (!readme?.readme_html) return;
    
    // Wait for DOM to update
    const timer = setTimeout(() => {
      const codeBlocks = document.querySelectorAll('.prose pre');
      
      codeBlocks.forEach((pre) => {
        // Skip if already has copy button
        if (pre.querySelector('.code-copy-btn')) return;
        
        // Create wrapper for positioning
        const wrapper = document.createElement('div');
        wrapper.className = 'relative group';
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(pre);
        
        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'code-copy-btn absolute top-2 right-2 p-2 rounded-md bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-sm border border-border/50';
        copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
        copyBtn.title = 'Copy code';
        
        copyBtn.addEventListener('click', async () => {
          const code = pre.querySelector('code')?.textContent || pre.textContent || '';
          try {
            await navigator.clipboard.writeText(code);
            copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"><polyline points="20 6 9 17 4 12"/></svg>`;
            copyBtn.title = 'Copied!';
            setTimeout(() => {
              copyBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
              copyBtn.title = 'Copy code';
            }, 2000);
          } catch (err) {
            console.error('Failed to copy:', err);
          }
        });
        
        wrapper.appendChild(copyBtn);
      });
    }, 100);
    
    return () => clearTimeout(timer);
  }, [readme?.readme_html]);

  // Build display data from entry and/or stats
  // Show entry data immediately, stats will load separately
  // License fallback: entry.license -> stats.license (from GitHub API)
  // Download URL fallback: entry.download_url -> release tarball -> codeload main branch
  const getDownloadUrl = () => {
    if (entry?.download_url) return entry.download_url;
    if (latestVersion && versions.length > 0) {
      const release = versions.find(v => v.tag === latestVersion);
      if (release?.tarballUrl) return release.tarballUrl;
    }
    // Fallback to codeload URL for main branch
    return `https://codeload.github.com/${owner}/${name}/tar.gz/refs/heads/main`;
  };

  const displayData = {
    name: entry?.name || name,
    owner: entry?.owner || owner,
    fullName,
    description: entry?.description || stats?.description || "No description available",
    homepage: entry?.homepage,
    license: entry?.license || stats?.license,
    category: entry?.category,
    type: entry?.type,
    htmlUrl: entry?.htmlUrl || `https://github.com/${owner}/${name}`,
    downloadUrl: getDownloadUrl(),
    hasReleases: versions.length > 0,
    // From stats (will be undefined while loading)
    topics: stats?.topics || [],
    stargazers_count: stats?.stargazers_count,
    forks_count: stats?.forks_count,
    watchers_count: stats?.watchers_count,
    language: stats?.language,
    pushed_at: stats?.pushed_at,
    updated_at: stats?.updated_at,
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 mesh-gradient relative overflow-hidden">
        {/* Header */}
        <div className="border-b hero-gradient relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 py-8 relative z-10">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <a href="/" className="hover:text-foreground transition-colors">Home</a>
              <span>/</span>
              <a href="/packages" className="hover:text-foreground transition-colors">Packages</a>
              <span>/</span>
              <span className="text-foreground">{fullName}</span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 overflow-hidden">
              {/* Title and Meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <div className="min-w-0">
                    <h1 className="text-2xl sm:text-3xl font-bold wrap-break-word">{displayData.name}</h1>
                    <p className="text-muted-foreground">
                      by{" "}
                      <a 
                        href={`/u?username=${encodeURIComponent(displayData.owner)}`}
                        className="font-medium hover:text-foreground hover:underline transition-colors"
                      >
                        {displayData.owner}
                      </a>
                    </p>
                  </div>
                </div>

                <p className="text-base sm:text-lg text-muted-foreground mb-4 wrap-break-word">
                  {displayData.description}
                </p>

                {/* Topics/Tags */}
                {displayData.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {displayData.topics.map((topic) => (
                      <Badge key={topic} variant="outline" className="text-xs">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Min Zig Version - display prominently if available */}
                {minZigVersion && (
                  <div className="mb-4">
                    <Badge variant="outline" className="font-mono gap-1.5">
                      <Code className="w-3 h-3" />
                      Requires Zig {minZigVersion}+
                    </Badge>
                  </div>
                )}

                {/* Installation Command - for packages or any repo with build.zig.zon */}
                {(displayData.type === "package" || hasZon) && (
                  <div className="mb-4">
                    <InstallationCommands 
                      owner={owner} 
                      repo={name} 
                      version={latestVersion} 
                      isPackage={true}
                      zonLoading={zonLoading}
                      hasReleases={versions.length > 0}
                    />
                  </div>
                )}

                {/* Badges */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Removed/Deleted Badge - Show first if deleted */}
                  {isDeleted && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Repository Removed
                    </Badge>
                  )}
                  {displayData.type === "package" && (
                    <Badge variant="default" className="gap-1">
                      <Package className="w-3 h-3" />
                      Package
                    </Badge>
                  )}
                  {displayData.type === "application" && (
                    <Badge variant="default" className="bg-green-600 gap-1">
                      <Cpu className="w-3 h-3" />
                      Application
                    </Badge>
                  )}
                  {displayData.category && (
                    <Badge variant="secondary" className="gap-1">
                      {displayData.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                    </Badge>
                  )}
                  {displayData.language && (
                    <Badge variant="secondary">{displayData.language}</Badge>
                  )}
                  {displayData.license && (
                    <Badge variant="outline" className="gap-1">
                      <Scale className="w-3 h-3" />
                      {displayData.license}
                    </Badge>
                  )}
                </div>

                {/* Application Downloads Dropdown */}
                {displayData.type === "application" && (
                  <div className="mb-4">
                    {versions.length > 0 ? (
                      (() => {
                        const latestRelease = versions[0];
                        const hasAssets = latestRelease.assets && latestRelease.assets.length > 0;
                        
                        // Helper to detect OS from asset name
                        const getOsIcon = (name: string) => {
                          const lowerName = name.toLowerCase();
                          if (lowerName.includes('windows') || lowerName.includes('win32') || lowerName.includes('win64') || lowerName.endsWith('.exe') || lowerName.endsWith('.msi')) {
                            return <Monitor className="w-4 h-4" />;
                          }
                          if (lowerName.includes('macos') || lowerName.includes('darwin') || lowerName.includes('apple') || lowerName.endsWith('.dmg')) {
                            return <Apple className="w-4 h-4" />;
                          }
                          if (lowerName.includes('linux') || lowerName.endsWith('.deb') || lowerName.endsWith('.rpm') || lowerName.endsWith('.appimage')) {
                            return <Terminal className="w-4 h-4" />;
                          }
                          return <FileDown className="w-4 h-4" />;
                        };

                        // Format file size
                        const formatSize = (bytes: number) => {
                          if (bytes === 0) return '';
                          const k = 1024;
                          const sizes = ['B', 'KB', 'MB', 'GB'];
                          const i = Math.floor(Math.log(bytes) / Math.log(k));
                          return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
                        };

                        return (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="default" className="gap-2 rounded-lg">
                                <Download className="w-4 h-4" />
                                Download {latestRelease.tag}
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-2rem)] max-h-80 overflow-y-auto rounded-lg">
                              <DropdownMenuLabel className="flex items-center gap-2">
                                <Tag className="w-4 h-4" />
                                {latestRelease.tag}
                                {latestRelease.isPrerelease && (
                                  <Badge variant="outline" className="text-xs ml-auto">Pre-release</Badge>
                                )}
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              
                              {hasAssets ? (
                                <>
                                  <DropdownMenuGroup>
                                    {latestRelease.assets.map((asset) => (
                                      <DropdownMenuItem key={asset.name} asChild>
                                        <a 
                                          href={asset.downloadUrl} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-3 cursor-pointer"
                                        >
                                          {getOsIcon(asset.name)}
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate text-sm">{asset.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {formatSize(asset.size)}
                                              {asset.downloadCount > 0 && ` • ${asset.downloadCount.toLocaleString()} downloads`}
                                            </p>
                                          </div>
                                        </a>
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuGroup>
                                  <DropdownMenuSeparator />
                                </>
                              ) : null}
                              
                              {/* Source code downloads */}
                              <DropdownMenuGroup>
                                <DropdownMenuLabel className="text-xs text-muted-foreground">Source Code</DropdownMenuLabel>
                                <DropdownMenuItem asChild>
                                  <a 
                                    href={latestRelease.zipballUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 cursor-pointer"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                    <span>Source Code (ZIP)</span>
                                  </a>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <a 
                                    href={latestRelease.tarballUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 cursor-pointer"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                    <span>Source Code (TAR.GZ)</span>
                                  </a>
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        );
                      })()
                    ) : (
                      // No releases - provide direct download from main branch
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="default" className="gap-2 rounded-lg">
                            <Download className="w-4 h-4" />
                            Download (main)
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-80 max-w-[calc(100vw-2rem)] rounded-lg">
                          <DropdownMenuLabel className="flex items-center gap-2">
                            <Tag className="w-4 h-4" />
                            main branch (latest)
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs text-muted-foreground">Source Code</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <a 
                                href={`https://codeload.github.com/${owner}/${name}/zip/refs/heads/main`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 cursor-pointer"
                              >
                                <FolderOpen className="w-4 h-4" />
                                <span>Source Code (ZIP)</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <a 
                                href={`https://codeload.github.com/${owner}/${name}/tar.gz/refs/heads/main`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 cursor-pointer"
                              >
                                <FolderOpen className="w-4 h-4" />
                                <span>Source Code (TAR.GZ)</span>
                              </a>
                            </DropdownMenuItem>
                          </DropdownMenuGroup>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem asChild>
                            <a 
                              href={`${displayData.htmlUrl}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center gap-3 cursor-pointer text-muted-foreground"
                            >
                              <Github className="w-4 h-4" />
                              <span>View on GitHub</span>
                            </a>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-wrap lg:flex-col gap-2">
                <Button asChild>
                  <a href={displayData.htmlUrl} target="_blank" rel="noopener noreferrer">
                    <Github className="w-4 h-4 mr-2" />
                    View on GitHub
                  </a>
                </Button>
                {displayData.homepage && (
                  <Button variant="outline" asChild>
                    <a href={displayData.homepage} target="_blank" rel="noopener noreferrer">
                      <Home className="w-4 h-4 mr-2" />
                      Homepage
                    </a>
                  </Button>
                )}
                {/* Download button for packages only (applications use dropdown) */}
                {displayData.downloadUrl && displayData.type !== "application" && (
                  <Button variant="secondary" asChild>
                    <a href={displayData.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      Download {latestVersion ? `(${latestVersion})` : "(main)"}
                    </a>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          {/* Warning for deleted repos */}
          {isDeleted && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 border border-destructive/50 bg-destructive/10 rounded-lg flex items-center gap-3"
            >
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              <div>
                <p className="font-medium text-destructive">This repository has been removed</p>
                <p className="text-sm text-muted-foreground">
                  This repository is no longer available on GitHub. It may have been deleted, renamed, or made private.
                </p>
              </div>
            </motion.div>
          )}

          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-20 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
          </div>
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content - README */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    README
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {readmeLoading ? (
                    <div className="space-y-3 sm:space-y-4">
                      <Skeleton className="h-5 sm:h-6 w-2/3 sm:w-3/4" />
                      <Skeleton className="h-3 sm:h-4 w-full" />
                      <Skeleton className="h-3 sm:h-4 w-full" />
                      <Skeleton className="h-3 sm:h-4 w-1/2 sm:w-2/3" />
                      <Skeleton className="h-24 sm:h-32 w-full" />
                      <Skeleton className="h-3 sm:h-4 w-full" />
                      <Skeleton className="h-3 sm:h-4 w-4/5 sm:w-5/6" />
                    </div>
                  ) : readme?.readme_html ? (
                    <div 
                      className="prose prose-neutral dark:prose-invert max-w-none overflow-x-hidden overflow-y-visible wrap-break-word"
                      dangerouslySetInnerHTML={{ __html: readme.readme_html }}
                    />
                  ) : readmeError ? (
                    <div className="text-center py-8">
                      <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-yellow-500 opacity-75" />
                      {readmeError.includes('Rate limit') ? (
                        <>
                          <p className="text-yellow-600 dark:text-yellow-400 font-medium mb-2">GitHub Rate Limit Exceeded</p>
                          <p className="text-sm text-muted-foreground">{readmeError}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-muted-foreground font-medium mb-2">Failed to load README</p>
                          <p className="text-sm text-muted-foreground">{readmeError}</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>This repository does not have a README file</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Stats Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Star className="w-4 h-4" />
                      Stars
                    </span>
                    {statsLoading ? (
                      <Skeleton className="h-4 sm:h-5 w-10 sm:w-12" />
                    ) : (
                      <span className="font-semibold">{formatNumber(displayData.stargazers_count ?? 0)}</span>
                    )}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <GitFork className="w-4 h-4" />
                      Forks
                    </span>
                    {statsLoading ? (
                      <Skeleton className="h-4 sm:h-5 w-10 sm:w-12" />
                    ) : (
                      <span className="font-semibold">{formatNumber(displayData.forks_count ?? 0)}</span>
                    )}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      Watchers
                    </span>
                    {statsLoading ? (
                      <Skeleton className="h-4 sm:h-5 w-10 sm:w-12" />
                    ) : (
                      <span className="font-semibold">{formatNumber(displayData.watchers_count ?? 0)}</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  {statsLoading ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                        <Skeleton className="h-5 sm:h-6 w-14 sm:w-16 rounded-full" />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 sm:h-4 w-14 sm:w-16" />
                        <Skeleton className="h-3 sm:h-4 w-20 sm:w-24" />
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-3 sm:h-4 w-16 sm:w-20" />
                        <Skeleton className="h-3 sm:h-4 w-24 sm:w-28" />
                      </div>
                    </>
                  ) : (
                    <>
                      {displayData.language && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Code className="w-4 h-4" />
                              Language
                            </span>
                            <Badge variant="secondary">{displayData.language}</Badge>
                          </div>
                          <Separator />
                        </>
                      )}
                      {displayData.license && (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-muted-foreground">
                              <Scale className="w-4 h-4" />
                              License
                            </span>
                            <span className="text-sm">{displayData.license}</span>
                          </div>
                          <Separator />
                        </>
                      )}
                      {displayData.pushed_at && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            Last Push
                          </span>
                          <span className="text-sm">{formatDate(displayData.pushed_at)}</span>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Links Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={displayData.htmlUrl} target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4 mr-2" />
                      Repository
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  </Button>
                  {displayData.homepage && (
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a href={displayData.homepage} target="_blank" rel="noopener noreferrer">
                        <Home className="w-4 h-4 mr-2" />
                        Homepage
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    </Button>
                  )}
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`${displayData.htmlUrl}/issues`} target="_blank" rel="noopener noreferrer">
                      <CircleDot className="w-4 h-4 mr-2" />
                      Issues
                      {issuesLoading ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          <Skeleton className="h-3 w-8" />
                        </span>
                      ) : issuesInfo ? (
                        <span className="ml-auto flex items-center gap-1.5 text-xs">
                          <span className="text-green-600 dark:text-green-400">{issuesInfo.openIssues} open</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{issuesInfo.closedIssues} closed</span>
                        </span>
                      ) : issuesError?.includes('Rate limit') ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="w-3 h-3" />
                          Rate limited
                        </span>
                      ) : (
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      )}
                    </a>
                  </Button>
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`${displayData.htmlUrl}/pulls`} target="_blank" rel="noopener noreferrer">
                      <GitPullRequest className="w-4 h-4 mr-2" />
                      Pull Requests
                      {issuesLoading ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                          <Skeleton className="h-3 w-8" />
                        </span>
                      ) : issuesInfo ? (
                        <span className="ml-auto flex items-center gap-1.5 text-xs">
                          <span className="text-green-600 dark:text-green-400">{issuesInfo.openPullRequests} open</span>
                          <span className="text-muted-foreground">·</span>
                          <span className="text-muted-foreground">{issuesInfo.closedPullRequests} closed</span>
                        </span>
                      ) : issuesError?.includes('Rate limit') ? (
                        <span className="ml-auto flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400">
                          <AlertTriangle className="w-3 h-3" />
                          Rate limited
                        </span>
                      ) : (
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      )}
                    </a>
                  </Button>
                  {/* Author link */}
                  <Button variant="outline" className="w-full justify-start" asChild>
                    <a href={`/u?username=${encodeURIComponent(displayData.owner)}`}>
                      <User className="w-4 h-4 mr-2" />
                      {displayData.owner}
                      <span className="ml-auto text-xs text-muted-foreground">View profile</span>
                    </a>
                  </Button>
                </CardContent>
              </Card>

              {/* Versions Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Versions
                    {versions.length > 0 && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        {versions.length}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {releasesLoading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-8 w-full" />
                    </div>
                  ) : releasesError && versions.length === 0 ? (
                    <div className="text-center py-4">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-yellow-500 opacity-75" />
                      {releasesError.includes('Rate limit') ? (
                        <>
                          <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">Rate Limit Exceeded</p>
                          <p className="text-xs text-muted-foreground mt-1">{releasesError}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">Failed to load releases</p>
                          <p className="text-xs text-muted-foreground mt-1">{releasesError}</p>
                        </>
                      )}
                    </div>
                  ) : versions.length > 0 ? (
                    <ScrollArea className="h-[350px] pr-4">
                      <div className="space-y-3">
                        {versions.map((version) => (
                          <VersionCard 
                            key={version.tag} 
                            version={version} 
                            isLatest={version.tag === latestVersion}
                          />
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>No releases available</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Dependencies Card - always show (will display error if needed) */}
              <DependenciesCard 
                dependencies={dependencies} 
                minZigVersion={minZigVersion}
                isLoading={zonLoading} 
                error={zonError}
              />
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Wrapper with QueryProvider
export function RepoDetailPage(props: RepoDetailPageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RepoDetailPageContent {...props} />
    </QueryClientProvider>
  );
}

export default RepoDetailPage;
