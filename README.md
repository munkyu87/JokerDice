# RogueRoll

주사위 기반 로그라이크 덱빌딩 게임 프로토타입입니다.

현재 버전은 아래 요소를 포함한 세로형 MVP입니다.

- 주사위 5개 기반 족보 판정
- `족보 점수 + 숫자 합 + 조커 보정` 점수 구조
- 드로우/버림/덱 압축이 있는 액션 카드 순환
- 트리거 기반 조커 시스템
- 보스 블라인드 제약
- 보상 선택과 상점 루프

## 문서

- 설계와 파일 구조: `docs/rogueroll-mvp.md`

## 실행

```sh
npm start
npm run android
```

## 테스트

```sh
npm test
npm run lint
```
