# 牌面、牌义与使用范围

本作品采用 Rider–Waite–Smith（韦特）体系的 **78 张牌**：22 张大阿尔卡那及四组各 14 张的小阿尔卡那，包含正逆位。每轮无放回抽取三张，位置依次为过去、现在、未来可能的发展方向。

## 牌面图像

Pamela Colman Smith 绘制的经典图像，取自 Project Gutenberg 的 *The Illustrated Key to the Tarot: The Veil of Divination*（1918 年版本）。原图完整呈现在自制的卡牌边框中，没有改变原图角色和象征。

- 图录与作者、插画者信息：https://www.gutenberg.org/ebooks/43548
- 原书：https://www.gutenberg.org/cache/epub/43548/pg43548-images.html
- 图像目录：https://www.gutenberg.org/cache/epub/43548/images/
- 本地资源对应：00 为 i_082.jpg（愚者），01–20 对应 i_042.jpg 至 i_080.jpg（每张递增 2 页），21 为 i_084.jpg（世界）。
- 原图属于公开领域版本；Gutenberg 标注 public domain in the USA。插画者 Pamela Colman Smith 生于 1878 年，卒于 1951 年。原书正文中的历史版权声明不等同于现今版权状态。

## 牌义

传统象征依据上述原版图录的图像与说明。中文牌义为本项目编写，结合现代常见正逆位解释，交叉参考：

- https://biddytarot.com/tarot-card-meanings/major-arcana/
- https://labyrinthos.co/blogs/tarot-card-meanings-list/tagged/major-arcana

牌义并非跨流派唯一标准。原版书的部分占断用语与现代解释不同，本项目明确采用现代常见韦特正逆位解释，不把全部正位解释成好结果，也不把死神解释为现实死亡。保留恶魔的依附与束缚、高塔的突变与崩塌、月亮的幻象与不安等原本主题。

力量为 VIII，正义为 XI。恋人包含价值选择，不仅涉及爱情。愚者编号 0；世界编号 XXI。

每张牌数据包含：牌名、英文名、罗马编号、常见正逆位牌义、关键词、传统图像象征、三种位置对应的解释、反思问题与原图路径。反思问题与牌阵综合段落是本项目的引导文案，不冒充原典。

## 验证

`node tarot-content.test.mjs` 核对数量、编号、位置解释、图片存在及关键牌义主题。

## 问题解读知识库

`tarot-knowledge.json` 为当前 `cards.js` 的结构化镜像，逐牌保留传统图像象征、项目中文现代牌义及三种牌位解释。问题解读服务只按合法牌 ID 检索三条记录作为生成依据；自动化测试检查两份数据一致，修改牌义时须同步更新。

关系、工作学习、选择和自我成长等情境指引由本项目编写，用于把牌义联系到提问，不是原书引文。AI 生成的个性化解释属于基于牌义的反思性推演，不是原典内容或对事实的证明。

2026-10-27 核对了 Gutenberg 图录的标题、作者和插画者元数据。该版本署名 L. W. de Laurence，插画为 Pamela Colman Smith；不将其误标为 Waite 本人署名的版本。

接口实现参考官方文档：https://developers.openai.com/api/docs/guides/structured-outputs


## 78 张牌与逆位的编写说明

新增小牌图片仍取自同一 1918 年图录，按英文牌名从原书 HTML 中逐一匹配，不用相同图片替代不同牌。`assets/cards/manifest.json` 记录小牌 ID、英文名与原图文件名。ID 22–35 为权杖、36–49 为圣杯、50–63 为宝剑、64–77 为星币；各组顺序为首牌至十、侍从、骑士、王后、国王。

`deck-expansion.js` 内的中文牌义为项目整理，依据牌面可见象征和现代韦特解释习惯，不是原典译文。逆位没有跨流派唯一标准；本项目逐牌提供受阻、过度、内化、延迟或松动恢复等解释，结合问题和邻牌判断适用方向。牌位基础说明与反思问题也是项目文案。

正逆位由程序独立等概率生成，这是本作品选择的抽取规则。每轮不重复抽牌，不强制出现逆位；连续正位依然可能发生。
