export const TECH_LEAD_CONTENT = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}

\\geometry{margin=0.75in}
\\setlength{\\parindent}{0pt}
\\setlength{\\itemsep}{2pt}
\\setlength{\\parskip}{4pt}

\\begin{document}

\\begin{center}
{\\LARGE\\bfseries {{name}}}\\\\[4pt]
{{email}} \\quad $|$ \\quad {{phone}} \\quad $|$ \\quad {{location}}\\\\
\\href{https://{{linkedin}}}{LinkedIn} \\quad \\href{https://{{github}}}{GitHub} \\quad \\href{https://{{website}}}{Website}
\\end{center}
\\vspace{0.75em}

\\section*{Summary}
Software engineer and tech lead with X+ years building scalable systems. Led teams of N; shipped products used by M users. Strong in system design, APIs, and mentoring.

\\section*{Leadership \\& Impact}
\\noindent\\textbf{Tech Lead / Senior Engineer} \\hfill Company \\hfill 2022 -- Present\\\\
\\textit{Scope: 3--5 engineers, 2--3 services, \$X impact}
\\begin{itemize}
    \\item Led technical direction for [product/area]; delivered [outcome] with measurable impact.
    \\item Drove architecture decisions: migration to Y, adoption of Z; reduced latency/cost by N\\%.
    \\item Mentored engineers; established onboarding, design docs, and on-call practices.
    \\item Collaborated with product and design on roadmap; broke down epics and estimated delivery.
\\end{itemize}

\\noindent\\textbf{Software Engineer} \\hfill Previous Company \\hfill 2019 -- 2022\\\\
\\begin{itemize}
    \\item Owned critical path: [system/feature]; improved reliability from X\\% to Y\\%.
    \\item Introduced testing and monitoring; reduced incidents and MTTR.
\\end{itemize}

\\section*{Technical Skills}
\\textbf{Primary:} TypeScript/JavaScript, Node.js, React, PostgreSQL, REST/gRPC, AWS\\\\
\\textbf{Also:} Python, Docker, Kubernetes, event-driven systems, system design

\\section*{Education}
\\textbf{B.S. Computer Science} \\hfill University \\hfill 2019

\\section*{Selected Projects}
\\textbf{[High-impact project]} \\hfill \\href{https://github.com}{Link}\\\\
One-line scope and outcome. Tech: A, B, C.

\\end{document}
`;
