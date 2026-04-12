import { defineCollection, z } from 'astro:content';

const projects = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    category: z
      .enum([
        'Backend',
        'Frontend',
        'Full-Stack',
        'Distributed Systems',
        'AI / ML',
        'Mobile',
        'Infrastructure',
        'DevTools',
        'Data',
        'Other',
      ])
      .default('Other'),
    startDate: z.date(),
    endDate: z.date().optional(),
    languages: z.array(z.string()).default([]),
    github: z.string().optional(),
    image: z.string().optional(),
    images: z.array(z.string()).default([]),
    quotes: z
      .array(
        z.object({
          quote: z.string(),
          author: z.string(),
          role: z.string().optional(),
        })
      )
      .default([]),
    status: z.enum(['Active', 'Shipped', 'Archived']).default('Active'),
    featured: z.boolean().default(false),
    order: z.number().default(0),
  }),
});

const members = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    tier: z.enum(['Lead', 'Member', 'Contributor']).default('Member'),
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
