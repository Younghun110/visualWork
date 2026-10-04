'use strict';
const fs=require('node:fs'),path=require('node:path');
const {generate}=require('./generator');
const [source,target]=process.argv.slice(2);
if(!source||!target){console.error('Usage: node extension/src/cli.js form.visualweb.json NEW_OUTPUT_DIRECTORY');process.exit(1);}
const files=generate(JSON.parse(fs.readFileSync(source,'utf8')));
fs.mkdirSync(target); // Never overwrite an existing project.
for(const [name,content]of Object.entries(files)){const file=path.join(target,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content,{flag:'wx'});}
console.log('Generated: '+path.resolve(target));
