"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

export type Usage = {
  plan: "free" | "pro";
  subscriptionStatus: string | null;
  limits: { projects: number; aiEditsPerMonth: number; atsAiReviewsPerMonth: number };
  usage: { projects: number; aiEdits: number; atsAiReviews: number };
};

/** Plan and monthly usage for the signed-in user (null when signed out). */
export function useUsage() {
  const { isSignedIn } = useAuth();
  return useQuery({
    queryKey: ["usage"],
    enabled: !!isSignedIn,
    queryFn: async (): Promise<Usage> => {
      const res = await fetch("/api/usage");
      if (!res.ok) throw new Error("Failed to load usage");
      return (await res.json()).data;
    },
  });
}
