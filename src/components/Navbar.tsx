"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "./ui/sheet";
import { 
  Search, 
  Menu, 
  Package, 
  Cpu, 
  Github, 
  Zap, 
  Plus,
  ArrowRight,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import Fuse from "fuse.js";

interface SearchItem {
  name: string;
  owner: string;
  repo: string;
  description: string;
  category?: string;
  type: "package" | "application";
  fullName: string;
}

interface NavbarProps {
  onSearch?: (query: string) => void;
  searchValue?: string;
  searchItems?: SearchItem[];
}

const navLinks = [
  { href: "/packages", label: "Packages", icon: Package },
  { href: "/applications", label: "Applications", icon: Cpu },
];

export function Navbar({ onSearch, searchValue, searchItems = [] }: NavbarProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localSearch, setLocalSearch] = React.useState(searchValue || "");
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [suggestions, setSuggestions] = React.useState<SearchItem[]>([]);
  const searchRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Build search index
  const fuse = React.useMemo(() => {
    if (!searchItems || searchItems.length === 0) return null;
    return new Fuse(searchItems, {
      keys: [
        { name: "name", weight: 2 },
        { name: "description", weight: 1 },
        { name: "owner", weight: 0.8 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [searchItems]);

  // Update suggestions when search changes
  React.useEffect(() => {
    if (!localSearch.trim() || !fuse) {
      setSuggestions([]);
      return;
    }
    const results = fuse.search(localSearch).slice(0, 8);
    setSuggestions(results.map(r => r.item));
  }, [localSearch, fuse]);

  // Close suggestions when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowSuggestions(false);
    onSearch?.(localSearch);
  };

  const handleClearSearch = () => {
    setLocalSearch("");
    setSuggestions([]);
    setShowSuggestions(false);
    onSearch?.("");
    inputRef.current?.focus();
  };

  const getCategoryIcon = (type: "package" | "application") => {
    return type === "package" ? Package : Cpu;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center px-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 mr-6 shrink-0" title="Zig Index - Home">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center w-8 h-8 bg-linear-to-br from-primary to-primary/70 rounded-lg shadow-lg"
          >
            <Zap className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="font-bold text-xl hidden sm:block bg-linear-to-r from-foreground to-foreground/70 bg-clip-text">
            Zig Index
          </span>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-accent"
              title={`Browse ${link.label}`}
            >
              <link.icon className="w-4 h-4" />
              {link.label}
            </a>
          ))}
        </nav>

        {/* Spacer to push search and actions to right */}
        <div className="flex-1" />

        {/* Search Bar with Dropdown - Desktop (now on right side) */}
        <div ref={searchRef} className="hidden md:flex items-center w-full max-w-sm relative mr-4">
          <form onSubmit={handleSearchSubmit} className="w-full">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Search packages & applications..."
                value={localSearch}
                onChange={(e) => {
                  setLocalSearch(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                className="pl-10 pr-8 w-full bg-muted/50 border-muted-foreground/20 focus:bg-background transition-colors"
                aria-label="Search packages and applications"
              />
              {localSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleClearSearch}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  title="Clear search"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </form>

          {/* Search Suggestions Dropdown */}
          <AnimatePresence>
            {showSuggestions && suggestions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-popover border rounded-lg shadow-xl overflow-hidden z-50"
              >
                <div className="p-2 max-h-[400px] overflow-y-auto">
                  {suggestions.map((item, index) => {
                    const Icon = getCategoryIcon(item.type);
                    return (
                      <motion.a
                        key={item.fullName}
                        href={`/repo?owner=${encodeURIComponent(item.owner)}&name=${encodeURIComponent(item.repo)}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setShowSuggestions(false)}
                        className="flex items-start gap-3 p-3 rounded-md hover:bg-accent transition-colors group"
                        title={`View ${item.name} details`}
                      >
                        <div className={cn(
                          "p-2 rounded-md shrink-0",
                          item.type === "package" 
                            ? "bg-blue-500/10 text-blue-500" 
                            : "bg-green-500/10 text-green-500"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{item.name}</span>
                            <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                              {item.type}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {item.description}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            by {item.owner}
                          </p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
                      </motion.a>
                    );
                  })}
                </div>
                {localSearch && (
                  <div className="border-t p-2">
                    <a
                      href={`/search?q=${encodeURIComponent(localSearch)}`}
                      className="flex items-center justify-center gap-2 p-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                      title={`Search all for "${localSearch}"`}
                    >
                      <Search className="w-4 h-4" />
                      Search all for "{localSearch}"
                    </a>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          {/* Add Project Button - Desktop */}
          <Button 
            asChild 
            size="sm" 
            className="hidden sm:flex bg-linear-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-md"
          >
            <a href="/how-to-add" title="Add your Zig project to the registry">
              <Plus className="w-4 h-4 mr-1" />
              Add Project
            </a>
          </Button>

          <Button variant="ghost" size="icon" asChild className="hidden sm:flex" title="View Zig Index on GitHub">
            <a 
              href="https://github.com/Zig-Index/website" 
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="View Zig Index source code on GitHub"
            >
              <Github className="w-4 h-4" />
            </a>
          </Button>

          {/* Mobile Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon" aria-label="Open navigation menu" title="Open menu">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[350px]">
              <div className="flex flex-col gap-4 mt-6">
                {/* Mobile Search */}
                <div className="relative">
                  <form onSubmit={handleSearchSubmit}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="pl-10 pr-8"
                        aria-label="Search packages and applications"
                      />
                      {localSearch && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={handleClearSearch}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                          title="Clear search"
                          aria-label="Clear search"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Mobile Nav Links */}
                <nav className="flex flex-col gap-1">
                  {navLinks.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsOpen(false)}
                      className="flex items-center gap-2 px-3 py-3 text-base font-medium text-foreground hover:bg-accent rounded-md transition-colors"
                      title={`Browse ${link.label}`}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                    </a>
                  ))}
                </nav>

                {/* Mobile Actions */}
                <div className="flex flex-col gap-2 pt-4 border-t">
                  <Button asChild className="justify-start" title="Add your Zig project">
                    <a href="/how-to-add" onClick={() => setIsOpen(false)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your Project
                    </a>
                  </Button>
                  <Button variant="outline" asChild title="View on GitHub">
                    <a 
                      href="https://github.com/Zig-Index/website" 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      <Github className="w-4 h-4 mr-2" />
                      View on GitHub
                    </a>
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
