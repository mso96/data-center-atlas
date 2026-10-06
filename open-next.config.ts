import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// All data routes are dynamic; no ISR, image service or cache bucket is needed.
export default defineCloudflareConfig({});
