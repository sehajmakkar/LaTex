/**
 * Common skills with the aliases ATS and recruiters treat as equivalent. Used
 * to widen AI-extracted aliases and for the keyword-only fallback match.
 */
export const SKILL_ALIASES: Record<string, string[]> = {
  javascript: ["js", "ecmascript"], typescript: ["ts"], python: [], java: [], "c++": ["cpp"], "c#": ["csharp", ".net"], go: ["golang"],
  rust: [], ruby: [], php: [], kotlin: [], swift: [], scala: [], r: [], sql: [], bash: ["shell scripting", "shell"],
  react: ["react.js", "reactjs"], "next.js": ["nextjs"], vue: ["vue.js", "vuejs"], angular: ["angularjs"], svelte: [],
  "node.js": ["nodejs", "node"], express: ["express.js", "expressjs"], django: [], flask: [], fastapi: [], spring: ["spring boot"],
  "ruby on rails": ["rails"], graphql: [], "rest": ["restful", "rest api", "rest apis"], grpc: [], "html": ["html5"], css: ["css3"],
  tailwind: ["tailwind css", "tailwindcss"], redux: [], "react native": [], flutter: [],
  aws: ["amazon web services"], gcp: ["google cloud", "google cloud platform"], azure: ["microsoft azure"], docker: ["containers"],
  kubernetes: ["k8s"], terraform: [], "ci/cd": ["continuous integration", "continuous delivery", "continuous deployment", "cicd"],
  jenkins: [], "github actions": [], linux: [], git: ["github", "gitlab"], nginx: [], serverless: ["lambda", "aws lambda"],
  postgresql: ["postgres"], mysql: [], mongodb: ["mongo"], redis: [], elasticsearch: [], kafka: ["apache kafka"], rabbitmq: [],
  dynamodb: [], snowflake: [], bigquery: [], spark: ["apache spark", "pyspark"], hadoop: [], airflow: ["apache airflow"],
  "machine learning": ["ml"], "deep learning": ["dl"], "natural language processing": ["nlp"], "computer vision": ["cv"],
  pytorch: [], tensorflow: [], "scikit-learn": ["sklearn"], pandas: [], numpy: [], llm: ["large language models", "llms"],
  "generative ai": ["genai", "gen ai"], langchain: [], rag: ["retrieval augmented generation", "retrieval-augmented generation"],
  "data analysis": ["data analytics"], "data visualization": [], tableau: [], "power bi": ["powerbi"], excel: ["microsoft excel", "ms excel"],
  looker: [], "a/b testing": ["ab testing", "experimentation"], statistics: [],
  microservices: [], "system design": ["distributed systems"], "unit testing": ["testing", "jest", "pytest", "junit"],
  agile: [], scrum: [], jira: [], figma: [], "ui/ux": ["ux", "ui design", "user experience"], seo: ["search engine optimization"],
  salesforce: [], "product management": [], "project management": ["pmp"], "stakeholder management": [], sap: [],
  "financial modeling": ["financial modelling"], accounting: [], "customer success": [], crm: [], marketing: ["digital marketing"],
  communication: ["communication skills"], leadership: [], teamwork: ["collaboration", "cross-functional"], "problem solving": ["problem-solving"],
  mentoring: ["mentorship", "coaching"],
};

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Word-boundary match that also works for C++, C#, Node.js, CI/CD. */
export function mentions(text: string, term: string): boolean {
  const t = term.trim().toLowerCase();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9+#])${escape(t)}($|[^a-z0-9+#])`, "i").test(text.toLowerCase());
}

/** All known names for a skill: itself, AI-provided aliases, and dictionary aliases. */
export function aliasesFor(skill: string, extra: string[] = []): string[] {
  const key = skill.trim().toLowerCase();
  const canonical = key in SKILL_ALIASES ? key : Object.keys(SKILL_ALIASES).find((k) => SKILL_ALIASES[k].includes(key));
  const dictionary = canonical ? [canonical, ...SKILL_ALIASES[canonical]] : [];
  return [...new Set([skill, ...extra, ...dictionary].map((s) => s.trim()).filter(Boolean))];
}

const SOFT = new Set(["communication", "leadership", "teamwork", "problem solving", "mentoring", "stakeholder management"]);

/** Keyword-only fallback: dictionary skills mentioned in the job description. */
export function dictionarySkillsIn(jd: string): { skill: string; kind: "hard" | "soft"; importance: "required" | "preferred" }[] {
  const sentences = jd.split(/[\n.;]/);
  return Object.entries(SKILL_ALIASES)
    .filter(([skill, aliases]) => [skill, ...aliases].some((a) => a.length > 2 && mentions(jd, a)))
    .map(([skill, aliases]) => {
      const sentence = sentences.find((s) => [skill, ...aliases].some((a) => a.length > 2 && mentions(s, a))) ?? "";
      const preferred = /\b(nice to have|preferred|bonus|plus|familiarity|exposure)\b/i.test(sentence);
      return { skill, kind: SOFT.has(skill) ? "soft" : "hard", importance: preferred ? "preferred" : "required" };
    });
}
