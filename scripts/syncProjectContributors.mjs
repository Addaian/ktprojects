import { promises as fileSystem } from 'node:fs';
import path from 'node:path';

const repositoryRootDirectory = process.cwd();
const projectContentDirectory = path.join(repositoryRootDirectory, 'src', 'content', 'projects');
const memberContentDirectory = path.join(repositoryRootDirectory, 'src', 'content', 'members');
const memberGitHubUsernameMapPath = path.join(
  repositoryRootDirectory,
  'src',
  'data',
  'memberGithubUsernames.json'
);

const gitHubApiBaseUrl = 'https://api.github.com';
const maximumContributorPages = 10;
const contributorsPerPage = 100;
const defaultContributorRole = 'Project Contributor';

async function main() {
  const memberSlugSet = await readMemberSlugSet();
  const gitHubUsernameToMemberSlugMap = await readGitHubUsernameToMemberSlugMap(memberSlugSet);
  const projectFilePaths = await readProjectFilePaths();

  let updatedProjectCount = 0;

  for (const projectFilePath of projectFilePaths) {
    const didUpdateProject = await syncProjectContributorsForFile(
      projectFilePath,
      gitHubUsernameToMemberSlugMap
    );

    if (didUpdateProject) {
      updatedProjectCount += 1;
    }
  }

  console.log(`Contributor sync complete. Updated ${updatedProjectCount} project file(s).`);
}

async function readMemberSlugSet() {
  const memberFileNames = await fileSystem.readdir(memberContentDirectory);
  const memberSlugSet = new Set();

  for (const memberFileName of memberFileNames) {
    if (!memberFileName.endsWith('.md')) {
      continue;
    }

    const memberSlug = memberFileName.replace(/\.md$/u, '');
    memberSlugSet.add(memberSlug);
  }

  return memberSlugSet;
}

async function readGitHubUsernameToMemberSlugMap(memberSlugSet) {
  const fileContents = await fileSystem.readFile(memberGitHubUsernameMapPath, 'utf8');
  const parsedEntries = JSON.parse(fileContents);

  if (!Array.isArray(parsedEntries)) {
    throw new Error('memberGithubUsernames.json must contain an array.');
  }

  const gitHubUsernameToMemberSlugMap = new Map();

  for (const parsedEntry of parsedEntries) {
    if (
      !parsedEntry ||
      typeof parsedEntry !== 'object' ||
      typeof parsedEntry.memberSlug !== 'string' ||
      !Array.isArray(parsedEntry.githubUsernames)
    ) {
      throw new Error('Each GitHub username mapping entry must include memberSlug and githubUsernames.');
    }

    if (!memberSlugSet.has(parsedEntry.memberSlug)) {
      throw new Error(
        `GitHub username mapping references missing member slug: ${parsedEntry.memberSlug}`
      );
    }

    for (const gitHubUsername of parsedEntry.githubUsernames) {
      if (typeof gitHubUsername !== 'string' || gitHubUsername.trim().length === 0) {
        throw new Error(
          `Invalid GitHub username for member slug ${parsedEntry.memberSlug}: ${String(gitHubUsername)}`
        );
      }

      const normalizedGitHubUsername = gitHubUsername.trim().toLowerCase();

      if (gitHubUsernameToMemberSlugMap.has(normalizedGitHubUsername)) {
        throw new Error(`Duplicate GitHub username mapping found: ${gitHubUsername}`);
      }

      gitHubUsernameToMemberSlugMap.set(normalizedGitHubUsername, parsedEntry.memberSlug);
    }
  }

  return gitHubUsernameToMemberSlugMap;
}

async function readProjectFilePaths() {
  const projectFileNames = await fileSystem.readdir(projectContentDirectory);
  const projectFilePaths = [];

  for (const projectFileName of projectFileNames) {
    if (!projectFileName.endsWith('.md')) {
      continue;
    }

    projectFilePaths.push(path.join(projectContentDirectory, projectFileName));
  }

  projectFilePaths.sort((leftPath, rightPath) => leftPath.localeCompare(rightPath));
  return projectFilePaths;
}

async function syncProjectContributorsForFile(
  projectFilePath,
  gitHubUsernameToMemberSlugMap
) {
  const fileContents = await fileSystem.readFile(projectFilePath, 'utf8');
  const markdownFile = splitMarkdownFrontmatter(fileContents);

  if (!markdownFile) {
    console.warn(`Skipping project without YAML frontmatter: ${path.basename(projectFilePath)}`);
    return false;
  }

  const repositoryUrl = readTopLevelScalarValue(markdownFile.frontmatterText, 'github');

  if (!repositoryUrl) {
    return false;
  }

  const gitHubRepositoryReference = parseGitHubRepositoryReference(repositoryUrl);

  if (!gitHubRepositoryReference) {
    console.warn(
      `Skipping project with invalid GitHub repository URL: ${path.basename(projectFilePath)}`
    );
    return false;
  }

  const repositoryContributorUsernames = await fetchRepositoryContributorUsernames(
    gitHubRepositoryReference.ownerName,
    gitHubRepositoryReference.repositoryName
  );

  if (repositoryContributorUsernames === null) {
    return false;
  }

  const matchedMemberSlugs = [];

  for (const repositoryContributorUsername of repositoryContributorUsernames) {
    const normalizedGitHubUsername = repositoryContributorUsername.toLowerCase();
    const matchedMemberSlug = gitHubUsernameToMemberSlugMap.get(normalizedGitHubUsername);

    if (matchedMemberSlug && !matchedMemberSlugs.includes(matchedMemberSlug)) {
      matchedMemberSlugs.push(matchedMemberSlug);
    }
  }

  const updatedFrontmatterText = upsertContributorSection(
    markdownFile.frontmatterText,
    matchedMemberSlugs
  );

  if (updatedFrontmatterText === markdownFile.frontmatterText) {
    return false;
  }

  const updatedFileContents =
    `${markdownFile.openingDelimiter}${updatedFrontmatterText}` +
    `${markdownFile.closingDelimiter}${markdownFile.bodyText}`;
  await fileSystem.writeFile(projectFilePath, updatedFileContents, 'utf8');

  console.log(`Updated contributors in ${path.relative(repositoryRootDirectory, projectFilePath)}`);
  return true;
}

function splitMarkdownFrontmatter(fileContents) {
  const openingDelimiter = '---\n';

  if (!fileContents.startsWith(openingDelimiter)) {
    return null;
  }

  const closingDelimiterIndex = fileContents.indexOf('\n---\n', openingDelimiter.length);

  if (closingDelimiterIndex === -1) {
    return null;
  }

  const frontmatterStartIndex = openingDelimiter.length;
  const frontmatterEndIndex = closingDelimiterIndex + 1;
  const closingDelimiter = '---\n';
  const bodyStartIndex = closingDelimiterIndex + '\n---\n'.length;

  return {
    openingDelimiter,
    frontmatterText: fileContents.slice(frontmatterStartIndex, frontmatterEndIndex),
    closingDelimiter,
    bodyText: fileContents.slice(bodyStartIndex),
  };
}

function readTopLevelScalarValue(frontmatterText, fieldName) {
  const frontmatterLines = frontmatterText.split('\n');

  for (const frontmatterLine of frontmatterLines) {
    const fieldMatch = frontmatterLine.match(new RegExp(`^${fieldName}:\\s*(.*)$`, 'u'));

    if (!fieldMatch) {
      continue;
    }

    return stripWrappingQuotes(fieldMatch[1].trim());
  }

  return null;
}

function stripWrappingQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function parseGitHubRepositoryReference(repositoryUrl) {
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

    return {
      ownerName: pathSegments[0],
      repositoryName: pathSegments[1].replace(/\.git$/iu, ''),
    };
  } catch {
    return null;
  }
}

async function fetchRepositoryContributorUsernames(ownerName, repositoryName) {
  const gitHubToken = process.env.GITHUB_TOKEN;
  const requestHeaders = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
  };

  if (gitHubToken) {
    requestHeaders.Authorization = `Bearer ${gitHubToken}`;
  }

  const repositoryContributorUsernames = [];

  for (let pageNumber = 1; pageNumber <= maximumContributorPages; pageNumber += 1) {
    const requestUrl =
      `${gitHubApiBaseUrl}/repos/${ownerName}/${repositoryName}/contributors` +
      `?per_page=${contributorsPerPage}&page=${pageNumber}`;

    let response;

    try {
      response = await fetch(requestUrl, { headers: requestHeaders });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Contributor sync request failed for ${ownerName}/${repositoryName}: ${errorMessage}`);
      return null;
    }

    if (!response.ok) {
      console.warn(
        `Contributor sync request failed for ${ownerName}/${repositoryName}: ${response.status}`
      );
      return null;
    }

    const contributorRecords = await response.json();

    if (!Array.isArray(contributorRecords) || contributorRecords.length === 0) {
      break;
    }

    for (const contributorRecord of contributorRecords) {
      if (
        contributorRecord &&
        typeof contributorRecord === 'object' &&
        typeof contributorRecord.login === 'string'
      ) {
        repositoryContributorUsernames.push(contributorRecord.login);
      }
    }

    if (contributorRecords.length < contributorsPerPage) {
      break;
    }
  }

  return repositoryContributorUsernames;
}

function upsertContributorSection(frontmatterText, matchedMemberSlugs) {
  const frontmatterLines = frontmatterText.split('\n');
  const existingContributorEntries = readContributorEntries(frontmatterLines);
  const contributorSectionRange = findTopLevelSectionRange(frontmatterLines, 'contributors');

  if (
    !contributorSectionRange &&
    existingContributorEntries.length === 0 &&
    matchedMemberSlugs.length === 0
  ) {
    return frontmatterText;
  }

  const mergedContributorEntries = mergeContributorEntries(
    existingContributorEntries,
    matchedMemberSlugs
  );

  const contributorSectionLines = buildContributorSectionLines(mergedContributorEntries);

  if (contributorSectionRange) {
    const updatedFrontmatterLines = [
      ...frontmatterLines.slice(0, contributorSectionRange.startIndex),
      ...contributorSectionLines,
      ...frontmatterLines.slice(contributorSectionRange.endIndex),
    ];

    const updatedFrontmatterText = updatedFrontmatterLines.join('\n');
    return updatedFrontmatterText === frontmatterText ? frontmatterText : updatedFrontmatterText;
  }

  const insertionIndex = findContributorInsertionIndex(frontmatterLines);
  const updatedFrontmatterLines = [...frontmatterLines];
  updatedFrontmatterLines.splice(insertionIndex, 0, ...contributorSectionLines);
  return updatedFrontmatterLines.join('\n');
}

function readContributorEntries(frontmatterLines) {
  const contributorSectionRange = findTopLevelSectionRange(frontmatterLines, 'contributors');

  if (!contributorSectionRange) {
    return [];
  }

  const contributorSectionLines = frontmatterLines.slice(
    contributorSectionRange.startIndex,
    contributorSectionRange.endIndex
  );

  if (
    contributorSectionLines.length === 1 &&
    contributorSectionLines[0].trim() === 'contributors: []'
  ) {
    return [];
  }

  const contributorEntries = [];
  let activeContributorEntry = null;

  for (const contributorSectionLine of contributorSectionLines.slice(1)) {
    const slugMatch = contributorSectionLine.match(/^\s*-\s*slug:\s*(.+)\s*$/u);

    if (slugMatch) {
      activeContributorEntry = {
        memberSlug: stripWrappingQuotes(slugMatch[1].trim()),
        role: defaultContributorRole,
      };
      contributorEntries.push(activeContributorEntry);
      continue;
    }

    const roleMatch = contributorSectionLine.match(/^\s*role:\s*(.+)\s*$/u);

    if (roleMatch && activeContributorEntry) {
      activeContributorEntry.role = stripWrappingQuotes(roleMatch[1].trim());
    }
  }

  return contributorEntries;
}

function mergeContributorEntries(existingContributorEntries, matchedMemberSlugs) {
  const mergedContributorEntries = existingContributorEntries.map((contributorEntry) => ({
    memberSlug: contributorEntry.memberSlug,
    role: contributorEntry.role,
  }));
  const existingMemberSlugSet = new Set(
    existingContributorEntries.map((contributorEntry) => contributorEntry.memberSlug)
  );

  const sortedMatchedMemberSlugs = [...matchedMemberSlugs].sort((leftSlug, rightSlug) =>
    leftSlug.localeCompare(rightSlug)
  );

  for (const matchedMemberSlug of sortedMatchedMemberSlugs) {
    if (existingMemberSlugSet.has(matchedMemberSlug)) {
      continue;
    }

    mergedContributorEntries.push({
      memberSlug: matchedMemberSlug,
      role: defaultContributorRole,
    });
  }

  return mergedContributorEntries;
}

function buildContributorSectionLines(contributorEntries) {
  if (contributorEntries.length === 0) {
    return ['contributors: []'];
  }

  const contributorSectionLines = ['contributors:'];

  for (const contributorEntry of contributorEntries) {
    contributorSectionLines.push(`  - slug: ${contributorEntry.memberSlug}`);
    contributorSectionLines.push(`    role: ${contributorEntry.role}`);
  }

  return contributorSectionLines;
}

function findTopLevelSectionRange(frontmatterLines, sectionName) {
  const sectionHeader = `${sectionName}:`;

  for (let lineIndex = 0; lineIndex < frontmatterLines.length; lineIndex += 1) {
    const frontmatterLine = frontmatterLines[lineIndex];

    if (!frontmatterLine.startsWith(sectionHeader)) {
      continue;
    }

    let endIndex = frontmatterLines.length;

    for (let nextLineIndex = lineIndex + 1; nextLineIndex < frontmatterLines.length; nextLineIndex += 1) {
      const nextLine = frontmatterLines[nextLineIndex];

      if (/^[A-Za-z][A-Za-z0-9_-]*:\s*/u.test(nextLine)) {
        endIndex = nextLineIndex;
        break;
      }
    }

    return {
      startIndex: lineIndex,
      endIndex,
    };
  }

  return null;
}

function findContributorInsertionIndex(frontmatterLines) {
  const preferredSectionNames = ['status', 'featured', 'order'];

  for (let lineIndex = 0; lineIndex < frontmatterLines.length; lineIndex += 1) {
    const frontmatterLine = frontmatterLines[lineIndex];

    for (const preferredSectionName of preferredSectionNames) {
      if (frontmatterLine.startsWith(`${preferredSectionName}:`)) {
        return lineIndex;
      }
    }
  }

  return frontmatterLines.length;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
