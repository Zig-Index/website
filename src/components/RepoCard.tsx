"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { 
  Star, 
  GitFork, 
  Eye, 
  ExternalLink, 
  Github, 
  Package, 
  Cpu, 
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { Skeleton } from "./ui/skeleton";
import { cn } from "@/lib/utils";
import type { CombinedRepoData } from "@/lib/schemas";

// ============================================
// Utility Functions
// ============================================

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
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

function getCategoryIcon(type: "package" | "application") {
  if (type === "package") return Package;
  return Cpu;
}

function getCategoryLabel(type: "package" | "application") {
  if (type === "package") return "Package";
  return "Application";
}

// ============================================
// Registry Card Component
// ============================================

interface RegistryCardProps {
  entry: CombinedRepoData;
  compact?: boolean;
}

export function RegistryCard({ entry, compact = false }: RegistryCardProps) {
  const CategoryIcon = getCategoryIcon(entry.type);
  const categoryLabel = getCategoryLabel(entry.type);

  // Get stats if available
  const stars = entry.stats?.stargazers_count ?? 0;
  const forks = entry.stats?.forks_count ?? 0;
  const watchers = entry.stats?.watchers_count ?? 0;
  const language = entry.stats?.language;
  const lastUpdated = entry.stats?.pushed_at;
  const isDeleted = entry.status === "deleted";

  const cardUrl = `/repo?owner=${encodeURIComponent(entry.owner)}&name=${encodeURIComponent(entry.repo)}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      className="h-full relative group"
    >
      <a 
        href={cardUrl}
        className="block h-full"
        title={`View ${entry.name} details`}
      >
        <Card className={cn(
          "h-full flex flex-col hover:shadow-xl transition-all duration-300 min-h-60 sm:min-h-[280px] border-border/50 hover:border-primary/30 bg-card cursor-pointer",
          isDeleted && "opacity-70 border-destructive/30"
        )}>
          <CardHeader className={cn("pb-2", compact && "pb-1")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 sm:gap-2 mb-1 flex-wrap">
                  {/* Removed/Deleted Badge - Show first if deleted */}
                  {isDeleted && (
                    <Badge variant="destructive" className="shrink-0 gap-1 text-xs">
                      <AlertTriangle className="w-3 h-3" />
                      <span className="hidden xs:inline">Removed</span>
                    </Badge>
                  )}
                  <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                    <CategoryIcon className="w-3 h-3" />
                    <span className="hidden xs:inline">{categoryLabel}</span>
                  </Badge>
                  {language && (
                    <Badge variant="secondary" className="shrink-0 text-xs">
                      {language}
                    </Badge>
                  )}
                </div>
                <CardTitle className={cn("truncate", compact ? "text-sm sm:text-base" : "text-base sm:text-lg")}>
                  {entry.name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  by{" "}
                  <a
                    href={`/u?username=${encodeURIComponent(entry.owner)}`}
                    onClick={(e) => e.stopPropagation()}
                    className="font-medium hover:text-primary hover:underline transition-colors"
                  >
                    {entry.owner}
                  </a>
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className={cn("flex-1", compact && "pb-2")}>
            <CardDescription className={cn(
              "line-clamp-2",
              compact ? "text-xs" : "text-xs sm:text-sm"
            )}>
              {entry.description || "No description available"}
            </CardDescription>

            {/* Category Badge */}
            {entry.category && !compact && (
              <div className="flex flex-wrap gap-1 mt-2 sm:mt-3">
                <Badge variant="outline" className="text-xs">
                  {entry.category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </Badge>
              </div>
            )}

          {/* Stats */}
          <div className={cn(
            "flex items-center gap-3 sm:gap-4 text-muted-foreground",
            compact ? "mt-2 text-xs" : "mt-3 sm:mt-4 text-xs sm:text-sm"
          )}>
            {entry.stats ? (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatNumber(stars)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Stars</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        <GitFork className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatNumber(forks)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Forks</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        <Eye className="w-3 h-3 sm:w-4 sm:h-4" />
                        {formatNumber(watchers)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Watchers</TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {!compact && lastUpdated && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="flex items-center gap-1 ml-auto text-xs">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="hidden sm:inline">{formatDate(lastUpdated)}</span>
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>Last updated: {formatDate(lastUpdated)}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3" />
                  —
                </span>
                <span className="flex items-center gap-1">
                  <GitFork className="w-3 h-3" />
                  —
                </span>
              </div>
            )}
          </div>
        </CardContent>

        <CardFooter className={cn(
          "pt-0 gap-2",
          compact && "pb-3"
        )}>
          {/* GitHub Button - stop propagation to prevent card click */}
          <Button 
            variant="outline" 
            size="sm" 
            asChild 
            className="flex-1 border-foreground/20 text-foreground hover:bg-foreground/10"
            onClick={(e) => e.stopPropagation()}
          >
            <a 
              href={entry.htmlUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              title={`View ${entry.name} on GitHub`}
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
          </Button>
          {entry.homepage && (
            <Button 
              variant="outline" 
              size="sm" 
              asChild
              className="border-foreground/20 text-foreground hover:bg-foreground/10"
              onClick={(e) => e.stopPropagation()}
            >
              <a 
                href={entry.homepage} 
                target="_blank" 
                rel="noopener noreferrer"
                title={`Visit ${entry.name} website`}
                aria-label={`Visit ${entry.name} website`}
              >
                <ExternalLink className="w-4 h-4" />
                <span>Website</span>
              </a>
            </Button>
          )}
        </CardFooter>
      </Card>
      </a>
    </motion.div>
  );
}

// ============================================
// Skeleton Loading Component
// ============================================

export function RegistryCardSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <Card className="h-full flex flex-col min-h-60 sm:min-h-[280px] animate-in fade-in-0 duration-300">
      <CardHeader className={cn("pb-2", compact && "pb-1")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-2">
            <div className="flex gap-1.5 sm:gap-2">
              <Skeleton className="h-5 w-14 sm:w-16 rounded-full" />
              <Skeleton className="h-5 w-10 sm:w-12 rounded-full" />
            </div>
            <Skeleton className={cn("h-5 sm:h-6 rounded", compact ? "w-28 sm:w-32" : "w-36 sm:w-48")} />
            <Skeleton className="h-3 w-16 sm:w-20 rounded" />
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("flex-1", compact && "pb-2")}>
        <div className="space-y-2">
          <Skeleton className="h-3 sm:h-4 w-full rounded" />
          <Skeleton className="h-3 sm:h-4 w-2/3 rounded" />
        </div>
        <div className={cn("flex gap-3 sm:gap-4", compact ? "mt-2" : "mt-3 sm:mt-4")}>
          <Skeleton className="h-3 sm:h-4 w-10 sm:w-12 rounded" />
          <Skeleton className="h-3 sm:h-4 w-10 sm:w-12 rounded" />
          <Skeleton className="h-3 sm:h-4 w-10 sm:w-12 rounded" />
        </div>
      </CardContent>
      <CardFooter className={cn("pt-0 gap-2", compact && "pb-3")}>
        <Skeleton className="h-8 sm:h-9 flex-1 rounded-md" />
        <Skeleton className="h-8 sm:h-9 w-8 sm:w-20 rounded-md" />
      </CardFooter>
    </Card>
  );
}

export default RegistryCard;
