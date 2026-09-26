// pdf-parse's library entry (imported directly to skip index.js's debug self-test).
declare module "pdf-parse/lib/pdf-parse.js" {
  import pdfParse from "pdf-parse";
  export default pdfParse;
}
