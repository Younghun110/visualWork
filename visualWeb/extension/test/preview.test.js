const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os'),path=require('node:path');
const {EventEmitter}=require('node:events');
const {createPreview,previewDirectory}=require('../src/preview');
const {createForm}=require('../src/model');
test('preview creates current design, reuses server and stops on disposal',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'visualweb-preview-test-'));
 let starts=0,kills=0,model=createForm();const opened=[];const commands=[];
 await fs.mkdir(path.join(root,'node_modules/next'),{recursive:true});await fs.writeFile(path.join(root,'node_modules/next/package.json'),'{}');
 const vscode={workspace:{isTrusted:true,getConfiguration:()=>({get:()=> 'http://localhost:4000'})},window:{createOutputChannel:()=>({show(){},append(){},dispose(){}})},env:{asExternalUri:async uri=>uri},Uri:{parse:value=>({toString:()=>value})},commands:{executeCommand:async(...args)=>opened.push(args)}};
 const preview=createPreview(vscode,{extensionUri:{fsPath:path.join(root,'extension')},globalStorageUri:{scheme:'file',fsPath:path.join(root,'storage')}},{uri:{toString:()=> 'file:///design.visualweb.json'},getText:()=>JSON.stringify(model)},{freePort:async()=>4567,startNpm:args=>{
  commands.push(args);starts++;const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{kills++;};setImmediate(()=>child.stdout.emit('data',Buffer.from('Ready in 100ms')));return child;
 }});
 try{
  await preview.run();assert.equal(starts,1);assert(commands[0].includes('--webpack'));assert.equal(opened[0][0],'simpleBrowser.show');assert.equal(opened[0][1],'http://127.0.0.1:4567');
  model.title='Updated preview';await preview.run();assert.equal(starts,1);assert.equal(opened.length,2);
  const [folder]=await fs.readdir(path.join(root,'storage/previews'));
  const project=path.join(root,'storage/previews',folder);
  assert.equal(JSON.parse(await fs.readFile(path.join(project,'frontend/schema.json'),'utf8')).title,'Updated preview');
  assert.equal(await fs.readFile(path.join(project,'frontend/.env.local'),'utf8'),'VISUALBACK_URL=http://localhost:4000\n');
  vscode.workspace.isTrusted=false;await assert.rejects(preview.run(),/신뢰/);
  preview.dispose();preview.dispose();assert.equal(kills,1);
 }finally{preview.dispose();await fs.rm(root,{recursive:true,force:true});}
});

test('remote and virtual storage URIs use a native temporary directory',async()=>{
 assert.equal(await previewDirectory({globalStorageUri:{scheme:'file',fsPath:'/tmp/storage'}},'design'),path.join('/tmp/storage','previews','design'));
 for(const scheme of ['vscode-remote','vscode-userdata']){
  const directory=await previewDirectory({globalStorageUri:{scheme,fsPath:'/unavailable/virtual/storage'}},'design');
  try{
   assert.equal(path.dirname(directory),os.tmpdir());
   await fs.writeFile(path.join(directory,'host-check'),'ok');
   assert.equal(await fs.readFile(path.join(directory,'host-check'),'utf8'),'ok');
  }finally{await fs.rm(directory,{recursive:true,force:true});}
 }
});
test('previews current workspace design and reuses exported configuration without modifying source',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'visualweb-export-preview-'));
 const project=path.join(root,'exported'),state=new Map(),opened=[],launches=[];
 await fs.mkdir(path.join(project,'frontend/app'),{recursive:true});
 await fs.mkdir(path.join(project,'node_modules/next'),{recursive:true});
 await fs.writeFile(path.join(project,'package.json'),'{}');
 await fs.writeFile(path.join(project,'node_modules/next/package.json'),'{}');
 await fs.writeFile(path.join(project,'frontend/app/page.jsx'),'custom saved screen');
 await fs.writeFile(path.join(project,'frontend/.env.local'),'existing-local-config');
 const vscode={workspace:{isTrusted:true},window:{createOutputChannel:()=>({show(){},append(){},dispose(){}})},env:{asExternalUri:async uri=>uri},Uri:{parse:value=>({toString:()=>value})},commands:{executeCommand:async(...args)=>opened.push(args)}};
 const context={extensionUri:{fsPath:path.join(root,'extension')},globalStorageUri:{scheme:'file',fsPath:path.join(root,'storage')},workspaceState:{get:key=>state.get(key),update:async(key,value)=>state.set(key,value)}};
 let model=createForm();model.screens=[{...createForm(),id:'screen_reservation',title:'예약 관리'}];
 const document={uri:{toString:()=> 'file:///saved.visualweb.json'},getText:()=>JSON.stringify(model)};
 const dependencies={freePort:async()=>4568,startNpm:(args,cwd)=>{
  launches.push(cwd);const child=new EventEmitter();child.stdout=new EventEmitter();child.stderr=new EventEmitter();child.kill=()=>{};
  setImmediate(()=>child.stdout.emit('data',Buffer.from('Ready in 100ms')));return child;
 }};
 let preview=createPreview(vscode,context,document,dependencies);
 try{
  await preview.setProject(project);await preview.run();preview.dispose();
  preview=createPreview(vscode,context,document,dependencies);await preview.run();
  assert.equal(launches.length,2);assert.notEqual(launches[0],project);assert.equal(launches[0],launches[1]);assert.equal(opened.length,2);
  const generated=JSON.parse(await fs.readFile(path.join(launches[0],'frontend/schema.json'),'utf8'));
  assert.equal(generated.screens[0].title,'예약 관리');
  assert.match(await fs.readFile(path.join(launches[0],'frontend/app/page.jsx'),'utf8'),/WorkspaceShell/);
  assert.match(await fs.readFile(path.join(launches[0],'frontend/components/workspace-shell.jsx'),'utf8'),/role="tabpanel"/);
  assert.equal(await fs.readFile(path.join(launches[0],'frontend/.env.local'),'utf8'),'existing-local-config');
  assert.equal(await fs.readFile(path.join(project,'frontend/app/page.jsx'),'utf8'),'custom saved screen');
  assert.equal(await fs.readFile(path.join(project,'frontend/.env.local'),'utf8'),'existing-local-config');
 }finally{preview.dispose();await fs.rm(root,{recursive:true,force:true});}
});
