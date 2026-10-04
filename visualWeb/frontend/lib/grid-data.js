export function normalizeGrid(payload) {
  const columns=payload?.columns || payload?.headers?.map(h=>({field:h.key,title:h.label}));
  const data=payload?.data || payload?.rows;
  if(!Array.isArray(columns)||!Array.isArray(data))throw Error('Grid의 columns/data 형식을 확인하세요.');
  const keys=new Set();
  for(const column of columns){
    if(!column||typeof column.field!=='string'||!column.field||typeof column.title!=='string'||keys.has(column.field))throw Error('Grid 컬럼의 field/title을 확인하세요.');
    keys.add(column.field);
  }
  if(data.some(row=>!row||typeof row!=='object'||Array.isArray(row)))throw Error('Grid 행은 JSON 객체여야 합니다.');
  return {columns:columns.map(c=>({field:c.field,title:c.title,width:Number.isFinite(c.width)?Math.max(80,Math.min(1000,c.width)):180,sorter:c.sorter==='number'?'number':'string',hozAlign:['left','center','right'].includes(c.hozAlign)?c.hozAlign:'left',headerSort:c.headerSort!==false})),data};
}
export function textValue(value){return value==null?'':typeof value==='object'?JSON.stringify(value):String(value);}
export function visibleRows(data,filters,sort,columns){
  const rows=data.filter(row=>Object.entries(filters).every(([field,value])=>textValue(row[field]).toLocaleLowerCase().includes(value.toLocaleLowerCase())));
  if(!sort)return rows;
  const numeric=columns.find(c=>c.field===sort.field)?.sorter==='number';
  return [...rows].sort((a,b)=>{
    const av=a[sort.field],bv=b[sort.field];
    if(av==null&&bv==null)return 0;
    if(av==null)return 1;if(bv==null)return -1;
    const result=numeric&&Number.isFinite(Number(av))&&Number.isFinite(Number(bv))?Number(av)-Number(bv):textValue(av).localeCompare(textValue(bv),undefined,{numeric:true});
    return sort.direction==='asc'?result:-result;
  });
}
