/** Brand and outbound links, shared by the shell, auth pages and metadata. */
export const site = {
  name: "Vero",
  tagline: "LaTeX resumes with an AI co-editor",
  description: "Write, tailor and check your resume in LaTeX, with AI editing and a free ATS check.",
  /** The separate marketing site that sends users here. */
  marketingUrl: process.env.NEXT_PUBLIC_MARKETING_URL || "https://texels.vercel.app",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "",
};
