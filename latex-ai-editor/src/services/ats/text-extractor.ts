export type ExtractedSection = {
  name: string;
  lines: string[];
};

export type LatexExtractionResult = {
  text: string;
  sections: ExtractedSection[];
};

/**
 * Best-effort LaTeX → plain text extractor for resumes.
 * - Preserves high-level section headings (Experience, Education, etc.)
 * - Strips most LaTeX commands and environments.
 * - Returns a flat plain-text version plus a simple section breakdown.
 */
export function extractPlainTextFromLatex(source: string): LatexExtractionResult {
  // Normalize newlines
  let content = source.replace(/\r\n/g, "\n");

  // Remove comments (lines starting with %)
  content = content
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("%"))
    .join("\n");

  const sections: ExtractedSection[] = [];
  let currentSection: ExtractedSection | null = null;

  // Replace sectioning commands with plain headings and capture them
  content = content.replace(
    /\\(section|subsection|subsubsection)\s*\*?\s*{([^}]*)}/g,
    (_match, _level, title) => {
      const name = String(title).trim();
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { name, lines: [] };
      return `\n\n${name}\n`;
    }
  );

  // Strip common LaTeX environments (\begin{...}...\end{...})
  content = content.replace(/\\begin{[^}]+}/g, "\n");
  content = content.replace(/\\end{[^}]+}/g, "\n");

  // Remove inline formatting commands but keep their arguments:
  // \textbf{X} -> X, \emph{Y} -> Y, etc.
  content = content.replace(/\\(textbf|textit|emph|underline|textsc)\s*{([^}]*)}/g, "$2");

  // Generic command removal: \command[opt]{arg} -> arg, \command{arg} -> arg, \command -> ""
  content = content.replace(/\\[a-zA-Z]+\s*(\[[^\]]*])?\s*{([^}]*)}/g, "$2");
  content = content.replace(/\\[a-zA-Z]+\s*(\[[^\]]*])?/g, "");

  // Replace multiple spaces/newlines with single spaces/newlines
  content = content.replace(/[ \t]+/g, " ");
  content = content.replace(/\n{3,}/g, "\n\n");

  const lines = content.split("\n");
  if (!currentSection) {
    currentSection = { name: "Document", lines: [] };
  }

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    // Heuristic: treat lines that look like headings as potential implicit sections
    if (/^[A-Z][A-Za-z ]{2,}$/.test(trimmed) && trimmed.length < 40) {
      // If this line is one of the standard resume headings and not already a section, start a new section
      const headingNames = [
        "Experience",
        "Work Experience",
        "Education",
        "Skills",
        "Projects",
        "Summary",
        "Objective",
      ];
      if (headingNames.includes(trimmed)) {
        if (currentSection && currentSection.lines.length > 0) {
          sections.push(currentSection);
        }
        currentSection = { name: trimmed, lines: [] };
        continue;
      }
    }
    currentSection.lines.push(trimmed);
  }

  if (currentSection && currentSection.lines.length > 0) {
    sections.push(currentSection);
  }

  const plainText = sections.map((s) => [s.name, ...s.lines].join("\n")).join("\n\n");

  return {
    text: plainText,
    sections,
  };
}

