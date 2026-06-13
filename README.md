# AlgoNote

프로그래머스 문제 URL을 넣으면 마크다운 풀이 기록을 만들어 **GitHub 레포에 커밋**하는 웹앱.
우아한테크코스 알고리즘 스터디 풀이 증빙용.

> **Phase 2 단계**: GitHub OAuth 로그인 + REST API 실제 커밋까지 동작합니다.
> 크루마다 자기 GitHub 계정으로 로그인해 **자기 레포**에 기록을 남깁니다.
>
> **하이브리드 캡처(백준허브 방식)**: `extension/` 의 크롬 확장이 프로그래머스
> 페이지에서 문제 + 정답 코드를 긁어 웹 에디터로 자동 전송합니다. 회고 작성·커밋은
> 웹앱이 담당해, 단순 아카이빙이 아닌 **풀이 기록**이라는 차별점을 유지합니다.

## 전체 흐름 (하이브리드)

```
[프로그래머스 문제 페이지]
   │  확장: 📝 "AlgoNote에 보내기" 클릭
   │  → 문제(제목/설명/제한/입출력예) + 정답코드 캡처
   ▼  window.open( 웹앱/#import=<base64 payload> )
[AlgoNote 웹앱]  ← 폼 자동 채움
   │  처음 짠 코드 / 막힌 점 / 배운 점(회고) 작성
   ▼  /api/commit
[내 GitHub 레포]  lv2/42587_프린터/README.md + INDEX.md 갱신
```

## 동작하는 것

- ✅ 프로그래머스 URL **서버사이드 스크래핑** (`/api/parse`, cheerio)
  - 제목 / 문제 설명 / 제한사항 / 입출력 예를 자동 추출
  - 파싱 실패 시 **수동 입력 폼으로 자동 전환** (fallback)
- ✅ 마크다운 템플릿 자동 생성 (PRD 4번 규칙)
- ✅ Java 문법 하이라이트 웹 에디터 (CodeMirror)
- ✅ README.md / INDEX.md / 커밋 정보 **실시간 미리보기**
- ✅ **GitHub OAuth 로그인** (`/api/auth/github/*`)
- ✅ **실제 커밋** (`/api/commit`): README.md 생성/갱신 + 루트 INDEX.md 누적 갱신
  - 동일 문제 재기록 시 덮어쓰기 확인 + INDEX 행 자동 교체(중복 방지)
- ✅ AI 접근법 힌트 토글 (`/api/ai-hint`, 현재 mock)
- ✅ **크롬 확장 캡처** (`extension/`): 프로그래머스 문제+정답코드 → 웹앱 자동 전송

## 실행

```bash
npm install
cp .env.example .env.local   # 아래 'GitHub 연동 설정' 참고해서 값 채우기
npm run dev
# http://localhost:3000
```

예시 URL: `https://programmers.co.kr/learn/courses/30/lessons/42587`

## GitHub 연동 설정 (최초 1회)

여러 크루가 각자 자기 레포에 쓰려면 **OAuth App 1개만 등록**하면 됩니다.

1. GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**
   - **Application name**: AlgoNote (자유)
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/api/auth/github/callback`
2. 생성 후 **Client ID** 복사, **Generate a new client secret** 으로 secret 발급
3. `.env.local` 에 채우기:
   ```bash
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   GITHUB_OAUTH_SCOPE=public_repo   # private 레포까지면 repo
   APP_BASE_URL=http://localhost:3000
   SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
   ```
4. `npm run dev` 재시작 → 우측 패널에서 **GitHub로 로그인** → owner/repo 입력 → 기록.

> **배포 시**: Homepage/Callback URL 과 `APP_BASE_URL` 을 실제 도메인으로 바꾸고,
> 같은 값을 Vercel 환경변수에 등록하면 됩니다.

## 크롬 확장 설치 (캡처용)

빌드 불필요 — 순수 JS 입니다.

1. Chrome → `chrome://extensions` → 우측 상단 **개발자 모드** ON
2. **압축해제된 확장 프로그램을 로드** → `algonote/extension/` 폴더 선택
3. 확장 아이콘 클릭 → **AlgoNote 웹앱 주소** 확인(기본 `http://localhost:3000`)
4. 프로그래머스 문제 페이지에서 우측 하단 **📝 AlgoNote에 보내기** 클릭
   → 새 탭으로 웹앱이 열리며 문제·정답코드가 채워짐 → 회고 작성 후 커밋

> **정답 코드 캡처**: 페이지의 Ace/CodeMirror 에디터에서 읽습니다.
> 에디터 구조가 바뀌어 못 읽으면 코드 칸만 비어 열리니, 웹앱에서 붙여넣으면 됩니다
> (문제 정보는 그대로 채워짐).

## 구조

```
src/
├── app/
│   ├── page.tsx              메인 플로우 (URL → 편집 → 미리보기 → 기록)
│   ├── layout.tsx · globals.css
│   └── api/
│       ├── parse/route.ts        프로그래머스 스크래핑
│       ├── ai-hint/route.ts      AI 접근법 힌트 (mock)
│       ├── auth/github/login     OAuth authorize 리다이렉트
│       ├── auth/github/callback  code→token 교환, 세션 저장
│       ├── auth/me · auth/logout 세션 조회/해제
│       ├── repo/route.ts         owner/repo 접근·브랜치 확인
│       └── commit/route.ts       실제 커밋 (README + INDEX.md)
├── components/
│   ├── CodeEditor.tsx        CodeMirror(Java) 래퍼
│   └── Toggle.tsx
└── lib/
    ├── types.ts              ParsedProblem / SolutionDraft / CommitArtifact
    ├── parser.ts             HTML → 섹션별 마크다운 파싱
    ├── template.ts           README/INDEX 빌더 + mergeIndex(누적 갱신)
    ├── path.ts               파일경로 · 커밋메시지 · INDEX 행 규칙
    ├── github.ts             GitHub REST API (토큰교환/유저/파일/커밋)
    ├── session.ts            HMAC 서명 httpOnly 세션 쿠키
    └── importPayload.ts      확장→웹앱 핸드오프 페이로드 인코딩/디코딩

extension/                    크롬 확장 (캡처, 빌드 불필요)
├── manifest.json            MV3
├── content.js               프로그래머스 DOM 파싱 + 플로팅 버튼 + 핸드오프
├── inject.js                페이지 컨텍스트: Ace/CodeMirror 코드 읽기
└── popup.html · popup.js    웹앱 주소 설정
```

## 생성되는 파일 규칙

| 항목 | 예시 |
|------|------|
| 파일 경로 | `lv2/42587_프린터/README.md` |
| 커밋 메시지 | `[lv2] 프린터 풀이 기록 - 2026.06.13` |
| INDEX 행 | `\| 2026.06.13 \| lv2 \| 프린터 \| [바로가기](./lv2/42587_프린터/README.md) \|` |

## 다음 단계 (Phase 3)

- AI 힌트를 Anthropic API(Claude)로 교체 (`/api/ai-hint` 내 주석 참고)
- 레포 자동 생성 (없을 때 `POST /user/repos` 가이드)
- 커밋 히스토리 기반 스트릭 시각화
- 두 파일을 1커밋으로 묶기 (Git Data API: tree/commit) — 현재는 contents API 2커밋
