---
description: 변경사항을 add + commit(트레일러) + push
argument-hint: "커밋 메시지"
---

변경사항을 커밋하고 푸시하라. 커밋 메시지는: `$ARGUMENTS`

절차:
1. `git status --short` 와 `git branch --show-current` 로 현재 상태와 브랜치를 확인한다.
2. **현재 브랜치가 `main` 이면** 먼저 작업용 브랜치를 만들지 사용자에게 확인한다 (사용자가 main 직접 커밋을 명시적으로 원한 경우는 예외).
3. `git diff` 로 실제 변경 내용을 점검하고, 메시지가 변경을 정확히 설명하는지 확인한다. `$ARGUMENTS` 가 비어 있으면 변경 내용에 맞는 메시지를 직접 작성한다.
4. `git add -A` 후 아래 트레일러를 붙여 커밋한다:

   ```
   <메시지>

   Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
   ```
5. `git push` 한다 (업스트림이 없으면 `git push -u origin <branch>`).
6. 커밋 해시와 푸시 결과를 보고한다.

주의: 셸은 PowerShell 도구를 우선 사용한다. `--no-verify` 등 훅 우회는 사용자가 명시하지 않는 한 쓰지 마라.
