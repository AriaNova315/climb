# 北京攀岩馆地图 — 项目上下文

> 新开对话时请先阅读本文件，了解项目全貌后再开始工作。

---

## 项目概述

**产品**：北京攀岩馆地图网页，帮助攀岩爱好者快速了解全市岩馆分布、类型与基本信息。  
**形态**：Web 应用，桌面优先，后续适配移动端。  
**仓库**：https://github.com/AriaNova315/climb  
**线上地址**：已部署到 Vercel（域名待补充）  
**本地开发**：`npm run dev`（需要先 `nvm use 20`，项目依赖 Node 20+）

---

## 技术栈

| 层次 | 选型 |
|------|------|
| 框架 | Next.js 16 (App Router) + TypeScript |
| 样式 | Tailwind CSS v4 |
| 地图 | react-simple-maps v3 + GeoJSON（北京市行政区划，16 区） |
| 数据 | 本地 JSON 文件（`data/gyms.json`）|
| 部署 | Vercel，GitHub 仓库自动触发 |

---

## 目录结构

```
climb/
├── app/
│   ├── layout.tsx          # 根布局，suppressHydrationWarning 已加（沉浸式翻译插件兼容）
│   ├── page.tsx            # 主页面；ClimbMap 用 dynamic(ssr:false) 引入；MapLegend 在此层渲染
│   └── globals.css
├── components/
│   ├── ClimbMap.tsx        # 地图主组件（ComposableMap + ZoomableGroup + 区块 + 标记 + 弹窗）
│   ├── GymPopup.tsx        # 岩馆信息弹窗（四向自动翻转防溢出）
│   └── MapLegend.tsx       # 图例（fixed 定位，在 page.tsx 渲染，不受地图 overflow-hidden 影响）
├── .env.local              # AMAP_KEY（高德 API Key，不提交 git）
├── data/
│   ├── gyms.json           # 58 家岩馆数据（见下方数据结构说明）
│   ├── gyms-temp.json      # 高德 POI 抓取结果（56 条，合并用，可重新生成）
│   ├── gyms-merged.json    # 自动合并中间产物（apply-merge.js 的输入）
│   ├── merge-report.md     # 合并对比报告（人工批注后驱动 apply-merge.js）
│   ├── gyms_list.md        # 岩馆列表（人工核对用）
│   ├── beijing-districts.json  # 北京市 16 区 GeoJSON（GCJ-02，已修复绕向为 CCW）
│   └── beijing-roads.geojson   # OSM 路网原始数据（motorway+trunk，17MB，仅本地存储）
├── public/
│   └── beijing-roads.json  # 精简后路网数据（motorway+trunk，3MB，运行时懒加载）
├── scripts/
│   ├── update-districts.js # 根据坐标自动更新岩馆所在区（见下方工作流说明）
│   ├── fetch-gyms-amap.js  # 高德 POI 搜索脚本 → 输出 data/gyms-temp.json
│   ├── merge-gyms.js       # 对比现有数据与高德数据 → 输出 gyms-merged.json + merge-report.md
│   └── apply-merge.js      # 按 merge-report.md 人工批注，一次性写入所有变更到 gyms.json
├── types/
│   ├── gym.ts              # 数据类型定义
│   └── declarations.d.ts   # react-simple-maps 模块声明（无官方类型包）
├── PRD.md                  # 产品需求设计说明
└── PROGRESS.md             # 项目进度计划
```

---

## 数据结构（`data/gyms.json`）

共 **58 家**岩馆，当前 `v0.6`。

```json
{
  "_meta": { "version": "0.6", ... },
  "gyms": [
    {
      "id": "gym_001",
      "name": "香蕉",               // 品牌短名（zoom < 3 时地图显示此字段）
      "mapLabel": "香蕉（上地）",    // 完整地图标注（zoom ≥ 3 时显示），统一使用高德官方名称
      "type": "抱石",               // 综合 | 抱石 | 难度（大部分场馆当前为空，待人工填写）
      "district": "海淀",           // 所在区（不含"区"字），由脚本自动计算，勿手动修改
      "status": "open",             // open | coming_soon | renovation（装修中）
      "coordinates": {
        "lat": 40.036985,           // 纬度（GCJ-02）
        "lng": 116.287476,          // 经度（GCJ-02）
        "approx": false             // true 表示坐标为估算，需人工核实
      },
      "address": "",
      "phone": "",
      "businessHours": "",
      "price": { "ticket": "", "coaching": "" },
      "grades": { "boulder": "", "lead": "" },
      "routeSetDifficulty": "",     // 软 | 正常 | 硬 | ""
      "audience": []                // 标签数组，如 ["初学友好", "竞技向"]
    }
  ]
}
```

**弹窗显示规则**：字段为空时不渲染对应行，不占位。

**坐标说明**：所有 58 家坐标均已通过高德 POI API 验证（approx: false）。历史遗留的 4 家 approx 坐标（趣野龙湖、黑攀、极石、趣野房山）已在 v0.6 用高德数据修正。青山攀石 / 北顶奥森 / 日坛攀岩的重复/错误坐标也已在 v0.6 修正。

**`district` 字段由脚本维护，不要手动修改**，见下方工作流。

---

## 修改岩馆坐标后的工作流

修改 `data/gyms.json` 中的坐标后，必须执行以下命令同步更新所在区：

```bash
node scripts/update-districts.js
```

脚本使用 `d3-geo` 的 `geoContains()` 对照 `data/beijing-districts.json` 边界做点在多边形判断，自动将 `district` 字段更新为正确的区名（不含"区"字）。会打印所有发生变更的条目，便于核查。

---

## 高德 POI 数据更新工作流

当需要更新岩馆数据时，按以下步骤操作：

```bash
# 1. 抓取高德 POI 数据（需要 .env.local 中有 AMAP_KEY）
node scripts/fetch-gyms-amap.js
# → 输出 data/gyms-temp.json（约 50+ 条）

# 2. 对比现有数据，生成合并报告
node scripts/merge-gyms.js
# → 输出 data/gyms-merged.json（自动合并结果）
# → 输出 data/merge-report.md（7 类情况的对比表格）

# 3. 人工审核 data/merge-report.md，在表格中用 ****！....**** 标注决策

# 4. 按批注将所有变更一次性写入
node scripts/apply-merge.js
# → 直接覆盖写入 data/gyms.json
```

**注意事项**：
- 高德免费配额：QPS=1，每关键词最多 100 条（4 页 × 25 条）
- 脚本关键词：`['攀岩', '抱石', '岩馆', '攀石', 'climbing', 'boulder']`，过滤 keytag 含"攀岩"的条目
- `adcode` 参数对 `/v3/place/text` 无效，须用 `city=北京` + `citylimit=true`
- apply-merge.js 以 gyms-merged.json 为基础，追加手动修正，最终写入 gyms.json

---

## 颜色规范

| 类型 | 含义 | 颜色 |
|------|------|------|
| 综合馆 | 抱石 + 难度 | 紫色 `#7C3AED` |
| 抱石馆 | 仅抱石 | 绿色 `#16A34A` |
| 难度馆 | 仅难度 | 橙色 `#EA580C` |
| 即将开业 | — | 灰色 `#9CA3AF` |

定线难度 badge 颜色：软=蓝、正常=绿、硬=红。

行政区底色：低饱和暖灰色系（各区有独立色相微差），定义在 `ClimbMap.tsx` 的 `DISTRICT_COLORS`。

---

## 当前地图方案

- **底图**：react-simple-maps + `data/beijing-districts.json`（GeoJSON，SVG 渲染，无需 API Key）
- **路网**：`public/beijing-roads.json`（OSM motorway+trunk，运行时 fetch 懒加载，约 3MB）
  - 来源：overpass-turbo.eu，查询语句：`way["highway"~"motorway|trunk"](39.4,115.4,41.2,117.6)`
  - 更新路网数据：重新下载 → 精简 → 覆盖 `public/beijing-roads.json`（见脚本逻辑）
  - motorway：`rgba(192,168,122,0.4)`，宽 0.9；trunk：`rgba(184,152,106,0.4)`，宽 0.4
- **坐标系**：GCJ-02（与高德地图一致）
- **岩馆标记**：`<Marker>` 组件，经纬度定位，彩色圆点 + 文字标签
- **缩放平移**：`ZoomableGroup`（内置），按钮控制 + 鼠标拖拽/滚轮
- **初始视图**：中心 `[116.31, 39.96]`（岩馆群重心），zoom=1.7（覆盖全部 58 家场馆）
- **标签交互**：始终显示 `gym.name`（短名）；鼠标悬停时在圆点上方显示 `gym.mapLabel`（全称 tooltip）；点击弹出详情弹窗（悬停 tooltip 同时消失）
- **字号**：`6.5 / Math.sqrt(zoom)` SVG 单位（弱自适应：放大时字体缓慢变大，动画无抖动）

**SVG 层级顺序（从下到上）**：
1. 区块底色（Geographies polygon）
2. 路网（Geographies linestring，懒加载）
3. 区名标注（text）
4. 岩馆标记点（Marker circle + text）

**重要技术细节**：
- `ClimbMap` 通过 `dynamic(() => import(...), { ssr: false })` 引入，避免 d3-geo SSR 精度导致的 hydration 不匹配
- GeoJSON 原始数据绕向为 CW（顺时针），d3-geo 要求 CCW（逆时针），已在 `beijing-districts.json` 中修复
- `MapLegend` 必须在 `page.tsx` 层渲染（fixed 定位），不能放在 ClimbMap 内部，否则被 overflow-hidden 裁切
- `strokeOpacity` prop 在 react-simple-maps `Geography` 中不生效，透明度需写入 rgba 颜色值

---

## 重要约定

- Node 版本：**20**（`nvm use 20` 后再运行 npm 命令）
- 浏览器有沉浸式翻译插件，`<html>` 上加了 `suppressHydrationWarning`
- 数据层全部在本地 JSON，无后端，无数据库
- 提交规范：中文 commit message，`git push` 后 Vercel 自动部署
- react-simple-maps 安装需加 `--legacy-peer-deps`（与 React 19 有 peer dep 冲突）
