import { readFile } from "node:fs/promises";

const files = {
  worker: await readFile(new URL("../public/_worker.js", import.meta.url), "utf8"),
  helper: await readFile(new URL("../public/cloudflare-protection.js", import.meta.url), "utf8"),
  festaConfig: await readFile(new URL("../wrangler.toml", import.meta.url), "utf8"),
  mainConfig: await readFile(new URL("../fantasista-site/wrangler.toml", import.meta.url), "utf8"),
  stagingConfig: await readFile(new URL("../wrangler.staging.jsonc", import.meta.url), "utf8"),
};

const checks = [
  ["FESTA Pages config avoids unsupported rate-limit bindings", !files.festaConfig.includes("ratelimits")],
  ["main-site Pages config avoids unsupported rate-limit bindings", !files.mainConfig.includes("ratelimits")],
  ["staging Pages config avoids unsupported rate-limit bindings", !files.stagingConfig.includes("ratelimits")],
  ["FESTA Pages config leaves observability to the dashboard", !files.festaConfig.includes("observability")],
  ["main-site Pages config leaves observability to the dashboard", !files.mainConfig.includes("observability")],
  ["staging Pages config leaves observability to the dashboard", !files.stagingConfig.includes("observability")],
  ["application API enforces its limiter", files.worker.includes('enforceRateLimit(request, env, "APPLICATION_RATE_LIMITER"')],
  ["public summary uses the Cache API", files.worker.includes("cache.match(cacheKey)") && files.worker.includes("cache.put(cacheKey, response.clone())")],
  ["Pages-compatible isolate fallback is bounded", files.helper.includes("MAX_LOCAL_KEYS") && files.helper.includes("enforceLocalWindow")],
  ["rate-limit logs do not include raw client IP", !files.helper.includes('ip_address:') && !files.helper.includes('cf-connecting-ip" || ""')],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failed.length) process.exitCode = 1;
