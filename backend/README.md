# backend

VisualWeb 프론트엔드가 연결하는 독립 Spring Boot JSON API 서버입니다. Java 21, Spring Boot 3.5.16, JDBC와 MariaDB를 사용합니다. 관리자 UI는 이후 별도 `../admin/`에서 개발할 예정입니다.

## 실행

이 디렉터리에서 DB 연결 환경변수를 설정하고 실행합니다. 비밀번호는 저장소에 기록하지 마세요. Spring Boot는 `.env` 파일을 자동으로 읽지 않습니다.

```bash
export DB_URL=jdbc:mariadb://127.0.0.1:3306/visualWork
export DB_USER=dbuser
read -rs -p 'DB password: ' DB_PASSWORD
export DB_PASSWORD
./gradlew bootRun
```

기본 주소는 `http://127.0.0.1:4000`입니다. `HOST`와 `PORT`로 변경합니다. DB 생성은 `init.sql`, 회원 테이블 생성은 `migration.sql`을 사용합니다.

```bash
mariadb -u YOUR_DB_ADMIN -p < init.sql
mariadb -u dbuser -p visualWork < migration.sql
./gradlew test bootJar
```

DB 초기화는 자동 실행하지 않습니다. 기존 테이블 변경은 별도 마이그레이션이 필요합니다. 테스트는 MockMvc와 모의 서비스를 사용하므로 실행 중인 DB가 필요하지 않습니다.

## JSON API

응답은 `success`(boolean), `message`(string), `data` 구조를 사용합니다. 이 샘플의 목록 및 Grid 응답은 페이지 메타데이터를 반환하지 않습니다. 페이지 응답을 구현하는 경우 `pageNo`와 `totalCount`(전체 건수)를 최상위에 추가할 수 있습니다. 오류와 반환 데이터가 없는 응답은 `data: null`입니다.

- `GET /health`: 프로세스 상태, `{"success":true,"message":"조회 성공","data":{"status":"ok"}}` (DB 상태 검사는 아님).
- `GET /api/records`: 최근 100개 회원의 배열을 `data`에 담아 반환합니다. 각 행에는 수정·삭제에 사용할 `id`가 포함됩니다.
- `GET /api/grid`: `data` 안에 `columns: [{field, title}]`와 `data: [{id, 필드명: 값}]`을 함께 반환합니다. 현재 회원 이름·이메일 헤더와 최근 회원 데이터를 제공하며, `page`/`size` 페이지네이션은 지원하지 않습니다.
- `POST /api/records`: `{"name":"Kim","email":"kim@example.com"}` 입력, 성공 시 `201 {"success":true,"message":"등록 성공","data":{"id":1}}`.
- `GET /api/records/{id}`: 기본키로 회원을 조회합니다.
- `PUT /api/records/{id}`: `name`과 `email`을 수정합니다. 입력 형식은 등록과 같습니다.
- `DELETE /api/records/{id}`: 기본키에 해당하는 회원을 삭제합니다.
- `GET /api/posts`: 최근 게시글 100개를 조회합니다. 행에는 `id`, `title`, `content`, `author`, `created_at`, `updated_at`이 포함됩니다.
- `GET /api/posts/{id}`: 기본키로 게시글을 조회합니다.
- `POST /api/posts`: `{"title":"제목","content":"내용","author":"작성자"}` 입력으로 게시글을 등록합니다. 성공 시 201과 생성된 `id`를 반환합니다.
- `PUT /api/posts/{id}`: `title`, `content`, `author`를 수정합니다. 등록과 같은 입력 형식입니다.
- `DELETE /api/posts/{id}`: 기본키에 해당하는 게시글을 삭제합니다.
- `GET /api/posts/grid`: 게시글 Grid 데이터를 `title`, `content`, `author`, `created_at`, `updated_at` 컬럼과 한국어 제목으로 반환합니다. `GET /api/grid`는 회원 Grid를 유지합니다.
- 게시글의 제목은 필수 255자 이하, 내용은 필수, 작성자는 필수 100자 이하입니다. 입력 오류는 400, 존재하지 않는 기본키는 404입니다.
- 필수값·이메일 형식·255자 길이 검증 실패는 400, 존재하지 않는 기본키는 404, 중복 키는 409, DB 오류는 500입니다. 오류 본문은 `{"success":false,"message":"설명","data":null}`입니다.

## visualWork 연결

VisualWeb의 `frontend/.env.local`에 `VISUALBACK_URL=http://127.0.0.1:4000`을 설정합니다. 브라우저는 Next.js `/api/records`를 호출하고 Next.js가 이 서버로 JSON 요청을 전달합니다. 서버 간 요청을 사용하므로 브라우저 CORS 설정은 필요하지 않습니다.

현재 API는 샘플 회원 모델(name/email)의 등록·조회·수정·삭제를 구현합니다. `schema.json`은 참조용이며 Java API를 동적으로 생성하지 않습니다. 다른 폼을 연결하려면 DTO, 서비스와 DB 마이그레이션을 함께 구현해야 합니다. 인증과 권한은 아직 없는 로컬 MVP입니다. VisualWeb이 생성하는 Grid는 `pageNo`와 `totalCount`가 응답에 포함된 경우 서버 페이지 이동을 사용할 수 있지만, 이 샘플의 `/api/grid`는 해당 기능을 제공하지 않습니다.

## API 문서

서버 실행 후 `http://127.0.0.1:4000/swagger-ui/index.html` 또는 `http://127.0.0.1:4000/rapidoc.html`을 엽니다. OpenAPI JSON은 `/v3/api-docs`에서 제공합니다. RapiDoc 스크립트는 서버에 포함되므로 외부 CDN 없이 사용할 수 있습니다.
