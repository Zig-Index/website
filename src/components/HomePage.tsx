"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { Hero, Features, QuickCategories } from "./Hero";
import { RegistryCard, RegistryCardSkeleton } from "./RepoCard";
import { EmptyState } from "./SyncStatus";
import { Button } from "./ui/button";
import { ArrowRight, Package } from "lucide-react";
import { useRegistryWithStats } from "@/hooks/useRegistryQueries";
import type { RegistryEntryWithCategory } from "@/lib/schemas";

// Create query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      retry: 1,
    },
  },
});

interface HomePageContentProps {
  registryEntries?: RegistryEntryWithCategory[];
  totalPackages?: number;
  totalApplications?: number;
}

function HomePageContent({ 
  registryEntries = [], 
  totalPackages = 0, 
  totalApplications = 0,
}: HomePageContentProps) {
  // Separate packages and applications
  const packages = React.useMemo(() => {
    return registryEntries.filter(e => e.type === "package");
  }, [registryEntries]);
  
  const applications = React.useMemo(() => {
    return registryEntries.filter(e => e.type === "application");
  }, [registryEntries]);

  // Prepare search items for navbar
  const searchItems = React.useMemo(() => {
    return registryEntries.map(e => ({
      name: e.name,
      owner: e.owner,
      repo: e.repo,
      description: e.description,
      category: e.category,
      type: e.type,
      fullName: e.fullName,
    }));
  }, [registryEntries]);
  
  // Get stats for packages and applications
  const { data: packagesWithStats, isLoading: packagesLoading } = useRegistryWithStats(
    packages, 
    true,
    { field: "stars", order: "desc" }
  );
  const { data: applicationsWithStats, isLoading: applicationsLoading } = useRegistryWithStats(
    applications, 
    true,
    { field: "stars", order: "desc" }
  );

  const heroStats = {
    totalRepos: registryEntries.length,
    totalPackages,
    totalApplications,
    lastUpdated: Date.now(),
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar searchItems={searchItems} />
      
      <main className="flex-1">
        {/* Hero Section */}
        <Hero stats={heroStats} />

        {/* Features */}
        <Features />

        {/* Quick Categories */}
        <QuickCategories />

        {/* Popular Packages */}
        <section className="py-12 sm:py-16 lg:py-20 mesh-gradient relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
                  Popular Packages
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Most popular Zig libraries and modules
                </p>
              </div>
              <Button variant="outline" asChild className="shrink-0">
                <a href="/packages" title="View all packages">
                  View All Packages
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {packagesLoading ? (
                  Array.from({ length: Math.min(packages.length || 3, 6) }).map((_, i) => (
                    <motion.div
                      key={`package-skeleton-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <RegistryCardSkeleton />
                    </motion.div>
                  ))
                ) : packagesWithStats.length > 0 ? (
                  packagesWithStats.slice(0, 6).map((entry, index) => (
                    <motion.div
                      key={entry.fullName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <RegistryCard entry={entry} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<Package className="w-12 h-12" />}
                      title="No packages yet"
                      description="Add packages to the registry via Pull Request"
                      action={{ label: "How to Add", onClick: () => window.location.href = "/how-to-add" }}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Popular Applications */}
        <section className="py-12 sm:py-16 lg:py-20 gradient-bg relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-20 left-0 w-[400px] h-[400px] bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-primary/5 rounded-full blur-3xl" />
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
              <div>
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">
                  Popular Applications
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base">
                  Tools and software built with Zig
                </p>
              </div>
              <Button variant="outline" asChild className="shrink-0">
                <a href="/applications" title="View all applications">
                  View All Applications
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <AnimatePresence mode="popLayout">
                {applicationsLoading ? (
                  Array.from({ length: Math.min(applications.length || 3, 6) }).map((_, i) => (
                    <motion.div
                      key={`app-skeleton-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <RegistryCardSkeleton />
                    </motion.div>
                  ))
                ) : applicationsWithStats.length > 0 ? (
                  applicationsWithStats.slice(0, 6).map((entry, index) => (
                    <motion.div
                      key={entry.fullName}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <RegistryCard entry={entry} />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full">
                    <EmptyState
                      icon={<Package className="w-12 h-12" />}
                      title="No applications yet"
                      description="Add applications to the registry via Pull Request"
                      action={{ label: "How to Add", onClick: () => window.location.href = "/how-to-add" }}
                    />
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-20 lg:py-24 relative overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-linear-to-br from-primary via-primary/90 to-purple-600" />
          {/* Animated blobs */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl blob" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl blob blob-delay-1" />
          </div>
          
          <div className="container mx-auto px-4 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4 text-primary-foreground">Add Your Zig Project</h2>
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto text-sm sm:text-base">
                Share your work with the Zig community. Submit a PR to add your 
                package or application to the registry.
              </p>
              <Button size="lg" variant="secondary" asChild className="hover-lift">
                <a href="/how-to-add" title="Learn how to add your project">
                  Learn How
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

// Props interface for HomePage
interface HomePageProps {
  registryEntries?: RegistryEntryWithCategory[];
  totalPackages?: number;
  totalApplications?: number;
}

// Wrapper with QueryProvider
export function HomePage({ registryEntries, totalPackages, totalApplications }: HomePageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <HomePageContent 
        registryEntries={registryEntries}
        totalPackages={totalPackages}
        totalApplications={totalApplications}
      />
    </QueryClientProvider>
  );
}

export default HomePage;
