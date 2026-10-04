export function findComponent(nodes,id){
  for(const node of nodes||[]){if(node.id===id)return node;const found=node.children&&findComponent(node.children,id);if(found)return found;}
}
export function resolveConnection(project,screenId='main',componentId,kind='grid'){
  const screen=screenId==='main'?project:project.screens?.find(screen=>screen.id===screenId);
  if(!screen)throw Error('화면을 찾을 수 없습니다.');
  const component=componentId?findComponent(screen.components,componentId):undefined;
  if(componentId&&(!component||(kind==='grid'?component.type!=='grid':component.type!=='button')))throw Error('API에 연결할 컴포넌트를 확인하세요.');
  const api=component?.apiId?screen.apis?.find(api=>api.id===component.apiId):undefined;
  if(component?.apiId&&(!api||(kind==='grid'&&api.method!=='GET')))throw Error('등록된 API 연결을 확인하세요.');
  return {screen,api,method:api?.method||(kind==='grid'?'GET':'POST'),path:api?.path||component?.apiPath||(kind==='grid'?screen.api?.gridPath||'/api/grid':screen.api?.submitPath||'/api/records')};
}
export function encodeRequest(fields,values){
  return Object.fromEntries(fields.filter(field=>values[field.name]!==undefined).map(field=>{
    const value=values[field.name];
    return [field.name,field.type==='number'&&value!==''?Number(value):value];
  }));
}
export function inputComponents(nodes){
  return (nodes||[]).flatMap(node=>['input','radio','select','textarea'].includes(node.type)?[node]:node.type==='grid'?[]:inputComponents(node.children));
}
export function requestFields(screen,source){
  const target=source?.type==='container'?findComponent(screen.components,source.componentId):undefined;
  if(source?.type==='container'&&target?.type!=='container')throw Error('요청 데이터 영역을 찾을 수 없습니다.');
  const inputs=screen.components?inputComponents(target?target.children:screen.components):screen.fields.map(field=>({field:field.name,id:'input_'+field.name}));
  return inputs.map(node=>({...screen.fields.find(field=>field.name===node.field),componentId:node.id}));
}
export function requestPayload(screen,api,values,selectedRows={},row){
  if(row)return {...row};
  if(api?.source?.type==='grid'){
    const selected=selectedRows[api.source.componentId];if(!selected)throw Error('처리할 행을 선택하세요.');return {...selected};
  }
  const fields=requestFields(screen,api?.source);
  for(const field of fields){
    const value=values[field.name];
    if(field.required&&(value===undefined||value===null||String(value).trim()===''))throw Error(field.label+'을(를) 입력하세요.');
    if(field.type==='number'&&value!==undefined&&value!==''&&!Number.isFinite(Number(value)))throw Error(field.label+'에 숫자를 입력하세요.');
  }
  return encodeRequest(fields,values);
}
