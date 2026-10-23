// Creates a draft GitHub release before electron-builder publishes, then publishes it afterwards.
//
// Usage:
//   node scripts/github-release.mjs draft <notesFile> [--prerelease]
//   node scripts/github-release.mjs publish

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const { owner, repo } = packageJson.build.publish;
const tag = `v${packageJson.version}`;
const token = process.env.GH_TOKEN;

async function github(method, endpoint, body) {
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error(`${method} ${endpoint} failed: ${response.status} ${await response.text()}`);
  return response.json();
}

async function findRelease() {
  const releases = await github("GET", "/releases?per_page=100");
  return releases.find((release) => release.tag_name === tag);
}

async function createDraft(notesFile, prerelease) {
  const existing = await findRelease();
  if (existing?.draft) {
    console.log(`Reusing existing draft release ${tag}.`);
    return;
  }
  if (existing) {
    throw new Error(`Release ${tag} is already published. Delete it on GitHub or bump "version" in package.json.`);
  }
  const notes = fs.readFileSync(path.join(__dirname, "..", notesFile), "utf8");
  await github("POST", "/releases", { tag_name: tag, name: packageJson.version, body: notes, draft: true, prerelease });
  console.log(`Created draft release ${tag}${prerelease ? " (pre-release)" : ""}.`);
}

async function publishDraft() {
  const existing = await findRelease();
  if (!existing) throw new Error(`No release found for ${tag}.`);
  if (!existing.draft) {
    console.log(`Release ${tag} is already published.`);
    return;
  }
  await github("PATCH", `/releases/${existing.id}`, { draft: false });
  console.log(`Published release https://github.com/${owner}/${repo}/releases/tag/${tag}`);
}

const [command, notesFile] = process.argv.slice(2);
if (!token) {
  console.error("GH_TOKEN is not set.");
  process.exit(1);
}
try {
  if (command === "draft" && notesFile) await createDraft(notesFile, process.argv.includes("--prerelease"));
  else if (command === "publish") await publishDraft();
  else throw new Error("Usage: github-release.mjs draft <notesFile> [--prerelease] | publish");
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
