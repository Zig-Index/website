"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { RegistryCard, RegistryCardSkeleton } from "./RepoCard";
import { Filters } from "./Filters";
import { Pagination } from "./Pagination";
import { EmptyState } from "./SyncStatus";
import { Package, Search } from "lucide-react";
import {
  useFilteredRegistry,
  useRegistryWithStats,
  getUniqueCategories,
  getUniqueLicenses,
} from "@/hooks/useRegistryQueries";
import type { Filter, Sort, RegistryEntryWithCategory } from "@/lib/schemas";

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

// Filter store (simple React state)
interface FilterState {
  filter: Filter;
  sort: Sort;
  pagination: { page: number; pageSize: number };
}

interface RegistryPageProps {
  defaultType?: "all" | "package" | "application";
  title?: string;
  description?: string;
  registryEntries?: RegistryEntryWithCategory[];
}

function RegistryPageContent({ 
  defaultType = "all", 
  title = "Registry",
  description = "Discover all Zig packages and applications",
  registryEntries = [],
}: RegistryPageProps) {
  // Local state for filters
  const [state, setState] = React.useState<FilterState>({
    filter: { type: defaultType },
    sort: { field: "stars", order: "desc" },
    pagination: { page: 1, pageSize: 20 },
  });

  // Derived filter values
  const { filter, sort, pagination } = state;

  // Prepare search items for navbar dropdown
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

  // Filter registry entries
  const filteredRegistry = useFilteredRegistry(registryEntries, {
    search: filter.search,
    type: filter.type as "all" | "package" | "application",
    categoryFilter: filter.categoryFilter,
    statusFilter: filter.statusFilter,
    license: filter.license,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  // Get stats for visible entries
  const { data: entriesWithStats, isLoading: statsLoading } = useRegistryWithStats(
    filteredRegistry.items,
    true,
    sort
  );

  // Apply stats-based filters after stats are loaded (status, minStars, updatedWithin)
  const filteredEntriesWithStats = React.useMemo(() => {
    let result = entriesWithStats;
    
    // Filter by status (exists/deleted)
    if (filter.statusFilter && filter.statusFilter !== "all") {
      result = result.filter(entry => entry.status === filter.statusFilter);
    }
    
    // Filter by minimum stars (requires live stats)
    if (filter.minStars && filter.minStars > 0) {
      result = result.filter(entry => 
        entry.stats && entry.stats.stargazers_count >= (filter.minStars || 0)
      );
    }
    
    // Filter by updated within time period (requires live stats)
    if (filter.updatedWithin && filter.updatedWithin !== "all") {
      const now = Date.now();
      const cutoffMap: Record<string, number> = {
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
        month: 30 * 24 * 60 * 60 * 1000,
        year: 365 * 24 * 60 * 60 * 1000,
      };
      const cutoffMs = cutoffMap[filter.updatedWithin];
      if (cutoffMs) {
        result = result.filter(entry => {
          if (!entry.stats?.pushed_at) return false;
          const updatedAt = new Date(entry.stats.pushed_at).getTime();
          return (now - updatedAt) <= cutoffMs;
        });
      }
    }
    
    return result;
  }, [entriesWithStats, filter.statusFilter, filter.minStars, filter.updatedWithin]);

  // Derive unique filters from registry
  const registryCategories = React.useMemo(() => getUniqueCategories(registryEntries), [registryEntries]);
  const registryLicenses = React.useMemo(() => getUniqueLicenses(registryEntries), [registryEntries]);

  // Handlers
  const handleSearch = (query: string) => {
    setState(s => ({ 
      ...s, 
      filter: { ...s.filter, search: query || undefined },
      pagination: { ...s.pagination, page: 1 }
    }));
  };

  const handleFilterChange = (newFilter: Filter) => {
    setState(s => ({ 
      ...s, 
      filter: newFilter,
      pagination: { ...s.pagination, page: 1 }
    }));
  };

  const handleSortChange = (newSort: Sort) => {
    setState(s => ({ ...s, sort: newSort }));
  };

  const handlePageChange = (page: number) => {
    setState(s => ({ ...s, pagination: { ...s.pagination, page } }));
  };

  const handlePageSizeChange = (pageSize: number) => {
    setState(s => ({ ...s, pagination: { ...s.pagination, pageSize, page: 1 } }));
  };

  const clearFilters = () => {
    setState(s => ({ 
      ...s, 
      filter: { type: defaultType },
      pagination: { ...s.pagination, page: 1 }
    }));
  };

  const total = filteredRegistry.totalItems;
  const pageCount = filteredRegistry.totalPages;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Navbar search is separate - it navigates to search page, not filter this page */}
      <Navbar 
        searchItems={searchItems}
      />
      
      <main className="flex-1 mesh-gradient relative overflow-hidden">
        {/* Animated background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-linear-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl blob" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-linear-to-br from-blue-500/10 to-primary/10 rounded-full blur-3xl blob blob-delay-1" />
          <div className="absolute top-1/2 right-1/4 w-[300px] h-[300px] bg-linear-to-br from-green-500/5 to-emerald-500/5 rounded-full blur-3xl blob blob-delay-2" />
          {/* Grid pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-size-[50px_50px]" />
        </div>
        
        <div className="container mx-auto px-4 py-6 sm:py-8 relative z-10">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 sm:mb-8"
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{title}</h1>
            <p className="text-muted-foreground text-sm sm:text-base">{description}</p>
          </motion.div>

          {/* Filters */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 sm:mb-8"
          >
            <Filters
              filter={filter}
              sort={sort}
              onFilterChange={handleFilterChange}
              onSortChange={handleSortChange}
              licenses={registryLicenses}
              totalResults={total}
              categories={registryCategories}
            />
          </motion.div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8">
            <AnimatePresence mode="popLayout">
              {statsLoading ? (
                // Skeleton loading grid
                Array.from({ length: Math.min(pagination.pageSize, 12) }).map((_, i) => (
                  <motion.div
                    key={`skeleton-${i}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.02 }}
                  >
                    <RegistryCardSkeleton />
                  </motion.div>
                ))
              ) : filteredEntriesWithStats.length > 0 ? (
                // Registry cards
                filteredEntriesWithStats.map((entry, index) => (
                  <motion.div
                    key={entry.fullName}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <RegistryCard entry={entry} />
                  </motion.div>
                ))
              ) : (
                <motion.div 
                  className="col-span-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <EmptyState
                    icon={filter.search ? <Search className="w-12 h-12" /> : <Package className="w-12 h-12" />}
                    title={filter.search ? "No results found" : "No entries yet"}
                    description={
                      filter.search 
                        ? "Try adjusting your search or filters"
                        : "Add entries to the registry via Pull Request"
                    }
                    action={
                      filter.search
                        ? { label: "Clear Filters", onClick: clearFilters }
                        : { label: "How to Add", onClick: () => window.location.href = "/how-to-add" }
                    }
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Pagination
                currentPage={pagination.page}
                totalPages={pageCount}
                pageSize={pagination.pageSize}
                onPageChange={handlePageChange}
                onPageSizeChange={handlePageSizeChange}
              />
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

// Wrapper with QueryProvider
export function RegistryPage(props: RegistryPageProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <RegistryPageContent {...props} />
    </QueryClientProvider>
  );
}

// Pre-configured page components
interface PackagesPageProps {
  packagesJson?: string;
  totalPackages?: number;
}

interface ApplicationsPageProps {
  applicationsJson?: string;
  totalApplications?: number;
}

export function PackagesPage({ packagesJson, totalPackages }: PackagesPageProps) {
  const registryEntries: RegistryEntryWithCategory[] = React.useMemo(() => {
    if (!packagesJson) return [];
    try {
      return JSON.parse(packagesJson);
    } catch {
      return [];
    }
  }, [packagesJson]);

  return (
    <RegistryPage
      defaultType="package"
      title="Zig Packages"
      description={`${totalPackages || registryEntries.length} libraries and reusable modules for the Zig programming language`}
      registryEntries={registryEntries}
    />
  );
}

export function ApplicationsPage({ applicationsJson, totalApplications }: ApplicationsPageProps) {
  const registryEntries: RegistryEntryWithCategory[] = React.useMemo(() => {
    if (!applicationsJson) return [];
    try {
      return JSON.parse(applicationsJson);
    } catch {
      return [];
    }
  }, [applicationsJson]);

  return (
    <RegistryPage
      defaultType="application"
      title="Zig Applications"
      description={`${totalApplications || registryEntries.length} programs, tools, and software built with Zig`}
      registryEntries={registryEntries}
    />
  );
}

export default RegistryPage;
