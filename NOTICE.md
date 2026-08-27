# 오픈소스 고지 (Third-party notices)

모여셈은 아래 오픈소스 자산을 사용합니다.

## Fluent Emoji — 앱 아이콘 · 스토어 그래픽 이미지

Microsoft Fluent Emoji의 3D 에셋을 사용해 만들었습니다.

- 출처: https://github.com/microsoft/fluentui-emoji
- 라이선스: MIT

아래 이미지는 전부 그 3D 에셋을 **크기만 바꿔 다시 구운 것**입니다. 모양을 새로 그리지 않았습니다.

| 쓰인 곳 | 원본 파일 | 이 저장소의 사본 |
|---|---|---|
| 웹·앱 아이콘 (`icon-192.png`, `icon-512.png`, `icon-maskable.png`) | assets/Luggage/3D/luggage_3d.png | `icon-source-luggage_3d.png` |
| 안드로이드 런처 아이콘 (`moa-app` 저장소의 `android/app/src/main/res/mipmap-*/ic_launcher*.png`) | assets/Luggage/3D/luggage_3d.png | 〃 |
| Play Console 앱 아이콘 512×512 (`moa-app` 저장소의 `store/app-icon-512.png`) | assets/Luggage/3D/luggage_3d.png | 〃 |
| Play 스토어 그래픽 이미지 1024×500 (`moa-app` 저장소의 `store/00-feature-graphic.png`) | assets/Money with wings/3D/money_with_wings_3d.png | `icon-source-money_with_wings_3d.png` |

### 사본이 진짜 원본과 같은지 확인하는 법 (2026-08-13 검증)

원본 사본 두 개는 공식 저장소의 파일과 **바이트 단위로 같습니다.** 다음 두 줄의 출력이 서로 같으면 그대로입니다.

```
git hash-object icon-source-luggage_3d.png
gh api repos/microsoft/fluentui-emoji/contents/assets/Luggage/3D/luggage_3d.png --jq .sha
#  → 01815c36b6786b2421cf8cb1b5d88c8a1fa7d59f (31,625 바이트)

git hash-object icon-source-money_with_wings_3d.png
gh api "repos/microsoft/fluentui-emoji/contents/assets/Money%20with%20wings/3D/money_with_wings_3d.png" --jq .sha
#  → ee3b4f0a2a78d70593fcd3f188713f3c4fc844aa (35,163 바이트)
```

⚠️ 아이콘을 다시 구울 때는 **반드시 이 사본에서** 굽습니다. 윈도우 이모지 패널(Win+;)에서 가져오면
Segoe UI Emoji(마이크로소프트 독점 폰트)가 되어 EULA 위반입니다 — 겉모습이 비슷해도 출처가 다릅니다.

```
    MIT License

    Copyright (c) Microsoft Corporation.

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in all
    copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
    SOFTWARE.
```
