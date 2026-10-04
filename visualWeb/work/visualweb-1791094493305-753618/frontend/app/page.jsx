'use client';
import {useState,useEffect,useRef} from 'react';
import FreeCanvas from '../components/free-canvas';
import DataGrid from '../components/data-grid';
import {requestPayload,requestFields} from '../lib/api-config';
import {normalizeGrid} from '../lib/grid-data';
import WorkspaceShell from '../components/workspace-shell';
import project from '../schema.json';
const emptyGrid={columns:[],data:[]};
export default function Page(){return <WorkspaceShell project={project}>{screen=><Screen schema={screen}/>}</WorkspaceShell>;}
function Screen({schema}){
  const [gridData,setGridData]=useState({});
  const [message,setMessage]=useState(''),[busy,setBusy]=useState(false);
  const [selectedRows,setSelectedRows]=useState({});const formRef=useRef(null);
  function grids(nodes){return nodes.flatMap(node=>node.type==='grid'?[node]:grids(node.children||[]));}
  function apiQuery(component){return new URLSearchParams({screen:schema.id||'main',...(component?{component}: {})});}
  function collectValues(source){
    const values={};
      for(const field of requestFields(schema,source)){
        const inputs=[...formRef.current.querySelectorAll('[data-input="'+field.componentId+'"]')];
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
  }
  async function load(){await Promise.all(grids(schema.components||[]).map(node=>loadGrid(node)));}
  useEffect(()=>{load().catch(e=>setMessage(e.message));},[schema]);
  async function invoke(node,row){
    if(busy)return;
    setBusy(true);setMessage('');
    try{
      const api=schema.apis?.find(api=>api.id===node?.apiId);
      const values=!row&&api?.source?.type!=='grid'?collectValues(api?.source):{};
      const body=requestPayload(schema,api,values,selectedRows,row);
      const response=await fetch('/api/records?'+apiQuery(schema.components?node?.id:undefined),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();if(!response.ok||!result.success)throw Error(result.message);
      setMessage(result.message);
      try{await load();setSelectedRows({});}catch{setMessage('요청은 성공했지만 Grid를 갱신하지 못했습니다. 새로고침하세요.');}
    }catch(e){setMessage(e.message);}finally{setBusy(false);}
  }
  function submit(event){event.preventDefault();const button=components.find(node=>node.type==='button'&&(node.action==='submit'||node.apiId));if(button)invoke(button);}
  const components=schema.components || [
    ...schema.fields.map(f=>({id:'input_'+f.name,type:'input',field:f.name,span:f.span})),
    {id:'submit_button',type:'button',text:schema.submitLabel,action:'submit',span:2}
  ];
  function hasGrid(nodes){return nodes.some(node=>node.type==='grid'||(node.children&&hasGrid(node.children)));}
  function cellText(value){return value==null?'':typeof value==='object'?JSON.stringify(value):String(value);}
  function renderNode(node,cellValue,rowContext){
    const width=node.span===2?'col-span-full':'';
    if(['input','radio','select','textarea'].includes(node.type)){
      const f=schema.fields.find(f=>f.name===node.field);
      const required=f.required;
      if(node.type==='radio')return <fieldset key={node.id} className={width+' vw-field vw-radio-field'}>
        <legend>{f.label}{required?' *':''}</legend>
        <div className="vw-radio-options">{node.options.map(option=><label key={option.value}><input data-input={node.id} type="radio" name={f.name} value={option.value} required={required}/><span>{option.label}</span></label>)}</div>
      </fieldset>;
      return <label key={node.id} className={width+' vw-field'}>
        <span className="mb-2 block text-sm font-medium">{f.label}{required?' *':''}</span>
        {node.type==='select'?<select data-input={node.id} name={f.name} required={required} defaultValue="" className="vw-input"><option value="" disabled={required}>선택하세요</option>{node.options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select>:
         node.type==='textarea'?<textarea data-input={node.id} name={f.name} required={required} maxLength={255} rows={node.rows} className="vw-input vw-textarea"/>:
         <input data-input={node.id} name={f.name} type={f.type} required={required} maxLength={255} step={f.type==='number'?'any':undefined} className="vw-input"/>}
      </label>;
    }
    if(node.type==='text')return <p key={node.id} className={width+' whitespace-pre-wrap break-words'}>{node.useCellValue?cellText(cellValue):node.text}</p>;
    if(node.type==='button'){
      const button=<button data-component={schema.components?node.id:undefined} type="button" onClick={event=>{if(node.action==='submit'||node.apiId){event.stopPropagation();invoke(node,rowContext);}}} disabled={(node.action==='submit'||!!node.apiId)&&busy} className="vw-primary-button" style={{...(node.buttonWidth!==undefined?{width:node.buttonWidth,minWidth:0,paddingInline:Math.min(28,node.buttonWidth/4),boxSizing:'border-box'}:{}),transform:`translate(${node.offsetX||0}px, ${node.offsetY||0}px)`}}>{(node.action==='submit'||node.apiId)&&busy?'저장 중…':node.text}</button>;
      return <div key={node.id} className={'vw-button-row'+(node.span===2?' vw-full-row':'')} data-align={node.align||'left'} style={{...(node.buttonAreaWidth!==undefined?{width:node.buttonAreaWidth,flexBasis:'auto',flexShrink:0}:{}),minHeight:node.buttonAreaHeight||44,alignItems:{top:'flex-start',center:'center',bottom:'flex-end'}[node.verticalAlign||'top']}}>{button}</div>;
    }
    if(node.type==='grid')return <div key={node.id} className={width+' min-w-0 w-full'}>
      <DataGrid definition={node} payload={gridData[node.id]||emptyGrid} onSelectionChange={row=>setSelectedRows(previous=>({...previous,[node.id]:row}))} onPageChange={page=>loadGrid(node,page).catch(e=>setMessage(e.message))} renderCell={(row,column,c,r)=>{
        const cell=node.children[(r%node.rows)*node.columns+c];
        const value=row[column.field];
        return c<node.columns&&cell?.children.length?cell.children.map(child=>renderNode(child,value,row)):cellText(value);
      }} />
    </div>;
    return <div key={node.id} className={width+' min-w-0 '+(node.type==='cell'?'flex flex-col gap-4':'vw-flow flex flex-wrap items-start gap-5')}>
      {node.children.map(child=>renderNode(child,cellValue,rowContext))}
    </div>;
  }
  return <main className="vw-screen">
    <p className="vw-screen-eyebrow">YOUR WORKSPACE</p>
    <h1 className="vw-screen-title">{schema.title}</h1>
    <form ref={formRef} noValidate onSubmit={submit} className="vw-screen-surface">
      <FreeCanvas nodes={components} renderNode={renderNode} />
    </form>
    <p role="status" className="vw-form-status">{message}</p>
  </main>;
}
