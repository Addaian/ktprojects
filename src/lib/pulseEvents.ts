import { getCollection, type CollectionEntry } from 'astro:content';

const GITHUB_API_BASE_URL = 'https://api.github.com';
const MAXIMUM_COMMITS_PER_REPOSITORY = 5;
const MAXIMUM_PULL_REQUESTS_PER_REPOSITORY = 5;
const GITHUB_REQUEST_TIMEOUT_IN_MILLISECONDS = 8000;

interface GitHubRepositoryReference {
  ownerName: string;
  repositoryName: string;
}

interface GitHubProjectReference extends GitHubRepositoryReference {
  projectSlug: string;
  projectTitle: string;
}

interface GitHubCommitResponse {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    } | null;
  };
  author: {
    login: string;
  } | null;
}

interface GitHubPullRequestResponse {
  number: number;
  html_url: string;
  title: string;
  body: string | null;
  updated_at: string;
  state: 'open' | 'closed';
  merged_at: string | null;
  user: {
    login: string;
  } | null;
}

interface BasePulseEvent {
  timestamp: Date;
  title: string;
  summary: string;
  url: string | null;
  projectSlug: string | null;
  projectTitle: string | null;
  repositoryName: string | null;
  categoryLabel: string;
}

export interface EditorialPulseEvent extends BasePulseEvent {
  source: 'editorial';
  versionLabel: string | null;
}

export interface CommitPulseEvent extends BasePulseEvent {
  source: 'commit';
  commitHash: string;
}

export interface PullRequestPulseEvent extends BasePulseEvent {
  source: 'pull_request';
  statusLabel: string;
  pullRequestNumber: number;
}

export type PulseEvent = EditorialPulseEvent | CommitPulseEvent | PullRequestPulseEvent;

function shortenText(textValue: string, maximumLength: number): string {
  const trimmedTextValue = textValue.trim();

  if (trimmedTextValue.length <= maximumLength) {
    return trimmedTextValue;
  }

  return `${trimmedTextValue.slice(0, maximumLength - 1).trimEnd()}…`;
}

function buildGitHubRequestHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  const githubToken = process.env.GITHUB_TOKEN;

  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`;
  }

  return headers;
}

async function fetchGitHubJson<ResponseType>(requestPath: string): Promise<ResponseType | null> {
  const requestUrl = `${GITHUB_API_BASE_URL}${requestPath}`;
  const abortController = new AbortController();
  const timeoutIdentifier = setTimeout(() => {
    abortController.abort();
  }, GITHUB_REQUEST_TIMEOUT_IN_MILLISECONDS);

  try {
    const response = await fetch(requestUrl, {
      headers: buildGitHubRequestHeaders(),
      signal: abortController.signal,
    });

    if (!response.ok) {
      console.warn(`GitHub request failed: ${requestUrl} (${response.status})`);
      return null;
    }

    return (await response.json()) as ResponseType;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.warn(`GitHub request failed: ${requestUrl} (${errorMessage})`);
    return null;
  } finally {
    clearTimeout(timeoutIdentifier);
  }
}

function parseGitHubRepositoryReference(repositoryUrl: string): GitHubRepositoryReference | null {
  try {
    const parsedUrl = new URL(repositoryUrl);
    const normalizedHostName = parsedUrl.hostname.toLowerCase();

    if (normalizedHostName !== 'github.com' && normalizedHostName !== 'www.github.com') {
      return null;
    }

    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

    if (pathSegments.length < 2) {
      return null;
    }

    const ownerName = pathSegments[0];
    const rawRepositoryName = pathSegments[1];
    const repositoryName = rawRepositoryName.replace(/\.git$/i, '');

    if (!ownerName || !repositoryName) {
      return null;
    }

    return {
      ownerName,
      repositoryName,
    };
  } catch {
    return null;
  }
}

export function hasLinkedGitHubRepository(project: CollectionEntry<'projects'>): boolean {
  if (!project.data.github) {
    return false;
  }

  return parseGitHubRepositoryReference(project.data.github) !== null;
}

function createGitHubProjectReference(
  project: CollectionEntry<'projects'>
): GitHubProjectReference | null {
  if (!project.data.github) {
    return null;
  }

  const repositoryReference = parseGitHubRepositoryReference(project.data.github);

  if (!repositoryReference) {
    console.warn(
      `Skipping project with invalid GitHub URL: ${project.slug} (${project.data.github})`
    );
    return null;
  }

  return {
    ownerName: repositoryReference.ownerName,
    repositoryName: repositoryReference.repositoryName,
    projectSlug: project.slug,
    projectTitle: project.data.title,
  };
}

function createCommitSummary(
  repositoryName: string,
  commitHash: string,
  authorName: string
): string {
  const shortenedCommitHash = commitHash.slice(0, 7);
  return `Commit ${shortenedCommitHash} by ${authorName} in ${repositoryName}.`;
}

function createPullRequestSummary(
  pullRequest: GitHubPullRequestResponse,
  repositoryName: string,
  statusLabel: string
): string {
  const authorName = pullRequest.user?.login ?? 'unknown author';
  const bodyPreview = pullRequest.body ? shortenText(pullRequest.body.replace(/\s+/g, ' '), 110) : '';

  if (bodyPreview.length > 0) {
    return `Pull request #${pullRequest.number} by ${authorName} in ${repositoryName}. ${bodyPreview}`;
  }

  return `Pull request #${pullRequest.number} is ${statusLabel.toLowerCase()} in ${repositoryName}.`;
}

async function fetchCommitEventsForProject(
  projectReference: GitHubProjectReference
): Promise<CommitPulseEvent[]> {
  const requestPath = `/repos/${projectReference.ownerName}/${projectReference.repositoryName}/commits?per_page=${MAXIMUM_COMMITS_PER_REPOSITORY}`;
  const commitResponses = await fetchGitHubJson<GitHubCommitResponse[]>(requestPath);

  if (!commitResponses) {
    return [];
  }

  return commitResponses
    .filter((commitResponse) => commitResponse.commit.author?.date)
    .map((commitResponse) => {
      const firstMessageLine =
        commitResponse.commit.message.split('\n')[0]?.trim() || 'Untitled commit';
      const authorName =
        commitResponse.author?.login ?? commitResponse.commit.author?.name ?? 'unknown author';

      return {
        source: 'commit',
        timestamp: new Date(commitResponse.commit.author?.date ?? 0),
        title: firstMessageLine,
        summary: createCommitSummary(
          projectReference.repositoryName,
          commitResponse.sha,
          authorName
        ),
        url: commitResponse.html_url,
        projectSlug: projectReference.projectSlug,
        projectTitle: projectReference.projectTitle,
        repositoryName: projectReference.repositoryName,
        categoryLabel: 'Commit',
        commitHash: commitResponse.sha,
      };
    });
}

function resolvePullRequestStatusLabel(pullRequest: GitHubPullRequestResponse): string {
  if (pullRequest.merged_at) {
    return 'Merged';
  }

  if (pullRequest.state === 'closed') {
    return 'Closed';
  }

  return 'Open';
}

async function fetchPullRequestEventsForProject(
  projectReference: GitHubProjectReference
): Promise<PullRequestPulseEvent[]> {
  const requestPath =
    `/repos/${projectReference.ownerName}/${projectReference.repositoryName}` +
    `/pulls?state=all&sort=updated&direction=desc&per_page=${MAXIMUM_PULL_REQUESTS_PER_REPOSITORY}`;
  const pullRequestResponses = await fetchGitHubJson<GitHubPullRequestResponse[]>(requestPath);

  if (!pullRequestResponses) {
    return [];
  }

  return pullRequestResponses.map((pullRequestResponse) => {
    const statusLabel = resolvePullRequestStatusLabel(pullRequestResponse);

    return {
      source: 'pull_request',
      timestamp: new Date(pullRequestResponse.updated_at),
      title: pullRequestResponse.title,
      summary: createPullRequestSummary(
        pullRequestResponse,
        projectReference.repositoryName,
        statusLabel
      ),
      url: pullRequestResponse.html_url,
      projectSlug: projectReference.projectSlug,
      projectTitle: projectReference.projectTitle,
      repositoryName: projectReference.repositoryName,
      categoryLabel: 'Pull Request',
      statusLabel,
      pullRequestNumber: pullRequestResponse.number,
    };
  });
}

export async function getGitHubPulseEvents(): Promise<PulseEvent[]> {
  const projects = await getCollection('projects');
  const projectReferences = projects
    .map((project) => createGitHubProjectReference(project))
    .filter((projectReference): projectReference is GitHubProjectReference => projectReference !== null);

  const pulseEventGroups = await Promise.all(
    projectReferences.map(async (projectReference) => {
      const [commitEvents, pullRequestEvents] = await Promise.all([
        fetchCommitEventsForProject(projectReference),
        fetchPullRequestEventsForProject(projectReference),
      ]);

      return [...commitEvents, ...pullRequestEvents];
    })
  );

  return pulseEventGroups.flat();
}

export async function getEditorialPulseEvents(): Promise<EditorialPulseEvent[]> {
  const editorialEntries = await getCollection('pulse');

  return editorialEntries.map((editorialEntry) => ({
    source: 'editorial',
    timestamp: editorialEntry.data.date,
    title: editorialEntry.data.title,
    summary: editorialEntry.data.excerpt ?? editorialEntry.body ?? '',
    url: null,
    projectSlug: null,
    projectTitle: null,
    repositoryName: null,
    categoryLabel: editorialEntry.data.category,
    versionLabel: editorialEntry.data.version ?? null,
  }));
}

export async function getCombinedPulseEvents(): Promise<PulseEvent[]> {
  const [editorialPulseEvents, gitHubPulseEvents] = await Promise.all([
    getEditorialPulseEvents(),
    getGitHubPulseEvents(),
  ]);

  return [...editorialPulseEvents, ...gitHubPulseEvents];
}
