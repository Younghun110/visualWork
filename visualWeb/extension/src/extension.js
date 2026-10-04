'use strict';
const vscode=require('vscode');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {validate,createBlankForm}=require('./model');
const {openProject,saveDesign}=require('./project');
const {createPreview,bindProject}=require('./preview');
const {generate}=require('./generator');
function setupDesigner(context,webview){
  webview.options={enableScripts:true,localResourceRoots:[vscode.Uri.joinPath(context.extensionUri,'media')]};
  const nonce=crypto.randomBytes(16).toString('hex');
  const resource=name=>webview.asWebviewUri(vscode.Uri.joinPath(context.extensionUri,'media',name)).toString();
  webview.html=fs.readFileSync(vscode.Uri.joinPath(context.extensionUri,'media/designer.html').fsPath,'utf8')
    .replaceAll('__CSP__',webview.cspSource).replaceAll('__NONCE__',nonce).replace('__CSS__',resource('designer.css')).replace('__LAYOUT__',resource('layout.js')).replace('__JS__',resource('designer.js'));
}
function activate(context){
  let welcome;
  const openDesigner=()=>{
    if(welcome){welcome.reveal();return;}
    welcome=vscode.window.createWebviewPanel('visualweb.start','VisualWeb Designer',vscode.ViewColumn.One,{enableScripts:true});
    const panel=welcome;
    const received=panel.webview.onDidReceiveMessage(async message=>{
      if(message.type==='ready')panel.webview.postMessage({type:'empty'});
      if(message.type==='newProject')await vscode.commands.executeCommand('visualweb.newForm');
      if(message.type==='openProject')await vscode.commands.executeCommand('visualweb.openProject');
    });
    panel.onDidDispose(()=>{received.dispose();if(welcome===panel)welcome=undefined;});
    setupDesigner(context,panel.webview);context.subscriptions.push(panel);
  };
  context.subscriptions.push(vscode.commands.registerCommand('visualweb.openDesigner',openDesigner));
  context.subscriptions.push(vscode.commands.registerCommand('visualweb.openProject',async()=>{
    try{if(await openProject(vscode,context,bindProject))welcome?.dispose();}catch(error){vscode.window.showErrorMessage(error.message);}
  }));
  context.subscriptions.push(vscode.commands.registerCommand('visualweb.newForm',async()=>{
    try{
      const uri=await vscode.window.showSaveDialog({filters:{'VisualWeb 설계':['visualweb.json']},saveLabel:'새 프로젝트 만들기'});
      if(!uri)return;
      await vscode.workspace.fs.writeFile(uri,Buffer.from(JSON.stringify(createBlankForm(),null,2)+'\n'));
      await vscode.commands.executeCommand('vscode.openWith',uri,'visualweb.designer');
      welcome?.dispose();
    }catch(error){vscode.window.showErrorMessage(error.message);}

  }));
  context.subscriptions.push(vscode.window.registerCustomEditorProvider('visualweb.designer',{
    async resolveCustomTextEditor(document,panel){
      const webview=panel.webview;
      const send=()=>{
        try{webview.postMessage({type:'model',model:validate(JSON.parse(document.getText())),version:document.version});}
        catch(e){webview.postMessage({type:'error',message:e.message+' JSON 원문에서 수정하거나 새 폼을 만드세요.'});}
      };
      const preview=createPreview(vscode,context,document);context.subscriptions.push(preview);
      let applying=false;
      const changed=vscode.workspace.onDidChangeTextDocument(e=>{if(e.document.uri.toString()===document.uri.toString()&&!applying)send();});
      const received=webview.onDidReceiveMessage(async message=>{
        try{
          if(message.type==='ready')send();
          if(message.type==='save'){
            const file=await saveDesign(document);
            webview.postMessage({type:'saved',message:'설계를 저장했습니다: '+file});
          }
          if(message.type==='edit'){
            if(message.version!==document.version){send();return;}
            const model=validate(message.model),edit=new vscode.WorkspaceEdit();
            edit.replace(document.uri,new vscode.Range(0,0,document.lineCount,0),JSON.stringify(model,null,2)+'\n');
            applying=true;
            try{if(!await vscode.workspace.applyEdit(edit))throw Error('변경을 적용하지 못했습니다.');}finally{applying=false;}
            send();
          }
          if(message.type==='preview'){
            webview.postMessage({type:'previewStatus',busy:true});
            try{await preview.run();}finally{webview.postMessage({type:'previewStatus',busy:false});}
          }
          if(message.type==='newProject')await vscode.commands.executeCommand('visualweb.newForm');
          if(message.type==='openProject')await vscode.commands.executeCommand('visualweb.openProject');
          if(message.type==='source')await vscode.commands.executeCommand('vscode.openWith',document.uri,'default');
          if(message.type==='export'){
            if(!vscode.workspace.isTrusted)throw Error('코드 생성은 신뢰하는 작업 공간에서 실행하세요.');
            const files=generate(validate(JSON.parse(document.getText())));
            const dirs=await vscode.window.showOpenDialog({canSelectFolders:true,canSelectFiles:false,canSelectMany:false,openLabel:'생성할 상위 폴더 선택'});
            if(!dirs)return;
            const folder=vscode.Uri.joinPath(dirs[0],`visualweb-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`);
            await vscode.workspace.fs.createDirectory(folder);
            for(const [name,content]of Object.entries(files)){
              const uri=vscode.Uri.joinPath(folder,name);
              await vscode.workspace.fs.createDirectory(vscode.Uri.joinPath(uri,'..'));
              await vscode.workspace.fs.writeFile(uri,Buffer.from(content));
            }
            await preview.setProject(folder.fsPath);
            await vscode.window.showTextDocument(vscode.Uri.joinPath(folder,'README.md'));
            vscode.window.showInformationMessage(`생성 완료: ${folder.fsPath}`);
          }
        }catch(e){if(message.type==='edit')send();webview.postMessage({type:'error',message:e.message});vscode.window.showErrorMessage(e.message);}
      });
      panel.onDidDispose(()=>{changed.dispose();received.dispose();preview.dispose();});
      setupDesigner(context,webview);

    }
  },{supportsMultipleEditorsPerDocument:false}));
  if(context.extensionMode===vscode.ExtensionMode.Development){
    openDesigner();
    void vscode.commands.executeCommand('workbench.action.closePanel');
  }
}
module.exports={activate};
