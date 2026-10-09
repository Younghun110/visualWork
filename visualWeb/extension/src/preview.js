'use strict';
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const net=require('node:net');
const crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const {generate}=require('./generator');
async function writePreview(model,directory){
  const files=Object.entries(generate(model));
  await fs.mkdir(directory,{recursive:true});
  await Promise.all(files.map(async([name,content])=>{
    const file=path.join(directory,name);
    await fs.mkdir(path.dirname(file),{recursive:true});
    try{if(await fs.readFile(file,'utf8')===content)return;}
    catch(error){if(error.code!=='ENOENT')throw error;}
    await fs.writeFile(file,content);
  }));
}
async function syncPreviewEnvironment(directory,generatedDirectory,backendUrl){
  const names=['.env','.env.development','.env.local','.env.development.local'];
  const desired=new Map();
  if(generatedDirectory){
    for(const name of names){
      try{desired.set(name,await fs.readFile(path.join(generatedDirectory,'frontend',name)));}
      catch(error){if(error.code!=='ENOENT')throw error;}
    }
  }
  if(!desired.size){
    const backend=new URL(backendUrl);
    if(!['http:','https:'].includes(backend.protocol))throw Error('VisualBack 주소는 http 또는 https URL이어야 합니다.');
    desired.set('.env.local',Buffer.from('VISUALBACK_URL='+backend.origin+'\n'));
  }
  await Promise.all(names.map(async name=>{
    const target=path.join(directory,'frontend',name),content=desired.get(name);
    if(!content){await fs.rm(target,{force:true});return;}
    try{if((await fs.readFile(target)).equals(content))return;}
    catch(error){if(error.code!=='ENOENT')throw error;}
    await fs.writeFile(target,content);
  }));
}
function freePort(){return new Promise((resolve,reject)=>{
  const server=net.createServer();server.once('error',reject);
  server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(error=>error?reject(error):resolve(port));});
});}
function startNpm(args,cwd){
  return process.platform==='win32'?spawn('cmd.exe',['/d','/s','/c','npm '+args.join(' ')],{cwd,windowsHide:true}):spawn('npm',args,{cwd,detached:true});
}
async function previewDirectory(context,key){
  if(context.globalStorageUri.scheme==='file')return path.join(context.globalStorageUri.fsPath,'previews',key);
  // URI providers do not determine whether this Node extension host can run npm.
  // Use a native path on the same host as the process when storage is virtual/remote.
  return fs.mkdtemp(path.join(os.tmpdir(),'visualweb-preview-'+key+'-'));
}
function projectStateKey(uri){return 'visualweb.preview.project.'+crypto.createHash('sha256').update(uri.toString()).digest('hex').slice(0,16);}
async function bindProject(context,uri,directory){await context.workspaceState?.update(projectStateKey(uri),directory);}
function createPreview(vscode,context,document,dependencies={}){
  const launch=dependencies.startNpm || startNpm,allocatePort=dependencies.freePort || freePort;
  const output=vscode.window.createOutputChannel('VisualWeb Preview');
  const key=crypto.createHash('sha256').update(document.uri.toString()).digest('hex').slice(0,16);
  const projectKey=projectStateKey(document.uri);
  let generatedDirectory=context.workspaceState?.get(projectKey),directory;
  let child,port,busy=false,closed=false;
  function stop(){
    if(child){
      if(process.platform!=='win32'&&child.pid){try{process.kill(-child.pid,'SIGTERM');}catch{child.kill();}}
      else if(process.platform==='win32'&&child.pid)spawn('taskkill',['/pid',String(child.pid),'/t','/f'],{windowsHide:true});
      else child.kill();
      child=undefined;
    }
    port=undefined;
  }
  async function run(){
    if(busy)throw Error('미리보기를 준비하고 있습니다.');
    if(!vscode.workspace.isTrusted)throw Error('미리보기는 신뢰하는 작업 공간에서 사용하세요.');
    busy=true;output.show(true);
    try{
      if(generatedDirectory){
        try{await fs.access(path.join(generatedDirectory,'package.json'));}
        catch{throw Error('생성한 프로젝트를 찾을 수 없습니다. 프로젝트 폴더를 다시 불러오세요.');}
      }
      directory ||= await previewDirectory(context,key);
      output.append('Preview directory: '+directory+'\n');
      const model=JSON.parse(document.getText());await writePreview(model,directory);
      await syncPreviewEnvironment(directory,generatedDirectory,vscode.workspace.getConfiguration('visualweb').get('preview.backendUrl','http://127.0.0.1:4000'));
      // Reuse saved-project dependencies, then the development workspace dependencies.
      const candidates=[generatedDirectory&&path.join(generatedDirectory,'node_modules'),path.resolve(context.extensionUri.fsPath,'../node_modules')].filter(Boolean);
      try{await fs.access(path.join(directory,'node_modules/next/package.json'));}
      catch{
        let linked=false;
        for(const modules of candidates){
          try{await fs.access(path.join(modules,'next/package.json'));await fs.symlink(modules,path.join(directory,'node_modules'),process.platform==='win32'?'junction':'dir');linked=true;break;}
          catch{}
        }
        if(!linked){await new Promise((resolve,reject)=>{
          child=launch(['install','--no-audit','--no-fund'],directory);
          child.stdout.on('data',chunk=>output.append(chunk.toString()));child.stderr.on('data',chunk=>output.append(chunk.toString()));
          child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('의존성 설치에 실패했습니다. VisualWeb Preview 로그를 확인하세요.')));
        });child=undefined;}
      }
      if(closed)throw Error('디자이너가 닫혀 미리보기를 중단했습니다.');
      if(!child){
        port=await allocatePort();
        await new Promise((resolve,reject)=>{
          const processHandle=launch(['run','dev','--','--webpack','--port',String(port)],directory);child=processHandle;
          let buffer='',ready=false;
          const timer=setTimeout(()=>fail(Error('미리보기 서버 시작 시간이 초과됐습니다. 로그를 확인하세요.')),120000);
          const fail=error=>{clearTimeout(timer);if(!ready){stop();reject(error);}};
          const log=chunk=>{const value=chunk.toString();output.append(value);buffer=(buffer+value).slice(-4000);if(!ready&&/Ready in|✓ Ready/.test(buffer)){ready=true;clearTimeout(timer);resolve();}};
          processHandle.stdout.on('data',log);processHandle.stderr.on('data',log);
          processHandle.once('error',fail);processHandle.once('exit',code=>{if(child===processHandle){child=undefined;port=undefined;}fail(Error('미리보기 서버가 종료됐습니다 ('+code+').'));});
        });
      }
      if(closed||!port)throw Error('미리보기 서버가 중단됐습니다.');
      const uri=await vscode.env.asExternalUri(vscode.Uri.parse('http://127.0.0.1:'+port));
      await vscode.commands.executeCommand('simpleBrowser.show',uri.toString());
    }finally{busy=false;}
  }
  return {run,async setProject(folder){stop();generatedDirectory=folder;directory=undefined;await context.workspaceState?.update(projectKey,folder);},dispose(){if(closed)return;closed=true;stop();output.dispose();}};
}
module.exports={createPreview,writePreview,syncPreviewEnvironment,previewDirectory,bindProject};
