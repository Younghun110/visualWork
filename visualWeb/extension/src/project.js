'use strict';
const {validate}=require('./model');
function parseProject(contents){
  try{return validate(JSON.parse(contents));}
  catch(error){throw Error('프로젝트 설계를 불러올 수 없습니다: '+error.message);}
}
async function openProject(vscode,context,bindProject){
  const folders=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'VisualWeb 프로젝트 폴더 불러오기'});
  if(!folders?.length)return;
  const folder=folders[0],design=vscode.Uri.joinPath(folder,'project.visualweb.json');
  let contents;
  try{contents=await vscode.workspace.fs.readFile(design);}
  catch(error){
    if(error.code!=='FileNotFound'&&error.code!=='ENOENT')throw error;
    try{contents=await vscode.workspace.fs.readFile(vscode.Uri.joinPath(folder,'frontend/schema.json'));}
    catch{throw Error('프로젝트 폴더에 project.visualweb.json 또는 frontend/schema.json이 없습니다.');}
    const model=parseProject(Buffer.from(contents).toString('utf8'));
    await vscode.workspace.fs.writeFile(design,Buffer.from(JSON.stringify(model,null,2)+'\n'));
  }
  parseProject(Buffer.from(contents).toString('utf8'));
  await bindProject(context,design,folder.fsPath);
  await vscode.commands.executeCommand('vscode.openWith',design,'visualweb.designer');
  vscode.window.showInformationMessage('프로젝트 불러오기 완료: '+folder.fsPath);
  return true;
}
async function saveDesign(document){
  parseProject(document.getText());
  if(!await document.save())throw Error('설계 파일을 저장하지 못했습니다.');
  return document.uri.fsPath;
}
module.exports={openProject,parseProject,saveDesign};
