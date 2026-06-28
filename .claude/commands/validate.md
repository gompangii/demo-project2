---
description: 검증 게이트 실행 (lint → typecheck → test → build)
---

`scripts/check.ps1` 를 실행해 전체 검증 게이트를 돌려라:

```
pwsh scripts/check.ps1
```

규칙:
- 첫 실패 단계에서 게이트가 멈춘다. 출력의 단계별 요약(✅/❌)을 확인하라.
- 실패하면 해당 단계의 에러를 분석해 고친 뒤 다시 `/validate` 로 게이트를 통과시켜라.
- 셸은 PowerShell 도구를 사용하라 (Git Bash 는 이 머신에서 불안정).
