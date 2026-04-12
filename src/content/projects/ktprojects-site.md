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
image: /ktprojects/main_1.jpg
images: []
quotes: []
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
