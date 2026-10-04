# 새 화면

VisualWeb에서 생성한 Next.js + React + Tailwind 프론트엔드입니다.

1. npm install
2. frontend/.env.local.example을 frontend/.env.local로 복사하고 VISUALBACK_URL 설정
3. Spring Boot VisualBack에 frontend/schema.json과 일치하는 DTO·서비스·DB 마이그레이션 준비
4. VisualBack 서버 실행 후 npm run dev → http://localhost:3000

디자이너의 화면별 API 연결과 버튼·Grid별 경로가 schema.json에 저장됩니다. /api/records와 /api/grid 프록시는 해당 설정의 VisualBack 경로로 전달합니다. 서버 주소는 VISUALBACK_URL 환경변수에서 읽습니다. 응답은 success/message/data 구조이며 페이지 정보 pageNo/totalCount는 최상위에 둡니다. DB 코드와 비밀번호는 프론트엔드에 포함하지 않습니다.
생성은 새 폴더에만 수행합니다.
