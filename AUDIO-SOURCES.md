# 魔法音效参考与素材

## 设计参考

- BOOM Library / A Sound Effect, **Magic UI**：以真实材质为底，叠加有共鸣的魔法音色；说明中列出弓奏/敲击水晶杯、颂钵、玻璃琴、风铃等来源。https://www.asoundeffect.com/sound-library/magic-ui/
- JaggedStone, **Magic Spell SFX**，CC0：作者说明其素材使用音符序列与滤波处理。只作研究参考，未使用该包音频。https://opengameart.org/content/magic-spell-sfx

本项目采用偏安静的“水面 + 闪光余韵”方向。移除原有正弦提示音和上下滑音：移动、聚焦、开关静音；仅捞牌、落位、揭晓有声，默认关闭。

## 已使用的授权素材

**Shimmer glitter magic / shimmer_1**

- 作者：The Berklee College of Music；由 qubodup 提交至 OpenGameArt。
- 来源：https://opengameart.org/content/shimmer-glitter-magic
- 原文件：https://opengameart.org/sites/default/files/shimmer_1.flac
- 许可：Creative Commons Attribution 3.0。https://creativecommons.org/licenses/by/3.0/
- 本地原件：assets/audio/shimmer-original.flac。
- 修改：降速移调、柔化起音、高频衰减、低频清理、混合及短立体声延迟尾音。没有暗示原作者认可本项目。

**6 Short water splashes / water_splash-02**

- 作者：ezwa；由 qubodup 剪辑并提交至 OpenGameArt。
- 来源：https://opengameart.org/content/6-short-water-splashes
- 原压缩包：https://opengameart.org/sites/default/files/ezwa-water_splash.7z
- 许可：CC0。https://creativecommons.org/publicdomain/zero/1.0/
- 本地原件：assets/audio/water-original.flac。
- 修改：降速、滤波、淡入淡出、音量控制与分层混合。

## 派生文件

- moon-rise.wav：水声与柔化后的闪光层，2.45 秒。
- moon-settle.wav：轻落水声与短余韵，2.05 秒。
- moon-reveal.wav：同一录音派生的三层和声音色，2.9 秒。

所有派生文件均保留上述 CC BY 3.0 素材署名义务，本说明同时作为派生音效的署名文件。网页交互指南内也列出作者、来源、许可和修改方式。

音频经过峰值和淡入淡出检查；听感属于主观体验，页面右上角提供“试听”，不把频谱检查当作人工试听结论。

## 拨水选牌（2026-10-27）

新增 water-original.flac（ezwa，CC0）短水声作为拨动反馈；按掌心或鼠标在水面的实际速度控制音量和轻微播放速率，低于移动阈值不触发，每280毫秒最多触发一次。片段独立淡入淡出，停手、捞起、暂停或离开页面时快速淡出，不混入闪光音乐层，遵循全局静音。

### 拨水声音修订

停用反复触发、降速的短水花声。使用同一CC0真实录音，去除低频咕噜段的能量，将柔化片段交叠成6秒连续水声；移动仅平滑控制音量，不改变音高、不周期重触发。整体降低响度，停手快速淡出。

### 更换拨水声源（第三版）

撤下高通滤波与循环录音水声。新增本项目原创 moon-ripple.wav：392Hz为主、588Hz与784Hz为轻微余韵的圆润短共鸣，柔化起音与尾音，不含随机噪声、连续底噪或尖锐高频层。移动时每850毫秒最多响一次，速度只改变音量；不循环、不改变音高，停止动作时淡出。此文件为程序合成的轻水纹提示音，不宣称为真实流水录音。原有捞牌、落位与揭晓录音不变。

## 真实手拨水声（现用）

- 原作：Swirl in the water，Joseph SARDIN，编号0192。
- 页面：https://bigsoundbank.com/swirl-in-the-water-s0192.html
- 官方WAV：https://bigsoundbank.com/UPLOAD/bwf-en/0192.wav
- CC0；录音说明为手在浴缸水中搅动，单声道，Rode NT5，44100Hz/16bit。
- 本地原件：hand-water-original.wav。
- hand-stir-1/2/3.wav：分别截取1.1、6.5、12.7秒处1.4秒，保留原始音高；只做40ms淡入淡出和峰值音量控制。持续拨动时依次播放不同录音段，单段播放中不反复打断、不循环、不混入琴音或噪声。
- hand-lift.wav：截取11秒处1.3秒的真实出水声，替换捞起时的音乐混合声。
- 已停用：moon-ripple.wav合成音、旧短水花反复触发及高通水声循环。旧文件保留为历史素材，不再接入拨水流程。

### 真实拨水声轻柔化

现用hand-stir-1/2/3-soft.wav及hand-lift-soft.wav，均从未修改原录音重新剪辑：以轻柔低通处理混合20%原声，减少清脆水滴的高频起音；首尾65ms淡化，音量略减。不改变音高，不增加合成声层。前一版原音剪辑保留以便比较。
