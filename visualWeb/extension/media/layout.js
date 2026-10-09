'use strict';
(function(root) {
  function isField(node){return ['input','radio','select','textarea'].includes(node.type);}
  function initial(model) {
    return model.fields.map(f => ({id:'input_'+f.name, type:'input', field:f.name, span:f.span}))
      .concat({id:'submit_button',type:'button',text:model.submitLabel,action:'submit',span:2});
  }
  function find(nodes, id) {
    for (const node of nodes) {
      if (node.id === id) return node;
      const child = node.children && find(node.children, id);
      if (child) return child;
    }
  }
  function location(nodes, id) {
    const index = nodes.findIndex(node => node.id === id);
    if (index >= 0) return {nodes,index};
    for (const node of nodes) {
      const found = node.children && location(node.children,id);
      if (found) return found;
    }
  }
  function destination(nodes, parent) {
    if (!parent) return nodes;
    const node = find(nodes,parent);
    if (!node || !['container','cell'].includes(node.type)) throw Error('올바른 컨테이너를 선택하세요.');
    return node.children;
  }
  function move(nodes, id, parent, index) {
    const source = location(nodes,id);
    if (!source) throw Error('컴포넌트를 찾을 수 없습니다.');
    const node = source.nodes[source.index];
    if (node.type === 'cell') throw Error('Grid 셀 자체는 이동할 수 없습니다.');
    if (parent === id || (node.children && find(node.children,parent))) throw Error('자기 자신 또는 하위 요소 안으로 이동할 수 없습니다.');
    const target = destination(nodes,parent);
    const offset = target === source.nodes && source.index < index ? 1 : 0;
    source.nodes.splice(source.index,1);
    if(parent)delete node.position;
    target.splice(Math.max(0,Math.min(index-offset,target.length)),0,node);
  }
  function defaultWidth(node){return node.type==='grid'?560:node.type==='container'?480:isField(node)?240:180;}
  function defaultHeight(node){return node.type==='grid'?420:node.type==='container'?260:['radio','textarea'].includes(node.type)?180:isField(node)?100:70;}
  function ensurePositions(nodes){
    let bottom=0;
    for(const node of nodes){
      node.position ||= {x:0,y:bottom,width:defaultWidth(node)};
      bottom=Math.max(bottom,node.position.y+defaultHeight(node)+16);
    }
  }
  function place(nodes,id,position){
    const node=find(nodes,id);
    if(!node)throw Error('컴포넌트를 찾을 수 없습니다.');
    move(nodes,id,null,nodes.length);
    node.position={x:Math.max(0,Math.round(position.x)),y:Math.max(0,Math.round(position.y)),width:position.width || node.position?.width || defaultWidth(node)};
  }
  function validate(nodes, fields) {
    const ids = new Set(), inputs = new Set();
    let count = 0;
    function walk(items, depth, parentType) {
      if (!Array.isArray(items) || depth > 8) throw Error('레이아웃은 최대 8단계로 구성하세요.');
      for (const node of items) {
        if (++count > 600 || !node || typeof node.id !== 'string' || !/^[a-zA-Z][\w-]{0,79}$/.test(node.id) || ids.has(node.id)) throw Error('컴포넌트 ID는 고유해야 하며 화면당 최대 600개까지 추가할 수 있습니다.');
        ids.add(node.id);
        if(node.className!==undefined&&(typeof node.className!=='string'||node.className.length>1000))throw Error('CSS class는 1000자 이내로 입력하세요.');
        if(node.style!==undefined){
          if(!node.style||typeof node.style!=='object'||Array.isArray(node.style)||Object.keys(node.style).length>100)throw Error('인라인 style은 최대 100개 속성의 JSON 객체여야 합니다.');
          for(const [key,value] of Object.entries(node.style))if(!/^(--[a-zA-Z0-9_-]+|[a-zA-Z][a-zA-Z0-9]*)$/.test(key)||!['string','number'].includes(typeof value)||String(value).length>1000)throw Error('style 속성은 camelCase CSS 이름과 문자열 또는 숫자 값으로 입력하세요.');
        }
        if(node.events!==undefined){
          if(node.type!=='button'||!node.events||typeof node.events!=='object'||Array.isArray(node.events))throw Error('이벤트는 Button에만 설정할 수 있습니다.');
          const eventNames=Object.keys(node.events);
          if(eventNames.length>2||eventNames.some(name=>!['onClick','onDblClick'].includes(name)))throw Error('지원하지 않는 버튼 이벤트입니다.');
          for(const [eventName,actions] of Object.entries(node.events)){
            if(!Array.isArray(actions)||!actions.length||actions.length>100)throw Error(eventName+' 이벤트에는 1~100개 액션을 추가하세요.');
            for(const action of actions){
              if(!action||typeof action!=='object'||Array.isArray(action))throw Error('이벤트 액션 설정을 확인하세요.');
              if(action.type==='callApi'){
                if(typeof action.apiId!=='string'||!/^api_[a-zA-Z0-9_-]{1,80}$/.test(action.apiId))throw Error('API 호출 액션의 API를 선택하세요.');
              }else if(action.type==='submitForm'){
                continue;
              }else if(action.type==='closePopup'){
                continue;
              }else if(action.type==='showMessage'){
                if(typeof action.message!=='string'||!action.message.trim()||action.message.length>500)throw Error('표시할 메시지를 1~500자로 입력하세요.');
              }else if(action.type==='confirm'){
                if(typeof action.message!=='string'||!action.message.trim()||action.message.length>500)throw Error('확인 메시지를 1~500자로 입력하세요.');
              }else if(action.type==='navigate'){
                if(typeof action.screenId!=='string'||!/^main$|^screen_[a-zA-Z0-9_-]+$/.test(action.screenId))throw Error('이동할 화면을 선택하세요.');
              }else if(action.type==='popupView'){
                if(typeof action.viewId!=='string'||!/^popup_[a-zA-Z0-9_-]{1,80}$/.test(action.viewId))throw Error('팝업으로 표시할 View를 선택하세요.');
                for(const key of ['primaryKeyField','primaryKeyParam'])if(action[key]!==undefined&&(typeof action[key]!=='string'||!/^[a-zA-Z][a-zA-Z0-9_]{0,79}$/.test(action[key])))throw Error('행 기본키 필드와 팝업 파라미터 이름을 확인하세요.');
              }else if(action.type==='reloadGrid'){
                if(typeof action.componentId!=='string'||!/^[a-zA-Z][\w-]{0,79}$/.test(action.componentId))throw Error('다시 불러올 Grid를 선택하세요.');
              }else throw Error('지원하지 않는 이벤트 액션입니다.');
            }
          }
        }
        if(node.position!==undefined){
          if(parentType!==undefined || !node.position || !Number.isInteger(node.position.x)||!Number.isInteger(node.position.y)||!Number.isInteger(node.position.width)||node.position.x<0||node.position.y<0||node.position.x>10000||node.position.y>10000||node.position.width<80||node.position.width>2000)throw Error('캔버스 좌표 또는 너비를 확인하세요.');
        }
        if (!['input','radio','select','textarea','button','text','container','grid','cell'].includes(node.type) || ![1,2].includes(node.span)) throw Error('컴포넌트 타입 또는 너비를 확인하세요.');
        if (isField(node)) {
          if (!fields.some(f=>f.name===node.field) || inputs.has(node.field)) throw Error('입력 컴포넌트는 고유한 데이터 필드에 연결해야 합니다.');
          inputs.add(node.field);
        }
        if(['radio','select'].includes(node.type)){
          if(!Array.isArray(node.options)||!node.options.length||node.options.length>30)throw Error('선택 항목은 1~30개로 설정하세요.');
          const values=new Set();
          for(const option of node.options){
            if(!option||typeof option.value!=='string'||!option.value.trim()||option.value.length>255||typeof option.label!=='string'||!option.label.trim()||option.label.length>100||values.has(option.value))throw Error('선택 항목의 값/라벨과 중복을 확인하세요.');
            values.add(option.value);
          }
        }
        if(node.type==='textarea'&&(!Number.isInteger(node.rows)||node.rows<2||node.rows>20))throw Error('텍스트에어리어 행은 2~20입니다.');
        if (['text','button'].includes(node.type) && (typeof node.text !== 'string' || !node.text.trim() || node.text.length > 100)) throw Error('텍스트는 1~100자로 입력하세요.');
        if (node.useCellValue !== undefined && typeof node.useCellValue !== 'boolean') throw Error('셀 값 연결을 확인하세요.');
        if(node.type==='button'){
          if(node.verticalAlign!==undefined&&!['top','center','bottom'].includes(node.verticalAlign))throw Error('버튼 세로 정렬을 확인하세요.');
          for(const key of ['offsetX','offsetY'])if(node[key]!==undefined&&(!Number.isInteger(node[key])||Math.abs(node[key])>1000))throw Error('버튼 이동량은 -1000~1000입니다.');
          if(node.buttonAreaWidth!==undefined&&(!Number.isInteger(node.buttonAreaWidth)||node.buttonAreaWidth<80||node.buttonAreaWidth>2000))throw Error('버튼 컨테이너 너비는 80~2000px입니다.');
          if(node.buttonWidth!==undefined&&(!Number.isInteger(node.buttonWidth)||node.buttonWidth<40||node.buttonWidth>2000))throw Error('버튼 너비는 40~2000px입니다.');
          if(node.buttonAreaHeight!==undefined&&(!Number.isInteger(node.buttonAreaHeight)||node.buttonAreaHeight<44||node.buttonAreaHeight>1000))throw Error('버튼 배치 영역 높이는 44~1000입니다.');
        }
        if (node.type === 'button' && node.align !== undefined && !['left','center','right'].includes(node.align)) throw Error('버튼 위치를 확인하세요.');
        if (node.type === 'button' && !['submit','button'].includes(node.action)) throw Error('버튼 동작을 확인하세요.');
        if (node.type === 'cell' && parentType !== 'grid') throw Error('셀은 Grid 안에만 배치할 수 있습니다.');
        if (node.type === 'container' && !['flow','horizontal','vertical'].includes(node.direction)) throw Error('Container 방향을 확인하세요.');
        if (node.type === 'container' && node.height!==undefined && (!Number.isInteger(node.height)||node.height<40||node.height>1200)) throw Error('Container 높이는 40~1200px입니다.');
        if (node.type === 'grid') {
          for(const key of ['sortable','headerFilter','pagination'])if(node[key]!==undefined&&typeof node[key]!=='boolean')throw Error('Grid 옵션을 확인하세요.');
          if(node.height!==undefined&&(!Number.isInteger(node.height)||node.height<120||node.height>1200))throw Error('Grid 높이는 120~1200입니다.');
          if(node.rowHeight!==undefined&&(!Number.isInteger(node.rowHeight)||node.rowHeight<28||node.rowHeight>300))throw Error('Grid 행 높이는 28~300px입니다.');
          if(node.columnWidths!==undefined&&(!Array.isArray(node.columnWidths)||node.columnWidths.length!==node.columns||node.columnWidths.some(width=>!Number.isInteger(width)||width<60||width>1200)))throw Error('Grid 컬럼 너비는 60~1200px로 지정하세요.');
          if(node.pageSize!==undefined&&(!Number.isInteger(node.pageSize)||node.pageSize<1||node.pageSize>100))throw Error('페이지당 행은 1~100입니다.');
          if (!Number.isInteger(node.columns)||node.columns<1||node.columns>50||!Number.isInteger(node.rows)||node.rows<1||node.rows>10) throw Error('Grid는 1~10행, 1~50열로 지정하세요.');
          if (!Array.isArray(node.children) || node.children.length !== node.rows * node.columns || node.children.some(cell=>cell.type !== 'cell')) throw Error('Grid 셀 구성을 확인하세요.');
        }
        if (['grid','container','cell'].includes(node.type)) walk(node.children,depth+1,node.type);
        else if (node.children !== undefined) throw Error('하위 컴포넌트는 Container/Grid에만 추가할 수 있습니다.');
      }
    }
    walk(nodes,1);
    if (inputs.size !== fields.length) throw Error('모든 데이터 필드를 입력 컴포넌트에 연결하세요.');
  }
  function resizeGrid(node, rows, columns, makeId) {
    const cells = [];
    for (let r=0;r<node.rows;r++) for (let c=0;c<node.columns;c++) {
      if ((r>=rows || c>=columns) && node.children[r*node.columns+c].children.length) throw Error('삭제될 셀을 먼저 비우거나 컴포넌트를 이동하세요.');
    }
    for (let r=0;r<rows;r++) for (let c=0;c<columns;c++) {
      cells.push(r<node.rows && c<node.columns ? node.children[r*node.columns+c] : {id:makeId(),type:'cell',span:1,children:[]});
    }
    node.rows=rows;node.columns=columns;node.children=cells;
    if(Array.isArray(node.columnWidths))node.columnWidths=node.columnWidths.slice(0,columns).concat(Array(Math.max(0,columns-node.columnWidths.length)).fill(180));
    if(Array.isArray(node.headerTitles))node.headerTitles=node.headerTitles.slice(0,columns).concat(Array(Math.max(0,columns-node.headerTitles.length)).fill(''));
  }
  const api = {initial,find,location,destination,move,validate,resizeGrid,ensurePositions,place,defaultWidth,defaultHeight,isField};
  if (typeof module !== 'undefined') module.exports = api;
  else root.VisualWebLayout = api;
})(typeof window === 'undefined' ? globalThis : window);
