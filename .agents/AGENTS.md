# Project Behavior Rules & Design Protocols

## 1. Planning & Review Protocol
- 대규모 리팩토링이나 새로운 요구사항 조치 시, 설명 위주의 장황한 텍스트 답변 대신 우측 탭에 `implementation_plan.md` (구현 계획서) 아티팩트를 작성하고 유저의 승인을 얻은 후 작업을 진행한다.
- 작업 완수 후에는 `walkthrough.md` (결과 보고서) 아티팩트를 업데이트하여 수행 결과, 수정된 파일 및 검증 커맨드 출력을 정돈해 제시한다.

## 2. Strict Lint & Git Push Protocol
- 코드 수정 후 반드시 `npm run lint` (`tsc --noEmit`)를 수행하여 타입 및 빌드 오류가 0개임을 직접 검증한다.
- 검증 통과 후 `git add`, `git commit`, `git push origin main`까지 원스톱으로 처리하여 원격 저장소 및 Vercel 자동 배포 상태를 항시 최신으로 유지한다.

## 3. Editorial Story & Lightbox UI/UX Guidelines
- **Story 블록 레이아웃 통일**: Product, Space, Journal의 미디어/텍스트 Editorial Story 블록(`contentBlocks`)은 2열 풀블리드 그리드 레이아웃을 공유하며, 위/아래 순서 변경(Move Up/Down) 기능 및 히어로 커버 단일 선택 상호 배타성을 보장한다.
- **텍스트 완벽 중앙 정렬**: Story 블록 내 Text Only 텍스트 및 이미지 하단 캡션은 세로(수직) 및 가로(수평) 방향 모두 완벽한 중앙 정렬(`justify-center items-center text-center`)을 유지한다.
- **Lightbox 뷰어 통합**: Space, Journal, Product의 Fullscreen Lightbox 뷰어 로직(줌/슬라이드/제스처)을 동등하게 연동하되, 하단 섬네일 바는 항상 **화면 중앙 정렬 (`justify-center mx-auto`)** 방식을 일관 적용한다.
