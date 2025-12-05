"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { 
  Users, 
  GitFork,
  Star,
  ExternalLink, 
  Github, 
  Calendar,
  MapPin,
  Building,
  Link as LinkIcon,
  Mail,
  Twitter,
  FileText,
  Package,
  Cpu,
  BookOpen,
  Eye,
  Home,
  User
} from "lucide-react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Separator } from "./ui/separator";
import { Skeleton } from "./ui/skeleton";
import { ScrollArea } from "./ui/scroll-area";
import { EmptyState } from "./SyncStatus";
import { 
  fetchUserProfileWithCache, 
  initializeCache 
} from "@/lib/cachedFetcher";
import type { UserProfile, RegistryEntryWithCategory } from "@/lib/schemas";
import { cn } from "@/lib/utils";

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

interface UserProfilePageProps {
  username: string;
  registryEntries?: RegistryEntryWithCategory[];
}

// Utility functions
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

// Mini repo card for user's packages/applications
function MiniRepoCard({ entry }: { entry: RegistryEntryWithCategory }) {
  const CategoryIcon = entry.type === "package" ? Package : Cpu;
  const cardUrl = `/repo?owner=${encodeURIComponent(entry.owner)}&name=${encodeURIComponent(entry.repo)}`;

  return (
    <motion.a
      href={cardUrl}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="block"
    >
      <Card className="hover:shadow-md transition-all duration-200 hover:border-primary/30">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <CategoryIcon className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-sm truncate">{entry.name}</span>
                <Badge variant="outline" className="text-xs shrink-0">
                  {entry.type === "package" ? "Package" : "App"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {entry.description || "No description"}
              </p>
              {entry.category && (
                <Badge variant="secondary" className="text-xs mt-2">
                  {entry.category.replace(/-/g, ' ')}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.a>
  );
}

// Stats counter component
function StatItem({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="flex flex-col items-center sm:items-start gap-1">
      <div className="flex items-center gap-2 text-muted-foreground text-sm">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
      </div>
      <span className="text-xl sm:text-2xl font-bold">{typeof value === "number" ? formatNumber(value) : value}</span>
    </div>
  );
}

function UserProfilePageContent({ username, registryEntries = [] }: UserProfilePageProps) {
  // Initialize IndexedDB cache on mount
  React.useEffect(() => {
    initializeCache();
  }, []);

  // Fetch user profile with IndexedDB caching
  const { data: userResult, isLoading: userLoading, error: userError } = useQuery({
    queryKey: ["userProfile", username],
    queryFn: async () => {
      const result = await fetchUserProfileWithCache(username);
      return { user: result.user, fromCache: result.fromCache, isStale: result.isStale, error: result.error };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const user = userResult?.user;

  // Filter registry entries by this user
  const userPackages = React.useMemo(() => {
    return registryEntries.filter(
      e => e.owner.toLowerCase() === username.toLowerCase() && e.type === "package"
    );
  }, [registryEntries, username]);

  const userApplications = React.useMemo(() => {
    return registryEntries.filter(
      e => e.owner.toLowerCase() === username.toLowerCase() && e.type === "application"
    );
  }, [registryEntries, username]);

  // Update document title and meta tags when user profile loads
  React.useEffect(() => {
    if (user) {
      const displayName = user.name || username;
      const totalContributions = userPackages.length + userApplications.length;
      
      // Update page title
      document.title = `${displayName} (@${username}) - Zig Developer Profile | Zig Index`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        const desc = user.bio 
          ? `${displayName} - ${user.bio}. Contributor of ${totalContributions} Zig packages and applications.`
          : `${displayName} is a Zig developer with ${totalContributions} contributions to the Zig ecosystem. View their packages, applications, and GitHub activity.`;
        metaDescription.setAttribute('content', desc);
      }
      
      // Update Open Graph tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', `${displayName} (@${username}) - Zig Developer | Zig Index`);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        const desc = user.bio || `View ${displayName}'s Zig packages, applications, and contributions to the Zig ecosystem.`;
        ogDescription.setAttribute('content', desc);
      }
      
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute('content', `https://zig-index.github.io/u?username=${encodeURIComponent(username)}`);
      }
      
      const ogImage = document.querySelector('meta[property="og:image"]');
      if (ogImage && user.avatarUrl) {
        ogImage.setAttribute('content', user.avatarUrl);
      }
      
      // Update Twitter tags
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', `${displayName} (@${username}) - Zig Developer | Zig Index`);
      }
      
      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription) {
        const desc = user.bio || `View ${displayName}'s Zig packages and contributions.`;
        twitterDescription.setAttribute('content', desc);
      }
      
      // Update canonical URL
      const canonical = document.querySelector('link[rel="canonical"]');
      if (canonical) {
        canonical.setAttribute('href', `https://zig-index.github.io/u?username=${encodeURIComponent(username)}`);
      }
    } else {
      // Set title for loading/not found states
      document.title = `@${username} - Developer Profile | Zig Index`;
    }
  }, [user, username, userPackages.length, userApplications.length]);

  // Loading state
  if (userLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 mesh-gradient">
          <UserHeaderSkeleton />
          <UserContentSkeleton />
        </main>
        <Footer />
      </div>
    );
  }

  // Error state
  if (userError || (!user && userResult?.error)) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-16">
          <EmptyState
            icon={<User className="w-12 h-12" />}
            title="User Not Found"
            description={userResult?.error || `Could not find GitHub user "${username}"`}
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 mesh-gradient relative overflow-hidden">
        {/* Hero Header with SaaS-style gradient */}
        <section className="relative overflow-hidden">
          {/* Animated gradient background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-purple-500/10 to-blue-500/15" />
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/15 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/3 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            {/* Grid pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-size-[60px_60px]" />
          </div>

          <div className="container mx-auto px-4 py-8 sm:py-12 lg:py-16 relative z-10">
            {/* Breadcrumb */}
            <motion.nav
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-sm text-muted-foreground mb-6"
            >
              <a href="/" className="hover:text-foreground transition-colors flex items-center gap-1">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Home</span>
              </a>
              <span>/</span>
              <span className="text-foreground font-medium">@{username}</span>
            </motion.nav>

            {/* User Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10"
            >
              {/* Avatar */}
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="relative"
                >
                  <img
                    src={user?.avatarUrl || `https://github.com/${username}.png`}
                    alt={user?.name || username}
                    className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full border-4 border-background shadow-2xl"
                  />
                  {/* Decorative ring */}
                  <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-pulse" />
                </motion.div>
              </div>

              {/* User Details */}
              <div className="flex-1 text-center lg:text-left">
                <div className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4 mb-2">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
                    {user?.name || username}
                  </h1>
                  {user?.hireable && (
                    <Badge className="w-fit mx-auto lg:mx-0">Available for hire</Badge>
                  )}
                </div>
                
                <p className="text-lg text-muted-foreground mb-4">
                  @{username}
                </p>

                {user?.bio && (
                  <p className="text-muted-foreground mb-6 max-w-2xl">
                    {user.bio}
                  </p>
                )}

                {/* Quick Stats */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-6 sm:gap-8">
                  <StatItem icon={Users} label="Followers" value={user?.followers ?? 0} />
                  <StatItem icon={Users} label="Following" value={user?.following ?? 0} />
                  <StatItem icon={BookOpen} label="Repositories" value={user?.publicRepos ?? 0} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 shrink-0">
                <Button asChild>
                  <a
                    href={user?.htmlUrl || `https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <Github className="w-4 h-4" />
                    View on GitHub
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </Button>
                {user?.blog && (
                  <Button variant="outline" asChild>
                    <a
                      href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Website
                    </a>
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Main Content */}
        <section className="container mx-auto px-4 py-8 relative z-10">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* User README (if available) */}
              {user?.readmeHtml && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        README.md
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="prose dark:prose-invert prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: user.readmeHtml }}
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* User's Zig Packages */}
              {userPackages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Zig Packages
                        <Badge variant="secondary" className="ml-auto">
                          {userPackages.length}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Packages maintained by {user?.name || username}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {userPackages.map((pkg) => (
                          <MiniRepoCard key={pkg.fullName} entry={pkg} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* User's Zig Applications */}
              {userApplications.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="w-5 h-5" />
                        Zig Applications
                        <Badge variant="secondary" className="ml-auto">
                          {userApplications.length}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Applications maintained by {user?.name || username}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {userApplications.map((app) => (
                          <MiniRepoCard key={app.fullName} entry={app} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* No Zig projects message */}
              {userPackages.length === 0 && userApplications.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card>
                    <CardContent className="py-12">
                      <div className="text-center text-muted-foreground">
                        <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p className="text-lg font-medium mb-2">No Zig Projects Found</p>
                        <p className="text-sm">
                          {user?.name || username} doesn't have any Zig packages or applications in the registry yet.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-6">
              {/* User Info Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <User className="w-4 h-4" />
                      About
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {user?.company && (
                      <div className="flex items-center gap-3 text-sm">
                        <Building className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{user.company}</span>
                      </div>
                    )}
                    {user?.location && (
                      <div className="flex items-center gap-3 text-sm">
                        <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span className="truncate">{user.location}</span>
                      </div>
                    )}
                    {user?.email && (
                      <div className="flex items-center gap-3 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a href={`mailto:${user.email}`} className="truncate hover:text-primary transition-colors">
                          {user.email}
                        </a>
                      </div>
                    )}
                    {user?.blog && (
                      <div className="flex items-center gap-3 text-sm">
                        <LinkIcon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a 
                          href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-primary transition-colors"
                        >
                          {user.blog.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                    {user?.twitterUsername && (
                      <div className="flex items-center gap-3 text-sm">
                        <Twitter className="w-4 h-4 text-muted-foreground shrink-0" />
                        <a 
                          href={`https://twitter.com/${user.twitterUsername}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate hover:text-primary transition-colors"
                        >
                          @{user.twitterUsername}
                        </a>
                      </div>
                    )}
                    <Separator />
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4 shrink-0" />
                      <span>Joined {formatDate(user?.createdAt)}</span>
                    </div>
                    {user && user.publicGists > 0 && (
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>{formatNumber(user.publicGists)} public gists</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              {/* Quick Links */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LinkIcon className="w-4 h-4" />
                      Links
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a
                        href={`https://github.com/${username}?tab=repositories`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        All Repositories
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a
                        href={`https://github.com/${username}?tab=stars`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Star className="w-4 h-4 mr-2" />
                        Starred Repos
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a
                        href={`https://github.com/${username}?tab=followers`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Followers
                        <ExternalLink className="w-3 h-3 ml-auto" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

// Skeleton components
function UserHeaderSkeleton() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-linear-to-br from-primary/20 via-purple-500/10 to-blue-500/15" />
      </div>
      <div className="container mx-auto px-4 py-12 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          <Skeleton className="w-36 h-36 rounded-full" />
          <div className="flex-1 text-center lg:text-left">
            <Skeleton className="h-10 w-48 mx-auto lg:mx-0 mb-2" />
            <Skeleton className="h-6 w-32 mx-auto lg:mx-0 mb-4" />
            <Skeleton className="h-5 w-full max-w-md mx-auto lg:mx-0 mb-6" />
            <div className="flex flex-wrap justify-center lg:justify-start gap-8">
              <Skeleton className="h-14 w-24" />
              <Skeleton className="h-14 w-24" />
              <Skeleton className="h-14 w-24" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function UserContentSkeleton() {
  return (
    <section className="container mx-auto px-4 py-8">
      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[150px] w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-20" />
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
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

// Wrapped with QueryClientProvider
export function UserProfilePage({ username, registryEntries = [] }: UserProfilePageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfilePageContent username={username} registryEntries={registryEntries} />
    </QueryClientProvider>
  );
}

export default UserProfilePage;
