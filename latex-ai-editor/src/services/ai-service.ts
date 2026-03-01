import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const LATEX_SYSTEM_PROMPT = `You are an expert LaTeX editor. You receive a fragment of LaTeX source and a user instruction, and you output the rewritten fragment.

OUTPUT RULES — FOLLOW EXACTLY:
- Output raw LaTeX only. No markdown. No code fences. No backticks. No \`\`\`latex. No \`\`\`.
- Do not explain anything. Do not add comments unless the user asks for comments.
- Do not include anything before or after the replacement code.
- Your entire response must be valid LaTeX that can be pasted directly into a .tex file.

EDITING RULES:
- Preserve indentation and formatting style of the surrounding code.
- Only introduce \\usepackage{} if it is strictly required by the change.
- Do not change the document class or global structure unless explicitly asked.
- If the instruction is ambiguous, make the most minimal change that satisfies it.`;

export type AIEditRequest = {
  selection: string;
  codeBefore: string;
  codeAfter: string;
  prompt: string;
};

export type AIEditResponse = {
  replacement: string;
};

function stripCodeFences(text: string): string {
  const stripped = text
    .trim()
    .replace(/^```(?:latex|tex)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "")
    .trim();
  return stripped;
}

class AIService {
  private getModel() {
    return genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: LATEX_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.2,
      },
    });
  }

  async generateEdit(request: AIEditRequest): Promise<AIEditResponse> {
    const userMessage = this.buildUserMessage(request);
    const model = this.getModel();

    const result = await model.generateContent(userMessage);
    const raw = result.response.text().trim() || request.selection;
    const replacement = stripCodeFences(raw);

    return { replacement };
  }

  async *streamEdit(request: AIEditRequest): AsyncGenerator<string> {
    const userMessage = this.buildUserMessage(request);
    const model = this.getModel();

    const result = await model.generateContentStream(userMessage);

    let buffer = "";
    let headerStripped = false;

    for await (const chunk of result.stream) {
      const content = chunk.text();
      if (!content) continue;

      if (!headerStripped) {
        // Accumulate until we can safely strip the opening fence
        buffer += content;

        // Wait until we have enough to detect and strip the opening fence
        const fenceMatch = buffer.match(/^```(?:latex|tex)?\s*\n?/i);
        if (fenceMatch) {
          buffer = buffer.slice(fenceMatch[0].length);
          headerStripped = true;
          if (buffer) yield buffer;
          buffer = "";
        } else if (buffer.length > 20) {
          // No fence found after 20 chars — output as-is
          headerStripped = true;
          yield buffer;
          buffer = "";
        }
        continue;
      }

      yield content;
    }

    // Flush remaining buffer (strip trailing fence if present)
    if (buffer) {
      yield stripCodeFences(buffer);
    }
  }

  private buildUserMessage(request: AIEditRequest): string {
    return `CONTEXT BEFORE SELECTION:
${request.codeBefore.slice(-500)}

SELECTED CODE (replace this):
${request.selection}

CONTEXT AFTER SELECTION:
${request.codeAfter.slice(0, 500)}

INSTRUCTION: ${request.prompt}`;
  }
}

export const aiService = new AIService();