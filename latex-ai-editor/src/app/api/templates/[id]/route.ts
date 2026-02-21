import { NextRequest, NextResponse } from "next/server";
import { templateService } from "@/services/template-service";
import { AppError } from "@/lib/errors";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const variablesParam = searchParams.get("variables");
    let variables: Record<string, string> | undefined;
    if (variablesParam) {
      try {
        variables = JSON.parse(decodeURIComponent(variablesParam)) as Record<string, string>;
      } catch {
        variables = undefined;
      }
    }
    const template = templateService.getById(id, variables);
    return NextResponse.json({ data: template });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error("Error fetching template:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch template" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    let variables: Record<string, string> = {};
    if (body && typeof body === "object" && typeof body.variables === "object" && body.variables !== null) {
      variables = body.variables as Record<string, string>;
    }
    const content = templateService.getContentWithVariables(id, variables);
    return NextResponse.json({ data: { content } });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.statusCode }
      );
    }
    console.error("Error getting template content:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to get template content" } },
      { status: 500 }
    );
  }
}
