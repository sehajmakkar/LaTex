import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

/**
 * The free ATS check lives at /ats for every account. Old /ats/free links
 * (landing page, bookmarks) sign people up first, then take them there.
 */
export default async function FreeAtsRedirect() {
  const { userId } = await auth();
  redirect(userId ? "/ats" : "/sign-up?intent=ats");
}
