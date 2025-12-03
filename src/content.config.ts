import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Schema for registry entries (packages and applications)
// Simple schema - no addedAt needed, timestamps not required
const registrySchema = z.object({
  name: z.string(),
  owner: z.string(),
  repo: z.string(),
  description: z.string(),
  homepage: z.string().optional(),
  license: z.string().optional(),
  category: z.string().optional(),
});

// Packages collection - from src/registry/repositories/packages
const packages = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/registry/src/registry/repositories/packages' }),
  schema: registrySchema,
});

// Applications collection - from src/registry/repositories/applications
const applications = defineCollection({
  loader: glob({ pattern: '**/*.json', base: './src/registry/src/registry/repositories/applications' }),
  schema: registrySchema,
});

export const collections = { packages, applications };
