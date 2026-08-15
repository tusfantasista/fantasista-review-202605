import { handleContactRequest } from "./contact-api.js";
import { enforceRateLimit } from "./cloudflare-protection.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      const rateLimited = await enforceRateLimit(request, env, "CONTACT_RATE_LIMITER", "contact");
      if (rateLimited) return rateLimited;
      return handleContactRequest(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
