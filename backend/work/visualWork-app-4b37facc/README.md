# visualWork-app

Java 21 / Spring Boot JSON API입니다. DB를 생성하고 migration.sql을 적용한 뒤 DB_URL, DB_USER, DB_PASSWORD 환경변수를 설정하세요.

```bash
./gradlew bootRun
./gradlew test bootJar
```

- /api/members: GET 목록, POST 등록
- /api/members/{id}: GET 상세, PUT 수정, DELETE 삭제
- /api/members/grid: GET columns/data (page, size 지원)

목록 page는 1부터, size는 1~100입니다. id는 자동 생성됩니다. 기존 테이블 변경은 별도 마이그레이션이 필요합니다. 인증·권한은 포함되지 않은 로컬 개발용 프로젝트입니다.
