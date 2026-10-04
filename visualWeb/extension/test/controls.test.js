const {test}=require('node:test'),assert=require('node:assert/strict');
const {createForm,validate}=require('../src/model'),{generate}=require('../src/generator'),L=require('../media/layout');
function form(){
 const model=createForm();model.fields=[];model.components=[];
 for(const type of ['radio','select','textarea']){
  const field={name:type+'_value',label:type,type:'text',span:1,required:true,unique:false};model.fields.push(field);
  const node={id:type,type,field:field.name,span:1};
  if(type==='textarea')node.rows=4;else node.options=[{value:'one',label:'옵션 1'},{value:'two',label:'옵션 2'}];
  model.components.push(node);
 }
 return model;
}
test('new controls retain field binding, choices and textarea rows through generation',()=>{
 const model=form();L.ensurePositions(model.components);validate(model);
 const restored=JSON.parse(generate(model)['frontend/schema.json']);assert.deepEqual(restored,model);
 const container={id:'container',type:'container',direction:'flow',span:2,children:[]};model.components.push(container);
 for(const type of ['radio','select','textarea'])L.move(model.components,type,'container',container.children.length);
 validate(model);assert.equal(container.children.length,3);assert(container.children.every(node=>!node.position));
});
test('rejects empty/duplicate choices and invalid textarea row counts',()=>{
 for(const options of [[],[{value:'',label:'Option'}],[{value:'same',label:'A'},{value:'same',label:'B'}],[{value:'a',label:''}]]){
  const model=form();model.components[0].options=options;assert.throws(()=>validate(model));
 }
 for(const rows of [0,1,21,2.5]){const model=form();model.components[2].rows=rows;assert.throws(()=>validate(model));}
 const model=form();model.components[1].field=model.components[0].field;assert.throws(()=>validate(model));
});
module.exports={form};
