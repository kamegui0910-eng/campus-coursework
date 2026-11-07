const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(process.argv[2] || 'node_modules');
const target = path.resolve(__dirname, '../node_modules');
const dependencies = ['pdfjs-dist','@napi-rs/canvas','@napi-rs/canvas-win32-x64-msvc','node-readable-to-web-readable-stream'];
for (const dependency of dependencies) {
  const from = path.join(source, dependency);
  if (!fs.existsSync(from)) throw new Error('Missing dependency: ' + dependency);
  const to = path.join(target, dependency);
  if (!fs.existsSync(to)) fs.cpSync(from, to, { recursive: true, dereference: true });
  const metadata = JSON.parse(fs.readFileSync(path.join(to, 'package.json'), 'utf8'));
  process.stdout.write(`${metadata.name} ${metadata.version}\n`);
}
