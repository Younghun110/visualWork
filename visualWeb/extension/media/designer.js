'use strict';
const vscode=acquireVsCodeApi(), L=window.VisualWebLayout;
const $=id=>document.getElementById(id);
let apiDraft,apiApplying=false,saveRequested=false;
let project,activeScreen='main',model,version,selected,pending=false,dragOffset={x:0,y:0},previewBusy=false;
function setStatus(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function currentScreen(){return activeScreen==='main'?project:project.screens?.find(screen=>screen.id===activeScreen)||project;}
function edit(fn){
  if(!model||pending)return;
  const previous=JSON.stringify(project);
  try{fn();L.validate(model.components,model.fields);}catch(e){project=JSON.parse(previous);model=currentScreen();render();setStatus(e.message,true);return;}
  pending=true;$('new-project').disabled=true;$('open-project').disabled=true;$('export').disabled=true;$('preview').disabled=true;vscode.postMessage({type:'edit',model:project,version});
}
function drop(event,parent,index){
  event.preventDefault();event.stopPropagation();event.currentTarget.classList.remove('drag-over');
  const value=event.dataTransfer.getData('text/plain');
  const rect=$('fields').getBoundingClientRect();
  const point={x:Math.max(0,Math.round(event.clientX-rect.left-(value.startsWith('move:')?dragOffset.x:0))),y:Math.max(0,Math.round(event.clientY-rect.top-(value.startsWith('move:')?dragOffset.y:0)))};
  if(value.startsWith('add:'))add(value.slice(4),parent,index,parent?undefined:point);
  else if(value.startsWith('move:'))edit(()=>{if(parent)L.move(model.components,value.slice(5),parent,index);else L.place(model.components,value.slice(5),point);selected=value.slice(5);});
}
function zone(parent,index){
  const el=document.createElement('div');el.className='drop-zone';el.textContent='＋ 여기로 드래그';
  el.ondragover=e=>{e.preventDefault();e.stopPropagation();el.classList.add('drag-over');};
  el.ondragleave=()=>el.classList.remove('drag-over');el.ondrop=e=>drop(e,parent,index);return el;
}
function renderNodes(nodes,target,parent=null){
  nodes.forEach((node,index)=>{
    if(parent&&node.type!=='cell')target.append(zone(parent,index));
    const el=document.createElement('div');el.className='field component'+(node.id===selected?' selected':'')+(node.span===2?' wide':'');el.draggable=node.type!=='cell';el.tabIndex=0;el.dataset.id=node.id;
    if(!parent){el.classList.add('free-component');el.style.left=node.position.x+'px';el.style.top=node.position.y+'px';el.style.width=node.position.width+'px';}
    el.setAttribute('aria-label',node.type+' 선택');
    const choose=e=>{e.stopPropagation();if(selected!==node.id){selected=node.id;render();}};
    el.onclick=node.type==='cell'?e=>e.stopPropagation():choose;el.onkeydown=e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(e);}};
    el.ondragstart=e=>{e.stopPropagation();const rect=el.getBoundingClientRect();dragOffset={x:e.clientX-rect.left,y:e.clientY-rect.top};e.dataTransfer.setData('text/plain','move:'+node.id);e.dataTransfer.effectAllowed='move';};
    if(L.isField(node)){
      const f=model.fields.find(f=>f.name===node.field);
      const caption=document.createElement('span');caption.className='caption';caption.textContent=f.label+(f.required?' *':'');
      const mock=document.createElement('span');mock.className='mock';
      if(node.type==='radio'){mock.className='preview-radio-options';for(const option of node.options){const item=document.createElement('span');item.textContent='○ '+option.label;mock.append(item);}}
      else if(node.type==='select')mock.textContent='선택하세요 ▾';
      else if(node.type==='textarea'){mock.classList.add('preview-textarea');mock.textContent='여러 줄 텍스트';mock.style.minHeight=(node.rows*20)+'px';}
      else mock.textContent=f.type==='email'?'name@example.com':f.type==='number'?'0':'텍스트 입력';el.append(caption,mock);
    }else if(node.type==='text'){const text=document.createElement('p');text.className='preview-text';text.textContent=node.useCellValue?'{{ backend cell value }}':node.text;el.append(text);}
    else if(node.type==='button'){if(node.buttonAreaWidth!==undefined){el.style.width=node.buttonAreaWidth+'px';el.style.flexBasis='auto';}const button=document.createElement('span');button.className='preview-button';button.textContent=node.text;button.onclick=choose;button.title='선택 후 오른쪽 버튼 텍스트에서 수정하세요.';const row=document.createElement('div');row.className='button-preview-row';row.dataset.align=node.align||'left';row.style.justifyContent={left:'flex-start',center:'center',right:'flex-end'}[node.align||'left'];row.style.alignItems={top:'flex-start',center:'center',bottom:'flex-end'}[node.verticalAlign||'top'];row.style.minHeight=(node.buttonAreaHeight||44)+'px';if(node.buttonWidth!==undefined){button.style.width=node.buttonWidth+'px';button.style.minWidth='0';button.style.paddingInline=Math.min(28,node.buttonWidth/4)+'px';button.style.boxSizing='border-box';}button.style.transform='translate('+(node.offsetX||0)+'px, '+(node.offsetY||0)+'px)';row.append(button);el.append(row);}
    else {
      const caption=document.createElement('span');caption.className='caption';caption.textContent=node.type==='grid'?'Grid · '+node.rows+'행 × '+node.columns+'열':node.type==='cell'?'Body Cell '+(index+1):'Container · Flow Layout';el.append(caption);
      const children=document.createElement('div');children.className=node.type==='grid'?'layout-grid cols-'+node.columns:'layout-stack '+(node.type==='container'?'layout-flow':'');
      if(node.type==='grid'){
        const header=document.createElement('div');header.className='grid-header';
        for(let c=0;c<node.columns;c++){const cell=document.createElement('div');cell.className='header-cell';const title=document.createElement('span');title.textContent=(model.fields[c]?.label || 'Header '+(c+1))+(node.sortable===false?'':' ↕');cell.append(title);
          if(node.headerFilter!==false){const filter=document.createElement('span');filter.className='preview-header-filter';filter.textContent='Filter…';cell.append(filter);}header.append(cell);}
        children.append(header);
      }
      renderNodes(node.children,children,node.id);el.append(children);
      if(node.type!=='grid')el.ondragover=e=>{e.preventDefault();e.stopPropagation();el.classList.add('drag-over');};
      el.ondragleave=()=>el.classList.remove('drag-over');if(node.type!=='grid')el.ondrop=e=>drop(e,node.id,node.children.length);
    }
    target.append(el);
  });if(parent&&(!nodes.length || nodes[0].type!=='cell'))target.append(zone(parent,nodes.length));
}
function render(){
  $('screen-list').replaceChildren();
  for(const screen of [{id:'main',title:project.title},...(project.screens||[])]){
    const button=document.createElement('button');button.textContent=screen.title;button.className=activeScreen===screen.id?'active':'';
    button.onclick=()=>{if(pending)return;activeScreen=screen.id;model=currentScreen();model.components??=L.initial(model);L.ensurePositions(model.components);selected=null;render();};$('screen-list').append(button);
  }
  $('delete-screen').disabled=activeScreen==='main';
  for(const key of ['title','table'])$(key).value=model[key];
  $('api-summary').textContent='등록된 API '+(model.apis?.length||0)+'개';
  L.ensurePositions(model.components);$('fields').replaceChildren();renderNodes(model.components,$('fields'));
  requestAnimationFrame(()=>{
    const elements=Array.from($('fields').children);
    $('fields').style.minHeight=Math.max(1000,...elements.map(el=>el.offsetTop+el.offsetHeight+40))+'px';
    $('fields').style.minWidth=Math.max(800,...elements.map(el=>el.offsetLeft+el.offsetWidth+16))+'px';
  });
  const node=L.find(model.components,selected);$('empty').hidden=!!node;$('properties').hidden=!node;if(!node)return;
  const root=model.components.includes(node);$('position-properties').hidden=!root;$('span-property').hidden=root&&node.type!=='button';
  if(root){$('pos-x').value=node.position.x;$('pos-y').value=node.position.y;$('pos-width').value=node.position.width;}if($('pos-width').parentElement)$('pos-width').parentElement.hidden=node.type==='button';
  $('button-api-selection').hidden=node.type!=='button';renderApiSelect('button-api-id',node,'ACTION');renderApiSelect('grid-api-id',node,'GET');
  $('button-api-property').hidden=node.type!=='button'||node.action!=='submit'||!!node.apiId;$('button-api-path').value=node.apiPath||'';$('grid-api-path').value=node.apiPath||'';if($('grid-api-path').parentElement)$('grid-api-path').parentElement.hidden=!!node.apiId;
  $('component-type').textContent=node.type+' · '+node.id;$('grid-properties').hidden=node.type!=='grid';
  $('input-properties').hidden=!L.isField(node);$('input-type-property').hidden=node.type!=='input';$('choice-properties').hidden=!['radio','select'].includes(node.type);$('textarea-property').hidden=node.type!=='textarea';
  if(['radio','select'].includes(node.type))$('option-values').value=node.options.map(option=>option.value+'|'+option.label).join('\n');if(node.type==='textarea')$('textarea-rows').value=node.rows;$('text-property').hidden=node.type!=='text';$('button-text-property').hidden=node.type!=='button';
  $('binding-property').hidden=node.type!=='text';if(node.type==='text')$('useCellValue').checked=!!node.useCellValue;$('direction-property').hidden=node.type!=='container';$('rows-property').hidden=node.type!=='grid';$('columns-property').hidden=node.type!=='grid';$('align-property').hidden=node.type!=='button';$('button-position-properties').hidden=node.type!=='button';$('action-property').hidden=node.type!=='button';$('span').value=node.span;
  if(L.isField(node)){const f=model.fields.find(f=>f.name===node.field);for(const key of ['label','name','type'])$(key).value=f[key];$('required').value=String(f.required);$('unique').checked=f.unique;}
  if(node.type==='text')$('text').value=node.text;if(node.type==='button')$('button-text').value=node.text;
  if(node.type==='grid'){$('columns').value=node.columns;$('rows').value=node.rows;$('height').value=node.height||320;$('pageSize').value=node.pageSize||10;for(const key of ['sortable','headerFilter','pagination'])$(key).checked=node[key]!==false;}

  if(node.type==='button'){$('action').value=node.action;$('align').value=node.align||'left';$('verticalAlign').value=node.verticalAlign||'top';$('buttonAreaHeight').value=node.buttonAreaHeight||44;$('buttonWidth').value=node.buttonWidth??'';$('buttonAreaWidth').value=node.buttonAreaWidth??(root?node.position.width:'');$('offsetX').value=node.offsetX||0;$('offsetY').value=node.offsetY||0;}
}
function add(type,parent=null,index,point){
  if(!['input','radio','select','textarea','text','button','container','grid'].includes(type))return;
  edit(()=>{
    const nodes=L.destination(model.components,parent);const node={id:'component_'+crypto.randomUUID(),type,span:['container','grid'].includes(type)?2:1};
    if(['input','radio','select','textarea'].includes(type)){
      let n=1;while(model.fields.some(f=>f.name==='field_'+n))n++;
      node.field='field_'+n;model.fields.push({name:node.field,label:{input:'입력',radio:'선택 항목',select:'선택 목록',textarea:'내용'}[type],type:'text',span:1,required:false,unique:false});
    }
    if(['radio','select'].includes(type))node.options=[{value:'option1',label:'옵션 1'},{value:'option2',label:'옵션 2'}];
    if(type==='textarea')node.rows=4;
    if(type==='text')node.text='텍스트';
    if(type==='button'){node.text='버튼';node.action='button';}
    if(['container','grid'].includes(type))node.children=[];
    if(type==='container')node.direction='flow';
    if(type==='grid'){Object.assign(node,{height:320,pageSize:10,sortable:true,headerFilter:true,pagination:true});node.rows=0;node.columns=0;L.resizeGrid(node,2,2,()=> 'cell_'+crypto.randomUUID());}
    if(!parent){const bottom=Math.max(0,...model.components.map(n=>n.position.y+L.defaultHeight(n)+16));node.position={x:point?.x || 0,y:point?.y ?? bottom,width:L.defaultWidth(node)};}
    nodes.splice(index===undefined?nodes.length:index,0,node);selected=node.id;
  });
}
for(const button of document.querySelectorAll('[data-type]')){
  button.onclick=()=>{const node=L.find(model.components,selected);add(button.dataset.type,node&&['container','cell'].includes(node.type)?node.id:null);};
  button.ondragstart=e=>{dragOffset={x:0,y:0};e.dataTransfer.setData('text/plain','add:'+button.dataset.type);e.dataTransfer.effectAllowed='copy';};
}
$('add-screen').onclick=()=>edit(()=>{
  project.screens??=[];if(project.screens.length>=29)throw Error('화면은 최대 30개까지 추가할 수 있습니다.');
  let n=1;while(project.screens.some(screen=>screen.table==='screen_'+n))n++;
  const screen={id:'screen_'+crypto.randomUUID(),version:2,title:'새 화면 '+n,table:'screen_'+n,submitLabel:'저장',fields:[],components:[]};
  project.screens.push(screen);activeScreen=screen.id;model=screen;selected=null;
});
$('delete-screen').onclick=()=>{if(activeScreen!=='main')edit(()=>{project.screens=project.screens.filter(screen=>screen.id!==activeScreen);activeScreen='main';model=project;selected=null;});};
$('show-grid').onchange=()=>{$('canvas').classList.toggle('show-grid',$('show-grid').checked);};
$('canvas').ondragover=e=>e.preventDefault();$('canvas').ondrop=e=>{if(!model){e.preventDefault();setStatus('먼저 폴더를 불러와주세요.');return;}drop(e,null,model.components.length);};
for(const [id,key]of [['pos-x','x'],['pos-y','y'],['pos-width','width']])$(id).onchange=()=>edit(()=>L.find(model.components,selected).position[key]=Number($(id).value));
for(const key of ['title','table'])$(key).onchange=()=>edit(()=>{
  model[key]=$(key).value;
});
for(const id of ['grid-api-id','button-api-id'])$(id).onchange=()=>edit(()=>{const node=L.find(model.components,selected);node.apiId=$(id).value;});
for(const id of ['grid-api-path','button-api-path'])$(id).onchange=()=>edit(()=>{L.find(model.components,selected).apiPath=$(id).value.trim();});
$('button-text').onchange=()=>edit(()=>{const node=L.find(model.components,selected);if(node?.type==='button')node.text=$('button-text').value;});
$('option-values').onchange=()=>edit(()=>{
  L.find(model.components,selected).options=$('option-values').value.split('\n').filter(line=>line.trim()).map(line=>{
    const separator=line.indexOf('|');return {value:(separator<0?line:line.slice(0,separator)).trim(),label:(separator<0?line:line.slice(separator+1)).trim()};
  });
});
$('buttonAreaWidth').onchange=()=>edit(()=>{const node=L.find(model.components,selected);if($('buttonAreaWidth').value==='')delete node.buttonAreaWidth;else {node.buttonAreaWidth=Number($('buttonAreaWidth').value);if(model.components.includes(node))node.position.width=node.buttonAreaWidth;}});
$('buttonWidth').onchange=()=>edit(()=>{const node=L.find(model.components,selected);if($('buttonWidth').value==='')delete node.buttonWidth;else node.buttonWidth=Number($('buttonWidth').value);});
$('textarea-rows').onchange=()=>edit(()=>L.find(model.components,selected).rows=Number($('textarea-rows').value));
for(const key of ['label','name','type','required','unique'])$(key).onchange=()=>edit(()=>{
  const node=L.find(model.components,selected),f=model.fields.find(f=>f.name===node.field);
  if(key==='required')f.required=$('required').value==='true';else f[key]=key==='unique'?$(key).checked:$(key).value;
  if(key==='name')node.field=f.name;
});
for(const key of ['text','span','columns','rows','action','align','useCellValue','height','pageSize','sortable','headerFilter','pagination','verticalAlign','buttonAreaHeight','offsetX','offsetY'])$(key).onchange=()=>edit(()=>{
  const node=L.find(model.components,selected);
  if(['rows','columns'].includes(key)){L.resizeGrid(node,key==='rows'?Number($(key).value):node.rows,key==='columns'?Number($(key).value):node.columns,()=> 'cell_'+crypto.randomUUID());return;}
  node[key]=['useCellValue','sortable','headerFilter','pagination'].includes(key)?$(key).checked:['span','columns','height','pageSize','buttonAreaHeight','offsetX','offsetY'].includes(key)?Number($(key).value):$(key).value;
  if(key==='span'&&L.isField(node))model.fields.find(f=>f.name===node.field).span=node.span;
});
$('delete').onclick=()=>edit(()=>{
  const source=L.location(model.components,selected);if(!source)return;
  const [node]=source.nodes.splice(source.index,1);
  function remove(n){if(L.isField(n))model.fields=model.fields.filter(f=>f.name!==n.field);if(n.children)n.children.forEach(remove);}remove(node);
  selected=null;
});
for(const [id,delta]of [['up',-1],['down',1]])$(id).onclick=()=>edit(()=>{
  const source=L.location(model.components,selected);if(!source)return;if(source.nodes===model.components){const node=source.nodes[source.index];node.position.y=Math.max(0,node.position.y+delta*16);return;}const next=source.index+delta;
  if(next>=0&&next<source.nodes.length)[source.nodes[source.index],source.nodes[next]]=[source.nodes[next],source.nodes[source.index]];
});
$('save').onclick=()=>{if(!model)return;if(pending){saveRequested=true;setStatus('변경 내용을 반영한 뒤 저장합니다…');return;}setStatus('설계를 저장하고 있습니다…');vscode.postMessage({type:'save'});};
$('new-project').onclick=()=>{if(!pending)vscode.postMessage({type:'newProject'});};
$('open-project').onclick=()=>{if(!pending)vscode.postMessage({type:'openProject'});};
$('source').onclick=()=>vscode.postMessage({type:'source'});$('export').onclick=()=>{if(!pending)vscode.postMessage({type:'export'});};
$('preview').onclick=()=>{if(!pending&&!previewBusy){previewBusy=true;$('preview').disabled=true;setStatus('미리보기 앱을 준비하고 있습니다…');vscode.postMessage({type:'preview'});}};
window.addEventListener('message',({data})=>{
  if(data.type==='saved'){setStatus(data.message);return;}
  if(data.type==='empty'){emptyCanvas();return;}
  if(data.type==='previewStatus'){previewBusy=data.busy;$('preview').disabled=pending||previewBusy;$('preview').textContent=previewBusy?'미리보기 준비 중…':'미리보기 ▶';if(!previewBusy)setStatus('미리보기 준비가 끝났습니다. 오류가 있으면 VisualWeb Preview 로그를 확인하세요.');return;}
  pending=false;$('new-project').disabled=false;$('open-project').disabled=false;$('export').disabled=false;$('preview').disabled=previewBusy;
  if(data.type==='model'){if(apiApplying){const incoming=activeScreen==='main'?data.model:data.model.screens?.find(screen=>screen.id===activeScreen);if(JSON.stringify(incoming?.apis)===JSON.stringify(apiDraft.apis)){apiApplying=false;$('api-dialog').close();}}for(const el of document.querySelectorAll('button,input,select,textarea'))el.disabled=false;project=data.model;if(activeScreen!=='main'&&!project.screens?.some(screen=>screen.id===activeScreen))activeScreen='main';model=currentScreen();version=data.version;model.components??=L.initial(model);L.ensurePositions(model.components);if(!L.find(model.components,selected))selected=model.components[0]?.id;render();setStatus('드래그로 추가·이동하고 Ctrl/Cmd+S로 저장하세요.');}
  if(data.type==='model'&&saveRequested){saveRequested=false;vscode.postMessage({type:'save'});}
  if(data.type==='error'){saveRequested=false;if(apiApplying){apiApplying=false;$('api-dialog-error').textContent=data.message;}setStatus(data.message,true);}
});
function renderApiSelect(id,node,method){
  const select=$(id);select.replaceChildren();
  const fallback=document.createElement('option');fallback.value='';fallback.textContent='기본 설정 / 직접 경로';select.append(fallback);
  for(const api of model.apis||[]){if(method!=='ACTION'&&api.method!==method)continue;const option=document.createElement('option');option.value=api.id;option.textContent=api.name+' · '+api.path;select.append(option);}
  select.value=node.apiId||'';
}
function apiConsumers(id){
  const consumers=[];
  function walk(nodes){for(const node of nodes){if(node.apiId===id)consumers.push(node);if(node.children)walk(node.children);}}
  walk(model.components||[]);return consumers;
}
function renderApiRows(){
  $('api-rows').replaceChildren();
  for(const api of apiDraft.apis){
    const row=document.createElement('tr');
    for(const key of ['name','method','path']){
      const cell=document.createElement('td'),input=document.createElement(key==='method'?'select':'input');
      input.setAttribute('aria-label',api.id+' '+key);
      if(key==='method')for(const method of ['GET','POST','PUT','PATCH','DELETE']){const option=document.createElement('option');option.value=method;option.textContent=method;input.append(option);}
      input.value=api[key];input.oninput=()=>{api[key]=input.value;};cell.append(input);row.append(cell);
    }
    const sourceCell=document.createElement('td'),source=document.createElement('select');source.setAttribute('aria-label',api.id+' 요청 데이터 영역');
    const choices=[{value:'screen',label:'화면 전체 입력값'}];
    function sourceChoices(nodes){for(const node of nodes){if(['container','grid'].includes(node.type))choices.push({value:node.type+':'+node.id,label:(node.type==='grid'?'Grid 선택 행':'Container 입력값')+' · '+node.id});if(node.children)sourceChoices(node.children);}}
    sourceChoices(model.components||[]);
    for(const choice of choices){const option=document.createElement('option');option.value=choice.value;option.textContent=choice.label;source.append(option);}
    source.value=api.source?.componentId?api.source.type+':'+api.source.componentId:'screen';
    source.onchange=()=>{const [type,componentId]=source.value.split(':');api.source=componentId?{type,componentId}:{type};};sourceCell.append(source);row.append(sourceCell);
    const usage=document.createElement('td');usage.className='api-consumers';
    const consumers=apiConsumers(api.id);
    if(!consumers.length){usage.textContent='미사용';usage.classList.add('unused');}
    for(const node of consumers){
      const label=document.createElement('div');label.textContent=(node.type==='grid'?'Grid':node.text||'Button')+' · '+node.id;usage.append(label);
    }
    row.append(usage);
    const cell=document.createElement('td'),remove=document.createElement('button');remove.textContent='삭제';
    remove.onclick=()=>{
      if(apiConsumers(api.id).length){$('api-dialog-error').textContent='사용 중인 API입니다. 컴포넌트의 API 연결을 먼저 변경하세요.';return;}
      apiDraft.apis=apiDraft.apis.filter(item=>item.id!==api.id);renderApiRows();
    };cell.append(remove);row.append(cell);$('api-rows').append(row);
  }
}
$('api-manage').onclick=()=>{
  if(pending||!model)return;
  apiDraft=JSON.parse(JSON.stringify({apis:model.apis||[]}));
  $('api-dialog-screen').textContent=model.title+' · 현재 화면의 API';$('api-dialog-error').textContent='';
  renderApiRows();$('api-dialog').showModal();
};
for(const id of ['api-close','api-cancel'])$(id).onclick=()=>{if(!apiApplying)$('api-dialog').close();};
$('api-add').onclick=()=>{
  if(apiDraft.apis.length>=100){$('api-dialog-error').textContent='화면당 API는 최대 100개입니다.';return;}
  apiDraft.apis.push({id:'api_'+crypto.randomUUID(),name:'새 API',method:'GET',path:'/api/records'});renderApiRows();
};
$('api-apply').onclick=()=>{
  if(pending)return;
  apiApplying=true;edit(()=>{model.apis=JSON.parse(JSON.stringify(apiDraft.apis));});
};
function emptyCanvas(){
  saveRequested=false;project=model=undefined;selected=null;$('fields').replaceChildren();$('screen-list').replaceChildren();
  $('properties').hidden=true;$('empty').hidden=false;$('empty').textContent='새 프로젝트를 만들거나 폴더를 불러오세요.';
  for(const el of document.querySelectorAll('button,input,select,textarea'))el.disabled=!['new-project','open-project','show-grid'].includes(el.id);
  $('title').value='';$('title').placeholder='빈 캔버스';
  setStatus('새 프로젝트로 빈 화면을 시작하거나 폴더 불러오기로 기존 프로젝트를 열어주세요.');
}
emptyCanvas();
vscode.postMessage({type:'ready'});
