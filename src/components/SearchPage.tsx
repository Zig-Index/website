"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { 
  Search, 
  Package, 
  Cpu, 
  ArrowRight, 
  X,
  Filter,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import Fuse from "fuse.js";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

interface SearchItem {
  name: string;
  owner: string;
  repo: string;
  description: string;
  category?: string;
  type: "package" | "application";
  fullName: string;
}

interface SearchPageProps {
  initialQuery?: string;
  items: SearchItem[];
}

export function SearchPage({ initialQuery = "", items }: SearchPageProps) {
  const [searchQuery, setSearchQuery] = React.useState(initialQuery);
  const [results, setResults] = React.useState<SearchItem[]>([]);
  const [activeFilter, setActiveFilter] = React.useState<"all" | "package" | "application">("all");
  const [isSearching, setIsSearching] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Build Fuse.js search index
  const fuse = React.useMemo(() => {
    return new Fuse(items, {
      keys: [
        { name: "name", weight: 2 },
        { name: "description", weight: 1 },
        { name: "owner", weight: 0.8 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
      includeScore: true,
    });
  }, [items]);

  // Perform search when query or filter changes
  React.useEffect(() => {
    setIsSearching(true);
    
    const timer = setTimeout(() => {
      let searchResults: SearchItem[] = [];
      
      if (searchQuery.trim()) {
        const fuseResults = fuse.search(searchQuery);
        searchResults = fuseResults.map(r => r.item);
      } else {
        // Show all items when no search query
        searchResults = [...items];
      }
      
      // Apply type filter
      if (activeFilter !== "all") {
        searchResults = searchResults.filter(item => item.type === activeFilter);
      }
      
      setResults(searchResults);
      setIsSearching(false);
    }, 150);
    
    return () => clearTimeout(timer);
  }, [searchQuery, activeFilter, fuse, items]);

  // Update URL with search query
  React.useEffect(() => {
    const url = new URL(window.location.href);
    if (searchQuery.trim()) {
      url.searchParams.set("q", searchQuery);
    } else {
      url.searchParams.delete("q");
    }
    window.history.replaceState({}, "", url.toString());
  }, [searchQuery]);

  const handleClearSearch = () => {
    setSearchQuery("");
    inputRef.current?.focus();
  };

  const handleNavSearch = (query: string) => {
    setSearchQuery(query);
  };

  const getCategoryIcon = (type: "package" | "application") => {
    return type === "package" ? Package : Cpu;
  };

  const packagesCount = results.filter(r => r.type === "package").length;
  const applicationsCount = results.filter(r => r.type === "application").length;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar 
        onSearch={handleNavSearch} 
        searchValue={searchQuery}
        searchItems={items}
      />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 sm:py-16 lg:py-20 overflow-hidden mesh-gradient">
          {/* Background Elements */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-linear-to-br from-primary/10 to-purple-500/10 rounded-full blur-3xl blob" />
            <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-linear-to-tr from-blue-500/10 to-primary/10 rounded-full blur-3xl blob blob-delay-1" />
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                <span className="gradient-text">Search</span> Zig Ecosystem
              </h1>
              <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                Find packages and applications in the Zig ecosystem
              </p>
            </motion.div>

          {/* Search Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-2xl mx-auto mb-8"
          >
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search packages, applications, or authors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-12 h-14 text-lg bg-card border-2 focus:border-primary/50 rounded-xl"
                autoFocus
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5" />
                </Button>
              )}
            </div>
          </motion.div>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center"
          >
            <Tabs value={activeFilter} onValueChange={(v) => setActiveFilter(v as any)}>
              <TabsList className="bg-muted/50">
                <TabsTrigger value="all" className="gap-2">
                  <Filter className="w-4 h-4" />
                  All ({results.length})
                </TabsTrigger>
                <TabsTrigger value="package" className="gap-2">
                  <Package className="w-4 h-4" />
                  Packages ({packagesCount})
                </TabsTrigger>
                <TabsTrigger value="application" className="gap-2">
                  <Cpu className="w-4 h-4" />
                  Applications ({applicationsCount})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>
        </div>
      </section>

      {/* Results Section */}
      <section className="pb-16">
        <div className="container mx-auto px-4">
          {/* Results Header */}
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted-foreground">
              {isSearching ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching...
                </span>
              ) : searchQuery ? (
                <>
                  Found <span className="font-medium text-foreground">{results.length}</span> results 
                  for "<span className="font-medium text-foreground">{searchQuery}</span>"
                </>
              ) : (
                <>
                  Showing <span className="font-medium text-foreground">{results.length}</span> items
                </>
              )}
            </p>
          </div>

          {/* Results Grid */}
          <AnimatePresence mode="wait">
            {results.length > 0 ? (
              <motion.div
                key="results"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {results.map((item, index) => {
                  const Icon = getCategoryIcon(item.type);
                  return (
                    <motion.a
                      key={item.fullName}
                      href={`/repo?owner=${encodeURIComponent(item.owner)}&name=${encodeURIComponent(item.repo)}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: Math.min(index * 0.05, 0.3) }}
                      className="group relative bg-card hover:bg-accent/50 border rounded-xl p-5 transition-all hover:shadow-lg hover:border-primary/30"
                    >
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-3 rounded-lg shrink-0 transition-colors",
                          item.type === "package" 
                            ? "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20" 
                            : "bg-green-500/10 text-green-500 group-hover:bg-green-500/20"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                              {item.name}
                            </h3>
                            <span className={cn(
                              "text-xs px-2 py-0.5 rounded-full shrink-0",
                              item.type === "package"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-green-500/10 text-green-500"
                            )}>
                              {item.type}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            by {item.owner}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-1" />
                      </div>
                    </motion.a>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-16"
              >
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
                  <Search className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  {searchQuery 
                    ? `No packages or applications match "${searchQuery}". Try a different search term.`
                    : "No items available in the current filter."}
                </p>
                {searchQuery && (
                  <Button onClick={handleClearSearch} variant="outline">
                    Clear search
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      </main>
      
      <Footer />
    </div>
  );
}

export default SearchPage;
