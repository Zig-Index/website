"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle, Loader2, WifiOff, RefreshCw, Clock } from "lucide-react";
import { Progress } from "./ui/progress";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import type { RateLimitInfo } from "@/lib/githubFetcher";

interface SyncStatusProps {
  issyncing: boolean;
  progress: {
    topic: string;
    page: number;
    totalPages: number;
    reposFetched: number;
    stage: "fetching" | "processing" | "complete" | "error";
  } | null;
  error: string | null;
  lastResult: {
    success: boolean;
    totalRepos: number;
    rateLimit: RateLimitInfo | null;
  } | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  className?: string;
}

export function SyncStatus({
  issyncing,
  progress,
  error,
  lastResult,
  onDismiss,
  onRetry,
  className,
}: SyncStatusProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    if (issyncing || error || (lastResult && !lastResult.success)) {
      setIsVisible(true);
    } else if (lastResult?.success) {
      // Show success briefly then hide
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [issyncing, error, lastResult]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  const progressPercent = progress
    ? (progress.page / Math.max(progress.totalPages, 1)) * 100
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className={cn(
          "fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4",
          className
        )}
      >
        <div className={cn(
          "rounded-lg border shadow-lg p-4",
          error ? "bg-destructive/10 border-destructive/50" : 
          lastResult?.success ? "bg-green-500/10 border-green-500/50" :
          "bg-background"
        )}>
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="shrink-0 mt-0.5">
              {issyncing && (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              )}
              {error && (
                <AlertCircle className="w-5 h-5 text-destructive" />
              )}
              {lastResult?.success && !issyncing && (
                <CheckCircle className="w-5 h-5 text-green-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Title */}
              <p className="font-medium">
                {issyncing && "Syncing repositories..."}
                {error && "Sync failed"}
                {lastResult?.success && !issyncing && "Sync complete"}
              </p>

              {/* Description */}
              <p className="text-sm text-muted-foreground mt-1">
                {issyncing && progress && (
                  <>
                    Fetching {progress.topic} (page {progress.page}/{progress.totalPages})
                    <br />
                    {progress.reposFetched} repositories found
                  </>
                )}
                {error && error}
                {lastResult?.success && !issyncing && (
                  <>
                    {lastResult.totalRepos.toLocaleString()} repositories indexed
                    {lastResult.rateLimit && (
                      <span className="ml-2 text-xs">
                        (API: {lastResult.rateLimit.remaining}/{lastResult.rateLimit.limit})
                      </span>
                    )}
                  </>
                )}
              </p>

              {/* Progress Bar */}
              {issyncing && progress && (
                <Progress value={progressPercent} className="mt-2 h-1" />
              )}

              {/* Rate Limit Warning */}
              {lastResult?.rateLimit && lastResult.rateLimit.remaining < 10 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Rate limit low. Resets at {new Date(lastResult.rateLimit.reset).toLocaleTimeString()}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-1">
              {error && onRetry && (
                <Button variant="ghost" size="icon-sm" onClick={onRetry}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              <Button variant="ghost" size="icon-sm" onClick={handleDismiss}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Offline indicator
export function OfflineIndicator() {
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    setIsOffline(!navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-full text-sm font-medium shadow-lg">
        <WifiOff className="w-4 h-4" />
        You're offline - viewing cached data
      </div>
    </motion.div>
  );
}

// Empty state component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      {description && (
        <p className="text-muted-foreground max-w-md">{description}</p>
      )}
      {action && (
        <Button onClick={action.onClick} className="mt-4">
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

export default SyncStatus;
