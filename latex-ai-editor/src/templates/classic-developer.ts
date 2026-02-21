export const CLASSIC_DEVELOPER_CONTENT = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}

\\geometry{margin=0.8in}
\\setlength{\\parindent}{0pt}
\\setlength{\\itemsep}{2pt}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\noindent
\\begin{minipage}[t]{0.65\\textwidth}
{\\LARGE\\bfseries {{name}}}\\\\[8pt]
\\section*{\\normalsize Experience}
\\noindent\\textbf{Software Engineer} \\hfill \\textit{Company Name}\\\\
2022 -- Present \\hfill TypeScript, React, Node.js
\\begin{itemize}
    \\item Key achievement with measurable impact (metrics if possible).
    \\item Technical ownership: APIs, services, or architecture.
    \\item Collaboration: mentoring, reviews, or cross-team work.
\\end{itemize}

\\noindent\\textbf{Developer} \\hfill \\textit{Previous Company}\\\\
2020 -- 2022 \\hfill Python, Django, AWS
\\begin{itemize}
    \\item Delivered features and maintained systems.
    \\item Improved reliability, tests, or tooling.
\\end{itemize}

\\section*{Education}
\\textbf{B.S. Computer Science} \\hfill University Name\\\\
Graduated 2020
\\end{minipage}
\\hfill
\\begin{minipage}[t]{0.3\\textwidth}
\\small
\\section*{Contact}
{{email}}\\\\
{{phone}}\\\\
{{location}}\\\\[8pt]
\\section*{Links}
\\href{https://{{github}}}{GitHub}\\\\
\\href{https://{{linkedin}}}{LinkedIn}\\\\
\\href{https://{{website}}}{Website}
\\section*{Skills}
\\textbf{Languages}\\\\
TypeScript, Python, SQL\\\\[6pt]
\\textbf{Tools}\\\\
React, Node, PostgreSQL, Docker, AWS, Git
\\end{minipage}

\\vspace{1em}
\\section*{Projects}
\\textbf{Project Name} \\hfill \\href{https://github.com}{Source}\\\\
Short description and technologies used.

\\end{document}
`;
