const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const L=require('../media/layout');
const {createForm}=require('../src/model');
const {generate}=require('../src/generator');

// Exercise the designer's actual click/change handlers without a browser host.
class Element {
  constructor(){
    this.children=[];this.dataset={};this.style={};this.value='';
    this.classList={add(){},remove(){},toggle(){}};
    this.offsetTop=this.offsetLeft=this.offsetWidth=this.offsetHeight=0;
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=children;}
  setAttribute(){}
}
test('grid buttons can be selected and renamed independently across host updates',()=>{
  const html=fs.readFileSync(require.resolve('../media/designer.html'),'utf8');
  const elements=new Map([...html.split('<script')[0].matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,new Element()]));
  let receive;
  const messages=[];
  const document={getElementById:id=>elements.get(id),createElement:()=>new Element(),querySelectorAll:()=>[]};
  const window={VisualWebLayout:L,addEventListener:(name,handler)=>{receive=handler;}};
  vm.runInNewContext(fs.readFileSync(require.resolve('../media/designer.js'),'utf8'),{
    document,window,requestAnimationFrame:fn=>fn(),acquireVsCodeApi:()=>({postMessage:message=>messages.push(structuredClone(message))})
  });
  const model=createForm();model.fields=[];
  model.components=[{id:'grid',type:'grid',span:2,rows:1,columns:2,children:[
    {id:'cell1',type:'cell',span:1,children:[{id:'edit',type:'button',span:1,text:'수정',action:'button'}]},
    {id:'cell2',type:'cell',span:1,children:[{id:'delete',type:'button',span:1,text:'삭제',action:'button'}]}
  ]}];
  receive({data:{type:'model',model,version:1}});
  function find(element,id){return element.dataset.id===id?element:element.children.map(child=>find(child,id)).find(Boolean);}
  function rename(id,text,version){
    const node=find(elements.get('fields'),id);
    let stopped=false;
    node.children[0].children[0].onclick({stopPropagation(){stopped=true;}});
    assert(stopped);
    assert.equal(elements.get('button-text-property').hidden,false);
    assert.equal(elements.get('text-property').hidden,true);
    elements.get('button-text').value=text;
    elements.get('button-text').onchange();
    const message=messages.at(-1);
    assert.equal(message.type,'edit');
    receive({data:{type:'model',model:structuredClone(message.model),version}});
    return message.model;
  }
  const first=rename('edit','상세 보기',2);
  assert.equal(L.find(first.components,'edit').text,'상세 보기');
  assert.equal(L.find(first.components,'delete').text,'삭제');
  const second=rename('delete','행 삭제',3);
  assert.equal(L.find(second.components,'edit').text,'상세 보기');
  assert.equal(L.find(second.components,'delete').text,'행 삭제');
  assert.equal(second.submitLabel,model.submitLabel);
  elements.get('buttonWidth').value='220';elements.get('buttonWidth').onchange();const resized=messages.at(-1).model;assert.equal(L.find(resized.components,'delete').buttonWidth,220);receive({data:{type:'model',model:structuredClone(resized),version:4}});assert.equal(find(elements.get('fields'),'delete').children[0].children[0].style.width,'220px');
  elements.get('buttonAreaWidth').value='300';elements.get('buttonAreaWidth').onchange();const area=messages.at(-1).model;assert.equal(L.find(area.components,'delete').buttonAreaWidth,300);assert.equal(L.find(area.components,'delete').buttonWidth,220);receive({data:{type:'model',model:structuredClone(area),version:5}});assert.equal(find(elements.get('fields'),'delete').style.width,'300px');
  const saved=JSON.parse(generate(second)['frontend/schema.json']);
  assert.equal(L.find(saved.components,'edit').text,'상세 보기');
  assert.equal(L.find(saved.components,'delete').text,'행 삭제');
  elements.get('button-text').value='삭제 실행';
  elements.get('button-text').onchange();
  const edited=messages.at(-1);
  elements.get('save').onclick();
  assert.equal(messages.at(-1).type,'edit');
  receive({data:{type:'model',model:structuredClone(edited.model),version:4}});
  assert.equal(messages.at(-1).type,'save');
  receive({data:{type:'saved',message:'설계를 저장했습니다: /project/project.visualweb.json'}});
  assert.match(elements.get('status').textContent,/설계를 저장했습니다/);
});
