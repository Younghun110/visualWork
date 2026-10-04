export function projectScreens(project){return [{...project,id:'main'},...(project.screens || [])];}
export function openScreen(tabs,id){return tabs.includes(id)?tabs:[...tabs,id];}
export function closeScreen(tabs,active,id){
 const index=tabs.indexOf(id),remaining=tabs.filter(key=>key!==id);
 return {tabs:remaining,active:active===id?(remaining[Math.min(index,remaining.length-1)] || null):active};
}
