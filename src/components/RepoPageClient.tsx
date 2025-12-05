"use client";

import * as React from "react";
import { RepoDetailPage as RepoDetailContent } from "./RepoDetailPage";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { EmptyState } from "./SyncStatus";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Separator } from "./ui/separator";
import { FileText } from "lucide-react";
import type { RegistryEntryWithCategory } from "@/lib/schemas";

// Skeleton for initial page load (before URL params are parsed)
function RepoPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mesh-gradient relative overflow-hidden">
        {/* Header skeleton */}
        <div className="border-b hero-gradient relative overflow-hidden">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/10 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto px-4 py-8 relative z-10">
            {/* Breadcrumb skeleton */}
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-4 w-12" />
              <span className="text-muted-foreground">/</span>
              <Skeleton className="h-4 w-16" />
              <span className="text-muted-foreground">/</span>
              <Skeleton className="h-4 w-24" />
            </div>
            
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
              <div className="flex-1">
                <Skeleton className="h-9 w-48 mb-2" />
                <Skeleton className="h-5 w-24 mb-4" />
                <Skeleton className="h-6 w-full max-w-xl mb-4" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
              <div className="flex flex-wrap lg:flex-col gap-2">
                <Skeleton className="h-10 w-36" />
                <Skeleton className="h-10 w-28" />
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* README skeleton */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5" />
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-8 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            </div>
            
            {/* Sidebar skeleton */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-14" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-18" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-20" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-16" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
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

// Client-side component that extracts owner/name from URL hash
interface RepoPageClientProps {
  registryEntries?: RegistryEntryWithCategory[];
}

export function RepoPageClient({ registryEntries = [] }: RepoPageClientProps) {
  const [owner, setOwner] = React.useState<string | null>(null);
  const [name, setName] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get the path from either query params or hash
    const params = new URLSearchParams(window.location.search);
    const ownerParam = params.get("owner");
    const nameParam = params.get("name");

    if (ownerParam && nameParam) {
      setOwner(ownerParam);
      setName(nameParam);
    } else {
      // Try to parse from hash: #owner/name
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        const parts = hash.split("/");
        if (parts.length >= 2) {
          setOwner(parts[0]);
          setName(parts.slice(1).join("/")); // Handle names with slashes
        } else {
          setError("Invalid URL format. Expected: /repo?owner=xxx&name=yyy or /repo#owner/name");
        }
      } else {
        setError("No repository specified. Use /repo?owner=xxx&name=yyy or /repo#owner/name");
      }
    }
  }, []);

  // Look up the entry from registry
  const entry = React.useMemo(() => {
    if (!owner || !name) return undefined;
    return registryEntries.find(
      e => e.owner.toLowerCase() === owner.toLowerCase() && 
           e.repo.toLowerCase() === name.toLowerCase()
    );
  }, [registryEntries, owner, name]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <EmptyState
            icon={<FileText className="w-12 h-12" />}
            title="Invalid URL"
            description={error}
            action={{
              label: "Go to Registry",
              onClick: () => window.location.href = "/registry",
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!owner || !name) {
    return <RepoPageSkeleton />;
  }

  return <RepoDetailContent owner={owner} name={name} entry={entry} />;
}

export default RepoPageClient;
