import type { TemplateManifest } from "@/types";
import { COMMON_VARIABLES } from "../common";

export const manifest: TemplateManifest = {
  id: "simple",
  name: "Simple",
  description: "Placeholder for a minimal, simple resume template.",
  category: "Developer",
  tags: ["Top Picks"],
  variables: COMMON_VARIABLES,
};

// TODO: Paste full LaTeX content for the Simple template below.
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
\usepackage{fancyhdr}
\usepackage[default]{lato}
\usepackage{setspace}

\geometry{left=1.5cm, right=1.5cm, top=1.2cm, bottom=1.2cm}

\definecolor{datecolor}{HTML}{666666}
\definecolor{primary}{HTML}{2b2b2b}
\definecolor{headings}{HTML}{6A6A6A}
\definecolor{subheadings}{HTML}{333333}

\hypersetup{colorlinks=true, urlcolor=primary, linkcolor=primary}
\pagestyle{fancy}
\fancyhf{}
\renewcommand{\headrulewidth}{0pt}

\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}

% KEY FIX: use \texorpdfstring and avoid \uppercase inside \titleformat
% Instead, apply MakeUppercase only to the title text via the format
\titleformat{\section}
  {\large\bfseries\color{headings}}{}{0em}{\MakeUppercase}
  [\color{headings}\titlerule]
\titlespacing*{\section}{0pt}{8pt}{5pt}

\setlist[itemize]{leftmargin=1.5em, itemsep=2pt, topsep=3pt, parsep=0pt}

\newcommand{\runsubsection}[1]{{\bfseries\large\color{subheadings} #1}}
\newcommand{\descript}[1]{{\normalsize\color{headings} #1}}
\newcommand{\location}[1]{{\small\color{datecolor}\itshape #1}}
\newcommand{\fakeNewLine}{\newline\vspace{-1em}}
\newcommand{\sectionsep}{\vspace{6pt}}

\newcommand{\resumeHeading}[4]{
  \runsubsection{\uppercase{#1}}\descript{ | #2}\hfill\location{#3 | #4}\fakeNewLine
}

\newcommand{\educationHeading}[4]{
  \runsubsection{#1}\hspace*{\fill}\location{#3 | #4}\\
  \descript{#2}\fakeNewLine
}

\newcommand{\Project}[2]{
  \textbf{\href{#2}{#1}}
}

\newcommand{\projectHeading}[3]{
  \Project{#1}{#2}
  \descript{| #3}\\
}

\newcommand{\projectHeadingWithDate}[4]{
  \Project{#1}{#2}
  \descript{| #3 | #4}\\
}

\newcommand{\courseWork}[1]{\textbf{Coursework:} #1}
\newcommand{\teacherAssistant}[1]{\textbf{Teacher Assistant (TA):} #1}
\newcommand{\singleItem}[2]{\textbf{#1} #2}

\newenvironment{bullets}{
  \begin{itemize}
}{
  \end{itemize}
}

\newenvironment{skillList}{
  \begin{itemize}[leftmargin=0pt, label={}, itemsep=3pt, topsep=2pt]
}{
  \end{itemize}
}

\newcommand{\yourName}{First Last}
\newcommand{\yourEmail}{someEmail@edu.com}
\newcommand{\yourPhone}{1-234-567-890}
\newcommand{\githubUserName}{myGithubName}
\newcommand{\linkedInUserName}{linkedInUsername}

\begin{document}

\begin{center}
    {\Huge\bfseries\yourName} \\ \vspace{1pt}
    \small
    \href{mailto:\yourEmail}{\underline{\yourEmail}}
    $|$ \yourPhone
    $|$ \href{https://www.linkedin.com/in/\linkedInUserName}{\underline{linkedIn/\linkedInUserName}}
    $|$ \href{https://github.com/\githubUserName}{\underline{github/\githubUserName}}
\end{center}

\section{Education}

\educationHeading{BSc. Honours Computer Science With Software Engineering Specialization}{University of Windsor}{Windsor, ON}{Jun 2021}
\teacherAssistant{World Wide Web Information Systems Development}
\sectionsep

\section{Work Experience}

\resumeHeading{Amazon}{Software Development Engineer Intern}{Toronto, ON}{May 2020 -- Aug 2020}
\begin{bullets}
    \item Designed and implemented a dashboard using \textbf{React} and \textbf{TypeScript} to visualize data stored in \textbf{DynamoDB}, decreasing time to understand delivery driver work sessions by over 10 times.
    \item Ensured only authorized employees have access to the application by creating an \textbf{AWS Lambda@Edge} function to intercept and sign valid requests.
    \item Devised and deployed the infrastructure in TypeScript through \textbf{AWS CDK}, then created efficient algorithms to process data from a custom \textbf{REST API}, so it could scale to handle millions of deliveries.
    \item Setup a CI/CD pipeline and exceeded requirements in each stage, which lead to the application being pushed to production.
\end{bullets}
\sectionsep

\resumeHeading{University of Windsor}{Research Assistant (RA)}{Windsor, ON}{Feb 2020 -- May 2020}
\begin{bullets}
    \item Developed a Personal Health Record (PHR) system in \textbf{\href{https://spring.io/}{Spring}} based on the theoretical model outlined in \href{https://research.library.mun.ca/11920}{\underline{Mitu Kumar's thesis}}.
    \item Applied the \href{https://link.springer.com/chapter/10.1007/978-3-642-10838-9\_23}{mCP-ABE} encryption scheme using the \href{http://gas.dia.unisa.it/projects/jpbc/}{JPBC} library, so patients have fine-grained access control over their health records with the ability to instantly revoke access.
\end{bullets}
\sectionsep

\resumeHeading{JoaTu}{Software Engineer Intern}{Montreal, QC}{Dec 2018 -- May 2019}
\begin{bullets}
    \item Rewrote legacy \textbf{Django code} in \textbf{Ruby on Rails} and refactored it to make the system more extensible.
    \item Created \textbf{UML} diagrams and documented where features were implemented, to make the codebase more maintainable.
\end{bullets}
\sectionsep

\section{Projects}

\projectHeading{Automated Spear-Phisher}{https://github.com/Aarif123456/Fb-Twitter-gui}{Python, PySpark, Selenium, Apache, NLP, Big Data}
A security research tool to send targeted spam messages on either Facebook or Twitter. The program analyzes the feed of its target to increase the effectiveness of the messages.\\
\sectionsep

\projectHeading{Image Repository}{https://github.com/Aarif123456/image\_repository}{Java, PHP, React, TypeScript, Maven, GCP, MySQL}
A full-stack image repository, where users can store their files. Created a GCP cloud function to implement \href{https://www.cs.utexas.edu/~bwaters/publications/papers/cp-abe.pdf}{CP-ABE} encryption and used it to ensure files are secure at rest.\\
\sectionsep

\projectHeading{Biometric Dynamic Keystroke Spoofer}{https://github.com/Aarif123456/KeystrokeDynamicsSpoofer}{Python, Object-Oriented Design, CyberSecurity}
A program that authenticates users based on their typing patterns. And a spoofer that uses the genetic algorithm to mimic the user's typing pattern.
\sectionsep

\projectHeading{Distributed Key-Value store}{https://github.com/Aarif123456/Distributed-DB}{Java, Distributed System, Computer Networks, Concurrency}
A distributed key-value store which automatically replicates data in the background while the user manages their data. Implemented a custom P2P protocol to maximize fault tolerance and scalability.\\
\sectionsep

\projectHeading{War of Weebles}{https://github.com/Aarif123456/GoalOrientedBehaviour}{C\#, Unity, Concurrency, Artificial Intelligence}
A capture-the-flag-styled shooting game composed of AI-controlled players. The agents change their goals based on various factors, such as their health, current weapon, their personality and what they see.\\
\sectionsep

\section{Skills}

\begin{skillList}
    \item \singleItem{Languages:}{Java, C++, Python, C\#, PHP, Prolog, Bash, C, Racket, SQL}
    \item \singleItem{Web Development:}{React, JavaScript, TypeScript, HTML/CSS}
    \item \singleItem{Technology:}{Git, AWS, GCP, Azure, Docker, Unity, Apache, \LaTeX, MongoDB, DynamoDB, Neo4j}
\end{skillList}

\end{document}

`;

