# VisualWeb

## 1. 프로젝트 개요

VisualWeb은 **AI가 생성한 UI와 기존 웹 프로젝트 사이를 연결하는 Visual Development Tool**이다.

VisualWeb의 목적은 단순히 AI에게 HTML/React 코드를 생성시키는 것이 아니다.

AI가 만들어준 UI를 실제 개발 프로젝트에 적용했을 때 발생하는 다음 문제를 해결하는 것이 핵심이다.

* 기존 프로젝트의 디자인과 맞지 않는 문제
* 기존 컴포넌트와 맞지 않는 문제
* API 및 데이터 구조가 다른 문제
* 이벤트와 비즈니스 로직을 연결해야 하는 문제
* 반응형 UI를 수정해야 하는 문제
* 기존 CSS 및 스타일과 충돌하는 문제
* AI가 생성한 UI를 사람이 직접 수정해야 하는 문제

따라서 VisualWeb은 다음과 같은 개발 흐름을 목표로 한다.

```text
AI UI 생성
    ↓
VisualWeb
    ↓
시각적 UI 편집
    ↓
속성 / 이벤트 / 데이터 / API 수정
    ↓
개발자가 세부 코드 수정
    ↓
실제 프로젝트 코드 반영
```

---

# 2. 핵심 철학

VisualWeb은 **AI를 대체하는 제품이 아니다.**

AI는 UI를 빠르게 생성하는 데 사용하고,

VisualWeb은 AI가 생성한 결과를 **실제 프로젝트에 맞게 수정하고 통합하는 역할**을 담당한다.

즉,

```text
AI
=
빠른 생성

VisualWeb
=
시각적 편집 + 구조화 + 통합 + 코드 반영
```

을 목표로 한다.

---

# 3. 해결하려는 문제

현재 AI를 이용하면 다음과 같은 요청은 쉽게 처리할 수 있다.

> "회원가입 화면을 만들어줘."

> "건강검진 예약 화면을 만들어줘."

> "React로 관리자 화면을 만들어줘."

그러나 실제 프로젝트에서는 생성된 UI를 그대로 사용할 수 없는 경우가 많다.

예를 들어:

```text
AI 생성 UI

   ↓

기존 프로젝트와 비교

   ├─ 디자인 시스템이 다름
   ├─ 기존 컴포넌트를 사용해야 함
   ├─ API가 다름
   ├─ 데이터 구조가 다름
   ├─ 권한 처리가 필요함
   ├─ 이벤트 처리가 필요함
   ├─ 기존 CSS와 충돌함
   └─ 모바일 UI를 수정해야 함
```

VisualWeb은 이 단계의 문제를 해결한다.

---

# 4. 핵심 사용자

VisualWeb의 주요 사용자는 웹 애플리케이션을 개발하는 개발자이다.

특히 다음 환경을 우선 대상으로 한다.

* React
* Next.js
* JavaScript
* TypeScript
* 기존 웹 프로젝트
* VS Code 개발환경

초기 버전에서는 **Next.js / React 프로젝트 지원을 최우선으로 한다.**

---

# 5. 가장 중요한 목표

VisualWeb의 첫 번째 목표는 거대한 RAD 플랫폼을 만드는 것이 아니다.

첫 번째 목표는 다음 한 가지를 실제로 동작시키는 것이다.

> **기존 Next.js 프로젝트를 VisualWeb에서 열고, 화면을 시각적으로 수정한 뒤 저장하면 실제 프로젝트 코드가 변경된다.**

예:

```text
기존 Next.js 프로젝트
        ↓
VisualWeb에서 분석
        ↓
화면 표시
        ↓
Canvas에서 컴포넌트 이동
        ↓
Property 수정
        ↓
저장
        ↓
실제 React / Next.js 코드 변경
```

이 기능이 VisualWeb의 첫 번째 검증 대상이다.

---

# 6. VisualWeb의 핵심 구조

VisualWeb은 다음 구조를 기본으로 한다.

```text
                AI
                 │
                 ▼
          ┌──────────────┐
          │   UI Model   │
          └──────┬───────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
 Visual Editor       Code Editor
        │                 │
        ▼                 ▼
     Canvas             Monaco
        │                 │
        └────────┬────────┘
                 ▼
          Project Source
                 │
                 ▼
          React / Next.js
```

VisualWeb에서 가장 중요한 계층은 **UI Model**이다.

---

# 7. UI Model

UI Model은 VisualWeb의 핵심 데이터 구조이다.

단순한 HTML 구조가 아니라 다음 정보를 표현할 수 있어야 한다.

```text
Screen
 ├─ Layout
 ├─ Component
 │   ├─ Property
 │   ├─ Style
 │   ├─ Event
 │   └─ DataBinding
 │
 ├─ State
 ├─ API
 ├─ Validation
 └─ Permission
```

예를 들어 Button은 다음과 같은 정보를 가질 수 있다.

```text
Button
 ├─ id
 ├─ type
 ├─ text
 ├─ disabled
 ├─ visible
 ├─ style
 ├─ onClick
 └─ dataBinding
```

---

# 8. UI Model과 실제 코드의 관계

UI Model은 실제 프로젝트 코드와 완전히 동일한 것이 아니다.

UI Model은 **VisualWeb이 UI를 이해하고 편집하기 위한 중간 표현(Intermediate Representation)**&#xC774;다.

```text
React / Next.js
       ↓
   Parser
       ↓
   UI Model
       ↓
 Visual Editor
       ↓
   UI Model
       ↓
 Generator / Transformer
       ↓
React / Next.js
```

따라서 VisualWeb은 가능한 한 기존 코드를 무조건 새 코드로 덮어쓰지 않아야 한다.

---

# 9. 기존 프로젝트 우선

VisualWeb은 새로운 프로젝트를 VisualWeb 전용 방식으로 만드는 것보다,

**기존 프로젝트를 VisualWeb에서 편집할 수 있는 기능**을 중요하게 생각한다.

예를 들어 기존 프로젝트가 다음과 같다면:

```text
project/
├── app/
├── components/
├── lib/
├── public/
├── styles/
└── package.json
```

VisualWeb은 프로젝트를 분석하고 가능한 범위에서 다음을 파악해야 한다.

* 화면
* 컴포넌트
* JSX 구조
* TypeScript 타입
* CSS
* Tailwind CSS
* 이벤트
* props
* 상태
* API 호출
* 데이터 구조

---

# 10. 기존 컴포넌트 재사용

VisualWeb은 자체 컴포넌트만 사용하는 방식으로 제한하지 않는다.

예를 들어 기존 프로젝트에:

```text
components/
├── Button.tsx
├── Input.tsx
├── Header.tsx
└── DataTable.tsx
```

가 있다면 VisualWeb은 가능하면 이를 인식하고 사용할 수 있어야 한다.

개발자가 기존 프로젝트를 버리고 VisualWeb 전용 컴포넌트로 다시 만드는 방식은 지양한다.

핵심 원칙:

> **VisualWeb이 프로젝트에 맞춰야 한다.**

프로젝트가 VisualWeb에 맞춰야 하는 구조가 되어서는 안 된다.

---

# 11. Visual Editor

Visual Editor는 다음 영역으로 구성한다.

```text
┌─────────────────────────────────────────────┐
│ VisualWeb                                   │
├────────────┬──────────────────┬─────────────┤
│ Components │      Canvas      │ Properties  │
│            │                  │             │
│ Container  │                  │ Width       │
│ Text       │                  │ Height      │
│ Button     │                  │ Margin      │
│ Input      │                  │ Padding     │
│ Select     │                  │ Font        │
│ Table      │                  │ Color       │
│ Card       │                  │ Visible     │
├────────────┴──────────────────┴─────────────┤
│ Monaco / Event / Data / API                 │
└─────────────────────────────────────────────┘
```

---

# 12. Component Panel

초기에는 다음 정도의 기본 컴포넌트를 지원한다.

```text
Container
Text
Button
Input
Textarea
Select
Checkbox
Radio
Image
Card
Table
List
Form
```

이후 확장한다.

---

# 13. Property Editor

선택된 컴포넌트의 속성을 시각적으로 수정할 수 있어야 한다.

예:

```text
Width
Height
Margin
Padding
Position
Display
Font
Color
Background
Border
Radius
Visible
Disabled
```

컴포넌트 종류에 따라 필요한 속성을 동적으로 표시한다.

---

# 14. Event Editor

컴포넌트의 이벤트를 편집할 수 있어야 한다.

초기에는:

```text
onClick
onChange
onSubmit
onLoad
```

등을 고려한다.

이벤트는 단순 JavaScript 코드뿐만 아니라 향후 다음과 같은 액션 모델도 지원할 수 있다.

```text
Button Click
    ↓
API 호출
    ↓
결과 확인
    ↓
화면 이동
```

또는

```text
Button Click
    ↓
Form Validation
    ↓
API 호출
    ↓
Success Message
```

---

# 15. Data Binding

UI와 데이터를 연결할 수 있어야 한다.

예:

```text
Hospital[] 
     ↓
Select
```

또는

```text
Patient[]
     ↓
Table
```

UI Model에는 최소한 다음 개념을 고려한다.

```text
Data Source
Data Type
Field
Binding
```

---

# 16. API 연결

VisualWeb은 UI만 편집하는 도구가 아니라 API 연결 정보를 표현할 수 있어야 한다.

예:

```text
GET /api/hospitals

Response:
Hospital[]
```

UI:

```text
Hospital[]
    ↓
Hospital Select
```

API 정보는 프로젝트 코드에 이미 존재할 수도 있고 사용자가 VisualWeb에서 설정할 수도 있어야 한다.

---

# 17. Monaco Editor

Monaco Editor는 VisualWeb의 보조적인 고급 편집 기능으로 사용한다.

Visual Editor가 모든 코드를 대체해서는 안 된다.

구조:

```text
Visual Editor
    ↓
일반적인 UI 편집

Monaco
    ↓
고급 코드 / 이벤트 / 표현식 / 사용자 정의 로직
```

개발자는 필요할 경우 직접 코드를 작성할 수 있어야 한다.

---

# 18. AI Integration

AI는 VisualWeb의 중요한 기능이지만 VisualWeb 자체가 AI 코드 생성기로 변하지 않도록 한다.

AI의 주요 역할:

```text
자연어
  ↓
UI Model 생성 / 수정
```

예:

> "회원가입 화면을 만들어줘."

또는

> "휴대폰 번호 입력 아래에 인증번호 입력을 추가해줘."

또는

> "모바일에서는 버튼을 화면 전체 너비로 만들어줘."

AI는 가능하면 직접 소스 코드를 무분별하게 수정하기보다 **UI Model을 이해하고 변경하는 방식**을 우선한다.

---

# 19. AI와 VisualWeb의 역할 분리

```text
AI
 ├─ UI 생성
 ├─ UI 수정
 ├─ 컴포넌트 추천
 ├─ 레이아웃 변경
 ├─ 데이터 연결 제안
 └─ 코드 보조

VisualWeb
 ├─ 프로젝트 분석
 ├─ UI Model 관리
 ├─ Visual Editing
 ├─ Property Editing
 ├─ Event Editing
 ├─ Data Binding
 ├─ API 연결
 └─ 실제 코드 반영
```

---

# 20. 코드 생성 원칙

VisualWeb은 특정 프레임워크에 사용자를 가두지 않는 것을 장기적인 목표로 한다.

초기 목표:

```text
UI Model
    ↓
React / Next.js
```

장기적으로:

```text
UI Model
 ├─ React
 ├─ Next.js
 ├─ Vue
 ├─ HTML
 └─ 기타 출력 형식
```

을 고려한다.

단, 초기 개발에서는 **Next.js / React 지원에 집중한다.**

---

# 21. 코드 변경 원칙

VisualWeb이 기존 프로젝트를 수정할 때 가장 중요한 원칙:

### 1. 기존 코드 보존

VisualWeb이 이해하지 못하는 코드를 함부로 삭제하지 않는다.

### 2. 최소 변경

사용자가 수정한 부분을 중심으로 최소한의 코드를 변경한다.

### 3. 사용자 코드 존중

사용자가 직접 작성한 코드를 VisualWeb의 자동 생성 코드로 무조건 덮어쓰지 않는다.

### 4. 변경 결과 확인

코드 변경 전후의 차이를 확인할 수 있도록 한다.

향후 Git diff와 연계하는 것을 고려한다.

---

# 22. VS Code Extension

VisualWeb은 VS Code Extension을 주요 실행환경으로 한다.

사용자는 VS Code에서 프로젝트를 열고 VisualWeb을 실행한다.

예:

```text
VS Code
   ↓
VisualWeb Extension
   ↓
Project Analysis
   ↓
Visual Editor
```

VisualWeb은 기존 VS Code 개발환경과 경쟁하기보다 VS Code를 확장하는 것을 목표로 한다.

---

# 23. 개발 우선순위

## Phase 1 — 최소 기능

목표:

> 기존 Next.js 프로젝트의 UI를 읽고 시각적으로 편집한다.

필수 기능:

* VS Code Extension
* 프로젝트 열기
* React/Next.js 파일 분석
* 기본 JSX 분석
* Canvas 표시
* 컴포넌트 선택
* Property 표시
* 간단한 Property 수정
* 코드 반영
* 저장

---

## Phase 2 — UI Model

* UI Model 정의
* JSX → UI Model
* UI Model → JSX
* 컴포넌트 구조
* Property
* Style
* Event

---

## Phase 3 — 개발 기능

* Monaco Editor
* Event Editor
* Data Binding
* API 연결
* TypeScript 지원
* Tailwind CSS 지원
* 기존 컴포넌트 인식

---

## Phase 4 — AI

* 자연어 UI 생성
* 자연어 UI 수정
* UI Model 수정
* 코드 분석
* 컴포넌트 추천
* API 연결 지원

---

## Phase 5 — 고급 기능

* Design System
* Component Library
* Git 연동
* Diff / Undo
* 팀 협업
* 다양한 프레임워크 출력
* Figma 연동 검토

---

# 24. 기술 방향

초기 개발환경:

```text
VS Code Extension
TypeScript
React
Next.js
Monaco Editor
```

Visual Editor는 웹 기술 기반으로 구현한다.

UI Model은 JSON 기반으로 시작할 수 있지만 향후 schema와 validation을 명확하게 정의한다.

---

# 25. 중요한 개발 원칙

### 원칙 1

**처음부터 모든 기능을 만들지 않는다.**

작동하는 작은 Visual Editor부터 만든다.

### 원칙 2

**UI Model을 성급하게 복잡하게 만들지 않는다.**

실제 편집 기능에서 필요한 구조를 발견하면서 확장한다.

### 원칙 3

**AI보다 기존 코드 통합을 먼저 해결한다.**

VisualWeb의 차별점은 AI가 아니라 기존 프로젝트와의 통합이다.

### 원칙 4

**사용자가 직접 수정할 수 있어야 한다.**

AI가 모든 것을 결정하는 구조를 만들지 않는다.

### 원칙 5

**생성 결과를 특정 플랫폼에 종속시키지 않는다.**

가능하면 UI Model과 실제 산출물을 분리한다.

---

# 26. 성공 기준

VisualWeb의 초기 성공 여부는 다음 질문으로 판단한다.

> "개발자가 기존 Next.js 화면을 VisualWeb에서 열어서 코드를 직접 수정하는 것보다 더 편하게 UI를 수정할 수 있는가?"

그리고 다음 단계에서는:

> "AI가 만든 UI를 실제 프로젝트에 적용할 때 VisualWeb을 사용하는 것이 더 편한가?"

를 검증한다.

---

# 27. 최종 비전

VisualWeb의 장기적인 목표는 다음과 같다.

```text
                User
                  │
          자연어 / 직접 편집
                  │
                  ▼
             VisualWeb
                  │
       ┌──────────┴──────────┐
       ▼                     ▼
      AI                  UI Model
       │                     │
       └──────────┬──────────┘
                  ▼
          Visual Development
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
     React      Next.js     기타
       │          │          │
       └──────────┼──────────┘
                  ▼
            실제 프로젝트
```

VisualWeb은 단순한 AI 코드 생성기가 아니다.

**AI가 만든 결과와 실제 개발 프로젝트 사이의 간극을 줄이는 Visual Development Platform**을 목표로 한다.
