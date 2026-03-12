import type { TemplateManifest } from "@/types";
import { COMMON_VARIABLES } from "../common";

export const manifest: TemplateManifest = {
  id: "scholarly",
  name: "Scholarly",
  description: "Placeholder for a scholarly CV template.",
  category: "Academic",
  tags: ["Top Picks"],
  variables: COMMON_VARIABLES,
};

// TODO: Paste full LaTeX content for the Scholarly template below.
// Make sure it exports a single `content` string using backticks (`).
export const content = String.raw`
\documentclass[10pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage{geometry}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage{titlesec}
\usepackage{hyperref}
\usepackage{fancyhdr}
\usepackage{setspace}
\usepackage{microtype}
\usepackage{lmodern}

\geometry{left=1.2cm, right=1.2cm, top=1.0cm, bottom=1.0cm}

\definecolor{datecolor}{HTML}{999999}
\definecolor{headings}{HTML}{999999}
\definecolor{subheadings}{HTML}{333333}
\definecolor{primary}{HTML}{333333}

\hypersetup{colorlinks=false}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}
\fancyhead[R]{{\small\color{datecolor}\itshape Last Updated on \today}}

\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}

% Section: small caps, light gray, no bold, with rule
\titleformat{\section}
  {\normalsize\scshape\color{headings}}{}{0em}{}
  [\color{headings}\titlerule]
\titlespacing*{\section}{0pt}{8pt}{4pt}

\setlist[itemize]{leftmargin=1.2em, itemsep=1pt, topsep=2pt, parsep=0pt,
  label={\small\textbullet}}

% Commands
\newcommand{\runsubsection}[1]{{\bfseries\large\color{subheadings}\uppercase{#1}}}
\newcommand{\descript}[1]{{\normalsize\scshape\color{headings} #1}}
\newcommand{\location}[1]{{\small\color{datecolor}\itshape #1}}
\newcommand{\sectionsep}{\vspace{5pt}}

\newenvironment{tightemize}{%
  \vspace{-2pt}\begin{itemize}}{%
  \end{itemize}\vspace{-2pt}}

\begin{document}

%% Header / Name
\begin{center}
  {\fontsize{38}{42}\selectfont\color{headings} Debarghya\ {\color{subheadings}\bfseries Das}}\\[6pt]
  {\small\color{primary}
    \href{http://debarghyadas.com}{debarghyadas.com}$|$
    \href{http://fb.co/dd}{fb.co/dd}\\
    \href{mailto:deedy@fb.com}{deedy@fb.com} $|$
    607.379.5733 $|$
    \href{mailto:dd367@cornell.edu}{dd367@cornell.edu}
  }
\end{center}

%% Two columns
\begin{minipage}[t]{0.32\textwidth}

\section{Education}

\noindent{\bfseries\small\color{subheadings}\uppercase{Cornell University}}\\
\descript{MEng in Computer Science}\\
\location{Dec 2014 | Ithaca, NY}
\sectionsep

\noindent{\bfseries\small\color{subheadings}\uppercase{Cornell University}}\\
\descript{BS in Computer Science}\\
\location{May 2014 | Ithaca, NY}\\
{\small College of Engineering}\\
{\small Magna Cum Laude}\\
\location{Cum. GPA: 3.83 / 4.0}\\
\location{Major GPA: 3.9 / 4.0}
\sectionsep

\noindent{\bfseries\small\color{subheadings}\uppercase{La Martiniere for Boys}}\\
\location{Grad. May 2011 | Kolkata, India}
\sectionsep

\section{Links}

{\small
Facebook:// \href{https://facebook.com/dd}{\textbf{dd}}\\
Github:// \href{https://github.com/deedydas}{\textbf{deedydas}}\\
LinkedIn:// \href{https://www.linkedin.com/in/debarghyadas}{\textbf{debarghyadas}}\\
YouTube:// \href{https://www.youtube.com/user/DeedyDash007}{\textbf{DeedyDash007}}\\
Twitter:// \href{https://twitter.com/debarghya_das}{\textbf{@debarghya\_das}}\\
Quora:// \href{https://www.quora.com/Debarghya-Das}{\textbf{Debarghya-Das}}
}
\sectionsep

\section{Coursework}

\noindent{\bfseries\small\color{subheadings} Graduate}\\[2pt]
{\small
Advanced Machine Learning\\
Open Source Software Engineering\\
Advanced Interactive Graphics\\
Compilers + Practicum\\
Cloud Computing\\
Evolutionary Computation\\
Defending Computer Networks\\
Machine Learning
}
\sectionsep

\noindent{\bfseries\small\color{subheadings} Undergraduate}\\[2pt]
{\small
Information Retrieval\\
Operating Systems\\
Artificial Intelligence + Practicum\\
Functional Programming\\
Computer Graphics + Practicum\\
{\footnotesize\textit{\textbf{(Research Asst. \& Teaching Asst 2x)}}}\\
Unix Tools and Scripting
}
\sectionsep

\section{Skills}

\noindent{\bfseries\small\color{subheadings} Programming}\\[2pt]
{\small\location{Over 5000 lines:}\\
Java \textbullet{} Shell \textbullet{} Python \textbullet{} Javascript\\
OCaml \textbullet{} Matlab \textbullet{} Rails \textbullet{} \LaTeX\\
\location{Over 1000 lines:}\\
C \textbullet{} C++ \textbullet{} CSS \textbullet{} PHP \textbullet{} Assembly\\
\location{Familiar:}\\
AS3 \textbullet{} iOS \textbullet{} Android \textbullet{} MySQL
}
\sectionsep

\end{minipage}
\hfill
\begin{minipage}[t]{0.65\textwidth}

\section{Experience}

\runsubsection{Facebook}
\descript{| Software Engineer}\\
\location{Jan 2015 -- Present | New York, NY}
\sectionsep

\runsubsection{Coursera}
\descript{| KPCB Fellow + Software Engineering Intern}\\
\location{June 2014 -- Sep 2014 | Mountain View, CA}
\begin{tightemize}
  \item 52 out of 2500 applicants chosen to be a KPCB Fellow 2014.
  \item Led and shipped Yoda -- the admin interface for the new Phoenix platform.
  \item Full-stack developer -- Wrote and reviewed code for JS using Backbone, Jade, Stylus and Require and Scala using Play.
\end{tightemize}
\sectionsep

\runsubsection{Google}
\descript{| Software Engineering Intern}\\
\location{May 2013 -- Aug 2013 | Mountain View, CA}
\begin{tightemize}
  \item Worked on the YouTube Captions team, in Javascript and Python to plan, to design and develop the full stack to add and edit Automatic Speech Recognition captions. In production.
  \item Created a backbone.js-like framework for the Captions editor.
\end{tightemize}
\sectionsep

\runsubsection{Phabricator}
\descript{| Open Source Contributor \& Team Leader}\\
\location{Jan 2013 -- May 2013 | Palo Alto, CA \& Ithaca, NY}
\begin{tightemize}
  \item Phabricator is used daily by Facebook, Dropbox, Quora, Asana and more.
  \item I created the Meme generator and more in PHP and Shell.
  \item Led a team from MIT, Cornell, IC London and UHelsinki for the project.
\end{tightemize}
\sectionsep

\section{Research}

\runsubsection{Cornell Robot Learning Lab}
\descript{| Researcher}\\
\location{Jan 2014 -- Jan 2015 | Ithaca, NY}\\[3pt]
{\small Worked with \textbf{\href{http://www.cs.cornell.edu/~ashesh/}{Ashesh Jain}} and \textbf{\href{http://www.cs.cornell.edu/~asaxena/}{Prof Ashutosh Saxena}} to create \textbf{PlanIt}, a tool which learns from large scale user preference feedback to plan robot trajectories in human environments.}
\sectionsep

\runsubsection{Cornell Phonetics Lab}
\descript{| Head Undergraduate Researcher}\\
\location{Mar 2012 -- May 2013 | Ithaca, NY}\\[3pt]
{\small Led the development of \textbf{QuickTongue}, the first ever breakthrough tongue-controlled game with \textbf{\href{http://conf.ling.cornell.edu/~tilsen/}{Prof Sam Tilsen}} to aid in Linguistics research.}
\sectionsep

\section{Awards}

{\small
\begin{tabular}{rll}
2014 & top 52/2500  & KPCB Engineering Fellow \\
2014 & 1\textsuperscript{st}/50 & Microsoft Coding Competition, Cornell \\
2013 & National & Jump Trading Challenge Finalist \\
2013 & 7\textsuperscript{th}/120 & CS 3410 Cache Race Bot Tournament \\
2012 & 2\textsuperscript{nd}/150 & CS 3110 Biannual Intra-Class Bot Tournament \\
2011 & National & Indian National Mathematics Olympiad (INMO) Finalist \\
\end{tabular}
}
\sectionsep

\section{Publications}

{\small
\noindent [1] A. Jain, D. Das, and A. Saxena. Planit: A crowdsourcing approach for learning to plan paths from large scale preference feedback. \textit{Tech Report, ICRA}, in press.\\[4pt]
\noindent [2] S. Tilsen, D. Das, and B. McKee. Real-time articulatory biofeedback with electromagnetic articulography. \textit{Linguistics Vanguard}, in press.
}

\end{minipage}

\end{document}

`;

