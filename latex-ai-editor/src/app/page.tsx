import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { parseIntent, postAuthPath, serializeIntent } from "@/lib/intents";

type Props = { searchParams: Promise<{ intent?: string | string[] }> };

/**
 * The app has no landing page of its own (that's the marketing site). Send
 * signed-in users to their resumes and everyone else to sign-up, keeping any
 * ?intent= from the landing site.
 */
export default async function Root({ searchParams }: Props) {
  const raw = (await searchParams).intent;
  const intent = parseIntent(Array.isArray(raw) ? raw[0] : raw);
  const { userId } = await auth();
  if (userId) redirect(postAuthPath(intent));
  redirect(intent ? `/sign-up?intent=${encodeURIComponent(serializeIntent(intent))}` : "/sign-in");
}
