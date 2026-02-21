export const MINIMALIST_DEV_CONTENT = `\\documentclass[10pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}

\\geometry{margin=1in}
\\setlength{\\parindent}{0pt}
\\setlength{\\itemsep}{1pt}
\\setlength{\\parskip}{2pt}

\\begin{document}

\\noindent{\\Large {{name}}}\\\\
{{email}} \\, $\\cdot$ \\, {{phone}} \\, $\\cdot$ \\, {{location}}\\\
\\href{https://{{github}}}{GitHub} \\, $\\cdot$ \\, \\href{https://{{linkedin}}}{LinkedIn}
\\vspace{1em}

\\subsection*{Experience}
\\textbf{Software Engineer} \\textit{Company Name} \\hfill 2022--Present\\\\
TypeScript, React, Node, PostgreSQL. Shipped X; improved Y; led Z.

\\textbf{Developer} \\textit{Previous Co} \\hfill 2020--2022\\\\
Python, Django, AWS. Built internal tools; raised test coverage.

\\vspace{0.5em}
\\subsection*{Skills}
Languages: TypeScript, Python, SQL. \\\\
Tools: React, Node, PostgreSQL, Docker, AWS, Git.

\\vspace{0.5em}
\\subsection*{Education}
B.S. Computer Science, University Name, 2020

\\vspace{0.5em}
\\subsection*{Projects}
\\textbf{Project Name} -- One-line description. \\href{https://github.com}{Link}

\\end{document}
`;
