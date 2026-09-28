import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/templates(.*)",
  "/api/templates(.*)",
  "/ats/free(.*)",
  // Generated icon and share image: fetched by browsers, iOS and link previewers without a session.
  "/apple-icon(.*)",
  "/opengraph-image(.*)",
]);

const isApiRoute = createRouteMatcher(["/api(.*)", "/trpc(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;
  if (isApiRoute(req)) {
    // APIs answer in JSON: a signed-out call gets 401, not the HTML sign-in/404 page
    // (which the app couldn't parse, and which broke file uploads with a 500).
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Sign in to continue." } }, { status: 401 });
    }
    return;
  }
  await auth.protect();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|ico|svg|woff2?|map)).*)",
    "/(api|trpc)(.*)",
  ],
};
