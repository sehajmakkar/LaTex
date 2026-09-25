"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { parseIntent } from "@/lib/intents";
import { createProjectFromTemplate, startProCheckout } from "@/lib/client/actions";

/**
 * Carries out an ?intent= from the landing site once the user is signed in
 * (it survives sign-up via the post-auth redirect). Runs once, then removes
 * the parameter so a refresh doesn't repeat it.
 */
export function IntentHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const handled = useRef(false);

  useEffect(() => {
    if (!isLoaded || handled.current) return;
    const intent = parseIntent(params.get("intent"));
    if (!intent) return;
    handled.current = true;
    router.replace("/dashboard", { scroll: false });

    if (intent.kind === "ats") {
      router.push("/ats");
    } else if (intent.kind === "pro") {
      toast.promise(startProCheckout(), { loading: "Opening checkout…", error: (e: Error) => e.message });
    } else if (intent.kind === "template") {
      toast.promise(
        createProjectFromTemplate(intent.templateId, user?.firstName).then((id) => router.push(`/project/${id}`)),
        { loading: "Creating your resume from the template…", error: (e: Error) => e.message }
      );
    }
    // "start": nothing to do, the dashboard's onboarding is the starting point.
  }, [isLoaded, params, router, user?.firstName]);

  return null;
}
