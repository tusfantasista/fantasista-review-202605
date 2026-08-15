import { readFile } from "node:fs/promises";

const files = {
  worker: await readFile(new URL("../public/_worker.js", import.meta.url), "utf8"),
  helper: await readFile(new URL("../public/cloudflare-protection.js", import.meta.url), "utf8"),
  festaConfig: await readFile(new URL("../wrangler.toml", import.meta.url), "utf8"),
  mainConfig: await readFile(new URL("../fantasista-site/wrangler.toml", import.meta.url), "utf8"),
  stagingConfig: await readFile(new URL("../wrangler.staging.jsonc", import.meta.url), "utf8"),
};

const requiredBindings = ["CONTACT_RATE_LIMITER", "APPLICATION_RATE_LIMITER", "PUBLIC_SUMMARY_RATE_LIMITER"];
const checks = [
  ["FESTA production observability is sampled", /\[observability\][\s\S]*head_sampling_rate\s*=\s*0\.1/.test(files.festaConfig)],
  ["main-site production observability is sampled", /\[observability\][\s\S]*head_sampling_rate\s*=\s*0\.1/.test(files.mainConfig)],
  ["staging observability captures all invocations", /"head_sampling_rate"\s*:\s*1/.test(files.stagingConfig)],
  ["FESTA production declares all API limiters", requiredBindings.every((name) => files.festaConfig.includes(`name = "${name}"`))],
  ["staging declares all API limiters", requiredBindings.every((name) => files.stagingConfig.includes(`"name": "${name}"`))],
  ["main site rate-limits contact submissions", files.mainConfig.includes('name = "CONTACT_RATE_LIMITER"')],
  ["application API enforces its limiter", files.worker.includes('enforceRateLimit(request, env, "APPLICATION_RATE_LIMITER"')],
  ["public summary uses the Cache API", files.worker.includes("cache.match(cacheKey)") && files.worker.includes("cache.put(cacheKey, response.clone())")],
  ["rate-limit logs do not include raw client IP", !files.helper.includes('ip_address:') && !files.helper.includes('cf-connecting-ip" || ""')],
];

const failed = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) {
  console.log(`${passed ? "PASS" : "FAIL"} ${label}`);
}

if (failed.length) process.exitCode = 1;
