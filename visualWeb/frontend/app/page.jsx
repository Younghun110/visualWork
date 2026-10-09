'use client';
import {useState,useEffect,useLayoutEffect,useRef} from 'react';
import FreeCanvas from '../components/free-canvas';
import DataGrid from '../components/data-grid';
import {requestPayload,requestFields} from '../lib/api-config';
import {normalizeGrid} from '../lib/grid-data';
import WorkspaceShell from '../components/workspace-shell';
import project from '../schema.json';
const emptyGrid={columns:[],data:[]};
export default function Page(){return <WorkspaceShell project={project}>{(screen,{open,active,registerLifecycle})=><Screen schema={screen} navigate={open} active={active} registerLifecycle={registerLifecycle}/>}</WorkspaceShell>;}
function Screen({schema,navigate,contextRow,active=false,registerLifecycle,isPopup=false,onClosePopup,onReloadParentGrid}){
  const [gridData,setGridData]=useState({});
  const [popupView,setPopupView]=useState(null);
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [selectedRows,setSelectedRows]=useState({});const formRef=useRef(null);
  const popupLoadStarted=useRef(false),pageLifecycle=useRef({});
  function grids(nodes){return nodes.flatMap(node=>node.type==='grid'?[node]:grids(node.children||[]));}
  function apiQuery(component,apiId,sourceSchema=schema){return new URLSearchParams({screen:sourceSchema.id||'main',...(component?{component}: {}),...(apiId?{apiId}: {})});}
  function collectValues(source,targetSchema=schema,targetFormRef=formRef){
    const values={};
      for(const field of requestFields(targetSchema,source)){
        const inputs=[...(targetFormRef.current?.querySelectorAll('[data-input="'+field.componentId+'"]')||[])];
        const input=inputs.find(input=>input.type!=='radio'||input.checked);
        if(input){if(!input.checkValidity()){input.reportValidity();throw Error(field.label+'의 입력값을 확인하세요.');}values[field.name]=input.value;}
      }
    return values;
  }
  async function loadGrid(node,pageNo=1){
    const query=apiQuery(node.id);query.set('page',pageNo);query.set('size',node.pageSize||10);
    const api=schema.apis?.find(api=>api.id===node.apiId);
    if(api?.source)query.set('input',JSON.stringify(requestPayload(schema,api,api.source.type==='grid'?{}:collectValues(api.source),selectedRows)));
    const response=await fetch('/api/grid?'+query,{cache:'no-store'});
    const result=await response.json();
    if(!response.ok||!result.success)throw Error(result.message||'Grid 조회에 실패했습니다.');
    const payload={...normalizeGrid(result.data),pageNo:result.pageNo,totalCount:result.totalCount};
    setGridData(previous=>({...previous,[node.id]:payload}));
    if(payload.columns.length>node.columns)setMessage(`Grid 컬럼 수 안내: 디자이너 설정은 ${node.columns}개이고 백엔드 응답은 ${payload.columns.length}개입니다. 백엔드 데이터 순서대로 표시합니다.`);
  }
  async function load(){await Promise.all(grids(schema.components||[]).map(node=>loadGrid(node)));}
  useEffect(()=>{if(active||isPopup)load().catch(e=>setMessage(e.message));},[schema,active,isPopup]);
  async function invokeApi(apiId,node,row,{refreshGrids=true,apiSchema=schema,allowBusy=false}={}){
    if(busy&&!allowBusy)return {success:false,message:'요청을 처리하고 있습니다.'};
    setBusy(true);setMessage('');
    try{
      const api=apiId?apiSchema.apis?.find(api=>api.id===apiId):undefined;
      if(apiId&&!api)throw Error('등록된 API를 찾을 수 없습니다.');
      const values=!row&&apiSchema===schema&&api?.source?.type!=='grid'?collectValues(api?.source):{};
      const body=requestPayload(apiSchema,api,values,selectedRows,row||contextRow);
      const response=await fetch('/api/records?'+apiQuery(apiSchema.components?node?.id:undefined,apiId,apiSchema),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();
      if(typeof result.success!=='boolean'||typeof result.message!=='string')throw Error('API 응답에 success 또는 message 값이 없습니다.');
      setMessage(`success: ${result.success} · message: ${result.message}`);
      if(!response.ok||!result.success)return result;
      if(isPopup&&node&&(api?.method||'POST')!=='GET')await onReloadParentGrid?.();
      if(refreshGrids)try{await load();setSelectedRows({});}catch(error){setMessage(`success: true · message: ${result.message} · Grid 갱신 실패: ${error.message}`);}
      return result;
    }catch(e){setMessage(`success: false · message: ${e.message}`);return {success:false,message:e.message};}finally{setBusy(false);}
  }
  function populateForm(data,targetFormRef=formRef){
    const record=Array.isArray(data)?data[0]:data;
    if(!record||typeof record!=='object'||!targetFormRef.current)return;
    const values=record.data&&typeof record.data==='object'&&!Array.isArray(record.data)?record.data:record;
    for(const input of targetFormRef.current.querySelectorAll('[name]')){
      if(!Object.hasOwn(values,input.name))continue;
      const value=values[input.name];
      if(input.type==='radio')input.checked=String(input.value)===String(value??'');
      else input.value=value==null?'':String(value);
    }
  }
  async function runPageEvent(eventName){const apiId=schema.pageEvents?.[eventName];if(!apiId)return;const result=await invokeApi(apiId,undefined,eventName==='onUnloadPage'?(contextRow||{}):contextRow,{refreshGrids:false,apiSchema:schema});if(eventName==='onLoadPage'&&result.success)populateForm(result.data);return result;}
  function closePopup(){if(isPopup&&onClosePopup){onClosePopup();return;}if(!popupView)return;const apiId=popupView.view.pageEvents?.onUnloadPage;if(apiId)invokeApi(apiId,undefined,popupView.row||{},{refreshGrids:false,apiSchema:popupView.view,allowBusy:true});setPopupView(null);}
  pageLifecycle.current={load:()=>runPageEvent('onLoadPage'),unload:()=>runPageEvent('onUnloadPage')};
  useLayoutEffect(()=>registerLifecycle?.(schema.id||'main',{load:()=>pageLifecycle.current.load(),unload:()=>pageLifecycle.current.unload()}),[registerLifecycle,schema.id]);
  useLayoutEffect(()=>{if(isPopup&&!popupLoadStarted.current){popupLoadStarted.current=true;pageLifecycle.current.load();}},[isPopup,schema.id]);
  async function invoke(node,row){const result=await invokeApi(node?.apiId,node,row);if(result?.success&&isPopup){window.alert(result.message);closePopup();}return result;}
  async function executeEvent(node,eventName,row){
    const actions=node.events?.[eventName];
    if(eventName==='onClick'&&!actions?.length&&(node.action==='submit'||node.apiId))return invoke(node,row);
    for(let actionIndex=0;actionIndex<(actions||[]).length;actionIndex++){
      const action=actions[actionIndex];
      if(action.type==='confirm'){const record=row||contextRow||{};const message=action.message.replace(/\{([a-zA-Z][a-zA-Z0-9_]*)\}/g,(_,key)=>cellText(record[key]));if(!window.confirm(message))return;}
      else if(action.type==='callApi'){const hasExplicitReload=actions.slice(actionIndex+1).some(next=>next.type==='reloadGrid');const result=await invokeApi(action.apiId,node,row,{refreshGrids:!hasExplicitReload});if(!result.success)return;window.alert(result.message);if(isPopup)closePopup();}
      else if(action.type==='submitForm'){const result=await invoke(node,row);if(!result?.success)return;}
      else if(action.type==='reloadGrid'){
        const grid=grids(schema.components||[]).find(item=>item.id===action.componentId);
        if(!grid){setMessage('success: false · message: 다시 불러올 Grid를 찾을 수 없습니다.');return;}
        try{await loadGrid(grid);}catch(error){setMessage(`success: false · message: Grid 조회 실패: ${error.message}`);return;}
      }
      else if(action.type==='showMessage')setMessage(action.message);
      else if(action.type==='navigate')navigate(action.screenId);
      else if(action.type==='popupView'){const target=action.viewId||action.screenId;const view=project.popupViews?.find(item=>item.id===target)||(action.viewId===undefined?(target==='main'?project:project.screens?.find(screen=>screen.id===target)):undefined);if(view){const sourceRow=row||contextRow||{},field=action.primaryKeyField||'id',param=action.primaryKeyParam||'id',popupRow={...sourceRow};if(sourceRow[field]!==undefined)popupRow[param]=sourceRow[field];setPopupView({view,row:popupRow});}else setMessage('팝업으로 표시할 View를 찾을 수 없습니다.');}
      else if(action.type==='closePopup'){if(isPopup)closePopup();else setMessage('이 액션은 팝업 View 안에서만 사용할 수 있습니다.');}
    }
  }
  function submit(event){event.preventDefault();const button=components.find(node=>node.type==='button'&&(node.action==='submit'||node.apiId));if(button)invoke(button);}
  const components=schema.components || [
    ...schema.fields.map(f=>({id:'input_'+f.name,type:'input',field:f.name,span:f.span})),
    {id:'submit_button',type:'button',text:schema.submitLabel,action:'submit',span:2}
  ];
  function hasGrid(nodes){return nodes.some(node=>node.type==='grid'||(node.children&&hasGrid(node.children)));}
  function cellText(value){return value==null?'':typeof value==='object'?JSON.stringify(value):String(value);}
  function classNames(...values){return values.filter(Boolean).join(' ');}
  function renderNode(node,cellValue,rowContext){
    const width=node.span===2?'col-span-full':'';
    if(['input','radio','select','textarea'].includes(node.type)){
      const f=schema.fields.find(f=>f.name===node.field);
      const required=f.required;
      if(node.type==='radio')return <fieldset key={node.id} className={classNames(width,'vw-field vw-radio-field',node.className)} style={node.style}>
        <legend>{f.label}{required?' *':''}</legend>
        <div className="vw-radio-options">{node.options.map(option=><label key={option.value}><input data-input={node.id} type="radio" name={f.name} value={option.value} required={required}/><span>{option.label}</span></label>)}</div>
      </fieldset>;
      return <label key={node.id} className={classNames(width,'vw-field',node.className)} style={node.style}>
        <span className="mb-2 block text-sm font-medium">{f.label}{required?' *':''}</span>
        {node.type==='select'?<select data-input={node.id} name={f.name} required={required} defaultValue="" className="vw-input"><option value="" disabled={required}>선택하세요</option>{node.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:
         node.type==='textarea'?<textarea data-input={node.id} name={f.name} required={required} maxLength={255} rows={node.rows} className="vw-input vw-textarea"/>:
         <input data-input={node.id} name={f.name} type={f.type} required={required} maxLength={255} step={f.type==='number'?'any':undefined} className="vw-input"/>}
      </label>;
    }
    if(node.type==='text')return <p key={node.id} className={classNames(width,'whitespace-pre-wrap break-words',node.className)} style={node.style}>{node.useCellValue?cellText(cellValue):node.text}</p>;
    if(node.type==='button'){
      const button=<button data-component={schema.components?node.id:undefined} type="button" onClick={event=>{if(node.events?.onClick?.length){event.stopPropagation();executeEvent(node,'onClick',rowContext);}else if(node.action==='submit'||node.apiId){event.stopPropagation();invoke(node,rowContext);}}} onDoubleClick={event=>{if(node.events?.onDblClick?.length){event.stopPropagation();executeEvent(node,'onDblClick',rowContext);}}} disabled={busy&&(!!node.events||node.action==='submit'||!!node.apiId)} className={classNames('vw-primary-button',node.className)} style={{...(node.buttonWidth!==undefined?{width:node.buttonWidth,minWidth:0,paddingInline:Math.min(28,node.buttonWidth/4),boxSizing:'border-box'}:{}),transform:`translate(${node.offsetX||0}px, ${node.offsetY||0}px)`,...node.style}}>{busy?'처리 중…':node.text}</button>;
      return <div key={node.id} className={'vw-button-row'+(node.span===2?' vw-full-row':'')} data-align={node.align||'left'} style={{...(node.buttonAreaWidth!==undefined?{width:node.buttonAreaWidth,flexBasis:'auto',flexShrink:0}:{}),minHeight:node.buttonAreaHeight||44,alignItems:{top:'flex-start',center:'center',bottom:'flex-end'}[node.verticalAlign||'top']}}>{button}</div>;
    }
    if(node.type==='grid'){
      const payload=gridData[node.id]||emptyGrid;
      const displayColumns=payload.columns.map((column,index)=>({...column,width:node.columnWidths?.[index]||column.width||180}));
      for(let index=displayColumns.length;index<node.columns;index++){
        let field=`__designer_column_${index+1}`;
        while(displayColumns.some(column=>column.field===field))field=`_${field}`;
        displayColumns.push({field,title:'',width:node.columnWidths?.[index]||180,sorter:'string',hozAlign:'left',headerSort:false});
      }
      displayColumns.forEach((column,index)=>{if(node.headerTitles?.[index]?.trim())column.title=node.headerTitles[index].trim();});
      return <div key={node.id} className={classNames(width,'min-w-0 w-full',node.className)} style={node.style}>
      <DataGrid definition={node} payload={{...payload,columns:displayColumns}} onSelectionChange={row=>setSelectedRows(previous=>({...previous,[node.id]:row}))} onPageChange={page=>loadGrid(node,page).catch(e=>setMessage(e.message))} renderCell={(row,column,c,r)=>{
        const cell=node.children[(r%node.rows)*node.columns+c];
        const value=row[column.field];
        return c<node.columns&&cell?.children.length?cell.children.map(child=>renderNode(child,value,row)):cellText(value);
      }} />
      </div>;
    }
    return <div key={node.id} className={classNames(width,'min-w-0',node.type==='cell'?'flex flex-col gap-4':'vw-flow flex flex-wrap items-start gap-5',node.className)} style={{...node.style,...(node.type==='container'&&node.height?{height:node.height}: {})}}>
      {node.children.map(child=>renderNode(child,cellValue,rowContext))}
    </div>;
  }
  return <main className="vw-screen">
    <h1 className="vw-screen-title">{schema.title}</h1>
    <form ref={formRef} noValidate onSubmit={submit} className="vw-screen-surface">
      <FreeCanvas nodes={components} renderNode={renderNode} />
    </form>
    <p role="status" className="vw-form-status">{message}</p>
    {popupView&&<div className="vw-popup-backdrop" onClick={closePopup}><section className="vw-popup" role="dialog" aria-modal="true" aria-label={popupView.view.title} onClick={event=>event.stopPropagation()} style={{...(popupView.view.width?{width:popupView.view.width}:{}),...(popupView.view.height?{height:popupView.view.height}:{})}}><button type="button" className="vw-popup-close" aria-label="팝업 닫기" onClick={closePopup}>×</button><Screen key={popupView.view.id||'main'} schema={popupView.view} navigate={navigate} contextRow={popupView.row} isPopup onClosePopup={closePopup} onReloadParentGrid={async()=>{try{await load();setSelectedRows({});}catch(error){setMessage(`success: true · message: 저장은 완료됐지만 Grid 갱신에 실패했습니다: ${error.message}`);}}}/></section></div>}
  </main>;
}
