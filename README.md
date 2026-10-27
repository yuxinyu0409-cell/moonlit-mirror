# 月下水镜 · 隐月 / Moonlit Mirror

**[在线体验](https://moonlit-mirror.vercel.app)** · [GitHub 源码](https://github.com/yuxinyu0409-cell/moonlit-mirror)

月夜水镜中的 3D 塔罗交互作品。通过摄像头张手拨水、握拳捞牌，也可用鼠标完成体验。Three.js 实时渲染水纹、卡牌与出水动画；MediaPipe 在本地 Worker 中识别手势。

## 功能

- 完整韦特78张牌，每轮抽三张且不重复，正逆位独立随机。
- 过去、现在、未来三牌阵，以及逐牌牌义和反思问题。
- 可选 DeepSeek / OpenAI 个性化问题解读，支持失败重试和文本导出。
- 同页面暂离恢复、鼠标替代入口、音效开关、首次手势示范和移动端布局。
- 摄像头画面不上传、不录制。填写的问题和牌阵仅在生成解读时发送至配置的模型服务。

## 本地运行

需要 Python 3.12+，前端无需安装依赖或构建。

```sh
cp .env.example .env
# 在 .env 配置自己的模型服务密钥；不配置也可抽牌并查看基础牌义。
python3 preview-server.py
```

打开 http://127.0.0.1:8877/ 。摄像头需要 localhost 或 HTTPS。

```sh
python3 preview-server.py status
python3 preview-server.py stop
```

## 部署到 Vercel

导入 GitHub 仓库，Framework Preset 选择 Other。仓库中的 `vercel.json` 已配置：

- `python3 scripts/build_public.py` 将前端白名单文件复制到 `public/`。
- `api/reading.py` 提供 Python 服务端函数，复用本地解读逻辑与知识库。
- 解读函数最长运行120秒，项目需允许该时长。

在 Vercel 项目的 Environment Variables 配置：

| 变量 | DeepSeek 示例 |
| --- | --- |
| `READING_PROVIDER` | `deepseek` |
| `DEEPSEEK_MODEL` | `deepseek-v4-flash`（使用你账号支持的模型） |
| `DEEPSEEK_API_KEY` | 自己的服务端密钥 |

使用 OpenAI 时设置 `READING_PROVIDER=openai`、`OPENAI_MODEL` 和 `OPENAI_API_KEY`。
密钥只能放服务端环境变量；不要提交 `.env` 或添加前端公开变量前缀。
环境变量修改后重新部署。

公开站点的访客会使用站长配置的模型额度。上线后可通过 Vercel Firewall
配置限流和支出提醒；代码中的并发上限仅针对单个函数实例。

## 验证

```sh
node gesture.test.mjs
node pool.test.mjs
node spread.test.mjs
node tarot-content.test.mjs
node reading.test.mjs
node sound.test.mjs
python3 -m unittest test_tarot_api.py test_vercel_api.py
python3 scripts/build_public.py
```

自动检查和鼠标模拟不能替代真实摄像头的光照、手型与设备体验测试。

## 技术与许可

原始源码使用 [MIT License](LICENSE)。第三方字体、音效、库和历史牌面遵循各自许可，见
[第三方说明](THIRD-PARTY-NOTICES.md)、[音效署名](AUDIO-SOURCES.md)、
[牌面与牌义来源](TAROT-SOURCES.md)、[场景素材说明](DESIGN-ASSETS.md)。
MediaPipe Worker 基于同版本 `vision_bundle.mjs`，只将 ESM 导出替换成 Worker 全局导出，
以兼容 WASM 的 importScripts 加载。

详细开发记录保存在 [开发历史](docs/DEVELOPMENT-HISTORY.md)。
