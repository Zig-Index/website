import { getCollection } from "astro:content";
import type { RegistryEntryWithCategory } from "./schemas";
import { convertRegistryEntryToCombined } from "./schemas";

// Load all registry entries at build time
export async function loadRegistryData(): Promise<RegistryEntryWithCategory[]> {
  const packages = await getCollection("packages");
  const applications = await getCollection("applications");
  
  const entries: RegistryEntryWithCategory[] = [];
  
  // Convert packages
  for (const pkg of packages) {
    entries.push(convertRegistryEntryToCombined(pkg.data, "package"));
  }
  
  // Convert applications
  for (const app of applications) {
    entries.push(convertRegistryEntryToCombined(app.data, "application"));
  }
  
  return entries;
}

// Get packages only
export async function loadPackages(): Promise<RegistryEntryWithCategory[]> {
  const packages = await getCollection("packages");
  return packages.map(pkg => convertRegistryEntryToCombined(pkg.data, "package"));
}

// Get applications only
export async function loadApplications(): Promise<RegistryEntryWithCategory[]> {
  const applications = await getCollection("applications");
  return applications.map(app => convertRegistryEntryToCombined(app.data, "application"));
}

// Get stats from all registry entries
export function getRegistryStats(entries: RegistryEntryWithCategory[]): {
  totalPackages: number;
  totalApplications: number;
  totalEntries: number;
  allCategories: string[];
  allLicenses: string[];
} {
  const packages = entries.filter(e => e.type === "package");
  const applications = entries.filter(e => e.type === "application");
  
  const categoriesSet = new Set<string>();
  const licensesSet = new Set<string>();
  
  for (const entry of entries) {
    if (entry.category) {
      categoriesSet.add(entry.category);
    }
    if (entry.license) {
      licensesSet.add(entry.license);
    }
  }
  
  return {
    totalPackages: packages.length,
    totalApplications: applications.length,
    totalEntries: entries.length,
    allCategories: Array.from(categoriesSet).sort(),
    allLicenses: Array.from(licensesSet).sort(),
  };
}
