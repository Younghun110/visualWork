const {test}=require('node:test');const assert=require('node:assert/strict');const Module=require('node:module');
test('development startup opens empty canvas without reading or opening a design',async()=>{
 const commands=new Map(),opened=[],read=[];let receive;const writes=[];
 const webview={asWebviewUri:uri=>({toString:()=>uri.fsPath}),cspSource:'test',postMessage:message=>opened.push(message),onDidReceiveMessage:callback=>{receive=callback;return {dispose(){}};}};
 const vscode={ExtensionMode:{Development:2},ViewColumn:{One:1},Uri:{joinPath:(uri,...parts)=>({fsPath:require('node:path').join(uri.fsPath,...parts)})},commands:{registerCommand:(name,callback)=>{commands.set(name,callback);return {dispose(){}};},executeCommand:async(...args)=>opened.push(args)},window:{showSaveDialog:async()=>({fsPath:'/tmp/new.visualweb.json'}),createWebviewPanel:()=>({webview,onDidDispose(){},dispose(){},reveal(){}}),registerCustomEditorProvider:()=>({dispose(){}})},workspace:{fs:{writeFile:async(uri,data)=>writes.push(JSON.parse(data.toString())),readFile:async uri=>{read.push(uri);throw Error('No designs should be read');}}}};
 const load=Module._load;Module._load=function(name,...args){return name==='vscode'?vscode:load.call(this,name,...args);};
 let activate;try{delete require.cache[require.resolve('../src/extension')];activate=require('../src/extension').activate;}finally{Module._load=load;}
 activate({extensionMode:2,extensionUri:{fsPath:require('node:path').resolve(__dirname,'..')},subscriptions:[]});
 assert(webview.html.includes('id="fields"'));assert.equal(read.length,0);assert.deepEqual(opened,[['workbench.action.closePanel']]);
 await receive({type:'ready'});assert.deepEqual(opened,[['workbench.action.closePanel'],{type:'empty'}]);assert(commands.has('visualweb.openProject'));assert(webview.html.includes('id="new-project"'));await receive({type:'newProject'});assert.deepEqual(opened.at(-1),['visualweb.newForm']);await commands.get('visualweb.newForm')();assert.deepEqual(writes[0].fields,[]);assert.deepEqual(writes[0].components,[]);assert.equal(opened.at(-1)[0],'vscode.openWith');
});
