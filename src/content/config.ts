import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    category: z.string().optional(),
    image: z.string().optional(),
    status: z.enum(['Active Ops', 'In Staging', 'Archived']).default('Active Ops'),
    featured: z.boolean().default(false),
    tags: z.array(z.string()).default([]),
    tech: z.array(z.string()).default([]),
    stats: z
      .array(
        z.object({
          label: z.string(),
          value: z.string(),
        })
      )
      .default([]),
    complexity: z.number().min(0).max(100).default(50),
    order: z.number().default(0),
  }),
});

const members = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    tier: z.enum(['Tier 1', 'Tier 2', 'Tier 3']).default('Tier 1'),
    avatar: z.string().optional(),
    skills: z
      .array(
        z.object({
          name: z.string(),
          level: z.number().min(0).max(100),
        })
      )
      .default([]),
    contributions: z.array(z.string()).default([]),
    order: z.number().default(0),
  }),
});

export const collections = { projects, members };
