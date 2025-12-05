"use client";

import * as React from "react";
import { UserProfilePage } from "./UserProfilePage";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { EmptyState } from "./SyncStatus";
import { Skeleton } from "./ui/skeleton";
import { Card, CardContent, CardHeader } from "./ui/card";
import { User } from "lucide-react";
import type { RegistryEntryWithCategory } from "@/lib/schemas";

// Skeleton for initial page load
function UserPageSkeleton() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mesh-gradient relative overflow-hidden">
        {/* Header skeleton with gradient */}
        <div className="relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-purple-500/10 to-blue-500/20" />
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-purple-500/10 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 py-12 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Avatar skeleton */}
              <Skeleton className="w-32 h-32 rounded-full" />
              
              {/* User info skeleton */}
              <div className="flex-1 text-center lg:text-left">
                <Skeleton className="h-10 w-48 mx-auto lg:mx-0 mb-2" />
                <Skeleton className="h-6 w-32 mx-auto lg:mx-0 mb-4" />
                <Skeleton className="h-5 w-full max-w-md mx-auto lg:mx-0 mb-6" />
                
                {/* Stats skeleton */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 w-24" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content skeleton */}
        <div className="container mx-auto px-4 py-8 relative z-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* README card skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>

              {/* Contributions skeleton */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-[150px] w-full" />
                </CardContent>
              </Card>
            </div>

            {/* Sidebar skeleton */}
            <div className="space-y-6">
              {/* Info card */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-24" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-4 w-4" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </CardContent>
              </Card>

              {/* Zig packages */}
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
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

// Props interface
interface UserPageClientProps {
  registryEntries?: RegistryEntryWithCategory[];
}

// Client-side component that extracts username from URL
export function UserPageClient({ registryEntries = [] }: UserPageClientProps) {
  const [username, setUsername] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    // Get the username from query params or hash
    const params = new URLSearchParams(window.location.search);
    const usernameParam = params.get("username");

    if (usernameParam) {
      setUsername(usernameParam);
    } else {
      // Try to parse from hash: #username
      const hash = window.location.hash.slice(1); // Remove #
      if (hash) {
        setUsername(hash);
      } else {
        setError("No username specified. Use /u?username=xxx or /u#username");
      }
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <EmptyState
            icon={<User className="w-12 h-12" />}
            title="Invalid URL"
            description={error}
            action={{
              label: "Go to Home",
              onClick: () => window.location.href = "/",
            }}
          />
        </main>
        <Footer />
      </div>
    );
  }

  if (!username) {
    return <UserPageSkeleton />;
  }

  return <UserProfilePage username={username} registryEntries={registryEntries} />;
}

export default UserPageClient;
