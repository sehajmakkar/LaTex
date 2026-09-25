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
  client ??= new GoogleGenAI({ apiKey: env.GEMINI_API_KEY ?? "" });
  return client;
}

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export const geminiModels = {
  main: env.GEMINI_MODEL,
  fast: env.GEMINI_MODEL_FAST,
};
