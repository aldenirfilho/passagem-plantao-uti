import { cp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(root, "public");
const output = path.join(root, "dist");

async function replaceInFile(relativePath, replacements) {
  const target = path.join(output, relativePath);
  let content = await readFile(target, "utf8");
  for (const [from, to] of replacements) content = content.replaceAll(from, to);
  await writeFile(target, content, "utf8");
}

await rm(output, { recursive: true, force: true });
await cp(source, output, { recursive: true });

const htmlReplacements = [
  [
    'content="Passagem de plantão online-first e local-first para UTI adulta: 10 leitos, 10 tópicos, anexos, checklist e PDFs estruturados."',
    'content="NEXUS CARE: continuidade assistencial em UTI com 10 leitos, 10 tópicos, checklist, read-back e PDFs estruturados."',
  ],
  ["<title>Passagem UTI · 10 leitos, 10 linhas</title>", "<title>NEXUS CARE · Continuidade assistencial em UTI</title>"],
  ['<meta name="apple-mobile-web-app-title" content="Passagem UTI" />', '<meta name="apple-mobile-web-app-title" content="NEXUS CARE" />'],
  [
    '<p class="eyebrow">NEXUS CARE · CONTINUIDADE ASSISTENCIAL</p>\n          <h1>PASSAGEM <span>UTI</span></h1>\n          <p class="tagline">10 leitos. 10 linhas. Nenhuma pendência invisível.</p>',
    '<p class="eyebrow">CONTINUIDADE ASSISTENCIAL · UTI</p>\n          <h1>NEXUS <span>CARE</span></h1>\n          <p class="tagline">10 leitos. 10 linhas. Continuidade sem pontos cegos.</p>',
  ],
  ["<strong>PASSAGEM UTI</strong>", "<strong>NEXUS CARE</strong>"],
];

await replaceInFile("index.html", htmlReplacements);
await replaceInFile("404.html", htmlReplacements);

await replaceInFile("app.js", [
  ['toast("Passagem UTI instalado neste dispositivo.");', 'toast("NEXUS CARE instalado neste dispositivo.");'],
  ['if (runningStandalone()) return toast("O Passagem UTI já está aberto como aplicativo.");', 'if (runningStandalone()) return toast("O NEXUS CARE já está aberto como aplicativo.");'],
  ['"# Passagem de Plantão UTI",', '"# NEXUS CARE · Passagem de Plantão UTI",'],
  ['`*PASSAGEM UTI · ${settings.unit || "UTI"} · ${bed.id}*`', '`*NEXUS CARE · ${settings.unit || "UTI"} · ${bed.id}*`'],
  ['"_Mensagem preparada pelo Passagem UTI; requer revisão médica. O prontuário continua sendo o registro oficial._",', '"_Mensagem preparada pelo NEXUS CARE; requer revisão médica. O prontuário continua sendo o registro oficial._",'],
  ['downloadTextFile(content, `passagem-uti-${date}-${target}.${format}`,', 'downloadTextFile(content, `nexus-care-uti-${date}-${target}.${format}`,'],
  ['createPrintNode("h1", "print-title", "PASSAGEM UTI"),', 'createPrintNode("h1", "print-title", "NEXUS CARE"),'],
  ['document.title = `Passagem UTI · ${targetName} · ${model.profile === "complete" ? "Completo" : "Padrão"} · ${date}`;', 'document.title = `NEXUS CARE · ${targetName} · ${model.profile === "complete" ? "Completo" : "Padrão"} · ${date}`;'],
  ['downloadTextFile(JSON.stringify(capsule, null, 2), `passagem-uti-${date}-${target}.capsula-uti.json`,', 'downloadTextFile(JSON.stringify(capsule, null, 2), `nexus-care-uti-${date}-${target}.capsula-uti.json`,'],
]);

await replaceInFile("tutorial.html", [
  ['content="Tutorial ilustrado v5 do Passagem UTI: instalação local, continuidade do plantão, dez leitos, exportações, WhatsApp e Cápsula UTI."', 'content="Tutorial ilustrado do NEXUS CARE: continuidade assistencial em UTI, dez leitos, exportações, PDFs, WhatsApp e Cápsula UTI."'],
  ["<title>Tutorial ilustrado v5 · Passagem UTI</title>", "<title>Tutorial ilustrado · NEXUS CARE</title>"],
  ['aria-label="Abrir o aplicativo Passagem UTI"', 'aria-label="Abrir o aplicativo NEXUS CARE"'],
  ["<span><strong>PASSAGEM UTI</strong><small>MANUAL VISUAL · v5 RC</small></span>", "<span><strong>NEXUS CARE</strong><small>CONTINUIDADE ASSISTENCIAL · UTI</small></span>"],
  [">Abrir Passagem UTI</a>", ">Abrir NEXUS CARE</a>"],
  ["<div><strong>PASSAGEM UTI · v5 RC</strong><span>Tutorial Turbo TEMI Premium · dados demonstrativos sintéticos</span></div>", "<div><strong>NEXUS CARE · UTI</strong><span>Tutorial visual · dados demonstrativos sintéticos</span></div>"],
]);

const manifestPath = path.join(output, "manifest.webmanifest");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
manifest.name = "NEXUS CARE · Continuidade Assistencial em UTI";
manifest.short_name = "NEXUS CARE";
manifest.description = "Continuidade assistencial em UTI com 10 leitos, 10 tópicos, checklist, read-back e PDFs estruturados.";
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

await replaceInFile("service-worker.js", [
  ['const CACHE_NAME = "passagem-uti-v5-2-online-pdf-1";', 'const CACHE_NAME = "nexus-care-uti-v5-3-brand-1";'],
]);

await replaceInFile("README_DEPLOY_ONLINE.md", [
  ["# Passagem UTI v5.2 - publicação online HTTPS", "# NEXUS CARE · UTI - publicação online HTTPS"],
]);

await writeFile(
  path.join(output, "brand.json"),
  `${JSON.stringify({ name: "NEXUS CARE", product: "Continuidade Assistencial em UTI", version: "5.3-brand" }, null, 2)}\n`,
  "utf8",
);

console.log(`NEXUS CARE preparado em ${output}`);
