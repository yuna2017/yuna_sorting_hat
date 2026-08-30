# YUNA 分部帽：图片素材生成与审核包

> 目的：先生成候选素材供审核，**不覆盖** `src/components/SortingHat.tsx` 或 `src/assets/dept/*.webp`。  
> 当前风格参考：[`reference/current-department-style-sheet.jpg`](./reference/current-department-style-sheet.jpg)。

## 1. 现状判断

- 当前分部帽是 `SortingHat.tsx` 中的简化 SVG。轮廓能识别，但布料、折痕、表情和光影较平，和四张高完成度 Q 版部门立绘不在同一精细度。
- 当前四张部门图为约 `597×592`、带透明通道的 WebP 贴纸立绘。它们已经具备不错的角色辨识度，优先级低于主帽子。
- 建议先只生成 **3 个主帽方向 + 3 个表情状态**。选定主帽后，再决定是否统一重绘四部门立绘。

## 2. 通用输出要求（每条提示词都保留）

```text
Production asset for a mobile-first interactive web app. Original design, not based on or resembling any existing movie prop, franchise character, school crest, or copyrighted sorting hat. Actual transparent background with clean alpha edges. No text, no letters, no watermark, no logo, no border frame, no mockup, no UI screenshot. The subject must remain clearly readable at 128 px. Centered composition, generous safe padding, nothing cropped. No baked rectangular background. No excessive bloom. No photorealistic human or human body.
```

推荐规格：

- 主帽：`2048×2048 PNG RGBA`，最终可压成 WebP。
- 同一主帽的状态变体：`1024×1024 PNG RGBA`，必须保持完全相同的画布、缩放和锚点。
- 部门立绘：`1536×1536 PNG RGBA`，角色主体占画布约 78%～84%。
- 生成器若支持“参考图 / image reference”，上传四部门风格图；若支持“参考强度”，先用中等强度，避免直接复制已有角色。

## 3. 主帽候选（先生成这 3 张）

### HAT-A：高级魔法绘本风（最推荐）

适合当前深蓝夜空、羊皮纸色文字与金色分隔线。比现有 SVG 精致，但不会过分幼态。

```text
Create an original sentient fantasy guild-selection hat as a premium storybook game asset. A very wide, low, slightly asymmetric brim; a tall soft felt cone leaning toward the viewer's right; the long tip curls and droops downward. The silhouette must unmistakably read as a hat, never as a boot, pipe, hood, or wizard sleeve. Warm aged brown felt with layered fibers, hand-stitched seams, subtle worn edges, tasteful antique-gold thread accents, and soft painterly shading. A clever, warm, slightly mysterious face is formed only by natural fabric folds: two expressive brow folds and one restrained smiling mouth crease, no eyeballs, no human teeth. Three-quarter front view, centered and almost symmetrical in visual weight. Premium hand-painted fantasy storybook illustration, refined but approachable, slightly chibi proportions, crisp silhouette, subtle parchment-colored rim light, harmonious with a dark navy starfield and gold typography. Readable at 128 px, medium detail concentrated around the face and brim. Actual transparent background, clean alpha, no ground plane and no rectangular backdrop.

Production asset for a mobile-first interactive web app. Original design, not based on or resembling any existing movie prop, franchise character, school crest, or copyrighted sorting hat. No text, no letters, no watermark, no logo, no border frame, no mockup, no UI screenshot. Centered composition with 16% transparent padding on every side, nothing cropped. No excessive bloom, no floating props, no character wearing the hat.
```

**审核点**：帽檐必须宽；尖端向右下垂；128px 下仍能看清脸；棕金色不应黑成一团。

---

### HAT-B：Q 版透明贴纸风（最贴近四部门立绘）

如果希望主帽与现有四张角色图像同一套游戏素材，可优先尝试这一版。

```text
Design an original cute chibi sentient guild-selection hat as a polished anime game sticker asset. Extremely clear hat silhouette: broad oval brim spanning almost the full width, soft conical crown leaning right, curled drooping tip. Rich chocolate-brown and caramel felt, layered cel shading, small fabric texture highlights, warm golden stitching and tiny star-shaped stitch details used very sparingly. Friendly intelligent expression formed by folded cloth only, with arched brow creases and a small confident smile. Add a clean warm-ivory die-cut sticker outline of consistent thickness, matching a high-quality chibi technology club mascot illustration. Dynamic but stable three-quarter view, no body and no wearer. Cute without becoming babyish, premium mobile game key art, crisp edges, saturated highlights balanced for a very dark navy background. The entire hat should fill about 76% of a square canvas and remain readable at 96–144 px.

Actual transparent background with clean alpha edges. Original design, not based on or resembling any existing movie prop, franchise character, school crest, or copyrighted sorting hat. No text, no letters, no watermark, no logo, no background stars, no floating devices, no broom, no wand, no face with eyeballs, no open human mouth, no thick black outer box. Nothing cropped.
```

**审核点**：白色刀模描边不能太粗；不能像儿童表情包；褶皱脸要自然。

---

### HAT-C：YUNA 魔法 × 技术风（品牌化方向）

适合把“网络与信息协会”融入帽子，但要克制，避免变成赛博朋克头盔。

```text
Create an original sentient fantasy guild-selection hat that subtly blends old magic with modern computing craft. Keep the primary material as aged brown felt: a very broad low brim, a soft cone leaning right, and a curled tip drooping toward the right. The face is made only from natural folds and has a thoughtful, perceptive expression. Integrate extremely subtle embroidered circuit traces and four tiny gem-like stitch nodes around the hatband in muted blue, cyan, amber, and rose, with antique-gold thread connecting them. The technology motifs must look hand-embroidered into cloth, not like neon hardware, armor, a helmet, or a cyberpunk device. Premium fantasy storybook game illustration, controlled painterly texture, clean silhouette, warm rim light, elegant and mysterious, designed for a dark navy mobile interface. No extra props. Actual transparent background and clean alpha.

Original design, not based on or resembling any existing movie prop, franchise character, school crest, or copyrighted sorting hat. No readable symbols, no text, no letters, no YUNA wordmark, no watermark, no logo, no UI, no background. Centered with generous safe padding and nothing cropped. Readable at 128 px.
```

**审核点**：四色节点只作近看彩蛋；缩小时仍首先看见“帽子”，而不是电路板。

## 4. 选中主帽后的状态变体

下面三条应使用选中的主帽作为**高一致性参考图 / edit input**。每次只改表情或光效，不重新设计帽子。

### HAT-IDLE：封面 / 开场

```text
Using the reference hat, preserve exactly the same hat design, silhouette, materials, colors, camera angle, canvas size, scale, center position, brim width, curled tip, outline style, and transparent alpha framing. Create the calm idle state only: relaxed brow folds, a quiet knowing half-smile, neutral warm lighting. No magical glow and no new objects. This must align pixel-for-pixel in framing with the other state variants.
```

### HAT-THINKING：分部仪式思考中

```text
Using the reference hat, preserve exactly the same design, silhouette, materials, camera angle, canvas, scale, position, and transparent framing. Change only the cloth-fold expression to a concentrated thinking state: brow folds gently drawn inward, mouth crease slightly pursed, a faint warm-gold glow visible only deep inside two or three fabric creases. Keep the glow subtle and fully contained within the alpha silhouette. No particles, no background, no extra props. Exact framing consistency is mandatory.
```

### HAT-DECIDED：宣判瞬间

```text
Using the reference hat, preserve exactly the same design, silhouette, materials, camera angle, canvas, scale, position, and transparent framing. Change only the expression and internal light: confident raised brow folds and a clear decisive smile crease, with a restrained antique-gold inner glow emerging along the face folds and lower crown. No open human mouth, no teeth, no external aura baked into the image, no particles, no background. Exact framing consistency is mandatory.
```

> CSS 已经负责浮动、呼吸光和部门色 glow；图片里不要烘焙大范围外发光，否则叠加后会糊。

## 5. 四部门立绘统一重绘（可选，主帽通过后再做）

### 统一风格锁（四张都放在提示词最前面）

```text
Create one asset in a unified four-character series for a university technology association. Premium polished chibi anime game illustration, approximately 2.8-head-tall proportions, seated or lightly floating full-body pose, clear expressive face, clean layered cel shading with soft painterly highlights, consistent upper-left key light, consistent warm-white die-cut sticker outline, compact near-square composition, detailed but readable at 180 px. Keep all important props close to the character so the silhouette remains compact. Actual transparent background with clean alpha. No text, no letters, no watermark, no real company logos, no trademarked software mascots, no UI rectangle behind the entire composition. Original character design.
```

### DEV：开发部

```text
A curious and focused young developer mascot in a navy, white, and electric-blue tech jacket, typing on a slim laptop. Surrounding compact props: one friendly small abstract helper robot, a code window with non-readable colored lines, a modular cube, a cloud-service symbol, and a stylized database cylinder. The pose should convey building an idea from zero into a working product. Blue is dominant, cyan only as a highlight. Avoid hoodie stereotypes, Matrix rain, readable code, giant screens, and clutter.
```

### SEC：网安部

```text
A calm, sharp-eyed cybersecurity mascot in a black, white, and cyan technical outfit, investigating a laptop. Compact props: a translucent shield with a simple keyhole, magnifying lens, abstract encrypted packet shapes, and a tiny mysterious digital familiar that is not a copyrighted mascot. The pose should communicate curiosity, analysis, defense, and puzzle solving rather than criminal hacking. Cyan is dominant with deep navy shadows. No skulls, weapons, red hacker hoodie, anonymous mask, readable exploit code, or threatening imagery.
```

### OPS：运维部

```text
A reliable and cheerful operations mascot in white, charcoal, and amber technical clothing, seated beside a compact server rack while checking system health. Compact props: stacked server modules, globe and network orbit, Wi-Fi signal, terminal window with non-readable status bars, cable connector, and a small original penguin-like helper creature that does not copy any existing software mascot. The pose should communicate stability, maintenance, service, and automation. Amber and warm yellow are dominant. No real Docker or Linux logos, no brand marks, no tangled cable mess, no disaster scene.
```

### PR：组宣部

```text
An energetic and organized communications mascot in white, charcoal, rose-pink, and small golden accents, holding a megaphone in one hand and a compact camera in the other. Surrounding props: content calendar card, event badge, abstract social-media reaction shapes without logos, a small camera drone, pen, and neatly clipped planning notes. The pose should communicate visual storytelling, event coordination, community building, and confident public expression. Rose-pink is dominant. No readable social platform logos, no influencer glamour pose, no excessive hearts, no beauty cosmetics theme.
```

## 6. 其他推荐素材

### AUX-01：帽子背后的魔法判定环

用途：封面或 reveal 阶段放在帽子后面，由 CSS 缓慢旋转。建议单独 PNG，方便控制透明度。

```text
An elegant original circular magical decision seal for a university technology guild, designed as a subtle background ornament behind a small central hat. Thin antique-gold ink lines, four evenly distributed tiny accent nodes in blue, cyan, amber, and rose, delicate constellations and abstract circuit-like geometry blended into an old astronomical diagram. Large empty transparent center, balanced radial symmetry, refined and minimal, no readable runes, no letters, no crest, no franchise symbols. Actual transparent background, square canvas, clean alpha, lines remain visible but unobtrusive on dark navy. No glow baked into the image.
```

规格：`2048×2048 PNG RGBA`。审核时重点看缩到 160px 后会不会变成一团噪点。

### AUX-02：分享海报无字背景

```text
Vertical 9:16 premium fantasy-tech background for a university association personality quiz result card. Deep midnight navy to indigo gradient, sparse tiny stars, subtle paper grain, a restrained antique-gold celestial arc near the upper third, and very faint four-color atmospheric glows: blue, cyan, amber, and rose near the edges. Keep the central upper area clean for a character illustration, the middle area clean for a large Chinese department name, and the lower third clean for score data and a QR code. Elegant, readable, low-noise, no text, no letters, no logos, no people, no hat, no UI controls, no watermark. 1080 by 1920 composition.
```

### AUX-03：四部门小徽记（如确实需要位图）

更推荐后续直接画 SVG；若先用生成器探索风格，可用：

```text
A set of four separate original miniature guild emblems in one consistent style, each centered in its own quadrant with ample separation: development represented by a modular cube and code bracket motif; cybersecurity by a shield and keyhole; operations by a server tower and orbit line; communications by a megaphone and camera aperture. Antique-gold base linework with one accent color per emblem: blue, cyan, amber, rose. Elegant fantasy-tech engraving, simple silhouette readable at 32 px, no letters, no words, no school crests, no existing brand icons, transparent background.
```

> 正式落地时应把四个徽记拆成独立文件，并人工校正线宽；不要直接把整张四宫格当 UI 图标。

## 7. 建议的生成顺序

1. 生成 `hat-a-storybook.png`、`hat-b-chibi-sticker.png`、`hat-c-yuna-tech.png`。
2. 在手机宽度预览中按 144px 展示三张图，不先看 2048px 大图细节。
3. 选定一个方向后，用其作为参考生成 `idle / thinking / decided`。
4. 三状态通过后，再生成魔法判定环。
5. 只有当四部门立绘确实显得不统一时，才重绘四张；否则保留现有素材，降低角色漂移风险。
6. 所有通过审核的文件先放在 `review-assets/generated/`，确认后再由代码替换原素材。

## 8. 审核清单

- [ ] 第一眼一定是帽子，不像靴子、兜帽、管道或山峰。
- [ ] 帽檐宽度接近主体最大宽度，尖端向右下方卷曲。
- [ ] 透明通道真实，边缘没有灰白底或脏边。
- [ ] 在 96px、128px、176px 三档仍可识别表情。
- [ ] 没有文字乱码、假 logo、影视道具复刻或学院徽章。
- [ ] 图片外发光很少，能交给 CSS 的部门色 glow 处理。
- [ ] 三个状态的画布、主体比例和中心锚点完全一致，不会切换时跳动。
- [ ] 暗色背景上轮廓清楚，棕色阴影没有死黑。
- [ ] WebP 压缩后没有明显透明边缘色带。

## 9. 审核后的预期替换方式

主帽通过后，建议不要把 PNG 硬塞进现有 SVG，而是：

- 新增 `src/assets/hat/hat-idle.webp`
- 新增 `src/assets/hat/hat-thinking.webp`
- 新增 `src/assets/hat/hat-decided.webp`
- 将 `SortingHat.tsx` 改为按 `state` 渲染图片，并保留现有 `className`、`glow` 和无障碍文本接口
- 封面、开场使用 `idle`；仪式阶段分别用 `thinking`、`decided`

在你确认具体候选图之前，不进行上述替换。
