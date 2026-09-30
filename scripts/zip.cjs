// Empaqueta la app de escritorio (win-unpacked) en instaladores/<versión>/Nocta-<versión>-windows.zip,
// con todo dentro de una carpeta "Nocta" (app + "Desinstalar Nocta.cmd"). Usa el tar de Windows.
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { version } = require('../package.json');

const out = path.join(__dirname, '..', 'instaladores', version);
const unpacked = path.join(out, 'win-unpacked');
const folder = path.join(out, 'Nocta');
const zip = path.join(out, `Nocta-${version}-windows.zip`);

if (!fs.existsSync(path.join(unpacked, 'Nocta.exe'))) {
  throw new Error(`No está ${unpacked}\Nocta.exe: electron-builder no ha terminado bien.`);
}

fs.rmSync(folder, { recursive: true, force: true });
fs.rmSync(zip, { force: true });
try {
  fs.renameSync(unpacked, folder);
} catch {
  fs.cpSync(unpacked, folder, { recursive: true }); // si algo tiene la carpeta abierta, se copia
}

const tar = path.join(process.env.SystemRoot || 'C:\Windows', 'System32', 'tar.exe');
execFileSync(tar, ['-a', '-c', '-f', zip, '-C', out, 'Nocta'], { stdio: 'inherit' });

const mb = (fs.statSync(zip).size / 1024 / 1024).toFixed(0);
console.log(`
  ${path.relative(process.cwd(), zip)} (${mb} MB)
`);
