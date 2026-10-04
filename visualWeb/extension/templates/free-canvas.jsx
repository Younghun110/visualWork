'use client';
import {useEffect,useRef,useState} from 'react';
export default function FreeCanvas({nodes,renderNode}){
  const stage=useRef(null),[height,setHeight]=useState(400);
  let bottom=0;
  const items=nodes.map(node=>{
    const width=node.type==='grid'?560:node.type==='container'?480:['input','radio','select','textarea'].includes(node.type)?240:180;
    const position=node.position || {x:0,y:bottom,width};
    bottom=Math.max(bottom,position.y+(node.type==='grid'?420:node.type==='container'?260:['radio','textarea'].includes(node.type)?180:['input','select'].includes(node.type)?100:70)+16);
    return {node,position:node.type==='button'&&node.buttonAreaWidth!==undefined?{...position,width:node.buttonAreaWidth}:position};
  });
  const minWidth=Math.max(800,...items.map(({position})=>position.x+position.width));
  useEffect(()=>{
    const element=stage.current;if(!element)return;
    const measure=()=>setHeight(Math.max(400,...Array.from(element.children,child=>child.offsetTop+child.offsetHeight+16)));
    const observer=new ResizeObserver(measure);
    for(const child of element.children)observer.observe(child);
    measure();return ()=>observer.disconnect();
  },[nodes]);
  return <div className="vw-canvas-scroll"><div ref={stage} className="vw-free-canvas" style={{minWidth,height}}>
    {items.map(({node,position})=><div key={node.id} className="vw-positioned" style={{left:position.x,top:position.y,width:position.width}}>{renderNode(node)}</div>)}
  </div></div>;
}
