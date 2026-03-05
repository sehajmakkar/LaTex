import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

type SupportedSource = "upload_pdf" | "upload_docx" | "upload_txt";

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    // Pass a Uint8Array so pdfjs-dist accepts data reliably in all runtimes (Node/Next).
    const data =
      buffer.buffer != null
        ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
        : new Uint8Array(buffer);
    const parser = new PDFParse({ data });
    const result = await parser.getText();
    await parser.destroy();
    return result.text ?? "";
  } catch (error) {
    console.error("ATS upload PDF parse error:", error);
    throw new Error("PDF_PARSE_FAILED");
  }
}

async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "";
  } catch (error) {
    console.error("ATS upload DOCX parse error:", error);
    throw new Error("DOCX_PARSE_FAILED");
  }
}

async function extractTextFromTxt(buffer: Buffer): Promise<string> {
  return buffer.toString("utf-8");
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Sign in to upload a resume" } },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "BAD_REQUEST", message: "Missing file in request" } },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: {
            code: "FILE_TOO_LARGE",
            message: "File is too large. Maximum size is 5MB.",
          },
        },
        { status: 413 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mime = file.type || "";
    const lowerName = file.name.toLowerCase();

    let text = "";
    let source: SupportedSource;

    if (mime === "application/pdf" || lowerName.endsWith(".pdf")) {
      try {
        text = await extractTextFromPdf(buffer);
        source = "upload_pdf";
      } catch {
        return NextResponse.json(
          {
            error: {
              code: "PDF_PARSE_FAILED",
              message:
                "We couldn't reliably read this PDF. Try uploading a DOCX or TXT version instead.",
            },
          },
          { status: 422 }
        );
      }
    } else if (
      mime ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      lowerName.endsWith(".docx")
    ) {
      try {
        text = await extractTextFromDocx(buffer);
        source = "upload_docx";
      } catch {
        return NextResponse.json(
          {
            error: {
              code: "DOCX_PARSE_FAILED",
              message:
                "We couldn't reliably read this DOCX file. Try exporting as PDF or TXT and uploading again.",
            },
          },
          { status: 422 }
        );
      }
    } else if (mime === "text/plain" || lowerName.endsWith(".txt")) {
      text = await extractTextFromTxt(buffer);
      source = "upload_txt";
    } else {
      return NextResponse.json(
        {
          error: {
            code: "UNSUPPORTED_TYPE",
            message: "Unsupported file type. Upload PDF, DOCX, or TXT.",
          },
        },
        { status: 415 }
      );
    }

    const trimmed = text.trim();
    if (!trimmed) {
      return NextResponse.json(
        {
          error: {
            code: "EMPTY_TEXT",
            message: "Could not extract any text from the uploaded file.",
          },
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      data: {
        fileName: file.name,
        mimeType: mime || "application/octet-stream",
        source,
        text: trimmed,
      },
    });
  } catch (error) {
    console.error("ATS upload error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to process uploaded resume" } },
      { status: 500 }
    );
  }
}

