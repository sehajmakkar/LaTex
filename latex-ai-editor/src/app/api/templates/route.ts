import { NextResponse } from "next/server";
import { templateService } from "@/services/template-service";

export async function GET() {
  try {
    const templates = templateService.list();
    return NextResponse.json({ data: templates });
  } catch (error) {
    console.error("Error listing templates:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } },
      { status: 500 }
    );
  }
}
