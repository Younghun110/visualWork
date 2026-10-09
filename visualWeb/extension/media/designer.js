'use strict';
const vscode=acquireVsCodeApi(), L=window.VisualWebLayout;
const $=id=>document.getElementById(id);
let apiDraft,apiApplying=false,postApiGenerating=false,postApiRequestId,postApiListLoading=false,postApiListRequestId,postApiOperations=[],eventDraft={},eventNodeId,eventApplying=false,eventApplySnapshot,saveRequested=false;
let project,activeScreen='main',model,version,selected,pending=false,dragOffset={x:0,y:0},previewBusy=false;
function setStatus(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function applyCustomStyle(element,node){
  if(node.className)element.classList.add(...node.className.split(/\s+/).filter(Boolean));
  if(node.style)for(const [key,value] of Object.entries(node.style)){if(key.startsWith('--'))element.style.setProperty(key,String(value));else element.style[key]=String(value);}
}
function currentModel(source=project){return activeScreen==='main'?source:source.screens?.find(screen=>screen.id===activeScreen)||source.popupViews?.find(view=>view.id===activeScreen)||source;}
function currentScreen(){return currentModel();}
function edit(fn){
  if(!model||pending)return false;
  const previous=JSON.stringify(project);
  try{fn();L.validate(model.components,model.fields);}catch(e){project=JSON.parse(previous);model=currentScreen();render();setStatus(e.message,true);return false;}
  pending=true;$('new-project').disabled=true;$('open-project').disabled=true;$('export').disabled=true;$('preview').disabled=true;vscode.postMessage({type:'edit',model:project,version});
  return true;
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
    if(node.type==='container'&&node.height)el.style.height=node.height+'px';
    if(parent&&node.type==='cell'){const grid=L.find(model.components,parent);if(grid?.rowHeight)el.style.minHeight=grid.rowHeight+'px';}
    applyCustomStyle(el,node);
    if(!parent){el.classList.add('free-component');el.style.left=node.position.x+'px';el.style.top=node.position.y+'px';el.style.width=node.position.width+'px';}
    el.setAttribute('aria-label',node.type+' 선택');
    const choose=e=>{e.stopPropagation();if(selected!==node.id){selected=node.id;render();}};
    el.onclick=node.type==='cell'?e=>e.stopPropagation():choose;el.onkeydown=e=>{if(e.target===el&&(e.key==='Enter'||e.key===' ')){e.preventDefault();choose(e);}};
    if(node.type==='button')el.ondblclick=e=>{e.stopPropagation();selected=node.id;render();openEventEditor(node.id);};
    el.ondragstart=e=>{e.stopPropagation();const rect=el.getBoundingClientRect();dragOffset={x:e.clientX-rect.left,y:e.clientY-rect.top};e.dataTransfer.setData('text/plain','move:'+node.id);e.dataTransfer.effectAllowed='move';};
    if(L.isField(node)){
      const f=model.fields.find(f=>f.name===node.field);
      const caption=document.createElement('span');caption.className='caption';caption.textContent=f.label+(f.required?' *':'');
      const mock=document.createElement('span');mock.className='mock';
      if(node.type==='radio'){mock.className='preview-radio-options';for(const option of node.options){const item=document.createElement('span');item.textContent='○ '+option.label;mock.append(item);}}
      else if(node.type==='select')mock.textContent='선택하세요 ▾';
      else if(node.type==='textarea'){mock.classList.add('preview-textarea');mock.textContent='여러 줄 텍스트';mock.style.minHeight=(node.rows*20)+'px';}
      else mock.textContent=f.type==='email'?'name@example.com':f.type==='number'?'0':'텍스트 입력';el.append(caption,mock);
    }else if(node.type==='text'){const text=document.createElement('p');text.className='preview-text';text.textContent=node.useCellValue?'{{ backend cell value }}':node.text;applyCustomStyle(text,node);el.append(text);}
    else if(node.type==='button'){if(node.buttonAreaWidth!==undefined){el.style.width=node.buttonAreaWidth+'px';el.style.flexBasis='auto';}const button=document.createElement('span');button.className='preview-button';applyCustomStyle(button,node);button.textContent=node.text;button.onclick=choose;button.ondblclick=e=>{e.stopPropagation();selected=node.id;render();openEventEditor(node.id);};button.title='더블클릭해 이벤트를 편집하세요.';const row=document.createElement('div');row.className='button-preview-row';row.dataset.align=node.align||'left';row.style.justifyContent={left:'flex-start',center:'center',right:'flex-end'}[node.align||'left'];row.style.alignItems={top:'flex-start',center:'center',bottom:'flex-end'}[node.verticalAlign||'top'];row.style.minHeight=(node.buttonAreaHeight||44)+'px';if(node.buttonWidth!==undefined){button.style.width=node.buttonWidth+'px';button.style.minWidth='0';button.style.paddingInline=Math.min(28,node.buttonWidth/4)+'px';button.style.boxSizing='border-box';}button.style.transform='translate('+(node.offsetX||0)+'px, '+(node.offsetY||0)+'px)';row.append(button);el.append(row);}
    else {
      const caption=document.createElement('span');caption.className='caption';caption.textContent=node.type==='grid'?'Grid · '+node.rows+'행 × '+node.columns+'열':node.type==='cell'?'Body Cell '+(index+1):'Container · Flow Layout';el.append(caption);
      const children=document.createElement('div');children.className=node.type==='grid'?'layout-grid cols-'+node.columns:'layout-stack '+(node.type==='container'?'layout-flow':'');
      if(node.type==='grid'){
        children.style.gridTemplateColumns=Array.from({length:node.columns},(_,c)=>(node.columnWidths?.[c]||180)+'px').join(' ');
        const header=document.createElement('div');header.className='grid-header';
        for(let c=0;c<node.columns;c++){const cell=document.createElement('div');cell.className='header-cell';const title=document.createElement('span');title.textContent=(node.headerTitles?.[c]?.trim()||'')+(node.sortable===false?'':' ↕');cell.append(title);
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
  const popupViews=project.popupViews||[];
  $('popup-view-list').replaceChildren();
  for(const view of popupViews){const button=document.createElement('button');button.textContent=view.title;button.className=activeScreen===view.id?'active':'';button.onclick=()=>{if(pending)return;activeScreen=view.id;model=currentScreen();model.components??=L.initial(model);L.ensurePositions(model.components);selected=null;render();};$('popup-view-list').append(button);}
  const activeIsPopup=popupViews.some(view=>view.id===activeScreen);
  $('delete-screen').disabled=activeScreen==='main'||activeIsPopup;
  $('delete-popup-view').disabled=!activeIsPopup;
  $('popup-view-properties').hidden=!activeIsPopup;$('popup-width').value=activeIsPopup?(model.width??''):'';$('popup-height').value=activeIsPopup?(model.height??''):'';
  for(const key of ['title','table'])$(key).value=model[key];
  $('api-summary').textContent='등록된 API '+(model.apis?.length||0)+'개';
  renderPageEventSelect('page-onload-api','onLoadPage');renderPageEventSelect('page-onunload-api','onUnloadPage');
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
  $('component-type').textContent=node.type+' · '+node.id;$('grid-properties').hidden=node.type!=='grid';$('event-edit').hidden=node.type!=='button';
  $('component-class').value=node.className||'';$('component-style').value=node.style?JSON.stringify(node.style,null,2):'';
  $('input-properties').hidden=!L.isField(node);$('input-type-property').hidden=node.type!=='input';$('choice-properties').hidden=!['radio','select'].includes(node.type);$('textarea-property').hidden=node.type!=='textarea';
  if(['radio','select'].includes(node.type))$('option-values').value=node.options.map(option=>option.value+'|'+option.label).join('\n');if(node.type==='textarea')$('textarea-rows').value=node.rows;$('text-property').hidden=node.type!=='text';$('button-text-property').hidden=node.type!=='button';
  $('binding-property').hidden=node.type!=='text';if(node.type==='text')$('useCellValue').checked=!!node.useCellValue;$('direction-property').hidden=node.type!=='container';$('container-height-property').hidden=node.type!=='container';$('container-height').value=node.height??'';$('rows-property').hidden=node.type!=='grid';$('columns-property').hidden=node.type!=='grid';$('align-property').hidden=node.type!=='button';$('button-position-properties').hidden=node.type!=='button';$('span').value=node.span;
  if(L.isField(node)){const f=model.fields.find(f=>f.name===node.field);for(const key of ['label','name','type'])$(key).value=f[key];$('required').value=String(f.required);$('unique').checked=f.unique;}
  if(node.type==='text')$('text').value=node.text;if(node.type==='button')$('button-text').value=node.text;
  if(node.type==='grid'){$('columns').value=node.columns;$('rows').value=node.rows;$('height').value=node.height||320;$('rowHeight').value=node.rowHeight||44;$('pageSize').value=node.pageSize||10;const titles=$('grid-column-titles');titles.replaceChildren();for(let column=0;column<node.columns;column++){const label=document.createElement('label');label.textContent='컬럼 '+(column+1)+' 헤더';const input=document.createElement('input');input.type='text';input.maxLength=100;input.placeholder=model.fields[column]?.label||'Header '+(column+1);input.value=node.headerTitles?.[column]||'';input.onchange=()=>edit(()=>{const grid=L.find(model.components,selected);grid.headerTitles||=Array(grid.columns).fill('');grid.headerTitles[column]=input.value.trim();});label.append(input);titles.append(label);}const widths=$('grid-column-widths');widths.replaceChildren();for(let column=0;column<node.columns;column++){const label=document.createElement('label');label.textContent='컬럼 '+(column+1)+' 너비 (px)';const input=document.createElement('input');input.type='number';input.min='60';input.max='1200';input.value=node.columnWidths?.[column]||180;input.onchange=()=>edit(()=>{const grid=L.find(model.components,selected);grid.columnWidths||=Array(grid.columns).fill(180);grid.columnWidths[column]=Number(input.value);});label.append(input);widths.append(label);}for(const key of ['sortable','headerFilter','pagination'])$(key).checked=node[key]!==false;}

  if(node.type==='button'){$('align').value=node.align||'left';$('verticalAlign').value=node.verticalAlign||'top';$('buttonAreaHeight').value=node.buttonAreaHeight||44;$('buttonWidth').value=node.buttonWidth??'';$('buttonAreaWidth').value=node.buttonAreaWidth??(root?node.position.width:'');$('offsetX').value=node.offsetX||0;$('offsetY').value=node.offsetY||0;}
}
$("component-class").onchange=()=>edit(()=>{const node=L.find(model.components,selected);const value=$("component-class").value.trim();if(value)node.className=value;else delete node.className;});
$("component-style").onchange=()=>{
  let style;
  try{style=$("component-style").value.trim()?JSON.parse($("component-style").value):undefined;}
  catch{setStatus('Inline style은 올바른 JSON 객체여야 합니다.',true);return;}
  edit(()=>{const node=L.find(model.components,selected);if(style===undefined)delete node.style;else node.style=style;});
};
function actionTemplate(type){
  if(type==='callApi')return {type,apiId:''};
  if(type==='navigate')return {type,screenId:'main'};
  if(type==='popupView')return {type,viewId:'',primaryKeyField:'id',primaryKeyParam:'id'};
  if(type==='reloadGrid')return {type,componentId:''};
  if(type==='submitForm')return {type};
  if(type==='closePopup')return {type};
  if(type==='confirm')return {type,message:'정말 진행하시겠습니까?'};
  return {type:'showMessage',message:'완료'};
}
function collectGridNodes(nodes){return (nodes||[]).flatMap(node=>(node.type==='grid'?[node]:[]).concat(collectGridNodes(node.children)));}
function labeledControl(title,control){const label=document.createElement('label');label.textContent=title;label.append(control);return label;}
function addOption(select,value,text){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}
function renderEventEditor(){
  const groups=$('event-groups');groups.replaceChildren();$('event-dialog-error').textContent='';
  for(const [eventName,actions] of Object.entries(eventDraft)){
    const group=document.createElement('section');group.className='event-group';
    const head=document.createElement('div');head.className='event-group-head';
    const eventSelect=document.createElement('select');eventSelect.setAttribute('aria-label','실행 이벤트');
    addOption(eventSelect,'onClick','클릭 · onClick');addOption(eventSelect,'onDblClick','더블클릭 · onDblClick');eventSelect.value=eventName;
    eventSelect.onchange=()=>{
      const next=eventSelect.value;
      if(eventDraft[next]){$('event-dialog-error').textContent='이 이벤트는 이미 추가되어 있습니다.';eventSelect.value=eventName;return;}
      eventDraft[next]=eventDraft[eventName];delete eventDraft[eventName];renderEventEditor();
    };
    const removeEvent=document.createElement('button');removeEvent.type='button';removeEvent.textContent='이벤트 삭제';removeEvent.onclick=()=>{delete eventDraft[eventName];renderEventEditor();};
    head.append(eventSelect,removeEvent);group.append(head);
    const actionList=document.createElement('div');actionList.className='event-actions';
    actions.forEach((action,index)=>{
      const row=document.createElement('div');row.className='event-action';
      const typeSelect=document.createElement('select');typeSelect.setAttribute('aria-label','액션 종류');
      addOption(typeSelect,'submitForm','폼 제출 / 버튼 연결 API');addOption(typeSelect,'callApi','API 호출');addOption(typeSelect,'reloadGrid','Grid 데이터 다시 불러오기');addOption(typeSelect,'showMessage','메시지 표시');addOption(typeSelect,'confirm','확인 후 계속');addOption(typeSelect,'navigate','화면 이동');addOption(typeSelect,'popupView','팝업으로 View 표시');addOption(typeSelect,'closePopup','팝업 닫기');typeSelect.value=action.type;
      typeSelect.onchange=()=>{actions[index]=actionTemplate(typeSelect.value);renderEventEditor();};
      const config=document.createElement('div');config.className='event-action-config';
      if(action.type==='callApi'){
        const apiSelect=document.createElement('select');apiSelect.setAttribute('aria-label','호출할 API');addOption(apiSelect,'','API 선택');
        for(const api of model.apis||[])addOption(apiSelect,api.id,api.name+' · '+api.method+' '+api.path);
        apiSelect.value=action.apiId||'';apiSelect.onchange=()=>{action.apiId=apiSelect.value;};
        config.append(labeledControl('호출할 API',apiSelect));
      }else if(action.type==='reloadGrid'){
        const gridSelect=document.createElement('select');gridSelect.setAttribute('aria-label','다시 불러올 Grid');addOption(gridSelect,'','Grid 선택');
        for(const grid of collectGridNodes(model.components))addOption(gridSelect,grid.id,(grid.title||'Grid')+' · '+grid.id);
        gridSelect.value=action.componentId||'';gridSelect.onchange=()=>{action.componentId=gridSelect.value;};
        config.append(labeledControl('다시 불러올 Grid',gridSelect));
      }else if(action.type==='submitForm'){
        const hint=document.createElement('p');hint.textContent='이 버튼에 설정한 폼 제출 또는 API 연결을 실행합니다.';config.append(hint);
      }else if(action.type==='showMessage'){
        const input=document.createElement('input');input.type='text';input.maxLength=500;input.placeholder='표시할 메시지';input.value=action.message||'';input.oninput=()=>{action.message=input.value;};
        config.append(labeledControl('메시지',input));
      }else if(action.type==='confirm'){
        const input=document.createElement('input');input.type='text';input.maxLength=500;input.placeholder='{id}를 삭제하시겠습니까?';input.value=action.message||'';input.oninput=()=>{action.message=input.value;};
        const hint=document.createElement('p');hint.textContent='메시지의 {id} 같은 항목은 클릭한 행의 값으로 바뀝니다. 취소하면 뒤의 액션은 실행하지 않습니다.';
        config.append(labeledControl('확인 메시지',input),hint);
      }else if(action.type==='navigate'){
        const screenSelect=document.createElement('select');screenSelect.setAttribute('aria-label','이동할 화면');
        addOption(screenSelect,'main',(project.title||'기본 화면')+' · 기본 화면');
        for(const screen of project.screens||[])addOption(screenSelect,screen.id,screen.title);
        screenSelect.value=action.screenId||'main';screenSelect.onchange=()=>{action.screenId=screenSelect.value;};
        config.append(labeledControl('이동할 화면',screenSelect));
      }else if(action.type==='popupView'){
        const viewSelect=document.createElement('select');viewSelect.setAttribute('aria-label','팝업으로 표시할 View');
        addOption(viewSelect,'','팝업 View 선택');
        for(const view of project.popupViews||[])addOption(viewSelect,view.id,view.title);
        viewSelect.value=action.viewId||'';viewSelect.onchange=()=>{action.viewId=viewSelect.value;};
        const fieldInput=document.createElement('input');fieldInput.type='text';fieldInput.maxLength=80;fieldInput.value=action.primaryKeyField||'id';fieldInput.placeholder='id';fieldInput.setAttribute('aria-label','행 기본키 필드');fieldInput.oninput=()=>{action.primaryKeyField=fieldInput.value.trim();};
        const paramInput=document.createElement('input');paramInput.type='text';paramInput.maxLength=80;paramInput.value=action.primaryKeyParam||'id';paramInput.placeholder='id';paramInput.setAttribute('aria-label','팝업 파라미터 이름');paramInput.oninput=()=>{action.primaryKeyParam=paramInput.value.trim();};
        const hint=document.createElement('p');hint.textContent='Grid 응답 행의 기본키를 팝업에 전달합니다. API 경로에서 {id}처럼 사용할 수 있습니다.';
        config.append(labeledControl('팝업으로 표시할 View',viewSelect),labeledControl('행 기본키 필드',fieldInput),labeledControl('팝업 파라미터 이름',paramInput),hint);
      }
      const removeAction=document.createElement('button');removeAction.type='button';removeAction.textContent='삭제';removeAction.setAttribute('aria-label','액션 삭제');removeAction.onclick=()=>{
        actions.splice(index,1);if(!actions.length)delete eventDraft[eventName];renderEventEditor();
      };
      row.append(typeSelect,config,removeAction);actionList.append(row);
    });
    group.append(actionList);
    const addAction=document.createElement('button');addAction.type='button';addAction.className='event-group-actions';addAction.textContent='＋ 액션 추가';addAction.onclick=()=>{
      if(actions.length>=100){$('event-dialog-error').textContent='이벤트당 액션은 최대 100개까지 추가할 수 있습니다.';return;}
      actions.push(actionTemplate('showMessage'));renderEventEditor();
    };
    group.append(addAction);groups.append(group);
  }
  $('event-add-trigger').disabled=Object.keys(eventDraft).length>=2;
}
function openEventEditor(nodeId){
  if(pending)return;
  const node=L.find(model.components,nodeId);if(node?.type!=='button')return;
  eventNodeId=nodeId;eventDraft=JSON.parse(JSON.stringify(node.events||{}));
  if(!node.events&&(node.action==='submit'||node.apiId))eventDraft.onClick=node.apiId?[{type:'callApi',apiId:node.apiId},...collectGridNodes(model.components).map(grid=>({type:'reloadGrid',componentId:grid.id}))]:[{type:'submitForm'}];
  $('event-dialog-component').textContent=(node.text||'Button')+' · '+node.id;
  renderEventEditor();$('event-dialog').showModal();
}
$('event-edit').onclick=()=>openEventEditor(selected);
$('event-add-trigger').onclick=()=>{
  const name=['onClick','onDblClick'].find(value=>!eventDraft[value]);
  if(!name)return;
  eventDraft[name]=[];renderEventEditor();
};
for(const id of ['event-close','event-cancel'])$(id).onclick=()=>{if(!eventApplying)$('event-dialog').close();};
$('event-dialog').addEventListener?.('cancel',event=>{if(eventApplying)event.preventDefault();});
$('event-apply').onclick=()=>{
  if(pending)return;
  const entries=Object.entries(eventDraft);
  for(const [name,actions] of entries){
    if(!actions.length){$('event-dialog-error').textContent=name+' 이벤트에 액션을 하나 이상 추가하세요.';return;}
    for(const action of actions){
      if(action.type==='callApi'&&!(model.apis||[]).some(api=>api.id===action.apiId)){$('event-dialog-error').textContent='호출할 API를 선택하세요. API가 없으면 먼저 API 관리에서 등록하세요.';return;}
      if(action.type==='reloadGrid'&&L.find(model.components,action.componentId)?.type!=='grid'){$('event-dialog-error').textContent='다시 불러올 Grid를 선택하세요.';return;}
      if(action.type==='showMessage'&&!action.message?.trim()){$('event-dialog-error').textContent='표시할 메시지를 입력하세요.';return;}
      if(action.type==='confirm'&&(!action.message?.trim()||action.message.length>500)){$('event-dialog-error').textContent='확인 메시지를 1~500자로 입력하세요.';return;}
      if(action.type==='navigate'&&!['main',...(project.screens||[]).map(screen=>screen.id)].includes(action.screenId)){$('event-dialog-error').textContent='이동할 화면을 선택하세요.';return;}
      if(action.type==='popupView'&&!(project.popupViews||[]).some(view=>view.id===action.viewId)&&!(action.viewId===undefined&&['main',...(project.screens||[]).map(screen=>screen.id)].includes(action.screenId))){$('event-dialog-error').textContent='팝업으로 표시할 View를 선택하세요. 먼저 왼쪽 메뉴에서 팝업 View를 만드세요.';return;}
      if(action.type==='popupView'&&(!/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(action.primaryKeyField||'id')||!/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(action.primaryKeyParam||'id'))){$('event-dialog-error').textContent='행 기본키 필드와 팝업 파라미터 이름은 영문자로 시작하는 영문, 숫자, 밑줄 조합으로 입력하세요.';return;}
    }
  }
  eventApplying=true;eventApplySnapshot=JSON.stringify(eventDraft);
  pending=true;$('new-project').disabled=true;$('open-project').disabled=true;$('export').disabled=true;$('preview').disabled=true;
  vscode.postMessage({type:'editEvents',componentId:eventNodeId,events:entries.length?JSON.parse(JSON.stringify(eventDraft)):null});
};
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
    if(type==='grid'){Object.assign(node,{height:320,rowHeight:44,columnWidths:[180,180],pageSize:10,sortable:true,headerFilter:true,pagination:true});node.rows=0;node.columns=0;L.resizeGrid(node,2,2,()=> 'cell_'+crypto.randomUUID());}
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
$('add-popup-view').onclick=()=>edit(()=>{
  project.popupViews??=[];if(project.popupViews.length>=30)throw Error('팝업 View는 최대 30개까지 만들 수 있습니다.');
  const view={id:'popup_'+crypto.randomUUID(),version:2,title:'새 팝업 View',table:project.table,submitLabel:'닫기',fields:[],components:[],apis:[]};
  project.popupViews.push(view);activeScreen=view.id;model=view;selected=null;
});
function updatePopupDimension(key,inputId,min,max){const raw=$(inputId).value;if(raw==='')return edit(()=>delete model[key]);const value=Number(raw);if(!Number.isInteger(value)||value<min||value>max){setStatus(`${key==='width'?'팝업 너비는 240~1600px':'팝업 높이는 180~1200px'} 사이로 입력하세요.`,true);render();return;}edit(()=>{model[key]=value;});}
$('popup-width').onchange=()=>updatePopupDimension('width','popup-width',240,1600);
$('popup-height').onchange=()=>updatePopupDimension('height','popup-height',180,1200);
$('delete-popup-view').onclick=()=>{if((project.popupViews||[]).some(view=>view.id===activeScreen))edit(()=>{
  const removed=activeScreen;project.popupViews=project.popupViews.filter(view=>view.id!==removed);
  const all=[project,...(project.screens||[]),...(project.popupViews||[])];
  const clear=nodes=>{for(const node of nodes||[]){for(const [eventName,actions] of Object.entries(node.events||{})){node.events[eventName]=actions.filter(action=>action.type!=='popupView'||action.viewId!==removed);if(!node.events[eventName].length)delete node.events[eventName];}if(!Object.keys(node.events||{}).length)delete node.events;if(node.children)clear(node.children);}};
  for(const owner of all)clear(owner.components);activeScreen='main';model=project;selected=null;
});};
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
$('container-height').onchange=()=>edit(()=>{const node=L.find(model.components,selected);if($('container-height').value==='')delete node.height;else node.height=Number($('container-height').value);});
for(const key of ['label','name','type','required','unique'])$(key).onchange=()=>edit(()=>{
  const node=L.find(model.components,selected),f=model.fields.find(f=>f.name===node.field);
  if(key==='required')f.required=$('required').value==='true';else f[key]=key==='unique'?$(key).checked:$(key).value;
  if(key==='name')node.field=f.name;
});
for(const key of ['text','span','columns','rows','align','useCellValue','height','rowHeight','pageSize','sortable','headerFilter','pagination','verticalAlign','buttonAreaHeight','offsetX','offsetY'])$(key).onchange=()=>edit(()=>{
  const node=L.find(model.components,selected);
  if(['rows','columns'].includes(key)){L.resizeGrid(node,key==='rows'?Number($(key).value):node.rows,key==='columns'?Number($(key).value):node.columns,()=> 'cell_'+crypto.randomUUID());return;}
  node[key]=['useCellValue','sortable','headerFilter','pagination'].includes(key)?$(key).checked:['span','columns','height','rowHeight','pageSize','buttonAreaHeight','offsetX','offsetY'].includes(key)?Number($(key).value):$(key).value;
  if(key==='span'&&L.isField(node))model.fields.find(f=>f.name===node.field).span=node.span;
});
function deleteSelectedComponent(){if(!selected)return;edit(()=>{
  const source=L.location(model.components,selected);if(!source)return;
  const [node]=source.nodes.splice(source.index,1);
  function remove(n){if(L.isField(n))model.fields=model.fields.filter(f=>f.name!==n.field);if(n.children)n.children.forEach(remove);}remove(node);
  selected=null;
});}
$('delete').onclick=deleteSelectedComponent;
for(const [id,delta]of [['up',-1],['down',1]])$(id).onclick=()=>edit(()=>{
  const source=L.location(model.components,selected);if(!source)return;if(source.nodes===model.components){const node=source.nodes[source.index];node.position.y=Math.max(0,node.position.y+delta*16);return;}const next=source.index+delta;
  if(next>=0&&next<source.nodes.length)[source.nodes[source.index],source.nodes[next]]=[source.nodes[next],source.nodes[source.index]];
});
$('save').onclick=()=>{if(!model)return;if(pending){saveRequested=true;setStatus('변경 내용을 반영한 뒤 저장합니다…');return;}setStatus('설계를 저장하고 있습니다…');vscode.postMessage({type:'save'});};
$('new-project').onclick=()=>{if(!pending)vscode.postMessage({type:'newProject'});};
$('open-project').onclick=()=>{if(!pending)vscode.postMessage({type:'openProject'});};
$('source').onclick=()=>vscode.postMessage({type:'source'});$('export').onclick=()=>{if(!pending)vscode.postMessage({type:'export'});};
$('preview').onclick=()=>{if(!pending&&!previewBusy){previewBusy=true;$('preview').disabled=true;setStatus('미리보기 앱을 준비하고 있습니다…');vscode.postMessage({type:'preview'});}};
window.addEventListener('keydown',event=>{
  const key=event.key.toLowerCase(),mod=event.ctrlKey||event.metaKey;
  const typing=event.target instanceof Element&&event.target.closest('input,textarea,select,[contenteditable="true"]');
  if((key==='delete'||key==='backspace')&&selected&&!typing&&!document.querySelector('dialog[open]')){event.preventDefault();deleteSelectedComponent();return;}
  let target;
  if(mod&&key==='s')target=event.shiftKey?'export':'save';
  else if(mod&&key==='enter')target='preview';
  else if(!mod&&event.altKey&&event.shiftKey&&!typing){target=({n:'new-project',o:'open-project',j:'source'})[key];}
  if(!target)return;
  if(typing&&target!=='save'&&target!=='export')return;
  event.preventDefault();event.stopPropagation();$(target)?.click();
});
window.addEventListener('message',({data})=>{
  if(data.type==='saved'){setStatus(data.message);return;}
  if(data.type==='empty'){emptyCanvas();return;}
  if(data.type==='postApiList'||data.type==='postApiListError'){
    if(data.requestId!==postApiListRequestId)return;
    postApiListLoading=false;$('load-post-apis').disabled=false;
    if(data.type==='postApiListError'){$('api-dialog-error').textContent=data.message;return;}
    postApiOperations=data.apis;renderPostApiSelect();
    $('api-dialog-error').textContent=data.apis.length?'POST API '+data.apis.length+'개를 찾았습니다.':'JSON requestBody가 정의된 POST API가 없습니다.';
    return;
  }
  if(data.type==='postApiFields'||data.type==='postApiFieldsError'){
    if(data.requestId!==postApiRequestId)return;
    postApiGenerating=false;$('generate-post-fields').disabled=false;
    if(data.type==='postApiFieldsError'){$('api-dialog-error').textContent=data.message;return;}
    if(!$('api-dialog').open||!model)return;
    const fields=data.fields,api=apiDraft?.apis.find(item=>item.method==='POST'&&item.path===$('post-api-select').value);
    if(!api||api.method!=='POST'){$('api-dialog-error').textContent='선택한 POST API가 변경되었습니다. 다시 선택하세요.';return;}
    const applied=edit(()=>{
      const removeInputs=nodes=>nodes.filter(node=>{if(L.isField(node))return false;if(node.children)node.children=removeInputs(node.children);return true;});
      model.components=removeInputs(model.components||[]);
      model.fields=fields.map(({multiline,...field})=>field);
      model.apis=JSON.parse(JSON.stringify(apiDraft.apis));
      const buttons=model.components.filter(node=>node.type==='button');
      const otherComponents=model.components.filter(node=>node.type!=='button');
      let bottom=Math.max(20,...otherComponents.map(node=>node.position?node.position.y+L.defaultHeight(node)+16:0));
      const generated=fields.map(field=>{
        const node={id:'component_'+crypto.randomUUID(),type:field.multiline?'textarea':'input',field:field.name,span:field.span,position:{x:0,y:bottom,width:320}};
        if(node.type==='textarea')node.rows=5;
        bottom+=node.type==='textarea'?150:116;
        return node;
      });
      for(const button of buttons){button.position={...(button.position||{x:0,width:L.defaultWidth(button)}),y:bottom};bottom+=L.defaultHeight(button)+16;}
      model.components=[...otherComponents,...generated,...buttons];selected=generated[0]?.id;
    });
    if(!applied){apiApplying=false;return;}
    apiApplying=true;$('api-dialog-error').textContent='입력 필드를 생성했습니다. 적용 후 저장하세요.';return;
  }
  if(data.type==='previewStatus'){previewBusy=data.busy;$('preview').disabled=pending||previewBusy;$('preview').querySelector('span').textContent=previewBusy?'미리보기 준비 중…':'미리보기 ▶';if(!previewBusy)setStatus('미리보기 준비가 끝났습니다. 오류가 있으면 VisualWeb Preview 로그를 확인하세요.');return;}
  pending=false;$('new-project').disabled=false;$('open-project').disabled=false;$('export').disabled=false;$('preview').disabled=previewBusy;
  if(data.type==='model'){if(apiApplying){const incoming=currentModel(data.model);if(JSON.stringify(incoming?.apis)===JSON.stringify(apiDraft.apis)){apiApplying=false;$('api-dialog').close();}}if(eventApplying){const incoming=currentModel(data.model);const node=L.find(incoming?.components||[],eventNodeId);if(data.editApplied||JSON.stringify(node?.events||{})===eventApplySnapshot){eventApplying=false;eventApplySnapshot=undefined;$('event-dialog').close();}}for(const el of document.querySelectorAll('button,input,select,textarea'))el.disabled=false;project=data.model;if(activeScreen!=='main'&&!project.screens?.some(screen=>screen.id===activeScreen)&&!project.popupViews?.some(view=>view.id===activeScreen))activeScreen='main';model=currentScreen();version=data.version;model.components??=L.initial(model);L.ensurePositions(model.components);if(!L.find(model.components,selected))selected=model.components[0]?.id;render();setStatus('드래그로 추가·이동하고 Ctrl/Cmd+S로 저장하세요.');}
  if(data.type==='model'&&saveRequested){saveRequested=false;vscode.postMessage({type:'save'});}
  if(data.type==='error'){saveRequested=false;if(apiApplying){apiApplying=false;$('api-dialog-error').textContent=data.message;}if(eventApplying){eventApplying=false;eventApplySnapshot=undefined;$('event-dialog-error').textContent=data.message;}setStatus(data.message,true);}
});
function renderApiSelect(id,node,method){
  const select=$(id);select.replaceChildren();
  const fallback=document.createElement('option');fallback.value='';fallback.textContent='기본 설정 / 직접 경로';select.append(fallback);
  for(const api of model.apis||[]){if(method!=='ACTION'&&api.method!==method)continue;const option=document.createElement('option');option.value=api.id;option.textContent=api.name+' · '+api.path;select.append(option);}
  select.value=node.apiId||'';
}
function renderPageEventSelect(id,eventName){
  const select=$(id);select.replaceChildren();addOption(select,'','호출하지 않음');
  for(const api of model.apis||[])addOption(select,api.id,api.name+' · '+api.method+' '+api.path);
  select.value=model.pageEvents?.[eventName]||'';
}
for(const [id,eventName]of [['page-onload-api','onLoadPage'],['page-onunload-api','onUnloadPage']])$(id).onchange=()=>edit(()=>{
  model.pageEvents||={};const apiId=$(id).value;
  if(apiId)model.pageEvents[eventName]=apiId;else delete model.pageEvents[eventName];
  if(!Object.keys(model.pageEvents).length)delete model.pageEvents;
});
function apiConsumers(id){
  const consumers=[];
  for(const [eventName,apiId]of Object.entries(model.pageEvents||{}))if(apiId===id)consumers.push({type:'pageEvent',eventName});
  function walk(nodes){for(const node of nodes){if(node.apiId===id||Object.values(node.events||{}).some(actions=>actions.some(action=>action.type==='callApi'&&action.apiId===id)))consumers.push(node);if(node.children)walk(node.children);}}
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
      input.value=api[key];input.oninput=()=>{api[key]=input.value;};input.onchange=()=>{api[key]=input.value;if(key==='method'||key==='path')renderPostApiSelect();};cell.append(input);row.append(cell);
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
      const label=document.createElement('div');label.textContent=node.type==='pageEvent'?node.eventName+' · '+model.title:(node.type==='grid'?'Grid':node.text||'Button')+' · '+node.id;usage.append(label);
    }
    row.append(usage);
    const cell=document.createElement('td'),remove=document.createElement('button');remove.textContent='삭제';
    remove.onclick=()=>{
      if(apiConsumers(api.id).length){$('api-dialog-error').textContent='사용 중인 API입니다. 컴포넌트의 API 연결을 먼저 변경하세요.';return;}
      apiDraft.apis=apiDraft.apis.filter(item=>item.id!==api.id);renderApiRows();
    };cell.append(remove);row.append(cell);$('api-rows').append(row);
  }
  renderPostApiSelect();
}
function renderPostApiSelect(){
  const select=$('post-api-select'),selected=select.value;select.replaceChildren();addOption(select,'','POST API 선택');
  if(!postApiOperations.length)addOption(select,'','먼저 OpenAPI 목록을 불러오세요');
  for(const api of postApiOperations)addOption(select,api.path,api.name+' · '+api.path);
  if(postApiOperations.some(api=>api.path===selected))select.value=selected;
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
$('load-post-apis').onclick=()=>{
  if(postApiListLoading)return;
  const openApiUrl=$('openapi-url').value.trim();
  if(!openApiUrl){$('api-dialog-error').textContent='OpenAPI JSON URL을 입력하세요.';return;}
  postApiListLoading=true;$('load-post-apis').disabled=true;$('api-dialog-error').textContent='OpenAPI 문서에서 POST API를 찾고 있습니다…';
  postApiListRequestId=crypto.randomUUID();vscode.postMessage({type:'listPostApis',requestId:postApiListRequestId,openApiUrl});
};
$('generate-post-fields').onclick=()=>{
  if(pending||postApiGenerating)return;
  const apiPath=$('post-api-select').value,operation=postApiOperations.find(item=>item.path===apiPath);
  if(!operation){$('api-dialog-error').textContent='OpenAPI 목록을 불러온 뒤 POST API를 선택하세요.';return;}
  let api=apiDraft.apis.find(item=>item.method==='POST'&&item.path===apiPath);
  if(!api){
    if(apiDraft.apis.length>=100){$('api-dialog-error').textContent='화면당 API는 최대 100개입니다.';return;}
    api={id:'api_'+crypto.randomUUID(),name:operation.name,method:'POST',path:apiPath,source:{type:'screen'}};
    apiDraft.apis.push(api);renderApiRows();$('post-api-select').value=apiPath;
  }
  const openApiUrl=$('openapi-url').value.trim();
  if(!openApiUrl){$('api-dialog-error').textContent='OpenAPI JSON URL을 입력하세요.';return;}
  postApiGenerating=true;$('generate-post-fields').disabled=true;$('api-dialog-error').textContent='OpenAPI 스키마를 읽고 있습니다…';
  postApiRequestId=crypto.randomUUID();vscode.postMessage({type:'inspectPostApi',requestId:postApiRequestId,openApiUrl,apiPath});
};
$('api-apply').onclick=()=>{
  if(pending)return;
  apiApplying=true;if(!edit(()=>{model.apis=JSON.parse(JSON.stringify(apiDraft.apis));}))apiApplying=false;
};
function emptyCanvas(){
  saveRequested=false;project=model=undefined;selected=null;$('fields').replaceChildren();$('screen-list').replaceChildren();$('popup-view-list').replaceChildren();
  $('properties').hidden=true;$('empty').hidden=false;$('empty').textContent='새 프로젝트를 만들거나 폴더를 불러오세요.';
  for(const el of document.querySelectorAll('button,input,select,textarea'))el.disabled=!['new-project','open-project','show-grid'].includes(el.id);
  $('title').value='';$('title').placeholder='빈 캔버스';
  setStatus('새 프로젝트로 빈 화면을 시작하거나 폴더 불러오기로 기존 프로젝트를 열어주세요.');
}
emptyCanvas();
vscode.postMessage({type:'ready'});
