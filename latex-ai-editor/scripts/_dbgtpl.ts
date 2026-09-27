import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { importZip } from "@/services/import/latex-import";
import { TEMPLATE_SOURCES } from "./templates/sources";
(async () => {
  const src = TEMPLATE_SOURCES.find((s) => s.id === process.argv[2])!;
  const zip = readFileSync(join(__dirname, "..", ".template-cache", `${src.repo!.replace("/", "__")}@${src.ref}.zip`));
  const r = await importZip(zip, { root: src.root, main: src.main });
  writeFileSync(process.argv[3], r.content);
  console.log(r.mainFile, r.embedded);
})();
