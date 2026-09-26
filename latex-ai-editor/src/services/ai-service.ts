import { z } from "zod";
import { ThinkingLevel, type Content } from "@google/genai";
import { getGemini, geminiModels } from "@/lib/gemini";
import { AIInvalidOutputError, AIProviderError } from "@/lib/errors";
import {
  INLINE_EDIT_RESPONSE_SCHEMA,
  INLINE_EDIT_SYSTEM_PROMPT,
  buildInlineEditMessage,
  trimContext,
  type InlineEditInput,
} from "@/services/ai/inline-edit-prompt";
import { validateInlineEdit } from "@/services/ai/inline-edit-validator";
import {
  COMMAND_RESPONSE_SCHEMA,
  COMMAND_SYSTEM_PROMPT,
  buildCommandMessage,
  type CommandInput,
} from "@/services/ai/command-prompt";
import { resolveEdits, type ResolvedEdit } from "@/services/ai/command-edits";

/** Per Gemini call; with one retry the route stays under its 60 s limit. */
const ATTEMPT_TIMEOUT_MS = 25_000;
const MAX_ATTEMPTS = 2;

const ModelOutputSchema = z.object({
  replacement: z.string(),
  notes: z.string().max(500).optional(),
});

const CommandOutputSchema = z.object({
  message: z.string().max(2000),
  edits: z.array(z.object({ find: z.string(), replace: z.string() })).max(40),
});

export type CommandResult = {
  message: string;
  edits: ResolvedEdit[];
  /** Proposed edits dropped because they failed validation after the retry. */
  skipped: number;
  skippedReasons: string[];
  model: string;
  attempts: number;
  usage: TokenUsage;
};

export type TokenUsage = { input: number; output: number; thinking: number };

export type InlineEditResult = {
  replacement: string;
  notes?: string;
  model: string;
  attempts: number;
  usage: TokenUsage;
};

function parseModelOutput(text: string | undefined) {
  try {
    return ModelOutputSchema.safeParse(JSON.parse(text ?? ""));
  } catch {
    return null;
  }
}

class AIService {
  /**
   * Rewrites one selected fragment. The model must return schema-valid JSON and
   * the replacement must pass `validateInlineEdit`; otherwise the model gets one
   * retry with the reason, and after that the edit is refused.
   */
  async inlineEdit(input: InlineEditInput, model = geminiModels.fast): Promise<InlineEditResult> {
    const { before, after } = trimContext(input.codeBefore, input.codeAfter);
    const contents: Content[] = [{ role: "user", parts: [{ text: buildInlineEditMessage(input) }] }];
    const usage: TokenUsage = { input: 0, output: 0, thinking: 0 };
    let reason = "";

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let text: string | undefined;
      try {
        const response = await getGemini().models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: INLINE_EDIT_SYSTEM_PROMPT,
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseJsonSchema: INLINE_EDIT_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
            abortSignal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
          },
        });
        text = response.text;
        usage.input += response.usageMetadata?.promptTokenCount ?? 0;
        usage.output += response.usageMetadata?.candidatesTokenCount ?? 0;
        usage.thinking += response.usageMetadata?.thoughtsTokenCount ?? 0;
      } catch (error) {
        throw new AIProviderError({ model, attempt, cause: error instanceof Error ? error.message : String(error) });
      }

      const parsed = parseModelOutput(text);
      if (!parsed?.success) {
        reason = 'The answer was not JSON with a "replacement" string.';
      } else {
        const check = validateInlineEdit({
          output: parsed.data.replacement,
          selection: input.selection,
          instruction: input.instruction,
          context: `${before}\n${after}`,
        });
        if (check.ok) {
          return { replacement: check.replacement, notes: parsed.data.notes || undefined, model, attempts: attempt, usage };
        }
        reason = check.reason;
      }

      contents.push(
        { role: "model", parts: [{ text: text ?? "" }] },
        {
          role: "user",
          parts: [{ text: `Your previous answer was rejected: ${reason}\nReturn corrected JSON for the same <instruction> and <selection>, following every rule.` }],
        }
      );
    }

    throw new AIInvalidOutputError(reason);
  }

  /**
   * AI command bar: returns a message plus verified {find, replace} edits.
   * Rejected edits get one retry with the reasons; any still invalid are dropped.
   */
  async command(input: CommandInput, model = geminiModels.main): Promise<CommandResult> {
    const contents: Content[] = [{ role: "user", parts: [{ text: buildCommandMessage(input) }] }];
    const usage: TokenUsage = { input: 0, output: 0, thinking: 0 };
    let best: { message: string; edits: ResolvedEdit[]; skipped: number; skippedReasons: string[] } | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let text: string | undefined;
      try {
        const response = await getGemini().models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: COMMAND_SYSTEM_PROMPT,
            temperature: 0.2,
            maxOutputTokens: 16_384,
            responseMimeType: "application/json",
            responseJsonSchema: COMMAND_RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            abortSignal: AbortSignal.timeout(45_000),
          },
        });
        text = response.text;
        usage.input += response.usageMetadata?.promptTokenCount ?? 0;
        usage.output += response.usageMetadata?.candidatesTokenCount ?? 0;
        usage.thinking += response.usageMetadata?.thoughtsTokenCount ?? 0;
      } catch (error) {
        if (best) break; // keep what the first attempt produced
        throw new AIProviderError({ model, attempt, cause: error instanceof Error ? error.message : String(error) });
      }

      let parsed: z.infer<typeof CommandOutputSchema> | null = null;
      try {
        const result = CommandOutputSchema.safeParse(JSON.parse(text ?? ""));
        parsed = result.success ? result.data : null;
      } catch {
        parsed = null;
      }
      if (!parsed) {
        contents.push(
          { role: "model", parts: [{ text: text ?? "" }] },
          { role: "user", parts: [{ text: 'Your answer was not valid JSON with "message" and "edits". Answer again in that format.' }] }
        );
        continue;
      }

      const { accepted, rejected } = resolveEdits(input.document, parsed.edits.slice(0, 25), {
        scope: input.scope,
        instruction: input.instruction,
        compileFix: !!input.compileLog?.trim(),
        jobDescription: input.jobDescription,
      });
      const current = { message: parsed.message.trim(), edits: accepted, skipped: rejected.length, skippedReasons: rejected.map((r) => r.reason) };
      if (rejected.length === 0) return { ...current, model, attempts: attempt, usage };
      if (!best || accepted.length >= best.edits.length) best = current;

      const reasons = rejected.map((r, i) => `${i + 1}. find: ${JSON.stringify(r.find.slice(0, 200))}\n   problem: ${r.reason}`).join("\n");
      contents.push(
        { role: "model", parts: [{ text: text ?? "" }] },
        {
          role: "user",
          parts: [
            {
              text: `Some edits were rejected:\n${reasons}\nReturn the complete corrected answer (message and ALL edits, including the ones that were fine), following every rule.`,
            },
          ],
        }
      );
    }

    if (!best) throw new AIInvalidOutputError("The AI didn't return a usable answer.");
    return { ...best, model, attempts: MAX_ATTEMPTS, usage };
  }
}

export const aiService = new AIService();
