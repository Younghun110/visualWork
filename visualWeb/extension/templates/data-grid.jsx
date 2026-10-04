'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {textValue,visibleRows} from '../lib/grid-data';
export default function DataGrid({definition,payload,renderCell,onPageChange,onSelectionChange}){
  const [order,setOrder]=useState([]),[widths,setWidths]=useState({}),[filters,setFilters]=useState({}),[sort,setSort]=useState(null),[page,setPage]=useState(1),[selected,setSelected]=useState(null);
  const columns=useMemo(()=>[...payload.columns].sort((a,b)=>{
    const ai=order.indexOf(a.field),bi=order.indexOf(b.field);
    return (ai<0?order.length+payload.columns.indexOf(a):ai)-(bi<0?order.length+payload.columns.indexOf(b):bi);
  }),[payload.columns,order]);
  const rows=useMemo(()=>visibleRows(payload.data,filters,sort,columns),[payload.data,filters,sort,columns]);
  const remote=Number.isInteger(payload.pageNo)&&Number.isInteger(payload.totalCount)&&!!onPageChange;
  const pageSize=definition.pageSize||10,pages=Math.max(1,Math.ceil((remote?payload.totalCount:rows.length)/pageSize)),current=remote?payload.pageNo:Math.min(page,pages);
  function changePage(value){if(remote)onPageChange(value);else setPage(value);}
  const shown=remote||definition.pagination===false?rows:rows.slice((current-1)*pageSize,current*pageSize);
  const dragField=useRef(null);
  useEffect(()=>{setPage(1);setSelected(null);onSelectionChange?.(null);},[payload]);
  function resize(event,column){
    event.preventDefault();event.stopPropagation();
    const element=event.currentTarget,start=event.clientX,width=widths[column.field]||column.width;
    element.setPointerCapture(event.pointerId);
    element.onpointermove=e=>setWidths(previous=>({...previous,[column.field]:Math.max(80,width+e.clientX-start)}));
    element.onpointerup=()=>{element.onpointermove=null;element.onpointerup=null;element.releasePointerCapture(event.pointerId);};
  }
  function moveColumn(event,field){
    event.preventDefault();event.stopPropagation();
    const source=dragField.current;if(!source||source===field)return;
    const keys=columns.map(c=>c.field).filter(key=>key!==source);keys.splice(keys.indexOf(field),0,source);setOrder(keys);dragField.current=null;
  }
  return <section className="vw-data-grid" aria-label="Data Grid" onDragOver={e=>{if(dragField.current)e.preventDefault();}}>
    <div className="vw-grid-scroll" style={{maxHeight:definition.height || 320}}>
      <table><colgroup>{columns.map(column=><col key={column.field} style={{width:widths[column.field]||column.width}} />)}</colgroup>
        <thead><tr>{columns.map(column=><th key={column.field} scope="col" style={{textAlign:column.hozAlign}} aria-sort={sort?.field===column.field?(sort.direction==='asc'?'ascending':'descending'):'none'} onDragOver={e=>{if(dragField.current){e.preventDefault();e.stopPropagation();}}} onDrop={e=>moveColumn(e,column.field)}>
          <div className="vw-grid-heading"><span draggable onDragStart={e=>{e.stopPropagation();dragField.current=column.field;e.dataTransfer.setData('application/visualweb-column',column.field);}} onDragEnd={()=>{dragField.current=null;}} aria-label={column.title+' 컬럼 이동'} className="vw-column-grip">⠿</span>
          <button type="button" disabled={definition.sortable===false||!column.headerSort} onClick={()=>{setSort({field:column.field,direction:sort?.field===column.field&&sort.direction==='asc'?'desc':'asc'});setPage(1);}}>{column.title}<span>{sort?.field===column.field?(sort.direction==='asc'?' ▲':' ▼'):' ↕'}</span></button></div>
          {definition.headerFilter!==false&&<input aria-label={column.title+' 필터'} placeholder="Filter…" value={filters[column.field]||''} onChange={e=>{setFilters({...filters,[column.field]:e.target.value});setPage(1);}} />}
          <button type="button" className="vw-column-resize" aria-label={column.title+' 너비 조절'} onPointerDown={e=>resize(e,column)} onKeyDown={e=>{if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();setWidths({...widths,[column.field]:Math.max(80,(widths[column.field]||column.width)+(e.key==='ArrowRight'?10:-10))});}}} />
        </th>)}</tr></thead>
        <tbody>{shown.map((row,index)=><tr key={row.id ?? index} className={selected===row?'is-selected':''} onClick={()=>{setSelected(row);onSelectionChange?.(row);}}>{columns.map(column=><td key={column.field} style={{textAlign:column.hozAlign}}>{renderCell?renderCell(row,column,payload.columns.findIndex(c=>c.field===column.field),payload.data.indexOf(row)):textValue(row[column.field])}</td>)}</tr>)}</tbody>
      </table>
      {!rows.length&&<p className="vw-grid-empty">표시할 데이터가 없습니다.</p>}
    </div>
    <footer><span>{remote?payload.totalCount:rows.length} rows</span>{definition.pagination!==false&&<div><button type="button" disabled={current<=1} onClick={()=>changePage(current-1)}>이전</button><span>{current} / {pages}</span><button type="button" disabled={current>=pages} onClick={()=>changePage(current+1)}>다음</button></div>}</footer>
  </section>;
}
