import { rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import extract from "extract-zip";

const root = path.dirname(fileURLToPath(import.meta.url));
const archive = path.join(root, "release", "passagem-uti-v5.2-pages.zip");
const output = path.join(root, "public");

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await extract(archive, { dir: output });

console.log(`Passagem UTI extraído para ${output}`);
