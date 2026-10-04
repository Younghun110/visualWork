const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {createForm,validate}=require('../src/model'),{generate}=require('../src/generator');
const config=import('data:text/javascript;base64,'+Buffer.from(fs.readFileSync(require.resolve('../templates/api-config.js'),'utf8')).toString('base64'));
test('resolves screen-specific and per-component paths without using schema server addresses',async()=>{
 const {resolveConnection,encodeRequest}=await config;
 const project=createForm();project.api={baseUrl:'http://127.0.0.1:4001',submitPath:'/api/members',gridPath:'/api/members/grid'};
 project.components=[{id:'button',type:'button',text:'저장',action:'submit',span:2,apiPath:'/api/custom'},...require('../media/layout').initial(project).filter(n=>n.type!=='button')];
 project.screens=[{...createForm(),id:'screen_orders',api:{baseUrl:'http://localhost:4002',submitPath:'/api/orders',gridPath:'/api/orders/grid'}}];
 validate(project);
 const saved=JSON.parse(generate(project)['frontend/schema.json']);
 assert.equal(resolveConnection(saved,'main','button','submit').path,'/api/custom');
 assert.equal(resolveConnection(saved,'screen_orders',undefined,'grid').path,'/api/orders/grid');
 assert.equal(resolveConnection(saved,'screen_orders').baseUrl,undefined);
 assert.equal(resolveConnection(createForm()).path,'/api/grid');
 assert.throws(()=>resolveConnection(saved,'missing'));
 assert.throws(()=>resolveConnection(saved,'main','button','grid'));
 assert.deepEqual(encodeRequest([{name:'amount',type:'number'},{name:'name',type:'text'}],{amount:'12.5',name:'Kim',unused:'x'}),{amount:12.5,name:'Kim'});
});
test('rejects invalid server URLs and paths before saving or generating',()=>{
 for(const api of [{submitPath:'https://elsewhere/api'},{gridPath:'/api/../private'},{gridPath:'//host/api'}]){
  const project=createForm();project.api=api;assert.throws(()=>validate(project));
 }
 const project=createForm();project.components=require('../media/layout').initial(project);project.components.at(-1).apiPath='/outside';assert.throws(()=>generate(project));
});
test('registered APIs override direct paths and require matching bindings',async()=>{
 const {resolveConnection}=await config;
 const model=createForm();model.components=require('../media/layout').initial(model);
 model.apis=[{id:'api_save',name:'회원 저장',method:'POST',path:'/api/members'}];
 const button=model.components.at(-1);button.apiId='api_save';button.apiPath='/api/legacy';
 validate(model);assert.equal(resolveConnection(model,'main',button.id,'submit').path,'/api/members');
 model.apis[0].method='GET';validate(model);assert.equal(resolveConnection(model,'main',button.id,'submit').method,'GET');
 model.apis=[];assert.throws(()=>validate(model));
});

test('scopes typed input payloads and sends clicked or selected grid rows',async()=>{
 const {requestPayload}=await config;
 const screen={fields:[{name:'name',label:'이름',required:true},{name:'amount',label:'수량',type:'number'},{name:'other',label:'다른 영역',required:true}],components:[{id:'form',type:'container',children:[{id:'name',type:'input',field:'name'},{id:'nested',type:'container',children:[{id:'amount',type:'input',field:'amount'}]}]},{id:'other',type:'input',field:'other'}]};
 const api={source:{type:'container',componentId:'form'}};
 assert.deepEqual(requestPayload(screen,api,{name:'홍길동',amount:'12',other:'ignored'}),{name:'홍길동',amount:12});
 assert.throws(()=>requestPayload(screen,api,{amount:'12'}),/이름/);
 assert.throws(()=>requestPayload(screen,api,{name:'홍길동',amount:'abc'}),/숫자/);
 const rowApi={source:{type:'grid',componentId:'grid'}};
 assert.throws(()=>requestPayload(screen,rowApi,{}),/행을 선택/);
 assert.deepEqual(requestPayload(screen,rowApi,{}, {grid:{id:1}}),{id:1});
 assert.deepEqual(requestPayload(screen,api,{}, {grid:{id:1}}, {id:2,name:'김영희'}),{id:2,name:'김영희'});
});

test('validates data sources and path placeholders',()=>{
 const model=createForm();model.components=require('../media/layout').initial(model);
 model.apis=[{id:'api_action',name:'수정',method:'PUT',path:'/api/members/{id}',source:{type:'screen'}}];validate(model);
 model.apis[0].source={type:'container',componentId:'missing'};assert.throws(()=>validate(model),/데이터 컴포넌트/);
 model.apis[0].source={type:'screen'};model.apis[0].path='/api/members/{bad';assert.throws(()=>validate(model),/API 경로/);
});
