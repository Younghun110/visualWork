# VisualBack

VisualWeb 프론트엔드가 연결하는 독립 Spring Boot JSON API 서버입니다. Java 21, Spring Boot 3.5.16, JDBC와 MariaDB를 사용합니다. 관리자 UI는 이후 별도 `visualAdmin/`에서 개발합니다.

## 실행

이 디렉터리에서 DB 연결 환경변수를 설정하고 실행합니다. 비밀번호는 저장소에 기록하지 마세요. Spring Boot는 `.env` 파일을 자동으로 읽지 않습니다.

```bash
export DB_URL=jdbc:mariadb://127.0.0.1:3306/visualWeb
export DB_USER=dbuser
read -rs -p 'DB password: ' DB_PASSWORD
export DB_PASSWORD
./gradlew bootRun
```

기본 주소는 `http://127.0.0.1:4000`입니다. `HOST`와 `PORT`로 변경합니다. DB 생성은 `init.sql`, 회원 테이블 생성은 `migration.sql`을 사용합니다.

```bash
mariadb -u YOUR_DB_ADMIN -p < init.sql
mariadb -u dbuser -p visualWeb < migration.sql
./gradlew test bootJar
```

DB 초기화는 자동 실행하지 않습니다. 기존 테이블 변경은 별도 마이그레이션이 필요합니다. 테스트는 MockMvc와 모의 서비스를 사용하므로 실행 중인 DB가 필요하지 않습니다.

## JSON API

모든 응답은 `success`(boolean), `message`(string), `data` 구조를 사용합니다. 페이지 조회에서는 `pageNo`와 `totalCount`(전체 건수)를 `data` 밖의 최상위에 추가합니다. 오류와 삭제 성공처럼 반환할 데이터가 없으면 `data`는 `null`입니다.

- `GET /health`: 프로세스 상태, `{"success":true,"message":"조회 성공","data":{"status":"ok"}}` (DB 상태 검사는 아님).
- `GET /api/records`: 최근 100개 회원의 배열을 `data`에 담아 반환합니다.
- `GET /api/grid`: `data` 안에 `columns: [{field, title}]`와 `data: [{필드명: 값}]`을 함께 반환합니다. 현재 회원 이름·이메일 헤더와 최근 회원 데이터를 제공합니다.
- `POST /api/records`: `{"name":"Kim","email":"kim@example.com"}` 입력, 성공 시 `201 {"success":true,"message":"등록 성공","data":{"id":1}}`.
- 필수값·이메일·255자 길이 검증 실패는 400, 중복 이메일은 409, DB 오류는 500입니다. 오류 본문은 `{"success":false,"message":"설명","data":null}`입니다.

## VisualWeb 연결

VisualWeb의 `frontend/.env.local`에 `VISUALBACK_URL=http://127.0.0.1:4000`을 설정합니다. 브라우저는 Next.js `/api/records`를 호출하고 Next.js가 이 서버로 JSON 요청을 전달합니다. 서버 간 요청을 사용하므로 브라우저 CORS 설정은 필요하지 않습니다.

현재 API는 샘플 회원 모델(name/email)을 구현합니다. `schema.json`은 참조용이며 Java API를 동적으로 생성하지 않습니다. 다른 폼을 연결하려면 DTO, 서비스와 DB 마이그레이션을 함께 구현해야 합니다. 인증과 권한은 아직 없는 로컬 MVP입니다.

## API 문서

서버 실행 후 `http://127.0.0.1:4000/swagger-ui/index.html` 또는 `http://127.0.0.1:4000/rapidoc.html`을 엽니다. OpenAPI JSON은 `/v3/api-docs`에서 제공합니다. RapiDoc 스크립트는 서버에 포함되므로 외부 CDN 없이 사용할 수 있습니다.
