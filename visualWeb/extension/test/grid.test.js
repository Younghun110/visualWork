const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const api=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require.resolve('../templates/grid-data.js'),'utf8')).toString('base64'));
test('normalizes Tabulator columns/data and legacy headers/rows without executable formatters',async()=>{
 const {normalizeGrid}=await api;
 const grid=normalizeGrid({columns:[{field:'name',title:'Name',formatter:'<script>',width:1}],data:[{name:'Kim'}]});
 assert.equal(grid.columns[0].width,80);assert(!('formatter' in grid.columns[0]));
 assert.equal(normalizeGrid({headers:[{key:'name',label:'Name'}],rows:[]}).columns[0].field,'name');
 for(const payload of [{columns:[{field:'name',title:'Name'},{field:'name',title:'Again'}],data:[]},{columns:[],data:[null]},{columns:[],data:'bad'}])assert.throws(()=>normalizeGrid(payload));
});
test('filters without case sensitivity, sorts numeric values and preserves source data',async()=>{
 const {visibleRows}=await api;
 const data=[{name:'Kim',score:10},{name:'KIM',score:2},{name:'Lee',score:30}];
 const columns=[{field:'score',sorter:'number'}];
 assert.deepEqual(visibleRows(data,{name:'kim'},{field:'score',direction:'asc'},columns).map(r=>r.score),[2,10]);
 assert.deepEqual(visibleRows(data,{}, {field:'score',direction:'desc'},columns).map(r=>r.score),[30,10,2]);
 assert.deepEqual(data.map(r=>r.score),[10,2,30]);
});
