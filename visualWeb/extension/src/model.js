'use strict';
const layout = require('../media/layout');
const identifier = /^[a-z][a-z0-9_]{0,39}$/;
function validateApiPath(value) {
  if(value===undefined||value==='')return;
  if(typeof value!=='string'||value.length>500||!/^\/api\/[a-zA-Z0-9_/?=&%{}.-]+$/.test(value)||value.includes('..')||value.includes('//')||/[{}]/.test(value.replace(/\{[a-zA-Z][a-zA-Z0-9_]*\}/g,'')))throw Error('API 경로는 /api/로 시작하는 경로를 입력하세요.');
}
function validateApi(api) {
  if(api===undefined)return;
  if(!api||typeof api!=='object'||Array.isArray(api))throw Error('API 연결 설정을 확인하세요.');
  validateApiPath(api.submitPath);validateApiPath(api.gridPath);
}
function validate(m,projectScreenIds,projectPopupViewIds) {
  if (!m || m.version !== 2 || typeof m.title !== 'string' || !m.title.trim() || m.title.length > 100) throw Error('유효한 v2 폼과 제목이 필요합니다.');
  if (typeof m.table !== 'string' || !identifier.test(m.table)) throw Error('테이블 이름은 소문자 영문으로 시작하는 영문/숫자/_ 조합입니다.');
  if (!Array.isArray(m.fields) || m.fields.length > 30) throw Error('필드는 최대 30개까지 추가할 수 있습니다.');
  const names = new Set(['id', 'created_at']);
  for (const f of m.fields) {
    if (!f || typeof f.name !== 'string' || !identifier.test(f.name) || names.has(f.name)) throw Error('필드 이름이 중복되거나 올바르지 않습니다.');
    names.add(f.name);
    if (!['text', 'email', 'number'].includes(f.type) || typeof f.label !== 'string' || !f.label.trim() || f.label.length > 100 || typeof f.required !== 'boolean' || typeof f.unique !== 'boolean' || ![1,2].includes(f.span)) throw Error('필드 속성이 올바르지 않습니다.');
  }
  if (typeof m.submitLabel !== 'string' || !m.submitLabel.trim() || m.submitLabel.length > 100) throw Error('저장 버튼 이름이 필요합니다.');
  validateApi(m.api);
  const screenIds=projectScreenIds||new Set(['main',...(Array.isArray(m.screens)?m.screens.map(screen=>screen?.id).filter(Boolean):[])]);
  const popupViewIds=projectPopupViewIds||new Set(Array.isArray(m.popupViews)?m.popupViews.map(view=>view?.id).filter(Boolean):[]);
  const apiIds=new Map();
  if(m.apis!==undefined){
    if(!Array.isArray(m.apis)||m.apis.length>100)throw Error('화면당 API는 최대 100개입니다.');
    for(const api of m.apis){
      if(!api||typeof api.id!=='string'||!/^api_[a-zA-Z0-9_-]{1,80}$/.test(api.id)||apiIds.has(api.id))throw Error('API ID는 고유해야 합니다.');
      if(typeof api.name!=='string'||!api.name.trim()||api.name.length>100||!['GET','POST','PUT','PATCH','DELETE'].includes(api.method)||!api.path)throw Error('API 이름, HTTP 메서드와 경로를 입력하세요.');
      if(api.source){if(!['screen','container','grid'].includes(api.source.type))throw Error('요청 데이터 영역을 확인하세요.');if(api.source.type!=='screen'){const target=layout.find(m.components||[],api.source.componentId);if(target?.type!==api.source.type)throw Error('요청 데이터 컴포넌트를 확인하세요.');}}
      validateApiPath(api.path);apiIds.set(api.id,api);
    }
  }
  if(m.pageEvents!==undefined){
    if(!m.pageEvents||typeof m.pageEvents!=='object'||Array.isArray(m.pageEvents)||Object.keys(m.pageEvents).some(name=>!['onLoadPage','onUnloadPage'].includes(name)))throw Error('View 이벤트 설정을 확인하세요.');
    for(const apiId of Object.values(m.pageEvents))if(typeof apiId!=='string'||!apiIds.has(apiId))throw Error('View 이벤트가 참조하는 API를 찾을 수 없습니다.');
  }
  if (m.components !== undefined) {
    layout.validate(m.components, m.fields);
    const walk=nodes=>{for(const node of nodes){if(node.apiId){const api=apiIds.get(node.apiId);if(!api||(node.type==='grid'?api.method!=='GET':node.type!=='button'))throw Error('컴포넌트의 API 연결 또는 메서드를 확인하세요.');}if(node.apiPath!==undefined){if(!['grid','button'].includes(node.type))throw Error('API 경로는 Grid 또는 버튼에만 지정하세요.');validateApiPath(node.apiPath);}for(const actions of Object.values(node.events||{}))for(const action of actions){if(action.type==='callApi'&&!apiIds.has(action.apiId))throw Error('이벤트 액션이 참조하는 API를 찾을 수 없습니다.');if(action.type==='navigate'&&!screenIds.has(action.screenId))throw Error('이벤트 액션이 참조하는 화면을 찾을 수 없습니다.');if(action.type==='popupView'&&!popupViewIds.has(action.viewId)&&!(action.viewId===undefined&&screenIds.has(action.screenId)))throw Error('팝업으로 표시할 View를 찾을 수 없습니다.');if(action.type==='reloadGrid'&&layout.find(m.components||[],action.componentId)?.type!=='grid')throw Error('이벤트 액션이 참조하는 Grid를 찾을 수 없습니다.');}if(node.children)walk(node.children);}};
    walk(m.components);
  }
  if(m.screens!==undefined){
    if(!Array.isArray(m.screens)||m.screens.length>29)throw Error('화면은 최대 30개까지 추가할 수 있습니다.');
    const ids=new Set(['main']);
    for(const screen of m.screens){
      if(!screen||typeof screen.id!=='string'||!/^screen_[a-zA-Z0-9_-]+$/.test(screen.id)||ids.has(screen.id)||screen.screens!==undefined)throw Error('화면 ID 또는 구성을 확인하세요.');
      ids.add(screen.id);
    }
    for(const screen of m.screens)validate(screen,ids,popupViewIds);
  }
  if(m.popupViews!==undefined){
    if(!Array.isArray(m.popupViews)||m.popupViews.length>30)throw Error('팝업 View는 최대 30개까지 만들 수 있습니다.');
    const ids=new Set();
    for(const view of m.popupViews){if(!view||typeof view.id!=='string'||!/^popup_[a-zA-Z0-9_-]{1,80}$/.test(view.id)||ids.has(view.id)||screenIds.has(view.id)||view.screens!==undefined||view.popupViews!==undefined)throw Error('팝업 View ID 또는 구성을 확인하세요.');if(view.width!==undefined&&(!Number.isInteger(view.width)||view.width<240||view.width>1600))throw Error('팝업 View 너비는 240~1600px 사이로 설정하세요.');if(view.height!==undefined&&(!Number.isInteger(view.height)||view.height<180||view.height>1200))throw Error('팝업 View 높이는 180~1200px 사이로 설정하세요.');ids.add(view.id);}
    for(const view of m.popupViews)validate(view,screenIds,ids);
  }
  return m;
}
function createForm() {
  return {version:2,title:'회원 등록',table:'members',submitLabel:'회원 저장',fields:[
    {name:'name',label:'이름',type:'text',required:true,unique:false,span:1},
    {name:'email',label:'이메일',type:'email',required:true,unique:true,span:1}
  ]};
}
function createBlankForm(){return {version:2,title:'새 화면',table:'records',submitLabel:'저장',fields:[],components:[],apis:[]};}
function migration(m) {
  validate(m);
  return `CREATE TABLE IF NOT EXISTS \`${m.table}\` (\n  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,\n${m.fields.map(f=>`  \`${f.name}\` ${f.type==='number'?'DOUBLE':'VARCHAR(255)'} ${f.required?'NOT NULL':'NULL'}${f.unique?' UNIQUE':''}`).join(',\n')}${m.fields.length?',':''}\n  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP\n) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
}
module.exports={validate,createForm,createBlankForm,migration};
