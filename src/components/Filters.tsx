"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "./ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Slider } from "./ui/slider";
import type { Filter, Sort } from "@/lib/schemas";

interface FiltersProps {
  filter: Filter;
  sort: Sort;
  onFilterChange: (filter: Filter) => void;
  onSortChange: (sort: Sort) => void;
  licenses: { key: string; name: string }[];
  totalResults: number;
  categories?: string[];
}

export function Filters({
  filter,
  sort,
  onFilterChange,
  onSortChange,
  licenses,
  totalResults,
  categories = [],
}: FiltersProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [localFilter, setLocalFilter] = React.useState(filter);
  const [searchInput, setSearchInput] = React.useState(filter.search || "");

  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filter.search) count++;
    if (filter.categoryFilter) count++;
    if (filter.statusFilter && filter.statusFilter !== "all") count++;
    if (filter.minStars && filter.minStars > 0) count++;
    if (filter.license) count++;
    if (filter.updatedWithin && filter.updatedWithin !== "all") count++;
    return count;
  }, [filter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filter, search: searchInput });
  };

  const handleSearchClear = () => {
    setSearchInput("");
    onFilterChange({ ...filter, search: undefined });
  };

  // Dynamic search with debounce
  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== (filter.search || "")) {
        onFilterChange({ ...filter, search: searchInput || undefined });
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchInput]);

  const handleApplyFilters = () => {
    onFilterChange(localFilter);
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    const cleared: Filter = { search: filter.search };
    setLocalFilter(cleared);
    onFilterChange(cleared);
    setIsOpen(false);
  };

  React.useEffect(() => {
    setLocalFilter(filter);
    setSearchInput(filter.search || "");
  }, [filter]);

  return (
    <div className="space-y-4 px-1">
      {/* Search and Quick Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex-1 min-w-0">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search packages, applications..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-8 w-full"
              aria-label="Search repositories"
            />
            {searchInput && (
              <button
                type="button"
                onClick={handleSearchClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </form>

        {/* Sort and Filter Buttons */}
        <div className="flex gap-2 shrink-0">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none" title="Sort results" aria-label="Sort results">
                <ArrowUpDown className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Sort</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSortChange({ field: "stars", order: "desc" })}>
                Most Stars
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: "stars", order: "asc" })}>
                Least Stars
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: "updated", order: "desc" })}>
                Recently Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: "updated", order: "asc" })}>
                Least Recently Updated
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: "forks", order: "desc" })}>
                Most Forks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: "name", order: "asc" })}>
                Name (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSortChange({ field: "name", order: "desc" })}>
                Name (Z-A)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Filters Sheet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="outline"
                className="flex-1 sm:flex-none relative"
                title="Open filters"
                aria-label={`Open filters${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
              >
                <SlidersHorizontal className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="ml-1 sm:ml-2 h-5 w-5 p-0 flex items-center justify-center">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:w-[400px] overflow-y-auto p-0" side="right">
              <div className="p-6">
                <SheetHeader className="mb-6">
                  <SheetTitle>Filter Results</SheetTitle>
                  <SheetDescription>
                    Narrow down your search with filters
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Minimum Stars */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Minimum Stars</Label>
                      <span className="text-sm text-muted-foreground">
                        {localFilter.minStars || 0}+
                      </span>
                    </div>
                    <Slider
                      value={[localFilter.minStars || 0]}
                      onValueChange={([value]) => 
                        setLocalFilter({ ...localFilter, minStars: value })
                      }
                      min={0}
                  max={1000}
                  step={10}
                />
              </div>

              {/* License Filter */}
              {licenses.length > 0 && (
                <div className="space-y-2">
                  <Label>License</Label>
                  <Select
                    value={localFilter.license || "all"}
                    onValueChange={(value) => 
                      setLocalFilter({ ...localFilter, license: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All licenses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Licenses</SelectItem>
                      {licenses.map((lic) => (
                        <SelectItem key={lic.key} value={lic.key}>{lic.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Category Filter - dynamic from JSON */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select
                    value={localFilter.categoryFilter || "all"}
                    onValueChange={(value) => 
                      setLocalFilter({ ...localFilter, categoryFilter: value === "all" ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Status Filter - Show deleted/exists repos */}
              <div className="space-y-2">
                <Label>Repository Status</Label>
                <Select
                  value={localFilter.statusFilter || "all"}
                  onValueChange={(value) => 
                    setLocalFilter({ ...localFilter, statusFilter: value as Filter["statusFilter"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Repositories</SelectItem>
                    <SelectItem value="exists">Active Only</SelectItem>
                    <SelectItem value="deleted">Removed Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Updated Within */}
              <div className="space-y-2">
                <Label>Updated Within</Label>
                <Select
                  value={localFilter.updatedWithin || "all"}
                  onValueChange={(value) => 
                    setLocalFilter({ ...localFilter, updatedWithin: value as Filter["updatedWithin"] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Any time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any Time</SelectItem>
                    <SelectItem value="day">Last 24 hours</SelectItem>
                    <SelectItem value="week">Last week</SelectItem>
                    <SelectItem value="month">Last month</SelectItem>
                    <SelectItem value="year">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
                </div>

                <SheetFooter className="gap-2 pt-6 flex-row">
                  <Button 
                    variant="outline" 
                    onClick={handleClearFilters}
                    title="Clear all filters"
                    aria-label="Clear all filters"
                    className="flex-1"
                  >
                    Clear All
                  </Button>
                  <Button 
                    onClick={handleApplyFilters}
                    title="Apply filters"
                    aria-label="Apply filters"
                    className="flex-1"
                  >
                    Apply Filters
                  </Button>
                </SheetFooter>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Results Count and Active Filters */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <p className="text-sm text-muted-foreground">
          {totalResults.toLocaleString()} {totalResults === 1 ? "result" : "results"}
        </p>

        {/* Active Filter Badges */}
        {filter.minStars && filter.minStars > 0 && (
          <Badge variant="secondary" className="gap-1">
            {filter.minStars}+ stars
            <button
              onClick={() => onFilterChange({ ...filter, minStars: undefined })}
              className="ml-1 hover:text-destructive"
              title="Remove stars filter"
              aria-label="Remove stars filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
        {filter.license && (
          <Badge variant="secondary" className="gap-1">
            {filter.license}
            <button
              onClick={() => onFilterChange({ ...filter, license: undefined })}
              className="ml-1 hover:text-destructive"
              title="Remove license filter"
              aria-label="Remove license filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
        {filter.categoryFilter && (
          <Badge variant="secondary" className="gap-1">
            {filter.categoryFilter.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            <button
              onClick={() => onFilterChange({ ...filter, categoryFilter: undefined })}
              className="ml-1 hover:text-destructive"
              title="Remove category filter"
              aria-label="Remove category filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
        {filter.statusFilter && filter.statusFilter !== "all" && (
          <Badge variant="secondary" className="gap-1">
            {filter.statusFilter === "deleted" ? "Removed" : "Active"}
            <button
              onClick={() => onFilterChange({ ...filter, statusFilter: undefined })}
              className="ml-1 hover:text-destructive"
              title="Remove status filter"
              aria-label="Remove status filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
        {filter.updatedWithin && filter.updatedWithin !== "all" && (
          <Badge variant="secondary" className="gap-1">
            Updated: {filter.updatedWithin}
            <button
              onClick={() => onFilterChange({ ...filter, updatedWithin: undefined })}
              className="ml-1 hover:text-destructive"
              title="Remove time filter"
              aria-label="Remove time filter"
            >
              <X className="w-3 h-3" />
            </button>
          </Badge>
        )}
      </div>
    </div>
  );
}

export default Filters;
