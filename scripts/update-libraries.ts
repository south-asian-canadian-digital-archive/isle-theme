/**
 * Script to auto-generate sacda.libraries.yml from dist/ contents
 * Run this after building: pnpm build
 */

import { globSync } from "glob";
import { writeFileSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");

// ANSI color codes
const colors = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
};

const WIDTH = 50;

function line(char = "-"): string {
    return "+" + char.repeat(WIDTH - 2) + "+";
}

function padLine(text: string, align: "left" | "center" = "left"): string {
    const inner = WIDTH - 4;
    let padded: string;
    if (align === "center") {
        const leftPad = Math.floor((inner - text.length) / 2);
        const rightPad = inner - text.length - leftPad;
        padded = " ".repeat(leftPad) + text + " ".repeat(rightPad);
    } else {
        padded = text.padEnd(inner);
    }
    return "| " + padded + " |";
}

function printHeader(): void {
    console.log(colors.cyan + line() + colors.reset);
    console.log(
        colors.cyan + padLine("SACDA Theme Build", "center") + colors.reset,
    );
    console.log(colors.cyan + line() + colors.reset);
}

function printSection(title: string, files: string[]): void {
    console.log("");
    console.log(colors.bold + `[${title}]` + colors.reset);
    if (files.length === 0) {
        console.log(colors.dim + "  (none)" + colors.reset);
    } else {
        for (const file of files.sort()) {
            console.log(colors.dim + "  - " + colors.reset + file);
        }
    }
}

function printFooter(jsCount: number, cssCount: number): void {
    console.log("");
    console.log(colors.green + line() + colors.reset);
    console.log(
        colors.green + padLine("[DONE] Libraries updated") + colors.reset,
    );
    console.log(
        colors.green + padLine(`JS:  ${jsCount} file(s)`) + colors.reset,
    );
    console.log(
        colors.green + padLine(`CSS: ${cssCount} file(s)`) + colors.reset,
    );
    console.log(colors.green + line() + colors.reset);
}

// Main execution
printHeader();
console.log(padLine("Status: Scanning files..."));
console.log(line());

const cssFiles = globSync("dist/*.css", { cwd: rootDir });
const jsFiles = globSync("dist/*.js", { cwd: rootDir });

printSection("JS Files", jsFiles);
printSection("CSS Files", cssFiles);

let content = `# Main theme library (auto-generated - do not edit manually)
global:
`;

if (jsFiles.length > 0) {
    content += `  js:\n`;
    for (const file of jsFiles.sort()) {
        content += `    ${file}: {}\n`;
    }
}
if (cssFiles.length > 0) {
    content += `  css:\n`;
    content += `    theme:\n`;
    for (const file of cssFiles.sort()) {
        content += `      ${file}: {}\n`;
    }
}

const librariesPath = resolve(rootDir, "sacda.libraries.yml");
content += `
# Load the large viewers only on pages with a matching media block.
iiif-images:
  js:
    dist/viewers/images.js: { minified: true }
  dependencies:
    - core/drupal
    - core/drupalSettings
    - core/once
av:
  js:
    dist/viewers/av.js: { minified: true }
  css:
    component:
      dist/viewers/ramp.css: {}
  dependencies:
    - core/drupal
    - core/once
`;
writeFileSync(librariesPath, content);

printFooter(jsFiles.length, cssFiles.length);
