import { GoogleGenAI } from "@google/genai";
import { env } from "@/lib/env";

/**
 * Single Gemini client for the app. Models come from env so a retired model can
 * be swapped without a code change:
 * - `GEMINI_MODEL`: heavier tasks (ATS review, AI command bar)
 * - `GEMINI_MODEL_FAST`: small, latency-sensitive edits (inline ⌘K)
 */
let client: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
  client ??= new GoogleGenAI({
    apiKey: env.GEMINI_API_KEY ?? "",
    // The SDK's default is 5 attempts with up to 60 s backoff on 429/5xx, which can
    // outlast a route's time budget (Vercel stops functions at 60 s). One quick
    // retry covers transient errors; our services do their own retries.
    httpOptions: { retryOptions: { attempts: 2, initialDelay: 1, maxDelay: 2 } },
  });
  return client;
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export const geminiModels = {
  main: env.GEMINI_MODEL,
  fast: env.GEMINI_MODEL_FAST,
};
