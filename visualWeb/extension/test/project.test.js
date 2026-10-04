const {test}=require('node:test'),assert=require('node:assert/strict');
const {openProject}=require('../src/project');const {createForm}=require('../src/model');const {generate}=require('../src/generator');
function fixture(files,cancel=false){
 const opened=[],bound=[],writes=[];
 const uri=path=>({fsPath:path,toString:()=>path});
 const vscode={Uri:{joinPath:(parent,name)=>uri(parent.fsPath+'/'+name)},window:{showOpenDialog:async()=>cancel?undefined:[uri('/project')],showInformationMessage(){}},workspace:{fs:{readFile:async file=>{
  if(!(file.fsPath in files))throw Object.assign(Error('missing'),{code:'FileNotFound'});return Buffer.from(files[file.fsPath]);
 },writeFile:async(file,contents)=>{writes.push(file.fsPath);files[file.fsPath]=contents.toString();}}},commands:{executeCommand:async(...args)=>opened.push(args)}};
 return {files,writes,opened,bound,run:()=>openProject(vscode,{},async(context,document,directory)=>bound.push([document.fsPath,directory]))};
}
test('older project imports schema while preserving app code and local settings',async()=>{
 const model=createForm();model.screens=[{...createForm(),id:'screen_members',title:'회원 관리'}];
 const f=fixture({'/project/frontend/schema.json':JSON.stringify(model),'/project/frontend/app/page.jsx':'custom code','/project/frontend/.env.local':'local settings'});
 await f.run();assert.deepEqual(JSON.parse(f.files['/project/project.visualweb.json']),model);
 assert.deepEqual(f.writes,['/project/project.visualweb.json']);assert.equal(f.files['/project/frontend/app/page.jsx'],'custom code');assert.equal(f.files['/project/frontend/.env.local'],'local settings');
 assert.deepEqual(f.bound,[['/project/project.visualweb.json','/project']]);assert.equal(f.opened[0][0],'vscode.openWith');
});
test('existing project design is preferred and reopened without writes',async()=>{
 const model=createForm();model.title='Saved design';const f=fixture({'/project/project.visualweb.json':JSON.stringify(model),'/project/frontend/schema.json':'invalid stale schema'});
 await f.run();assert.equal(f.writes.length,0);assert.equal(f.bound.length,1);assert.equal(JSON.parse(generate(model)['project.visualweb.json']).title,'Saved design');
});
test('invalid, missing and canceled projects do not modify files or bind preview',async()=>{
 for(const files of [{},{'/project/frontend/schema.json':'{}'},{'/project/project.visualweb.json':'invalid JSON'}]){
  const f=fixture(files);await assert.rejects(f.run());assert.equal(f.writes.length,0);assert.equal(f.bound.length,0);
 }
 const f=fixture({},true);await f.run();assert.equal(f.opened.length,0);assert.equal(f.writes.length,0);
});

test('save updates the opened design document and reports failure',async()=>{
 const {saveDesign}=require('../src/project');
 const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'visualweb-save-'));
 try{
  const file=path.join(directory,'project.visualweb.json');
  const model=createForm();await fs.writeFile(file,JSON.stringify(model));
  model.title='수정한 화면';let contents=JSON.stringify(model);
  const document={uri:{fsPath:file},getText:()=>contents,save:async()=>{await fs.writeFile(file,contents);return true;}};
  assert.equal(await saveDesign(document),file);
  assert.equal(JSON.parse(await fs.readFile(file,'utf8')).title,'수정한 화면');
  document.save=async()=>false;await assert.rejects(saveDesign(document),/저장하지 못했습니다/);
  contents='invalid';await assert.rejects(saveDesign(document),/프로젝트 설계/);
 }finally{await fs.rm(directory,{recursive:true,force:true});}
});
