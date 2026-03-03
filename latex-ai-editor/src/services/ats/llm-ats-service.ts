import { GoogleGenerativeAI } from "@google/generative-ai";

export type LLMSuggestion = {
  text: string;
  priority: "high" | "medium" | "low";
};

export type LLMResult = {
  qualityScore: number;
  summary: string;
  suggestions: LLMSuggestion[];
};

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const ATS_LLM_SYSTEM_PROMPT = `You are an expert technical recruiter and resume reviewer.
You receive the plain-text content of a candidate's resume and (optionally) a job description.

You must:
- Assign a QUALITY_SCORE from 0 to 100 based on clarity, impact, and use of strong action verbs and measurable outcomes.
- Provide a 2–3 sentence SUMMARY describing how strong the resume is overall.
- Suggest concrete improvements (SUGGESTIONS) as short, actionable bullet points.

Return ONLY a valid JSON object with this shape:
{
  "qualityScore": number,   // 0-100
  "summary": string,
  "suggestions": [
    { "text": string, "priority": "high" | "medium" | "low" }
  ]
}

Rules:
- Do NOT include any commentary outside of the JSON.
- Do NOT include markdown, backticks, or code fences.
- Keep suggestions specific and actionable (e.g. "Add a measurable impact to the first bullet under Experience").`;

export class LLMAtsService {
  private getModel() {
    return genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: ATS_LLM_SYSTEM_PROMPT,
      generationConfig: {
        temperature: 0.3,
      },
    });
  }

  async analyze(plainText: string, jobDescription?: string): Promise<LLMResult> {
    const model = this.getModel();
    const prompt = this.buildUserPrompt(plainText, jobDescription);
    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    let parsed: LLMResult;
    try {
      parsed = JSON.parse(raw) as LLMResult;
    } catch {
      // Fallback: best effort parse by stripping fences or text before/after JSON
      const jsonMatch = raw.match(/\{[\s\S]*\}$/);
      if (!jsonMatch) {
        throw new Error("Failed to parse LLM ATS JSON response");
      }
      parsed = JSON.parse(jsonMatch[0]) as LLMResult;
    }

    const qualityScore =
      typeof parsed.qualityScore === "number"
        ? Math.max(0, Math.min(100, Math.round(parsed.qualityScore)))
        : 0;

    return {
      qualityScore,
      summary: parsed.summary ?? "",
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
    };
  }

  private buildUserPrompt(plainText: string, jobDescription?: string): string {
    const trimmedResume = plainText.slice(0, 8000);
    const jd = jobDescription?.trim();

    if (jd) {
      const trimmedJd = jd.slice(0, 4000);
      return `RESUME (plain text):
${trimmedResume}

JOB DESCRIPTION (plain text):
${trimmedJd}

Return the JSON as specified.`;
    }

    return `RESUME (plain text):
${trimmedResume}

No job description provided.

Return the JSON as specified.`;
  }
}

export const llmAtsService = new LLMAtsService();

