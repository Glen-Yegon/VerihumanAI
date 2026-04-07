// minify-all.js (ES module version)

import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Folders to process
const folders = [
  "styles",
  "scripts",
  "firebase-config"
];

function minifyFile(folderPath, file) {
  const ext = path.extname(file);
  const base = path.basename(file, ext);

  const input = path.join(folderPath, file);

  if (ext === ".css" && !file.endsWith(".min.css")) {
    const output = path.join(folderPath, `${base}.min.css`);

    exec(`npx cleancss -o "${output}" "${input}"`, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error minifying CSS ${input}:`, stderr);
      } else {
        console.log(`✅ CSS: ${input} -> ${output}`);
      }
    });
  }

  if (ext === ".js" && !file.endsWith(".min.js")) {
    const output = path.join(folderPath, `${base}.min.js`);

    exec(
      `npx terser "${input}" -o "${output}" --compress --mangle`,
      (error, stdout, stderr) => {
        if (error) {
          console.error(`Error minifying JS ${input}:`, stderr);
        } else {
          console.log(`✅ JS: ${input} -> ${output}`);
        }
      }
    );
  }
}

// Loop through folders
folders.forEach((folder) => {
  const folderPath = path.join(__dirname, folder);

  fs.readdir(folderPath, (err, files) => {
    if (err) {
      console.error(`Error reading folder ${folder}:`, err);
      return;
    }

    files.forEach((file) => {
      minifyFile(folderPath, file);
    });
  });
});