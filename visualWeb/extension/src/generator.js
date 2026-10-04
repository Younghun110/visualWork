'use strict';
const fs=require('node:fs');
const path=require('node:path');
const {validate}=require('./model');
const template=name=>fs.readFileSync(path.join(__dirname,'../templates',name),'utf8');
function generate(model){
  validate(model);
  const json=JSON.stringify(model,null,2)+'\n';
  return {
    'project.visualweb.json':json,
    'frontend/components/workspace-shell.jsx':template('workspace-shell.jsx'),
    'frontend/lib/workspace-data.js':template('workspace-data.js'),
    'frontend/components/free-canvas.jsx':template('free-canvas.jsx'),
    'frontend/components/data-grid.jsx':template('data-grid.jsx'),
    'frontend/lib/api-config.js':template('api-config.js'),
    'frontend/lib/api-proxy.js':template('api-proxy.js'),
    'frontend/lib/grid-data.js':template('grid-data.js'),
    'frontend/schema.json':json,
    'frontend/app/page.jsx':template('page.jsx'),
    'frontend/app/layout.jsx':"import './globals.css';\nexport default function Layout({children}) { return <html lang=\"ko\"><body className=\"bg-slate-50\">{children}</body></html>; }\n",
    'frontend/app/globals.css':'@import "tailwindcss";\n\n.vw-flow > * { flex: 0 1 auto; max-width: 100%; }\n.vw-flow > label { width: 240px; }\n.vw-flow > .col-span-full { flex-basis: 100%; }\n'+template('grid.css')+template('canvas.css')+template('workspace.css'),
    'frontend/postcss.config.mjs':'export default {plugins:{"@tailwindcss/postcss":{}}};\n',
    'frontend/next.config.mjs':'export default {};\n',
    'frontend/app/api/grid/route.js':template('grid-route.js'),
    'frontend/app/api/records/route.js':template('records-route.js'),
    'package.json':JSON.stringify({name:'visualweb-generated',version:'0.1.0',private:true,scripts:{dev:'next dev frontend --hostname 127.0.0.1',build:'next build frontend --webpack',start:'next start frontend --hostname 127.0.0.1'},dependencies:{next:'16.3.8',react:'19.3.0','react-dom':'19.3.0'},devDependencies:{tailwindcss:'4.3.3','@tailwindcss/postcss':'4.3.3'},engines:{node:'>=20.9.0'}},null,2)+'\n',
    'frontend/.env.local.example':'VISUALBACK_URL=http://127.0.0.1:4000\n',
    '.gitignore':'node_modules/\n.next/\n.env*\n!.env.local.example\n',
    'README.md':`# ${model.title}\n\nVisualWeb에서 생성한 Next.js + React + Tailwind 프론트엔드입니다.\n\n1. npm install\n2. frontend/.env.local.example을 frontend/.env.local로 복사하고 VISUALBACK_URL 설정\n3. Spring Boot VisualBack에 frontend/schema.json과 일치하는 DTO·서비스·DB 마이그레이션 준비\n4. VisualBack 서버 실행 후 npm run dev → http://localhost:3000\n\n디자이너의 화면별 API 연결과 버튼·Grid별 경로가 schema.json에 저장됩니다. /api/records와 /api/grid 프록시는 해당 설정의 VisualBack 경로로 전달합니다. 서버 주소는 VISUALBACK_URL 환경변수에서 읽습니다. 응답은 success/message/data 구조이며 페이지 정보 pageNo/totalCount는 최상위에 둡니다. DB 코드와 비밀번호는 프론트엔드에 포함하지 않습니다.\n생성은 새 폴더에만 수행합니다.\n`
  };
}
module.exports={generate};
