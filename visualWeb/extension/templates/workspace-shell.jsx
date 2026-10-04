'use client';
import {useEffect,useState} from 'react';
import {projectScreens,openScreen,closeScreen} from '../lib/workspace-data';
function Icon({type='screen'}){
 const paths={screen:'M3 4h18v12H3z M8 21h8 M12 16v5',search:'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',folder:'M3 7h7l2-3h9v16H3z',chevron:'m7 10 5 5 5-5',play:'m8 5 12 7-12 7z'};
 return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[type]||paths.screen}/></svg>;
}
export default function WorkspaceShell({project,children}){
 const screens=projectScreens(project),[tabs,setTabs]=useState(['main']),[active,setActive]=useState('main'),[query,setQuery]=useState(''),[menu,setMenu]=useState(false);
 useEffect(()=>{const ids=new Set(projectScreens(project).map(screen=>screen.id));setTabs(previous=>previous.filter(id=>ids.has(id)));setActive(previous=>ids.has(previous)?previous:'main');},[project]);
 function open(id){setTabs(previous=>openScreen(previous,id));setActive(id);setMenu(false);}
 function close(id){const result=closeScreen(tabs,active,id);setTabs(result.tabs);setActive(result.active);}
 return <div className="vw-workspace">
  <aside className={'vw-sidebar'+(menu?' is-open':'')}>
    <div className="vw-brand"><span className="vw-brand-mark"><Icon/></span><strong>VISUALWEB</strong></div>
    <label className="vw-menu-search"><Icon type="search"/><input aria-label="화면 검색" placeholder="메뉴 검색" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <div className="vw-nav-label">프로젝트 화면 <span>{screens.length}</span></div>
    <nav aria-label="프로젝트 화면">{screens.filter(screen=>screen.title.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(screen=><button type="button" key={screen.id} className={active===screen.id?'active':''} aria-current={active===screen.id?'page':undefined} onClick={()=>open(screen.id)}><Icon/><span>{screen.title}</span></button>)}</nav>
    {query&&!screens.some(screen=>screen.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()))&&<p className="vw-search-empty">검색된 화면이 없습니다.</p>}
    <div className="vw-sidebar-footer"><Icon type="folder"/><span>프로젝트 워크스페이스</span></div>
  </aside>
  <div className="vw-workspace-body">
    <header className="vw-workspace-header"><div><button type="button" className="vw-menu-button" onClick={()=>setMenu(!menu)} aria-label="화면 메뉴" aria-expanded={menu}>☰</button><h1>워크스페이스</h1></div><span className="vw-workspace-label">DESIGNED BY YOU</span></header>
    <div className="vw-tab-strip" role="tablist" aria-label="열린 화면">{tabs.map(id=>{const screen=screens.find(item=>item.id===id);if(!screen)return null;return <div key={id} className={'vw-screen-tab'+(active===id?' active':'')}><button type="button" role="tab" id={'tab-'+id} aria-controls={'panel-'+id} aria-selected={active===id} onClick={()=>setActive(id)} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const index=tabs.indexOf(id),next=event.key==='Home'?tabs[0]:event.key==='End'?tabs[tabs.length-1]:tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];setActive(next);document.getElementById('tab-'+next)?.focus();}}}><Icon/><span>{screen.title}</span></button><button type="button" className="vw-close-tab" aria-label={screen.title+' 탭 닫기'} onClick={()=>close(id)}>×</button></div>;})}</div>
    <div className="vw-workspace-content">{tabs.map(id=>{const screen=screens.find(item=>item.id===id);return screen&&<section key={id} role="tabpanel" id={'panel-'+id} aria-labelledby={'tab-'+id} hidden={active!==id}>{children(screen)}</section>;})}{!tabs.length&&<div className="vw-empty-workspace"><Icon/><h2>화면을 선택하세요</h2><p>왼쪽 메뉴에서 화면을 선택하면 탭으로 열립니다.</p></div>}</div>
  </div>
 </div>;
}
