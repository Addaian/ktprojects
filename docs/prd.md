# ktprojects — Pages PRD

**Status:** Draft
**Last updated:** 2026-04-11
**Owner:** Addaian

---

## 1. Purpose

Audit the current ktprojects website, identify pages that are implied by existing UI (buttons, links) but don't yet exist, and propose a prioritized set of pages to build next. Each page is scoped to be buildable without new infrastructure — static Astro pages with content collections where appropriate.

## 2. Current state

**Live pages**

| Route | Purpose |
|---|---|
| `/` | Home — hero, stats, CTA to join |
| `/projects` | Grid of all project cards |
| `/projects/[slug]` | Detail view for a single project |
| `/members` | Grid of all member cards |

**Unwired buttons and links**

| Location | Element | Current destination |
|---|---|---|
| Nav (every page) | "Join Us" button | none — `<button>` with no href |
| Home hero | "Submit Portfolio" button | none |
| Footer (every page) | "Pulse" link | `href="#"` |

Two distinct CTAs ("Join Us", "Submit Portfolio") point nowhere, and one footer link is dead. These are the gaps this PRD addresses.

## 3. Goals

1. Every visible button and link on the site lands on a real page.
2. A visitor who wants to join the group can do so in one click from anywhere on the site.
3. The site structure supports adding news/updates over time without rebuilding the CMS.
4. All new pages are editable through Pages CMS without touching code.

## 4. Non-goals

- User accounts, authentication, or private areas
- Server-side functionality (form submissions go to third-party services, e.g. Google Forms, Formspree)
- Internationalization
- A full blog engine — "Pulse" is lightweight updates, not long-form writing

---

## 5. Proposed pages

### P0 — ship first

#### 5.1 `/join` (Join Page)

**Why:** Two unwired CTAs ("Join Us", "Submit Portfolio") both imply a join flow. This is the single most-needed page.

**Who it's for:** UChicago students and external collaborators considering applying.

**Required sections**

1. **Hero** — "Join ktprojects" headline, one-sentence value prop, current application status (open/closed).
2. **Who we're looking for** — 3-4 role cards (Engineer, Designer, Researcher, Quant) with short descriptions. Mirrors the design language of project cards for consistency.
3. **Process** — Numbered steps: submit application → interview → onboarding. Sets expectations.
4. **Application form** — Embedded Google Form *or* a button that opens `mailto:recruiting@ktprojects.com` with a prefilled subject.
5. **FAQ** — Short, 4-6 questions (time commitment, prerequisites, remote OK, etc.)

**Content source:** Hardcoded in the Astro page initially. If the role list or FAQ changes often, promote to a content collection later.

**Open questions**
- Google Form link? (Need URL from Addaian)
- Recruiting email address?
- Is application rolling or semester-based?

---

#### 5.2 `/about` (About Page)

**Why:** Visitors clicking "Join Us" want to know who they're joining. Currently the only context is the home hero tagline, which isn't enough to close the trust gap.

**Who it's for:** Potential members, potential collaborators, press/university administrators.

**Required sections**

1. **Origin story** — How and why the group formed at UChicago. 2-3 paragraphs.
2. **Mission** — One-sentence mission statement, then a short elaboration.
3. **Values** — 3-4 named values (e.g. "Precision", "Open Source", "Cross-disciplinary") with short descriptions.
4. **Leadership** — Photo + name + role for founders/leads. Could reuse the `MemberCard` component or create a compact variant.
5. **Timeline** — Optional. Key milestones (founded, first project deployed, notable accomplishments).
6. **Contact** — Email / GitHub / any other channels.

**Content source:** Hardcoded Astro page. Leadership section can pull from the existing `members` collection with a `featured: true` flag.

**Schema change:** Add `featured: boolean` to the members content collection schema.

---

### P1 — ship after P0 is live

#### 5.3 `/pulse` (Updates / News)

**Why:** Removes the dead footer link. Gives the group a place to announce new projects, wins, and milestones without tweeting them into the void.

**Who it's for:** Returning visitors, university community, followers who want to see the group is active.

**Scope:** Intentionally lightweight — *not* a full blog. Think "changelog with personality."

**Required sections**

1. **Feed** — Reverse-chronological list of entries. Each entry has: date, title, category (Release, Announcement, Award, Milestone), 1-3 paragraph body, optional image.
2. **Filter by category** — Client-side filter, no pagination initially (we're not going to hit 100 entries any time soon).

**Content source:** New content collection `src/content/pulse/` with markdown entries. Added to Pages CMS config so updates are editable via the CMS.

**Schema (new collection)**
```
title: string
date: date
category: "Release" | "Announcement" | "Award" | "Milestone"
image: string (optional)
body: markdown
```

**Open question:** Does each entry get its own permalink (`/pulse/neural-lattice-v2-launch`) or is it a single-page feed? Recommendation: single-page feed for v1, split into permalinks later if SEO matters.

---

#### 5.4 `/members/[slug]` (Member Detail Pages)

**Why:** Symmetry with projects — each project has a detail page, so it's natural for each member to have one too. Also makes "Contributions" chips on the member card clickable and linkable.

**Who it's for:** Visitors curious about an individual member; members themselves, who can share a permalink as a portfolio item.

**Required sections**

1. **Hero** — Avatar, name, role, tier badge.
2. **Bio** — Longer paragraph from the member's markdown body.
3. **Skills** — The existing skill bars, larger format.
4. **Contributions** — Clickable chips that link to the corresponding `/projects/[slug]` pages.
5. **Links** — Optional GitHub, personal site, LinkedIn (new schema fields).

**Schema change:** Add optional `bio` (body markdown already supports this), `github`, `website`, `linkedin` fields to the members collection.

---

### P2 — nice to have, not blocking

- **`/404`** — Custom not-found page matching the site's design language. Astro generates a generic 404 by default; replacing it is a small polish win.
- **`/contact`** — Could fold into `/about` or `/join` — probably doesn't need its own page.
- **Tag/category filtered project views** (`/projects?category=AI`) — The filter UI already exists on the projects page as static chips; wiring them up is a small follow-up task.

---

## 6. Priority and sequencing

| Order | Page | Rough effort | Blocks what |
|---|---|---|---|
| 1 | `/join` | Small | Two dead CTAs currently visible on every page |
| 2 | `/about` | Small | Nothing directly, but adds context to /join |
| 3 | `/pulse` | Medium (new collection + CMS config) | Dead footer link |
| 4 | `/members/[slug]` | Small (mirrors existing project detail) | Contribution chips on member cards |
| 5 | `/404` | Small | Nothing — pure polish |

**Recommendation:** Ship 1 and 2 in the same push. Then evaluate whether Pulse is actually wanted (it requires ongoing effort to populate — an empty Pulse page is worse than no Pulse page).

---

## 7. Cross-cutting requirements

All new pages must:

- Use the existing `Layout.astro` so they inherit the nav, footer, and global styles
- Set the correct `active` prop on the nav so the current page is highlighted (requires adding new nav entries)
- Match the visual language of existing pages (same card styles, typography, color usage)
- Be editable via Pages CMS where it makes sense (content collections), or be clearly marked as "edit the `.astro` file" pages (About, Join)
- Work on mobile — the existing pages are responsive, so this is mostly about not breaking it

**Nav changes:** Adding a "Join Us" button (already there) and potentially "About" / "Pulse" nav links. If the nav gets cramped, move "Pulse" to the footer only and keep the top nav to: Home, Projects, Members, About + Join Us button.

---

## 8. Open questions

1. **Application form:** Google Form URL? Or should we build a Formspree-powered form directly in the page?
2. **Recruiting email:** Is there a group inbox, or does it route to an individual?
3. **Leadership for About page:** Who are the founders/leads we want pictured?
4. **Pulse commitment:** Is someone actually going to write and publish updates, or is it a "build it and no one will write" situation? (Honest question — better to cut it than have an empty feed.)
5. **Member links:** Do members want their real GitHub / LinkedIn / personal sites listed publicly on the site?
6. **"Pulse" name:** Does this branding actually fit, or is it a placeholder? If placeholder, what do we rename to? (Could be "Updates", "Log", "Field Notes", etc.)

---

## 9. Out of scope (for this iteration)

- Search functionality across projects/members
- RSS feed for Pulse
- Social sharing cards (Open Graph images)
- Analytics
- Comment threads on Pulse entries
- Member login / private member areas
