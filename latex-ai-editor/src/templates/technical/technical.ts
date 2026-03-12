import type { TemplateManifest } from "@/types";
import { COMMON_VARIABLES } from "../common";

export const manifest: TemplateManifest = {
  id: "technical",
  name: "Technical",
  description: "Placeholder for a highly technical resume template.",
  category: "Developer",
  tags: ["Top Picks"],
  variables: COMMON_VARIABLES,
};

// TODO: Paste full LaTeX content for the Technical template below.
// Make sure it exports a single `content` string using backticks (`).
export const content = String.raw`
\documentclass[10pt,a4paper]{article}
\usepackage[T1]{fontenc}
\usepackage{geometry}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage{fontawesome5}
\usepackage{titlesec}
\usepackage{hyperref}
\usepackage{paracol}
\usepackage[default]{lato}

\geometry{left=1.2cm, right=1.2cm, top=1.2cm, bottom=1.2cm}

\definecolor{maincolor}{HTML}{000000}
\definecolor{darkgray}{HTML}{2E2E2E}
\definecolor{lightgray}{HTML}{666666}

\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}

\titleformat{\section}{\large\bfseries\color{maincolor}}{}{0em}{}[\titlerule]
\titlespacing*{\section}{0pt}{6pt}{4pt}

\setlist[itemize]{leftmargin=1.2em, itemsep=2pt, topsep=2pt, parsep=0pt}

\newcommand{\runsubsection}[1]{{\large\bfseries #1}}
\newcommand{\descript}[1]{{\normalsize\color{darkgray} #1}}
\newcommand{\location}[1]{{\small\color{lightgray}\faMapMarker*\ #1}}
\newcommand{\duration}[1]{{\small\color{lightgray}\faCalendar\ #1}}
\newcommand{\sectionsep}{\vspace{6pt}}

\begin{document}

{\Huge\bfseries Firstname Lastname}\\[4pt]
{\large Full Stack Software Engineer}\\[6pt]
\faGlobe\ \href{https://www.home.me}{homepage.com}
\quad\faGithub\ \href{https://www.github.com/sansquoi}{sansquoi}
\quad\faLinkedin\ \href{https://www.linkedin.com/}{li-username}
\quad\faEnvelope\ \href{mailto:first.last@mail.com}{first.last@email.com}
\quad\faPhone\ \href{tel:+1999999999}{9999999999}

\vspace{0.4em}
\noindent\rule{\textwidth}{0.8pt}
\vspace{0.2em}

\setlength{\columnsep}{1.2cm}
\columnratio{0.68}
\begin{paracol}{2}

\section{Experience}

\runsubsection{Weyland Yutani Industries} \descript{| Program Manager}\\
\duration{May 2021 -- Current} \quad \location{Tokyo, Japan}
\begin{itemize}
    \item Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ullamcorper venenatis nisi at suscipit. Vestibulum vel odio in diam ultrices posuere. Cras suscipit faucibus ullamcorper.
    \item Ut consectetur tempus tincidunt. Curabitur in felis et leo elementum facilisis at non metus. Vestibulum et ullamcorper augue, nec accumsan tellus.
    \item Cras posuere in nunc vel sagittis. Aliquam aliquet non orci id pellentesque. Nulla gravida lectus quis tellus rhoncus rhoncus.
\end{itemize}
\sectionsep

\runsubsection{Tessier-Ashpoole S.A.} \descript{| Software Developer}\\
\duration{July 2016 -- March 2019} \quad \location{Villa Straylight, U.S.}
\begin{itemize}
    \item Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ullamcorper venenatis nisi at suscipit. Vestibulum vel odio in diam ultrices posuere. Cras suscipit faucibus ullamcorper.
    \item Ut consectetur tempus tincidunt. Curabitur in felis et leo elementum facilisis at non metus. Vestibulum et ullamcorper augue, nec accumsan tellus.
    \item Cras posuere in nunc vel sagittis. Aliquam aliquet non orci id pellentesque. Nulla gravida lectus quis tellus rhoncus rhoncus.
\end{itemize}
\sectionsep

\runsubsection{LexCorp} \descript{| Software Developer}\\
\duration{July 2012 -- March 2016} \quad \location{Metropolis}
\begin{itemize}
    \item Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ullamcorper venenatis nisi at suscipit. Vestibulum vel odio in diam ultrices posuere. Cras suscipit faucibus ullamcorper.
    \item Ut consectetur tempus tincidunt. Curabitur in felis et leo elementum facilisis at non metus. Vestibulum et ullamcorper augue, nec accumsan tellus.
\end{itemize}
\sectionsep

\section{Projects}

\runsubsection{Chess Engine} \descript{| C++}\\
\duration{2018}
\begin{itemize}
    \item Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ullamcorper venenatis nisi at suscipit. Vestibulum vel odio in diam ultrices posuere. Cras suscipit faucibus ullamcorper.
    \item Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ullamcorper venenatis nisi at suscipit.
\end{itemize}
\sectionsep

\runsubsection{Speech-enabled Chatbot} \descript{| C\#, Microsoft Bot Framework}\\
\duration{2018}
\begin{itemize}
    \item Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ullamcorper venenatis nisi at suscipit. Vestibulum vel odio in diam ultrices posuere. Cras suscipit faucibus ullamcorper.
    \item Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin ullamcorper venenatis nisi at suscipit.
\end{itemize}
\sectionsep

\switchcolumn
\raggedright

\section{Skills}

\subsection*{Programming}
\smallskip
{\small\textbf{Proficient:}}\\
{\small C\# \textbullet{} C \textbullet{} JavaScript \textbullet{} Python}\\
{\small SQL \textbullet{} CSS \textbullet{} HTML}
\smallskip

{\small\textbf{Experienced:}}\\
{\small Python \textbullet{} \LaTeX\ \textbullet{} C++}
\smallskip

{\small\textbf{Familiar:}}\\
{\small Java \textbullet{} Shell \textbullet{} Assembly}
\sectionsep

\subsection*{Libraries / Frameworks}
\smallskip
{\small jQuery \textbullet{} Node.js \textbullet{} Jekyll \textbullet{} React}
\sectionsep

\subsection*{Tools / Platforms}
\smallskip
{\small Git \textbullet{} Gulp \textbullet{} Webpack \textbullet{} Heroku}\\
{\small WordPress \textbullet{} Docker}
\sectionsep

\section{Education}

\noindent{\bfseries University of Utah}\\
{\small Master's in Computer Science}\\
{\small\color{lightgray} Jan 2021 -- Present $|$ SLC, Utah}\\
{\small School of Computing}\\
{\small Cum. GPA: 3.85 / 4.0}
\sectionsep

\noindent{\bfseries University of Oregon}\\
{\small Bachelor's in Computer Science and Engineering}\\
{\small\color{lightgray} May 2016 $|$ Corvallis, OR}\\
{\small School of Computing}\\
{\small Cum. GPA: 3.7 / 4.0}
\sectionsep

\section{References}

\noindent\href{https://www.linkedin.com/company/john-doe/}{\textbf{John Doe}}\\
{\small Senior Software Developer, Tyrell Corp}\\
{\small \faEnvelope\ john.doe@email.com}\\
{\small \faPhone\ +19999999999}
\sectionsep

\noindent\href{https://www.linkedin.com/company/john-doe/}{\textbf{Jane Doe}}\\
{\small Senior Software Developer, Primatech}\\
{\small \faEnvelope\ jane.doe@email.com}\\
{\small \faPhone\ +19999999999}

\end{paracol}

\end{document}

`;

