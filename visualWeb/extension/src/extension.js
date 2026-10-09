'use strict';
const vscode=require('vscode');
const fs=require('node:fs');
const crypto=require('node:crypto');
const {validate,createBlankForm}=require('./model');
const layout=require('../media/layout');
const {openProject,saveDesign}=require('./project');
const {createPreview,bindProject}=require('./preview');
const {generate}=require('./generator');
async function inspectPostRequest(openApiUrl,apiPath){
  let url;
  try{url=new URL(openApiUrl);}catch{throw Error('OpenAPI JSON URL을 올바르게 입력하세요.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('OpenAPI URL은 사용자 정보가 없는 HTTP 또는 HTTPS 주소여야 합니다.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  let response,text;
  try{
    response=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw Error(`OpenAPI 문서를 가져오지 못했습니다. (HTTP ${response.status})`);
    text=await response.text();
  }catch(error){if(error.name==='AbortError')throw Error('OpenAPI 요청 시간이 초과되었습니다.');throw error;}
  finally{clearTimeout(timer);}
  if(text.length>2_000_000)throw Error('OpenAPI 문서는 2MB 이하만 지원합니다.');
  let document;try{document=JSON.parse(text);}catch{throw Error('OpenAPI URL이 유효한 JSON 문서를 반환하지 않았습니다.');}
  const operation=document.paths?.[apiPath]?.post;
  if(!operation)throw Error(`OpenAPI 문서에서 POST ${apiPath}를 찾지 못했습니다.`);
  const requestSchema=operation.requestBody?.content?.['application/json']?.schema;
  if(!requestSchema)throw Error('선택한 POST API에 application/json requestBody 스키마가 없습니다.');
  function dereference(schema,seen=new Set()){
    if(!schema||typeof schema!=='object')return {};
    let result={...schema};
    if(schema.$ref){
      if(seen.has(schema.$ref))throw Error('OpenAPI 스키마 참조가 순환합니다.');
      const target=schema.$ref.split('/').slice(1).map(part=>decodeURIComponent(part.replace(/~1/g,'/').replace(/~0/g,'~'))).reduce((value,key)=>value?.[key],document);
      if(!target)throw Error('OpenAPI 스키마 참조를 찾을 수 없습니다: '+schema.$ref);
      const next=new Set(seen);next.add(schema.$ref);result={...dereference(target,next),...result};
    }
    if(Array.isArray(schema.allOf))for(const part of schema.allOf){const resolved=dereference(part,seen);result={...result,...resolved,properties:{...result.properties,...resolved.properties},required:[...new Set([...(result.required||[]),...(resolved.required||[])])]};}
    return result;
  }
  const schema=dereference(requestSchema),properties=schema.properties;
  if(!properties||typeof properties!=='object'||Array.isArray(properties))throw Error('POST requestBody에 객체 properties가 없습니다.');
  const required=new Set(schema.required||[]),fields=Object.entries(properties).map(([name,value])=>{
    if(!/^[a-z][a-z0-9_]{0,39}$/.test(name))throw Error(`필드 이름 '${name}'은 디자이너에서 지원하는 소문자 영문/숫자/_ 형식이 아닙니다.`);
    const property=dereference(value);
    if(!['string','integer','number',undefined].includes(property.type))throw Error(`'${name}'의 ${property.type} 타입은 입력 컴포넌트로 만들 수 없습니다.`);
    return {name,label:String(property.title||name).slice(0,100),type:['integer','number'].includes(property.type)?'number':property.format==='email'?'email':'text',required:required.has(name),unique:false,span:1,multiline:/^(content|description|body|text)$/.test(name)||property.format==='textarea'};
  });
  if(!fields.length)throw Error('POST requestBody에 생성할 입력 필드가 없습니다.');
  if(fields.length>30)throw Error('POST requestBody 필드는 30개까지만 자동 생성할 수 있습니다.');
  return fields;
}
async function listPostOperations(openApiUrl){
  let url;try{url=new URL(openApiUrl);}catch{throw Error('OpenAPI JSON URL을 올바르게 입력하세요.');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('OpenAPI URL은 사용자 정보가 없는 HTTP 또는 HTTPS 주소여야 합니다.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
  let text;
  try{
    const response=await fetch(url,{headers:{accept:'application/json'},signal:controller.signal});
    if(!response.ok)throw Error(`OpenAPI 문서를 가져오지 못했습니다. (HTTP ${response.status})`);
    text=await response.text();
  }catch(error){if(error.name==='AbortError')throw Error('OpenAPI 요청 시간이 초과되었습니다.');throw error;}
  finally{clearTimeout(timer);}
  if(text.length>2_000_000)throw Error('OpenAPI 문서는 2MB 이하만 지원합니다.');
  let document;try{document=JSON.parse(text);}catch{throw Error('OpenAPI URL이 유효한 JSON 문서를 반환하지 않았습니다.');}
  return Object.entries(document.paths||{}).flatMap(([path,operations])=>{
    const post=operations?.post;
    if(!post?.requestBody?.content?.['application/json']?.schema)return [];
    return [{path,name:String(post.summary||post.operationId||path).slice(0,100)}];
  });
}
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
      const send=(editApplied=false)=>{
        try{webview.postMessage({type:'model',model:validate(JSON.parse(document.getText())),version:document.version,editApplied});}
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
            if(message.version!==document.version)throw Error('문서가 변경되어 이벤트를 적용하지 못했습니다. 최신 상태를 불러왔습니다. 다시 적용해 주세요.');
            const model=validate(message.model),edit=new vscode.WorkspaceEdit();
            edit.replace(document.uri,new vscode.Range(0,0,document.lineCount,0),JSON.stringify(model,null,2)+'\n');
            applying=true;
            try{if(!await vscode.workspace.applyEdit(edit))throw Error('변경을 적용하지 못했습니다.');}finally{applying=false;}
            send(true);
          }
          if(message.type==='editEvents'){
            const model=validate(JSON.parse(document.getText()));
            const roots=[model,...(model.screens||[]),...(model.popupViews||[])];
            const node=roots.map(root=>layout.find(root.components||[],message.componentId)).find(Boolean);
            if(node?.type!=='button')throw Error('이벤트를 적용할 버튼을 찾을 수 없습니다.');
            if(message.events&&Object.keys(message.events).length)node.events=message.events;else delete node.events;
            validate(model);
            const edit=new vscode.WorkspaceEdit();
            edit.replace(document.uri,new vscode.Range(0,0,document.lineCount,0),JSON.stringify(model,null,2)+'\n');
            applying=true;
            try{if(!await vscode.workspace.applyEdit(edit))throw Error('이벤트 변경을 적용하지 못했습니다.');}finally{applying=false;}
            send(true);
          }
          if(message.type==='inspectPostApi'){
            const fields=await inspectPostRequest(message.openApiUrl,message.apiPath);
            webview.postMessage({type:'postApiFields',requestId:message.requestId,fields});
          }
          if(message.type==='listPostApis'){
            const apis=await listPostOperations(message.openApiUrl);
            webview.postMessage({type:'postApiList',requestId:message.requestId,apis});
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
        }catch(e){if(message.type==='inspectPostApi'||message.type==='listPostApis'){webview.postMessage({type:message.type==='listPostApis'?'postApiListError':'postApiFieldsError',requestId:message.requestId,message:e.message});return;}if(message.type==='edit'||message.type==='editEvents')send();webview.postMessage({type:'error',message:e.message});vscode.window.showErrorMessage(e.message);}
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
