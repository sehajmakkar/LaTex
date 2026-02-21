import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const LATEX_SYSTEM_PROMPT = `You are an expert LaTeX editor assistant. Your task is to modify LaTeX code based on user instructions.

CRITICAL RULES:
1. Return ONLY the replacement code - no explanations, no markdown code blocks, no extra text
2. Preserve the document structure and formatting style
3. Use valid LaTeX commands and syntax
4. Maintain consistent indentation with the surrounding code
5. If adding new packages, only include the \\usepackage command if absolutely necessary
6. Keep the same document class and style unless explicitly asked to change it

You will receive:
- The selected code to modify
- Code before the selection (for context)
- Code after the selection (for context)
- The user's instruction

Respond with ONLY the replacement text that should replace the selected code.`;

export type AIEditRequest = {
  selection: string;
  codeBefore: string;
  codeAfter: string;
  prompt: string;
};

export type AIEditResponse = {
  replacement: string;
};

class AIService {
  private getModel() {
    return genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: LATEX_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    });
  }

  async generateEdit(request: AIEditRequest): Promise<AIEditResponse> {
    const userMessage = this.buildUserMessage(request);
    const model = this.getModel();

    const result = await model.generateContent(userMessage);
    const replacement = result.response.text().trim() || request.selection;

    return { replacement };
  }

  async *streamEdit(request: AIEditRequest): AsyncGenerator<string> {
    const userMessage = this.buildUserMessage(request);
    const model = this.getModel();

    const result = await model.generateContentStream(userMessage);

    for await (const chunk of result.stream) {
      const content = chunk.text();
      if (content) {
        yield content;
      }
    }
  }

  private buildUserMessage(request: AIEditRequest): string {
    return `SELECTED CODE TO MODIFY:
\`\`\`latex
${request.selection}
\`\`\`

CODE BEFORE SELECTION:
\`\`\`latex
${request.codeBefore.slice(-500)}
\`\`\`

CODE AFTER SELECTION:
\`\`\`latex
${request.codeAfter.slice(0, 500)}
\`\`\`

USER INSTRUCTION: ${request.prompt}

Remember: Return ONLY the replacement code, nothing else.`;
  }
}

export const aiService = new AIService();
