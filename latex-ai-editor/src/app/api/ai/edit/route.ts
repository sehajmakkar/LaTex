import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiService } from "@/services/ai-service";

const AIEditRequestSchema = z.object({
  selection: z.string(),
  codeBefore: z.string(),
  codeAfter: z.string(),
  prompt: z.string().min(1).max(1000),
});

export async function POST(req: NextRequest) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        {
          error: {
            code: "CONFIG_ERROR",
            message: "Gemini API key not configured",
          },
        },
        { status: 500 },
      );
    }

    const body = await req.json();
    const parsed = AIEditRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request",
            details: parsed.error.flatten(),
          },
        },
        { status: 400 },
      );
    }

    const { selection, codeBefore, codeAfter, prompt } = parsed.data;

    const stream = aiService.streamEdit({
      selection,
      codeBefore,
      codeAfter,
      prompt,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ content: chunk })}\n\n`),
            );
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream failed" })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("AI edit error:", error);
    return NextResponse.json(
      {
        error: { code: "INTERNAL_ERROR", message: "Failed to process AI edit" },
      },
      { status: 500 },
    );
  }
}
