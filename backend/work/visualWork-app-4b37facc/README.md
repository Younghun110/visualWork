# visualWork-app

Java 21 / Spring Boot JSON API입니다. DB를 생성하고 migration.sql을 적용한 뒤 DB_URL, DB_USER, DB_PASSWORD 환경변수를 설정하세요.

```bash
./gradlew bootRun
./gradlew test bootJar
```

- /api/members: GET 목록, POST 등록
- /api/members/{id}: GET 상세, PUT 수정, DELETE 삭제
- /api/members/grid: GET columns/data (page, size 요청 지원)

목록 page는 1부터, size는 1~100입니다. 목록은 배열을, 상세·등록·수정은 객체를 직접 반환하며, 삭제는 204 응답을 반환합니다. 이 프로젝트는 `success/message/data` 응답 봉투를 사용하지 않고 페이지의 전체 건수도 반환하지 않습니다. 따라서 VisualWeb의 기본 API 프록시 응답 형식과 호환하려면 API 응답을 맞춰야 하며, 현재 Grid의 page/size는 일부 행만 반환할 뿐 전체 페이지 수를 제공하지 않습니다. id는 자동 생성됩니다. 기존 테이블 변경은 별도 마이그레이션이 필요합니다. 인증·권한은 포함되지 않은 로컬 개발용 프로젝트입니다.
