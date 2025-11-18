## 问题结论
- 现象：/tools 首次通过 Swup（无刷新导航）进入时，统计一直显示 `统计加载中...`；强制刷新后才更新。
- 根因：Swup 页面过渡默认不会重新执行被替换容器中的内联 `<script>`。在当前 `astro.config.mjs` 的 Swup 集成中未显式开启脚本重载，导致 `src/pages/tools.astro:72-136` 的统计初始化脚本在无刷新导航时不执行，从而停留在加载态。首页能正常，是因为首页脚本在首屏已执行；再次返回首页时复用已有状态看起来像“无需刷新”。

## 证据与代码定位
- Swup 集成：`astro.config.mjs:43-58`，使用 `@swup/astro`，容器为 `['main', '#toc']`，但未设置 `reloadScripts`。
- /tools 统计初始化：`src/pages/tools.astro:118-135` 仅在 `DOMContentLoaded` 或首屏立即执行，依赖脚本确实被执行。
- 全局 Umami 工具：`public/js/umami-share.js` 在 `src/layouts/Layout.astro:117` 以 `defer` 引入；若页面脚本未运行会一直显示占位文案。
- 其他统计（首页/文章）也依赖组件内 `<script>` 执行：`src/components/widget/Profile.astro:102-104`、`src/components/PostCard.astro:176-180`、`src/components/PostMeta.astro:136-141`。

## 修复方案
1) 启用 Swup 的脚本重载
- 在 `astro.config.mjs` 的 Swup 集成增加 `reloadScripts: true`，让被替换容器内的内联/外链脚本在每次页面视图上重新执行（等价于启用 `SwupScriptsPlugin`）。

2) 提升组件脚本的鲁棒性（防 Swup 插件差异与竞态）
- 在需要重复初始化的组件脚本中，除 `DOMContentLoaded` 外，额外绑定 `window.swup.hooks.on('page:view', init)`（存在即绑定），确保在无刷新导航后也会执行。
- 将 `/tools` 统计脚本的等待策略复用到首页/文章：轮询 `getUmamiShareData` 可用（≤7s）+ 请求超时（5s）+ 401 清缓存单次重试，避免首访竞态或网络阻塞导致卡在加载态。

## 具体改动
- 修改 `astro.config.mjs`：`swup({ ..., reloadScripts: true })`。
- 更新以下组件脚本的初始化方式：
  - `src/pages/tools.astro:131-135`：增加 Swup `page:view` 绑定。
  - `src/components/widget/Profile.astro:102-104`：改为 `readyState` 检测 + `page:view` 绑定 + 超时与轮询。
  - `src/components/PostCard.astro:176-180` 与 `src/components/PostMeta.astro:136-141`：同上，补充 `page:view` 绑定。

## 验证步骤
- 开发环境无刷新导航到 `/tools/` 与返回首页，观察统计从“加载中”变为实际数值；在网络阻塞/AdBlock 场景下回退为“统计不可用”提示。
- 在本地 `localhost` 下确认 `hostname=eq.blog.ekti.cc` 过滤仍能返回数据（可能为 0，但不应卡在加载）。

请确认是否按上述方案执行。我将据此完成代码修改并进行本地验证。