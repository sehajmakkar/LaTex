import { GoogleGenerativeAI, type ModelParams } from "@google/generative-ai";
import { env } from "@/lib/env";

/**
 * Single Gemini client for the app. The model comes from `GEMINI_MODEL` so a
 * retired model can be swapped via env without a code change.
 */
const client = new GoogleGenerativeAI(env.GEMINI_API_KEY ?? "");

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export function getGeminiModel(params: Omit<ModelParams, "model">) {
  return client.getGenerativeModel({ model: env.GEMINI_MODEL, ...params });
}
