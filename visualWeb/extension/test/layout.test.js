const {test}=require('node:test');
const assert=require('node:assert/strict');
const L=require('../media/layout');
const {createForm,validate}=require('../src/model');
const {generate}=require('../src/generator');
let sequence=0;
const id=()=> 'cell_test_'+(++sequence);
function grid(){const node={id:'grid',type:'grid',span:2,rows:0,columns:0,children:[]};L.resizeGrid(node,2,2,id);return node;}
test('Container directions and Grid cells persist in generated schema',()=>{
 const model=createForm();model.components=L.initial(model);
 model.components.push({id:'container',type:'container',span:2,direction:'horizontal',children:[]},grid());
 L.move(model.components,'input_name','container',0);
 L.move(model.components,'input_email',model.components.find(n=>n.type==='grid').children[0].id,0);
 validate(model);
 assert.deepEqual(JSON.parse(generate(model)['frontend/schema.json']),model);
 assert.match(generate(model)['frontend/app/page.jsx'],/node.type==='cell'/);
});
test('moves before and after siblings and prevents cycles without removing nodes',()=>{
 const nodes=L.initial(createForm());L.move(nodes,'input_name',null,2);
 assert.deepEqual(nodes.map(n=>n.id),['input_email','input_name','submit_button']);
 const container={id:'container',type:'container',span:2,direction:'vertical',children:[]};nodes.push(container);
 assert.throws(()=>L.move(nodes,'container','container',0));assert(nodes.includes(container));
 const g=grid();container.children.push(g);
 assert.throws(()=>L.move(nodes,'container',g.children[0].id,0));
 assert.throws(()=>L.move(nodes,g.children[0].id,null,0));
});
test('Grid resizing preserves cell coordinates and refuses to discard occupied cells',()=>{
 const g=grid(),cell=g.children[3];cell.children.push({id:'text',type:'text',span:1,text:'Hello'});
 L.resizeGrid(g,2,3,id);assert.equal(g.children[4],cell);
 assert.throws(()=>L.resizeGrid(g,1,3,id));assert.equal(g.rows,2);
 L.resizeGrid(g,2,2,id);assert.equal(g.children[3],cell);
});
test('rejects duplicate field bindings, malformed cells and invalid Container direction',()=>{
 const model=createForm();model.components=L.initial(model);
 model.components.push({...model.components[0],id:'duplicate'});assert.throws(()=>validate(model));
 model.components=L.initial(model);const g=grid();model.components.push(g);g.children[0].type='container';assert.throws(()=>validate(model));
 model.components=L.initial(model);model.components.push({id:'container',type:'container',span:2,direction:'diagonal',children:[]});assert.throws(()=>validate(model));
});

test('Flow Container and backend Grid table are generated independently',()=>{
 const model=createForm();model.components=L.initial(model);
 model.components.push({id:'flow',type:'container',span:2,direction:'flow',children:[]},grid());
 validate(model);const files=generate(model);
 assert.match(files['frontend/app/globals.css'],/flex-basis: 100%/);
 assert.match(files['frontend/app/page.jsx'],/flex flex-wrap/);
 assert.match(files['frontend/components/data-grid.jsx'],/<thead/);
 assert.match(files['frontend/components/data-grid.jsx'],/<tbody/);
 assert.match(files['frontend/app/page.jsx'],/row\[column.field\]/);
 assert.match(files['frontend/lib/api-proxy.js'],/VISUALBACK_URL/);
});
test('free canvas positions survive export and are removed when moved into Flow Container',()=>{
 const model=createForm();model.components=L.initial(model);L.ensurePositions(model.components);
 L.place(model.components,'input_name',{x:137,y:221,width:260});
 assert.deepEqual(L.find(model.components,'input_name').position,{x:137,y:221,width:260});
 model.components.push({id:'flow',type:'container',direction:'flow',span:2,children:[],position:{x:500,y:80,width:400}});
 const files=generate(model);assert.equal(JSON.parse(files['frontend/schema.json']).components.find(n=>n.id==='input_name').position.x,137);
 assert.match(files['frontend/components/free-canvas.jsx'],/ResizeObserver/);
 L.move(model.components,'input_name','flow',0);assert.equal(L.find(model.components,'input_name').position,undefined);validate(model);
 L.place(model.components,'input_name',{x:-10,y:79});assert.equal(L.find(model.components,'input_name').position.x,0);validate(model);
});
test('rejects invalid root positions and nested absolute coordinates',()=>{
 const model=createForm();model.components=L.initial(model);L.ensurePositions(model.components);
 model.components[0].position.x=Infinity;assert.throws(()=>validate(model));
 model.components[0].position.x=0;model.components[0].position.width=0;assert.throws(()=>validate(model));
});
test('full-width button alignment persists and rejects unsupported positions',()=>{
 const model=createForm();model.components=L.initial(model);
 const button=model.components.find(node=>node.type==='button');
 for(const align of ['left','center','right']){
  button.align=align;validate(model);
  assert.equal(JSON.parse(generate(model)['frontend/schema.json']).components.find(node=>node.type==='button').align,align);
 }
 button.align='invalid';assert.throws(()=>validate(model));
});
test('single-slot buttons preserve vertical alignment and precise offsets',()=>{
 const model=createForm();model.components=L.initial(model);const button=model.components.find(n=>n.type==='button');
 Object.assign(button,{span:1,align:'right',verticalAlign:'bottom',buttonAreaHeight:120,offsetX:-12,offsetY:8});
 const exported=JSON.parse(generate(model)['frontend/schema.json']).components.find(n=>n.type==='button');
 assert.equal(exported.span,1);assert.equal(exported.offsetX,-12);assert.equal(exported.verticalAlign,'bottom');
 for(const invalid of [{offsetX:1001},{offsetY:NaN},{verticalAlign:'invalid'},{buttonAreaHeight:0}]){
  const original={...button};Object.assign(button,invalid);assert.throws(()=>validate(model));Object.assign(button,original);
 }
});
