import { Polar } from "@polar-sh/sdk";

// POLAR_SERVER can be 'sandbox' | 'production' per Polar SDK docs.
// Default to 'sandbox' for local/dev; override in production via env.
export const polarClient = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_SERVER as "sandbox" | "production") ?? "sandbox",
});
