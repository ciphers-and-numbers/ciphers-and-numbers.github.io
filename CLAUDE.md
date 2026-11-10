# 암호와 수 작업 지침

Claude(또는 Claude Code)가 이 저장소를 수정할 때 따르는 규칙입니다.

## 먼저 읽을 것
- 작업을 시작하기 전에 `docs/PROJECT-PLAN.md`(주제선택 "암호와 수" 작업 정리)를 먼저 읽는다.

## 기본 정보
- 배포: GitHub Pages (main 브랜치 / root)
- 배포 주소: https://ciphers-and-numbers.github.io/
- 빌드 도구 없음. 순수 HTML·CSS·JavaScript만 사용한다.

## 파일 역할
| 파일 | 역할 | 수정 여부 |
|---|---|---|
| `site-config.js` | 홈페이지 이름·문구(`SITE`), 앱 목록(`TOOLS`), 과목(`SUBJECT_GROUPS`) | 주로 여기만 수정 |
| `index.html` | 메인 페이지 뼈대 | `data-site`, `id` 속성은 유지 |
| `script.js` | 검색·과목 필터·카드·QR 동작 | 되도록 수정하지 않음 |
| `style.css` | 메인 디자인 | 디자인 변경 시 `:root` 색상부터 수정 |
| `hero-reel.js` | 첫 화면 오른쪽 모션 그래픽 | 원하지 않으면 index.html에서 스크립트 줄을 지워도 됨 |
| `app-template/` | 새 앱의 빈 틀 | 복사해서 사용, 원본은 남겨 둠 |
| `<앱폴더>/index.html` | 각 수학 앱 | 앱마다 폴더 하나 |
| `thumbnails/<앱폴더>.png` | 카드 썸네일 | 선택 |

## 새 앱 추가 규칙
1. 앱은 저장소 최상위의 `<영문-폴더이름>/index.html`로 저장한다. 폴더 이름은 영어 소문자·숫자·하이픈만 쓴다.
2. `app-template/index.html`의 공통 테마(`:root`, 공통 셸 CSS, 상단바 구조)를 그대로 쓰고, 앱 고유의 CSS·JS는 "도구 전용" 영역에만 작성한다.
3. 상단바의 홈 링크는 `../#tools`로 둔다.
4. 앱 하나는 HTML 파일 하나로 완결한다. 외부 라이브러리는 cdnjs, jsdelivr 등 CDN 주소로 불러온다.
5. `site-config.js`의 `TOOLS` 배열에 항목을 추가한다. `url`은 `"./<폴더이름>/"` 형식, `subject`는 `SUBJECT_GROUPS`에 있는 이름과 글자까지 같게 쓴다.
6. 썸네일은 `thumbnails/<폴더이름>.png`(또는 jpg, webp)로 저장하면 자동 연결된다.
7. 변경은 `main` 브랜치에 커밋하고, 배포 주소에서 1~2분 뒤 반영을 확인한다.

## 작업 방식
- 수정 전에 바꿀 파일과 내용을 사용자에게 먼저 설명한다.
- 기존 앱 삭제나 전체 구조 변경은 먼저 확인받는다.
- 수정 후 기존 앱이 정상 작동하는지, 휴대폰 폭(약 390px)에서도 보이는지 확인한다.
