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
  Loader2,
  FileText,
  Home,
  Package,
  Cpu,
  AlertTriangle
} from "lucide-react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { EmptyState } from "./SyncStatus";
import { fetchRepoStats, fetchRepoReadme } from "@/lib/githubFetcher";
import type { RegistryEntryWithCategory } from "@/lib/schemas";

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

  // Fetch stats
  const { data: statsResult, isLoading: statsLoading } = useQuery({
    queryKey: ["repoStats", fullName],
    queryFn: async () => {
      const result = await fetchRepoStats(owner, name);
      return { stats: result.stats, status: result.status };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch README
  const { data: readmeResult, isLoading: readmeLoading, refetch: refetchReadme } = useQuery({
    queryKey: ["repoReadme", fullName],
    queryFn: async () => {
      const result = await fetchRepoReadme(owner, name);
      return result.readme;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const stats = statsResult?.stats;
  const repoStatus = statsResult?.status || "unknown";
  const readme = readmeResult;
  const isDeleted = repoStatus === "deleted";

  if (statsLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <RepoDetailSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  // Build display data from entry and/or stats
  const displayData = {
    name: entry?.name || name,
    owner: entry?.owner || owner,
    fullName,
    description: entry?.description || "No description available",
    homepage: entry?.homepage,
    license: entry?.license,
    category: entry?.category,
    type: entry?.type,
    htmlUrl: entry?.htmlUrl || `https://github.com/${owner}/${name}`,
    // From stats
    stargazers_count: stats?.stargazers_count || 0,
    forks_count: stats?.forks_count || 0,
    watchers_count: stats?.watchers_count || 0,
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

            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              {/* Title and Meta */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">{displayData.name}</h1>
                    <p className="text-muted-foreground">by {displayData.owner}</p>
                  </div>
                </div>

                <p className="text-lg text-muted-foreground mb-4">
                  {displayData.description}
                </p>

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
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-32 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  ) : readme?.readme_html ? (
                    <div 
                      className="prose prose-neutral dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: readme.readme_html }}
                    />
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>README not available</p>
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
                    <span className="font-semibold">{formatNumber(displayData.stargazers_count)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <GitFork className="w-4 h-4" />
                      Forks
                    </span>
                    <span className="font-semibold">{formatNumber(displayData.forks_count)}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Eye className="w-4 h-4" />
                      Watchers
                    </span>
                    <span className="font-semibold">{formatNumber(displayData.watchers_count)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Details Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <FileText className="w-4 h-4 mr-2" />
                      Issues
                      <ExternalLink className="w-3 h-3 ml-auto" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
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

function RepoDetailSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="h-4 w-64 mb-4" />
        <div className="flex items-center gap-3 mb-4">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div>
            <Skeleton className="h-8 w-48 mb-1" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-5 w-full max-w-2xl mb-4" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default RepoDetailPage;
