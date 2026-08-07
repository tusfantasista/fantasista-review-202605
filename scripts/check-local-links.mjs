import fs from "node:fs";
import path from "node:path";

const root = path.resolve(process.argv[2] || "public");
const htmlFiles = [];
const cssFiles = [];

function collectFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) collectFiles(filePath);
    else if (entry.name.endsWith(".html")) htmlFiles.push(filePath);
    else if (entry.name.endsWith(".css")) cssFiles.push(filePath);
  }
}

collectFiles(root);

const problems = [];
const htmlIds = new Map();
const externalPattern = /^(?:https?:|mailto:|tel:|javascript:|data:|blob:)/i;

function idsFor(filePath) {
  if (htmlIds.has(filePath)) return htmlIds.get(filePath);
  const ids = new Set();
  if (fs.existsSync(filePath) && filePath.endsWith(".html")) {
    const html = fs.readFileSync(filePath, "utf8");
    for (const match of html.matchAll(/\b(?:id|name)=["']([^"']+)["']/g)) ids.add(match[1]);
  }
  htmlIds.set(filePath, ids);
  return ids;
}

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function resolveLocalTarget(sourceFile, rawPath) {
  const decodedPath = decodePath(rawPath);
  let target = decodedPath.startsWith("/")
    ? path.join(root, decodedPath.slice(1))
    : path.resolve(path.dirname(sourceFile), decodedPath);

  if (decodedPath.endsWith("/")) target = path.join(target, "index.html");
  else if (fs.existsSync(target) && fs.statSync(target).isDirectory()) target = path.join(target, "index.html");
  return target;
}

function checkReference(sourceFile, originalValue) {
  const value = originalValue.trim();
  if (!value || externalPattern.test(value)) return;

  const hashIndex = value.indexOf("#");
  const queryIndex = value.indexOf("?");
  const pathEndCandidates = [hashIndex, queryIndex].filter((index) => index >= 0);
  const pathEnd = pathEndCandidates.length ? Math.min(...pathEndCandidates) : value.length;
  const rawPath = value.slice(0, pathEnd);
  const fragment = hashIndex >= 0 ? decodePath(value.slice(hashIndex + 1)) : "";
  const target = rawPath ? resolveLocalTarget(sourceFile, rawPath) : sourceFile;

  if (!fs.existsSync(target)) {
    problems.push(`${path.relative(root, sourceFile)} -> ${originalValue} (missing target)`);
    return;
  }

  if (fragment && target.endsWith(".html") && !idsFor(target).has(fragment)) {
    problems.push(`${path.relative(root, sourceFile)} -> ${originalValue} (missing fragment #${fragment})`);
  }
}

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(htmlFile, "utf8");
  for (const match of html.matchAll(/\b(?:href|src|poster)=["']([^"']+)["']/g)) {
    checkReference(htmlFile, match[1]);
  }
  for (const match of html.matchAll(/\bsrcset=["']([^"']+)["']/g)) {
    for (const candidate of match[1].split(",")) {
      const url = candidate.trim().split(/\s+/)[0];
      if (url) checkReference(htmlFile, url);
    }
  }
}

for (const cssFile of cssFiles) {
  const css = fs.readFileSync(cssFile, "utf8");
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    checkReference(cssFile, match[1]);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`All local links, assets, and fragments resolved across ${htmlFiles.length} HTML and ${cssFiles.length} CSS files.`);
}
