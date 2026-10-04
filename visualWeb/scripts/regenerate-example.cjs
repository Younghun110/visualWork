'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {generate} = require('../extension/src/generator');
const root = path.resolve(__dirname, '..');
const source = path.join(root, 'extension/examples/members.visualweb.json');
const target = path.join(root, 'frontend');
const manifestPath = path.join(target, '.visualweb-generated.json');
const check = process.argv.includes('--check');
const files = Object.fromEntries(Object.entries(generate(JSON.parse(fs.readFileSync(source, 'utf8'))))
  .filter(([name]) => name.startsWith('frontend/'))
  .map(([name, content]) => [name.slice('frontend/'.length), content]));
files['README.md'] = `# Generated Frontend Example

This directory is generated from \`extension/examples/members.visualweb.json\` and the VisualWeb generator/templates. Edit those sources instead of the files here.

From the visualWeb repository root:

\`\`\`bash
npm run example:generate
npm run example:check
npm run dev
\`\`\`

Regeneration updates generated files and removes obsolete files listed in the generation manifest. Local \`.env.local\`, dependencies, build output, and unrelated files are preserved.

Copy \`.env.local.example\` to \`.env.local\` and set \`VISUALBACK_URL\` to the Spring Boot API address. This is a runnable example, not the VS Code designer.
`;
const previous = fs.existsSync(manifestPath) ? JSON.parse(fs.readFileSync(manifestPath, 'utf8')) : [];
if (!Array.isArray(previous) || previous.some(name => typeof name !== 'string' || name.includes('..') || path.isAbsolute(name) || name.startsWith('.env') && name !== '.env.local.example')) {
  throw Error('Invalid generated file manifest');
}
const manifest = JSON.stringify(Object.keys(files).sort(), null, 2) + '\n';
const changes = Object.keys(files).filter(name => !fs.existsSync(path.join(target,name)) || fs.readFileSync(path.join(target,name),'utf8') !== files[name]);
const obsolete = previous.filter(name => !(name in files) && fs.existsSync(path.join(target,name)));
const manifestChanged = !fs.existsSync(manifestPath) || fs.readFileSync(manifestPath,'utf8') !== manifest;
if (check) {
  if (changes.length || obsolete.length || manifestChanged) {
    console.error('Example is out of date. Run npm run example:generate.');
    console.error([...changes, ...obsolete.map(name => 'obsolete: '+name), ...(manifestChanged ? ['.visualweb-generated.json'] : [])].join('\n'));
    process.exitCode = 1;
  } else console.log('Frontend example matches the generator and source model.');
} else {
  for (const name of changes) {
    const file = path.join(target, name);
    fs.mkdirSync(path.dirname(file), {recursive:true});
    fs.writeFileSync(file, files[name]);
  }
  for (const name of obsolete) fs.unlinkSync(path.join(target,name));
  if (manifestChanged) fs.writeFileSync(manifestPath,manifest);
  console.log(`Frontend example regenerated (${changes.length} updated, ${obsolete.length} obsolete files removed).`);
}
