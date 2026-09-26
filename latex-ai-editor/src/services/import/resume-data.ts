import { z } from "zod";

/**
 * A resume as structured data: what the AI reads out of a PDF/DOCX, before we
 * render it to LaTeX ourselves. Text fields hold the file's wording verbatim.
 */
export const ResumeDataSchema = z.object({
  name: z.string().max(200),
  headline: z.string().max(300).optional().default(""),
  contact: z
    .object({
      email: z.string().max(200).optional().default(""),
      phone: z.string().max(100).optional().default(""),
      location: z.string().max(200).optional().default(""),
      links: z.array(z.object({ label: z.string().max(200), url: z.string().max(500) })).max(10).default([]),
    })
    .default({ email: "", phone: "", location: "", links: [] }),
  sections: z
    .array(
      z.object({
        title: z.string().max(120),
        kind: z.enum(["entries", "list", "skills", "text"]),
        entries: z
          .array(
            z.object({
              title: z.string().max(300),
              subtitle: z.string().max(300).optional().default(""),
              date: z.string().max(100).optional().default(""),
              location: z.string().max(200).optional().default(""),
              bullets: z.array(z.string().max(2000)).max(40).default([]),
            })
          )
          .max(40)
          .default([]),
        items: z.array(z.string().max(2000)).max(60).default([]),
        groups: z.array(z.object({ label: z.string().max(200), value: z.string().max(2000) })).max(30).default([]),
        text: z.string().max(5000).optional().default(""),
      })
    )
    .max(20),
});

export type ResumeData = z.infer<typeof ResumeDataSchema>;
export type ResumeSection = ResumeData["sections"][number];

/** JSON schema for Gemini's structured output (mirrors ResumeDataSchema). */
export const RESUME_DATA_JSON_SCHEMA = {
  type: "object",
  properties: {
    name: { type: "string" },
    headline: { type: "string", description: "Title/tagline under the name, if the resume has one." },
    contact: {
      type: "object",
      properties: {
        email: { type: "string" },
        phone: { type: "string" },
        location: { type: "string" },
        links: {
          type: "array",
          items: {
            type: "object",
            properties: {
              label: { type: "string", description: "Text as shown, e.g. linkedin.com/in/jane or GitHub." },
              url: { type: "string", description: "Full URL if visible or obvious from the label, else the label." },
            },
            required: ["label", "url"],
          },
        },
      },
    },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Section heading exactly as written." },
          kind: {
            type: "string",
            enum: ["entries", "list", "skills", "text"],
            description:
              "entries: jobs, education, projects (heading lines + bullets). list: plain bullet list. skills: 'Label: values' lines. text: a paragraph such as a summary.",
          },
          entries: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "The main (usually bold) line: role, school or project name." },
                subtitle: { type: "string", description: "Second line: company, degree, tech stack." },
                date: { type: "string" },
                location: { type: "string" },
                bullets: { type: "array", items: { type: "string" } },
              },
              required: ["title", "bullets"],
            },
          },
          items: { type: "array", items: { type: "string" } },
          groups: {
            type: "array",
            items: {
              type: "object",
              properties: { label: { type: "string" }, value: { type: "string" } },
              required: ["label", "value"],
            },
          },
          text: { type: "string" },
        },
        required: ["title", "kind"],
      },
    },
  },
  required: ["name", "contact", "sections"],
} as const;

/** Every piece of visible text in the data, with a short label for reports. */
export function resumeStrings(data: ResumeData): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  const add = (where: string, text: string | undefined) => {
    if (text?.trim()) out.push({ where, text: text.trim() });
  };
  add("Name", data.name);
  add("Headline", data.headline);
  add("Email", data.contact.email);
  add("Phone", data.contact.phone);
  add("Location", data.contact.location);
  data.contact.links.forEach((l) => add("Link", l.label));
  for (const s of data.sections) {
    add("Section", s.title);
    for (const e of s.entries) {
      add(s.title, e.title);
      add(s.title, e.subtitle);
      add(s.title, e.date);
      add(s.title, e.location);
      e.bullets.forEach((b) => add(s.title, b));
    }
    s.items.forEach((i) => add(s.title, i));
    for (const g of s.groups) {
      add(s.title, g.label);
      add(s.title, g.value);
    }
    add(s.title, s.text);
  }
  return out;
}
