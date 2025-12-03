"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Filter, Sort, Pagination } from "@/lib/schemas";

// Create a query client with 1 hour cache
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 60, // 1 hour
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: 1,
    },
  },
});

// Query Provider Component
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

// Query Keys
export const queryKeys = {
  stats: (fullName: string) => ["stats", fullName] as const,
  readme: (fullName: string) => ["readme", fullName] as const,
  rateLimit: ["rateLimit"] as const,
};

// ============================================
// Zustand Stores
// ============================================

// Filter Store
interface FilterStoreState {
  filter: Filter;
  sort: Sort;
  pagination: Pagination;
  setFilter: (filter: Filter) => void;
  setSort: (sort: Sort) => void;
  setSearch: (search: string | undefined) => void;
  setType: (type: "all" | "package" | "application") => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  resetFilters: () => void;
}

const defaultFilter: Filter = {};
const defaultSort: Sort = { field: "stars", order: "desc" };
const defaultPagination: Pagination = { page: 1, pageSize: 20 };

export const useFilterStore = create<FilterStoreState>()((set) => ({
  filter: defaultFilter,
  sort: defaultSort,
  pagination: defaultPagination,
  setFilter: (filter) => set({ filter, pagination: { ...defaultPagination } }),
  setSort: (sort) => set({ sort }),
  setSearch: (search) => set((state) => ({ 
    filter: { ...state.filter, search },
    pagination: { ...state.pagination, page: 1 }
  })),
  setType: (type) => set((state) => ({ 
    filter: { ...state.filter, type },
    pagination: { ...state.pagination, page: 1 }
  })),
  setPage: (page) => set((state) => ({ 
    pagination: { ...state.pagination, page } 
  })),
  setPageSize: (pageSize) => set((state) => ({ 
    pagination: { ...state.pagination, pageSize, page: 1 } 
  })),
  resetFilters: () => set({ 
    filter: defaultFilter, 
    sort: defaultSort, 
    pagination: defaultPagination 
  }),
}));

// Favorites Store (persisted)
interface FavoritesStoreState {
  favorites: Set<string>;
  toggleFavorite: (fullName: string) => void;
  isFavorite: (fullName: string) => boolean;
}

export const useFavoritesStore = create<FavoritesStoreState>()(
  persist(
    (set, get) => ({
      favorites: new Set<string>(),
      toggleFavorite: (fullName) => set((state) => {
        const newFavorites = new Set(state.favorites);
        if (newFavorites.has(fullName)) {
          newFavorites.delete(fullName);
        } else {
          newFavorites.add(fullName);
        }
        return { favorites: newFavorites };
      }),
      isFavorite: (fullName) => get().favorites.has(fullName),
    }),
    {
      name: "zigindex-favorites",
      partialize: (state) => ({ 
        favorites: Array.from(state.favorites) 
      }),
      merge: (persisted, current) => ({
        ...current,
        favorites: new Set((persisted as { favorites?: string[] })?.favorites || []),
      }),
    }
  )
);

// Preferences Store (persisted)
interface PreferencesStoreState {
  theme: "light" | "dark" | "system";
  pageSize: number;
  githubToken: string | null;
  setTheme: (theme: "light" | "dark" | "system") => void;
  setPageSize: (size: number) => void;
  setGithubToken: (token: string | null) => void;
}

export const usePreferencesStore = create<PreferencesStoreState>()(
  persist(
    (set) => ({
      theme: "system",
      pageSize: 20,
      githubToken: null,
      setTheme: (theme) => set({ theme }),
      setPageSize: (pageSize) => set({ pageSize }),
      setGithubToken: (githubToken) => set({ githubToken }),
    }),
    {
      name: "zigindex-preferences",
    }
  )
);

// Re-export for backwards compatibility
export { useFilterStore as useAppFilterStore };
