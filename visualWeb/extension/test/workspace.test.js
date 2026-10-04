const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const {createForm,validate}=require('../src/model');const {generate}=require('../src/generator');
const api=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require.resolve('../templates/workspace-data.js'),'utf8')).toString('base64'));
test('screens persist through generation and use stable separate tabs',async()=>{
 const model=createForm();model.screens=[{id:'screen_reservation',version:2,title:'예약 관리',table:'reservations',submitLabel:'저장',fields:[],components:[]}];validate(model);
 const {projectScreens,openScreen,closeScreen}=await api;
 assert.deepEqual(projectScreens(model).map(screen=>screen.title),['회원 등록','예약 관리']);
 assert.deepEqual(openScreen(['main','screen_reservation'],'screen_reservation'),['main','screen_reservation']);
 assert.deepEqual(closeScreen(['main','screen_reservation'],'screen_reservation','screen_reservation'),{tabs:['main'],active:'main'});
 assert.deepEqual(closeScreen(['main'],'main','main'),{tabs:[],active:null});
 const files=generate(model);assert.deepEqual(JSON.parse(files['frontend/schema.json']).screens,model.screens);assert.match(files['frontend/app/page.jsx'],/WorkspaceShell/);assert.match(files['frontend/components/workspace-shell.jsx'],/role="tabpanel"/);
});
test('rejects duplicate screen IDs and nested projects',()=>{
 const model=createForm(),screen={...createForm(),id:'screen_one'};model.screens=[screen,{...screen}];assert.throws(()=>validate(model));model.screens=[{...screen,screens:[]}];assert.throws(()=>validate(model));
});
