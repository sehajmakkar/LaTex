import { describe, expect, it } from "vitest";
import { repairJsonEscapes } from "./json-escapes";

const doc = String.raw`\begin{document}
  \resumeSubheading
    {\textbf{Gitlytics} $|$ \emph{Python}}{June 2020}
    \resumeItem{Built a REST API}
  \noindent Skills: \frac{1}{2}
\end{document}
`;

describe("repairJsonEscapes", () => {
  it("turns control characters from unescaped JSON back into macros", () => {
    // What JSON.parse makes of "\resumeItem{...}", "\textbf{...}" and "\frac{...}" written with one backslash.
    const broken = "\resumeItem{Built a REST API}\n    {\textbf{Gitlytics}} \frac{1}{2}";
    const fixed = repairJsonEscapes(broken, doc);
    expect(fixed).toBe(String.raw`\resumeItem{Built a REST API}` + "\n    " + String.raw`{\textbf{Gitlytics}} \frac{1}{2}`);
    expect(doc.includes(fixed.split("\n")[0])).toBe(true);
  });

  it("repairs \\n only for a macro the document uses, keeping real line breaks", () => {
    expect(repairJsonEscapes("\noindent Skills", doc)).toBe(String.raw`\noindent Skills`);
    expect(repairJsonEscapes("line one\nline two", doc)).toBe("line one\nline two");
  });

  it("leaves correct text alone", () => {
    const good = String.raw`\resumeItem{Built a REST API}` + "\n" + String.raw`\textbf{x}`;
    expect(repairJsonEscapes(good, doc)).toBe(good);
  });

  it("keeps real tabs in a tab-indented document", () => {
    const tabbed = "\\begin{itemize}\n\tItem one\n\\end{itemize}";
    expect(repairJsonEscapes("\tItem one", tabbed)).toBe("\tItem one");
  });
});
