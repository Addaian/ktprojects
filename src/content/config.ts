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
    specialization: z.string().optional(),
    affiliation: z.string().optional(),
    joinDate: z.string().optional(),
    status: z.enum(['Active Deployment', 'On Sabbatical', 'Alumni']).default('Active Deployment'),
    featured: z.boolean().default(false),
    isPledge: z.boolean().default(false),
    github: z.string().optional(),
    linkedin: z.string().optional(),
    website: z.string().optional(),
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

const pulse = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    category: z.enum(['Release', 'Milestone', 'Announcement', 'Award', 'Patch', 'System']),
    version: z.string().optional(),
    image: z.string().optional(),
    excerpt: z.string().optional(),
    order: z.number().default(0),
  }),
});

export const collections = { projects, members, pulse };
