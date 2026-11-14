# The Allure of the Abject Body — 紫黑色 V3 部署与换图

## 一、这次改了什么

- Pool 现在是 **Intriguing / Pleasant / Beautiful / Disturbing**，可对同一张图多选；不再有 Uncanny。
- UI 是黑色 `#000000`、深灰 `#1a1a1a`、紫色 `#4e2f88`。
- 更少文字，手机上直接点击 Pool 即可分类；电脑上也能拖动图片到 Pool。
- 仍支持上传照片、仅研究者可见的 Constructed / Lived 分组、统计与 CSV。

## 二、更新你现在的 GitHub / Vercel

1. 解压 ZIP。**上传里面的文件**到 GitHub 根目录，不要再包一层文件夹。
2. 根目录应直接看到 `index.html`、`style.css`、`app.js`、`config.js`、`vercel.json`、`assets/`、`supabase/`。
3. 如果你之前已经在 `config.js` 填了 Supabase URL 和公钥，**先复制保存**，升级时不要把它覆盖成空白。新 ZIP 里的 `config.js` 仍是空模板。
4. 最省事的方式：在现有 V2 仓库把 `app.js`、`style.css`、`index.html` 更新成 V3；同时上传新版 SQL 文件。这样能保留原有已配置的 `config.js`。
5. Vercel：Framework Preset = `Other`；Root Directory = `./`（前提是 `index.html` 在根目录）；Build/Output Command 留空。GitHub commit 后通常会自动重新部署。
6. 新版本加载后，打开网站时应看到紫黑色页面和新的四个 pool。

## 三、Supabase（非常重要）

- **如果从来没有建过 Supabase 数据库**：在 Supabase → SQL Editor 运行 `supabase/setup.sql`。
- **如果之前已经运行过 V2 的 setup.sql**：只运行 `supabase/UPDATE_EXISTING_DATABASE.sql`。否则提交时会出现 `Unknown pool`。
- 原来的试验回答不会被改动。旧版的 `Interesting` 和 `Uncanny` 不会被偷偷转换为新标签（这会改变研究数据）。请先备份旧 CSV，然后在 Researcher → Responses 清除测试回答，再开始新的正式问卷。
- 在 `config.js` 中只填写 Supabase URL 和 **publishable/anon** 公钥。不要使用 service_role 或 secret key。

## 四、怎么替换照片

连接好 Supabase 后：

1. 打开已部署的网页，滑到最下面点 **Researcher**，用已授权的 Supabase 研究者邮箱和密码登录。
2. 进入 **Images** → **Add images**。
3. 选择隐藏分组：`Constructed`（人为造型、AI、假体、妆容等）、`Lived`（真实身体差异）、或 `Unclassified`。参与者看不到分组。
4. 一次选择多张 JPG / PNG / WebP 上传；自动压缩至适合手机浏览的大小。
5. 旧图片在 Image library 里点 **Archive / hide**，然后上传新照片。不要覆盖原图，否则历史数据会误对应新图片。
6. 图片新增/归档**不需要重新部署 Vercel**；后续进入问卷的人会加载新版图片集。

如果网页显示 `Preview mode`，说明还没成功连上 Supabase，演示图片是本地素材，**答卷不会集中保存在研究者后台**。

## 五、如何看统计

- **Researcher → Overview**：每张图及 Constructed/Lived 两组的四种 pool 选择率。
- **Responses → Export responses CSV**：下载全部匿名回答，方便做图和进行研究。
- 不要在正式收集过程中改 pool 含义、图片分类和研究样本；及时备份 CSV。

## 六、方法说明

- 四个 pool 是**非互斥**标签。Intriguing 侧重吸引注意；Pleasant 侧重积极感受；Beautiful 侧重审美判断；Disturbing 包含 uncanny/unsettling 等不安反应。
- 演示图片仅用于测试交互，不具备经过核实的研究分类和授权，请用有来源且适合课程研究的图片替换。
- 不要根据外貌推断疾病、残障、intersex 身份；真实身体差异的分类应有可靠来源和恰当授权。
- 图片组差异同时受摄影、模特姿态和语境影响，因此本问卷是探索性研究，不能用来证明单一因果。
