import type { TemplateManifest } from "@/types";
import { COMMON_VARIABLES } from "../common";

export const manifest: TemplateManifest = {
  id: "academic",
  name: "Academic",
  description: "Placeholder for an academic CV template.",
  category: "Academic",
  tags: ["Top Picks"],
  variables: COMMON_VARIABLES,
};

// TODO: Paste full LaTeX content for the Academic template below.
// Make sure it exports a single `content` string using backticks (`).
export const content = String.raw`
\documentclass[11pt,a4paper]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{geometry}
\usepackage{xcolor}
\usepackage{enumitem}
\usepackage{fontawesome5}
\usepackage{titlesec}
\usepackage{hyperref}
\usepackage{paracol}
\usepackage{array}
\usepackage{booktabs}

\geometry{left=1.5cm, right=1.5cm, top=1.2cm, bottom=1.2cm}

\definecolor{primary}{HTML}{1a1a2e}
\definecolor{accent}{HTML}{0f3460}
\definecolor{highlight}{HTML}{e94560}
\definecolor{lightgray}{HTML}{666666}
\definecolor{linkcolor}{HTML}{0f3460}

\hypersetup{colorlinks=true, urlcolor=linkcolor, linkcolor=linkcolor}
\pagestyle{empty}
\setlength{\parindent}{0pt}
\setlength{\parskip}{0pt}

\titleformat{\section}
  {\large\bfseries\color{accent}}{}{0em}{}
  [\color{highlight}\titlerule]
\titlespacing*{\section}{0pt}{8pt}{5pt}

\setlist[itemize]{leftmargin=1.5em, itemsep=2pt, topsep=2pt, parsep=0pt}

\newcommand{\cventry}[5]{
  \noindent
  {\bfseries\color{accent} #1} \hfill {\small\color{lightgray} #4}\\
  {\itshape #2} \hfill {\small\color{lightgray} #3}\\
  \ifx&#5&\else{\small #5}\fi
  \vspace{3pt}
}

\begin{document}

\begin{center}
  {\Huge\bfseries\color{primary} Full Name}\\[4pt]
  {\large\color{accent} Indian Institute of Technology Madras, India}\\[6pt]
  \small
  \faMapMarker*\ Somewhere, City -- 123456, State, Country
  \quad\faPhone\ +91-123456789
  \quad\faEnvelope\ \href{mailto:emailId@gmail.com}{emailId@gmail.com}\\[3pt]
  \faLinkedin\ \href{https://www.linkedin.com/in/xxxxxxxxxx}{linkedin.com/in/xxxxxxxxxx}
  \quad\faGithub\ \href{https://www.github.com/xxxxxxxxxx}{github.com/xxxxxxxxxx}
\end{center}

\noindent\textcolor{highlight}{\rule{\textwidth}{1.5pt}}
\vspace{0.3em}

\section{Education}

\vspace{4pt}
\noindent
\begin{tabular}{>{\color{accent}\bfseries}p{0.22\textwidth} p{0.38\textwidth} >{\centering}p{0.15\textwidth} p{0.15\textwidth}}
\color{accent}\textbf{Program} & \color{accent}\textbf{Institution / Board} & \color{accent}\textbf{\%/CGPA} & \color{accent}\textbf{Year} \\
\midrule
\href{https://somelinks}{\textcolor{highlight}{M.Tech.}} (CS\&E) & Indian Institute of Technology Madras, Chennai & \textbf{7.77/10} & 20xx--xx \\[4pt]
\href{https://somelinks}{\textcolor{highlight}{B.Tech.}} (CS\&E) & Jalpaiguri Govt. Engineering College, West Bengal & \textbf{7.77/10} & 20xx--xx \\[4pt]
\href{https://somelinks}{\textcolor{highlight}{Diploma}} (CS\&T) & Darjeeling Polytechnic, Kurseong, West Bengal & \textbf{77.77\%} & 20xx--xx \\[4pt]
\href{https://somelinks}{\textcolor{highlight}{SSLC}} & Meghalaya Board of School Education, Tura & \textbf{77.77\%} & 20xx \\
\bottomrule
\end{tabular}

\section{Key Projects}

\cventry{Project 1 --- \href{https://somelinks}{\textcolor{highlight}{Link}}}{IIT Madras $|$ M.Tech $|$ Guide: Prof. XXXX}{Aug 20xx -- April 20xx}{}{}
\begin{itemize}
  \item Correctly \textbf{classified} the Kaggle eye image dataset into different stages of DR and also \textbf{predicted} an eye image as \textbf{abnormal or normal with 94\% accuracy.}
  \item \textit{Keywords: CNN, DR, Kaggle, GPU, Python, Anaconda, Keras, Confusion Matrix}
\end{itemize}

\cventry{Project 2 --- \href{https://somelinks}{\textcolor{highlight}{Link}}}{Jalpaiguri Govt. Engineering College $|$ B.Tech $|$ Guide: Mrs. XXXX}{Jan -- May 20xx}{}{}
\begin{itemize}
  \item Developed a \textbf{web portal} for taking online examinations.
  \item \textit{Keywords: LAMP stack (Linux-Apache-MySQL-phpMyAdmin), HTML, CSS, PHP}
\end{itemize}

\cventry{Project 3 --- \href{https://somelinks}{\textcolor{highlight}{Link}}}{Darjeeling Polytechnic $|$ Diploma $|$ Guide: Asst. Prof. XXXX}{Jan -- May 20xx}{}{}
\begin{itemize}
  \item Developed an application which detected malware in Windows systems.
  \item \textit{Keywords: VB, Visual Basic}
\end{itemize}

\section{Course Projects}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Project 1}} --- Simulated Annealing for TSP}{IIT Madras $|$ M.Tech $|$ Faculty: Prof. XXXXXXXX}{Jan -- May 2019}{}{}
\begin{itemize}
  \item Implemented \textbf{Simulated Annealing} algorithm for TSP; finding the shortest possible route between cities.
\end{itemize}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Project 2}} --- Othello Bot}{IIT Madras $|$ M.Tech $|$ Faculty: Prof. XXXXXXXX}{Jan -- May 2019}{}{}
\begin{itemize}
  \item Coded a bot to play the game of Othello and win with valid moves, implemented using the \textbf{MiniMax} algorithm.
\end{itemize}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Project 3}} --- Genetic Algorithm for TSP}{IIT Madras $|$ M.Tech $|$ Faculty: Prof. XXXXXXXX}{Jan -- May 20xx}{}{}
\begin{itemize}
  \item Implemented \textbf{Genetic Algorithm} (GA) for finding the best candidate tour and integrated it with the provided animation platform.
\end{itemize}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Project 4}} --- Block Cipher}{IIT Madras $|$ M.Tech $|$ Faculty: Dr. XXXXXXX}{Jan -- May 20xx}{}{}
\begin{itemize}
  \item Designed and implemented a block cipher similar to AES.
\end{itemize}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Project 5}} --- Mobile Domain}{IIT Madras $|$ M.Tech $|$ Faculty: Prof. XXXXXXXX}{Jan -- May 2018}{}{}
\begin{itemize}
  \item Created and validated \textbf{XML data model}; used multiple \textbf{Web APIs} to create a \textbf{Mash-up}.
  \item Used \textbf{SPARQL Endpoints} for Mash-up creation; \textbf{Ontology creation} using ontology editor \textbf{Protege}.
\end{itemize}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Project 6}} --- 5G Protocols}{IIT Madras $|$ M.Tech $|$ Faculty: Prof. XXXXX}{Aug -- Dec 2017}{}{}
\begin{itemize}
  \item Implemented two 5G protocols for \textbf{Beam-searching} and \textbf{Transmission scheduling} in millimeter wave communication.
\end{itemize}

\section{Online Courses}

\begin{itemize}
  \item \textbf{\textcolor{accent}{Jovian:}} \href{https://someLinks}{\textcolor{highlight}{Data Structures and Algorithms in Python}} (May 2021), \href{https://someLinks}{\textcolor{highlight}{Deep Learning with PyTorch: Zero to GANs}} (Jan 2021), \href{https://someLinks}{\textcolor{highlight}{Data Analysis with Python: Zero to Pandas}} (Oct 2020)

  \item \textbf{\textcolor{accent}{MathWorks:}} \href{https://someLinks}{\textcolor{highlight}{Machine Learning with Matlab}} (June 2020), \href{https://someLinks}{\textcolor{highlight}{Matlab Onramp}} (May 20xx), \href{https://someLinks}{\textcolor{highlight}{Deep Learning Onramp}} (May 20xx), \href{https://someLinks}{\textcolor{highlight}{Machine Learning Onramp}} (May 20xx), \href{https://someLinks}{\textcolor{highlight}{Deep Learning with Matlab}} (May 20xx)

  \item \textbf{\textcolor{accent}{Coursera:}} \href{https://someLinks}{\textcolor{highlight}{Covid-19 Contact Tracing}} (May 20xx)
\end{itemize}

\section{Online Course Projects}

\begin{itemize}
  \item Classified \href{https://someLinks}{\textcolor{highlight}{Food-101}} images using ResNet-9. (20xx) \quad Classified \href{https://someLinks}{\textcolor{highlight}{MNIST}} hand-written digit recognition. (20xx)
  \item Classified \href{https://someLinks}{\textcolor{highlight}{CIFAR-10}} images using Neural Network. (20xx) \quad Analysed \href{https://someLinks}{\textcolor{highlight}{Covid-19}} dataset for various parameters. (20xx)
\end{itemize}

\section{Industrial Training}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Employee Appraisal System}}}{National Skill Development Corporation, Kolkata $|$ Mentor: Mrs. XXXX}{Dec 20xx -- Jan 20xx}{}{}
\begin{itemize}
  \item Developed an application which computed the salary hike of an employee based on performance rating.
\end{itemize}

\cventry{\href{https://someLinks}{\textcolor{highlight}{Bharat Sanchar Nigam Limited (Networking)}}}{BSNL, Jalpaiguri $|$ Mentor: XXXXXX}{Oct -- Nov 20xx}{}{}
\begin{itemize}
  \item Studied the working of landline phones and its architecture in streams of Switching, OFC \& IT.
\end{itemize}

\section{Course Work}

\cventry{Key Courses}{IIT Madras $|$ M.Tech $|$ Core and Electives}{Aug 20xx -- April 20xx}{}{}
\begin{itemize}
  \item \textbf{Courses:} Advanced Data Structures and Algorithms, Logic and Combinatorics for Computer Science, Theory and Applications of Ontology, Digital System Testing and Testable Design, Applied Cryptography, Non-linear Optimization
  \item \textbf{Lab:} Advanced Programming Languages in C++
\end{itemize}

\section{Technical Skills}

\begin{itemize}
  \item \textbf{\textcolor{accent}{Programming Languages:}} C, C++, Java, Python \quad \textbf{\textcolor{accent}{Web Technology:}} HTML, XML, SPARQL, PHP
  \item \textbf{\textcolor{accent}{Database Systems:}} phpMyAdmin, MySQL \quad \textbf{\textcolor{accent}{Operating Systems:}} Windows, Linux
  \item \textbf{\textcolor{accent}{Frameworks:}} LAMP stack, GPU, Wireframe (Balsamiq)
  \item \textbf{\textcolor{accent}{Tools:}} \LaTeX, Eclipse, Anaconda, Adobe Dreamweaver, Microsoft Office
\end{itemize}

\section{Positions of Responsibility}

\begin{itemize}
  \item \href{https://someLinks}{\textcolor{highlight}{Mentor}} at Going Online As Leaders (GOAL) jointly initiated by Facebook India and MoTA -- Govt. of India. (20xx--xx)
  \item \href{https://someLinks}{\textcolor{highlight}{Teaching Assistant}} for Computational Engineering course, CSE Dept., IIT Madras (Jan--May, 20xx)
  \item \href{https://someLinks}{\textcolor{highlight}{Teaching Assistant}} at Computing Facility, CSE Dept., IIT Madras (July--Nov, 20xx)
  \item \href{https://someLinks}{\textcolor{highlight}{Teaching Assistant}} at Library, CSE Dept., IIT Madras (Jan--May, 20xx)
  \item \href{https://someLinks}{\textcolor{highlight}{Teaching Assistant}} for Computational Engineering course, CSE Dept., IIT Madras (July--Nov, 20xx)
\end{itemize}

\section{Workshops}

\begin{itemize}
  \item Participated in the webinar \href{https://someLinks}{\textcolor{highlight}{Foundations of Vedic Mathematics}} conducted by SSNU, Tamil Nadu (20xx).
  \item Participated in the webinar on \href{https://someLinks}{\textcolor{highlight}{NBA Accreditation \& Role of Stakeholders in the light of National Education Policy (2020)}}, organized by Women's Polytechnic, Tripura in association with NITTTR, Kolkata (20xx).
  \item Participated in the \href{https://someLinks}{\textcolor{highlight}{International Youth Web-Conclave on Vasudhaiva Kutumbakam}}, jointly organized by Sixth Sense Foundation and partner institutions (Nov 20xx).
  \item Attended the workshop on \href{https://someLinks}{\textcolor{highlight}{Program for Aspiring College Teachers (PACT)}}, conducted by TLC, IIT Madras (20xx).
\end{itemize}

\section{Achievements / Awards}

\begin{itemize}
  \item Successfully qualified \href{https://someLinks}{\textcolor{highlight}{UGC-NET}} (20xx), \href{https://someLinks}{\textcolor{highlight}{SLET-NE Region}} (20xx), \href{https://someLinks}{\textcolor{highlight}{WB-SET}} (20xx) and \href{https://someLinks}{\textcolor{highlight}{GATE}} (20xx).
  \item Secured \textbf{3\textsuperscript{rd} rank} out of 540 in \href{https://someLinks}{\textcolor{highlight}{Virtual Product Management Experience Project}} conducted by Quollab (20xx).
  \item Competed in the \href{https://someLinks}{\textcolor{highlight}{Code To Japan Algorithms}} and \href{https://someLinks}{\textcolor{highlight}{Code To Japan AI}} challenge, overall rank 188/746 (20xx).
  \item Awarded \href{https://someLinks}{\textcolor{highlight}{Star Teaching Assistant}} for contribution as a Teaching Assistant, CSE Dept., IIT Madras (20xx).
  \item Received \href{https://someLinks}{\textcolor{highlight}{Certificate of Appreciation}} for donating blood, State Blood Transfusion Council, West Bengal (20xx).
  \item Secured \href{https://someLinks}{\textcolor{highlight}{2\textsuperscript{nd} in quiz competition}} at Rotary Youth Festival by Rotary Club of Tura, Meghalaya (20xx).
  \item Secured \href{https://someLinks}{\textcolor{highlight}{1\textsuperscript{st} in quiz competition}} at Rotary Youth Festival by Rotary Club of Tura, Meghalaya (20xx).
  \item Secured \href{https://someLinks}{\textcolor{highlight}{Consolation Prize}} in essay writing on \textit{Conservation of Natural Resources}, Soil Conservation Dept., Meghalaya (20xx).
\end{itemize}

\section{Others}

\begin{itemize}
  \item \textbf{\textcolor{accent}{Hobbies:}} Travelling, Cooking, Learning languages
  \item \textbf{\textcolor{accent}{Languages Known:}} Bengali, Hindi, Assamese, Nepali, Garo, English
\end{itemize}

\section{Declaration}

I do hereby declare that all the details furnished above are true to the best of my knowledge and belief.\\[6pt]
\textbf{Place:} Somewhere, State (Country) \hfill \textbf{Full Name}\\
\textbf{Date:} 18th Aug, 20xx\\[4pt]
{\small\textit{Note: Highlighted text contains links to proofs and validation (if required).}}

\end{document}

`;

