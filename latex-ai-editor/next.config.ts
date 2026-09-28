import type { NextConfig } from "next";

/**
 * Production deployments must not start half-configured. Core variables fail
 * the build (the app can't work without them); feature variables only warn,
 * because billing, storage and the Clerk webhook can be set up after a first
 * deploy. Promote them to CORE at launch (Phase 6).
 */
const CORE_ENV = [
  "DATABASE_URL",
  "CLERK_SECRET_KEY",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "GEMINI_API_KEY",
  "LATEX_SERVICE_URL",
  "LATEX_API_SECRET",
];
const FEATURE_ENV = [
  "NEXT_PUBLIC_APP_URL",
  "DODO_PAYMENTS_API_KEY",
  "DODO_PAYMENTS_WEBHOOK_KEY",
  "DODO_PRODUCT_ID_PRO",
  "R2_ENDPOINT",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
  "CLERK_WEBHOOK_SIGNING_SECRET",
];

if (process.env.VERCEL_ENV === "production") {
  const missing = CORE_ENV.filter((k) => !process.env[k]?.trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables for production: ${missing.join(", ")}`);
  }
  const missingFeatures = FEATURE_ENV.filter((k) => !process.env[k]?.trim());
  if (missingFeatures.length) {
    console.warn(`⚠ Production is missing optional environment variables (features will be off): ${missingFeatures.join(", ")}`);
  }
}

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
