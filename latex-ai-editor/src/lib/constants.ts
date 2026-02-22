export const DEFAULT_LATEX_CONTENT = `\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{geometry}
\\usepackage{hyperref}

\\geometry{margin=1in}

\\title{My Document}
\\author{Your Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Welcome to the LaTeX AI Editor! This is a simple document to get you started.

\\section{Features}
\\begin{itemize}
    \\item Real-time LaTeX editing with syntax highlighting
    \\item AI-powered inline suggestions (coming soon)
    \\item Instant PDF preview
    \\item Beautiful resume templates
\\end{itemize}

\\section{Mathematics}
Here's an example equation:

\\begin{equation}
    E = mc^2
\\end{equation}

And inline math: $\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}$

\\section{Conclusion}
Start editing to see your changes reflected in the PDF preview!

\\end{document}
`;

export const MAX_CONTENT_SIZE = 500_000; // 500KB
export const COMPILE_TIMEOUT_MS = 60_000; // 60 seconds

export const FREE_PROJECT_LIMIT = 3;
