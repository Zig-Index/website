import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Filter, Sort, Pagination } from "@/lib/schemas";

// Filter Store
interface FilterState {
  filter: Filter;
  sort: Sort;
  pagination: Pagination;
  setFilter: (filter: Filter) => void;
  setSort: (sort: Sort) => void;
  setPagination: (pagination: Pagination) => void;
  resetFilters: () => void;
  setSearch: (search: string | undefined) => void;
  setType: (type: Filter["type"]) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setCategory: (category: string | undefined) => void;
}

const defaultFilter: Filter = { type: "all" };
const defaultSort: Sort = { field: "stars", order: "desc" };
const defaultPagination: Pagination = { page: 1, pageSize: 20 };

export const useFilterStore = create<FilterState>()((set) => ({
  filter: defaultFilter,
  sort: defaultSort,
  pagination: defaultPagination,
  setFilter: (filter) => set({ filter, pagination: { ...defaultPagination, pageSize: 20 } }),
  setSort: (sort) => set({ sort, pagination: { ...defaultPagination, pageSize: 20 } }),
  setPagination: (pagination) => set({ pagination }),
  resetFilters: () => set({ filter: defaultFilter, pagination: defaultPagination }),
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
  setCategory: (category) => set((state) => ({
    filter: { ...state.filter, category },
    pagination: { ...state.pagination, page: 1 }
  })),
}));

// Sync Status Store
interface SyncState {
  isSyncing: boolean;
  progress: {
    topic: string;
    page: number;
    totalPages: number;
    reposFetched: number;
    stage: "fetching" | "processing" | "complete" | "error";
  } | null;
  error: string | null;
  lastSyncTime: number | null;
  totalRepos: number;
  setIsSyncing: (isSyncing: boolean) => void;
  setProgress: (progress: SyncState["progress"]) => void;
  setError: (error: string | null) => void;
  setLastSyncTime: (time: number) => void;
  setTotalRepos: (count: number) => void;
  reset: () => void;
}

export const useSyncStore = create<SyncState>()((set) => ({
  isSyncing: false,
  progress: null,
  error: null,
  lastSyncTime: null,
  totalRepos: 0,
  setIsSyncing: (isSyncing) => set({ isSyncing }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
  setTotalRepos: (totalRepos) => set({ totalRepos }),
  reset: () => set({ isSyncing: false, progress: null, error: null }),
}));

// Favorites Store (persisted)
interface FavoritesState {
  favoriteIds: number[];
  addFavorite: (id: number) => void;
  removeFavorite: (id: number) => void;
  toggleFavorite: (id: number) => void;
  isFavorite: (id: number) => boolean;
  clearFavorites: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favoriteIds: [],
      addFavorite: (id) => set((state) => ({
        favoriteIds: state.favoriteIds.includes(id) 
          ? state.favoriteIds 
          : [...state.favoriteIds, id]
      })),
      removeFavorite: (id) => set((state) => ({
        favoriteIds: state.favoriteIds.filter((fid) => fid !== id)
      })),
      toggleFavorite: (id) => {
        const { favoriteIds, addFavorite, removeFavorite } = get();
        if (favoriteIds.includes(id)) {
          removeFavorite(id);
        } else {
          addFavorite(id);
        }
      },
      isFavorite: (id) => get().favoriteIds.includes(id),
      clearFavorites: () => set({ favoriteIds: [] }),
    }),
    {
      name: "zigindex-favorites",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// Preferences Store (persisted)
interface PreferencesState {
  theme: "light" | "dark" | "system";
  pageSize: number;
  githubToken: string | null;
  autoRefreshHours: number;
  setTheme: (theme: PreferencesState["theme"]) => void;
  setPageSize: (pageSize: number) => void;
  setGithubToken: (token: string | null) => void;
  setAutoRefreshHours: (hours: number) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      theme: "system",
      pageSize: 20,
      githubToken: null,
      autoRefreshHours: 1, // Refresh every 1 hour
      setTheme: (theme) => set({ theme }),
      setPageSize: (pageSize) => set({ pageSize }),
      setGithubToken: (githubToken) => set({ githubToken }),
      setAutoRefreshHours: (autoRefreshHours) => set({ autoRefreshHours }),
    }),
    {
      name: "zigindex-preferences",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

// UI State Store
interface UIState {
  isOffline: boolean;
  mobileMenuOpen: boolean;
  filterSheetOpen: boolean;
  setIsOffline: (isOffline: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  setFilterSheetOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  isOffline: typeof navigator !== "undefined" ? !navigator.onLine : false,
  mobileMenuOpen: false,
  filterSheetOpen: false,
  setIsOffline: (isOffline) => set({ isOffline }),
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  setFilterSheetOpen: (filterSheetOpen) => set({ filterSheetOpen }),
}));
