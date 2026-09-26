/** What an import found, shown on the review screen. */
export type ImportReport = {
  method: "latex" | "ai";
  fileType: "tex" | "zip" | "pdf" | "docx" | "txt" | "paste";
  warnings: string[];
  /** AI imports: text in the result that wasn't found in the file. */
  unverified: { where: string; text: string }[];
  /** AI imports: lines of the file that aren't in the result. */
  missed: string[];
  coverage: number | null;
  /** LaTeX imports: the main file, embedded class/style files, and whether it compiled here. */
  mainFile?: string;
  embedded?: string[];
  compiles?: boolean;
  engine?: string;
  /** First LaTeX error when it doesn't compile. */
  compileError?: string;
};
