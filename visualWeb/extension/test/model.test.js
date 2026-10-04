const {test}=require('node:test');const assert=require('node:assert/strict');
const {validate,createForm,migration}=require('../src/model');const {generate}=require('../src/generator');
test('generates frontend with an independent VisualBack connection',()=>{
  const m=createForm(),files=generate(m);
  assert(!Object.keys(files).some(name=>name.startsWith('backend/')));
  assert(!JSON.parse(files['package.json']).dependencies.mysql2);
  assert.deepEqual(JSON.parse(files['frontend/schema.json']),m);
  assert.match(files['frontend/app/page.jsx'],/FreeCanvas/);
  assert.match(files['frontend/lib/api-proxy.js'],/VISUALBACK_URL/);
  assert.match(files['frontend/.env.local.example'],/VISUALBACK_URL=/);
});
test('rejects SQL identifiers, reserved field names and duplicate fields',()=>{for(const name of ['x`;DROP TABLE users;--','id','created_at','name']){const m=createForm();m.fields[1].name=name;assert.throws(()=>validate(m));}});
test('rejects incomplete schemas and unknown types',()=>{for(const change of [m=>m.fields=null,m=>m.fields[0].type='script',m=>m.fields[0].span=4,m=>m.table='../data']){const m=createForm();change(m);assert.throws(()=>generate(m));}});
test('migration handles numeric, optional and unique fields',()=>{const m=createForm();m.fields=[{name:'amount',label:'금액',type:'number',required:false,unique:true,span:2}];assert.match(migration(m),/`amount` DOUBLE NULL UNIQUE/);});
test('rejects absent identifiers instead of coercing undefined to SQL names',()=>{const a=createForm();delete a.table;assert.throws(()=>validate(a));const b=createForm();delete b.fields[0].name;assert.throws(()=>validate(b));});

test('required is a boolean and controls required validation',()=>{const m=createForm();m.fields[0].required=false;validate(m);assert.equal(m.fields[0].required,false);m.fields[0].required='false';assert.throws(()=>validate(m),/필드 속성이/);});
