import type { TemplateManifest } from "@/types";
import { COMMON_VARIABLES } from "../common";

export const manifest: TemplateManifest = {
  id: "modern-tech",
  name: "Modern Tech",
  description: "Clean single-column layout for software engineers.",
  category: "Developer",
  tags: ["Top Picks", "SDE 1", "Single Column"],
  variables: COMMON_VARIABLES,
};

export const content = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}

\\geometry{margin=0.75in}
\\setlength{\\parindent}{0pt}
\\setlength{\\itemsep}{2pt}
\\setlength{\\parskip}{4pt}

\\hypersetup{colorlinks=true, urlcolor=blue, linkcolor=black}

\\begin{document}

\\begin{center}
{\\LARGE\\bfseries {{name}}}\\\\[6pt]
{{email}} \\quad $|$ \\quad {{phone}} \\quad $|$ \\quad {{location}}\\\\[4pt]
\\small
\\href{https://{{linkedin}}}{LinkedIn} \\quad \\href{https://{{github}}}{GitHub} \\quad \\href{https://{{website}}}{Website}
\\end{center}
\\vspace{0.5em}

\\section*{Experience}
\\noindent\\textbf{Software Engineer} \\hfill Company Name \\hfill 2022 -- Present\\\\
\\textit{Tech: TypeScript, React, Node.js, PostgreSQL}
\\begin{itemize}
    \\item Delivered features that improved performance by 40\\% and reduced latency for 1M+ users.
    \\item Led migration to microservices; designed APIs and event-driven pipelines.
    \\item Mentored 2 junior developers and established code review practices.
\\end{itemize}

\\noindent\\textbf{Junior Developer} \\hfill Previous Corp \\hfill 2020 -- 2022\\\\
\\textit{Tech: Python, Django, AWS}
\\begin{itemize}
    \\item Built and maintained internal tools and dashboards used by 50+ teams.
    \\item Wrote unit and integration tests; improved coverage from 60\\% to 85\\%.
\\end{itemize}

\\section*{Technical Skills}
\\textbf{Languages:} TypeScript, Python, SQL\\\\
\\textbf{Frameworks \\& Tools:} React, Node.js, PostgreSQL, Docker, AWS, Git\\\\
\\textbf{Concepts:} REST APIs, system design, testing, CI/CD

\\section*{Education}
\\textbf{B.S. Computer Science} \\hfill University Name \\hfill 2020

\\section*{Projects}
\\textbf{Open Source / Side Project} \\hfill \\href{https://github.com}{github.com/project}\\\\
Brief description: Tech stack and impact in 1--2 lines.

\\end{document}
`;
