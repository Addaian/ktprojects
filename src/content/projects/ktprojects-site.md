---
title: ktprojects.com
description: The site you're currently reading — a portfolio and living archive for the KTP Project Committee at UChicago, built by Adrian Dai with the help of Claude.
category: Frontend
startDate: 2026-04-10
languages:
  - TypeScript
  - Astro
  - Tailwind CSS
  - HTML
github: "https://github.com/Addaian/ktprojects"
image: /main_1.jpg
images: []
features:
  - Content-managed project archive with no code edits required — add a project via Pages CMS, push, done.
  - Terminal-themed hero with a draggable IDE window and live text scrambler so the home page feels like a dev surface, not a brochure.
  - Per-project detail pages with frontmatter-as-terminal metadata, feature list, architecture slot, README, and retrospective.
  - Contributor avatars tagged by project role (Head / Member / Contributor) on both the project grid and detail views.
  - Static build deploys on every push to `main` via GitHub Pages + GitHub Actions.
retrospective: |
  ## what went well
  Content collections + Pages CMS was the right call — adding a project is a 30-second form fill instead of a PR. The terminal motif ended up tying everything together more than expected once it bled into both the home page and the project detail pages.

  ## what was hard
  Getting the scramble word to sit on the same baseline as the static "projects" text took a mini-terminal inside an h1 and a baseline hack. Worth it, but I lost an afternoon to it. The draggable IDE window also needed a boundary clamp so you can't lose it below the fold.

  ## what I'd do differently
  Start from the content schema first next time. A couple of sections were rebuilt because the schema wasn't rich enough (e.g., contributors was a flat string list before roles got added).
quotes: []
contributors:
  - slug: adrian-dai
    role: Project Head
status: Active
featured: true
order: 1
---

## Overview

This is the meta project — the site you're currently reading is itself a Project Committee entry. It serves as a portfolio and ongoing archive of the software KTP brothers have built together at UChicago's Theta chapter.

Adrian Dai is the sole builder and maintainer of the site.

## Goals

- Give visitors a clear picture of what the Project Committee actually builds
- Make it easy to add new projects, members, and updates via a content-managed flow (no code edits required)
- Match the visual language of UChicago and KTP without being a clone of the parent fraternity site
- Deploy automatically on every push to `main`

## Stack

- **[Astro](https://astro.build)** — static site framework with content collections
- **Tailwind CSS** — utility-first styling
- **[Pages CMS](https://pagescms.org)** — form-based content editor that commits directly to the repo
- **GitHub Pages + GitHub Actions** — hosting and CI

## How to add a new project

Open [app.pagescms.org](https://app.pagescms.org), sign in with the `Addaian` GitHub account, pick the `ktprojects` repo, and add an entry to the **Projects** collection. Fill in the form, hit save — a new markdown file gets committed, the GitHub Action rebuilds, and the project is live in about a minute.
