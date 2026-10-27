# 月下水镜 · 场景素材

工具：内置 image_gen，图片编辑模式。原始 UI 概念已获用户确认，素材只用于当前作品。

- 确认图：`assets/approved-ui-concept.png`
- 最终场景：`assets/moonlit-observatory.png`
- 实际首页截图：`preview.png`
- 实际结果页截图：`preview-reading.png`

## 最终素材提示词

Edit the provided UI concept into a production BACKGROUND ENVIRONMENT PLATE for exactly the same website. Preserve its composition, aspect ratio, gothic observatory arches, crescent moon, fantasy floating castles, indigo violet nebula, gold metal star devices, mist and central ornate bronze reflecting pool with its tilted astrolabe rings. Keep the central pool exactly in the same location, scale and perspective. Required changes: REMOVE ALL typography, ALL Chinese and English text, ALL logos and ALL UI graphic overlays everywhere, including the top title, navigation icons, left brand, bottom form panel, button, footer, and the entire horizontal three-slot gold UI line below the form. Replace these areas seamlessly with the underlying architecture/sky/fog, leaving pleasantly dark clear areas at top center and bottom for real HTML UI to be placed later. REMOVE ALL THREE TAROT CARDS, including the hovering center card and the two cards in the pool. REMOVE the tall water column and droplets associated with the hovering card. Restore the pool to beautiful empty calm dark silver-violet reflective water with delicate concentric ripples and scattered restrained highlights. No card shapes, no textual markings, no logos, no UI anywhere. Preserve the exquisite cinematic visual quality and ornate pool rim detail. This must look like the same approved scene, prepared without text or cards so live 3D cards and HTML interface can be layered above it.

## 实际实现

环境图、薄雾光晕、透明 WebGL、HTML 界面逐层组合。卡牌不是图片中的固定装饰：卡背由 Canvas 绘制，正面为经过核对的经典韦特牌面，抽取、提起、落位与翻面均为实时三维动画。水纹、水珠、光点与水线随动作渲染。场景本身采用固定镜位，建筑和星盘的精细纹饰来自环境美术。

## 2026-10-27 · 已确认的秘境解读页

- `assets/approved-oracle-ui.png`：用户确认的可读性修订 UI 参考图。
- `assets/oracle-sanctuary.png`：使用内置 ImageGen 生成的无字秘境环境背景。
- `assets/oracle-scenes.png`：使用内置 ImageGen 生成的三联氛围插画；分别表达过去、当下与未来，属于牌阵位置装饰，不代替随机抽出的真实塔罗牌面。
- `assets/oracle-filigree.svg`：本地矢量银色拱顶与角花。
- `oracle.css`：结果页独立样式；正文为系统黑体，18–20px，行高 1.9，深色实底，真实 HTML 文本；手机改为单列。

背景生成提示词：Production website background, landscape 16:9, no text, no UI, no cards. Dark fantasy celestial oracle sanctuary, immense antique silver astrolabe high in frame, eclipsed moon upper right, gothic ruins along edges, violet mist, reflective water, lotus flowers and silver floor rings. Keep central 75 percent dark and quiet for content panels. Charcoal and muted violet with pale gold candlelight.

三联插画生成提示词：Production illustration atlas, three equal vertical scenes side by side with no gaps, frames or text. Left: ancient radiant sun, ruined gothic columns and tiny cloaked traveler. Middle: crescent moon over a quiet reflecting pool and arches. Right: eight-point star over a dream lake and distant mountains. Shared painterly celestial fantasy style, silver lavender charcoal palette, bottom fading to dark. Decorative past/present/future scenes, not literal tarot cards.

完整生成规格通过内置 ImageGen 工具调用保存在本次对话。环境图及插画独立生成后复制到工作区；网页没有使用带文字的概念图充当界面。传统牌义展开区域显示 `assets/cards` 内与抽牌结果对应的原图。
