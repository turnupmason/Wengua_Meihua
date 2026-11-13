# 资源与授权清单

## 美术、纹理、声音

| 资源 | 来源 | 授权 |
| --- | --- | --- |
| 三清像画作 `public/art/sanqing-yuanshi.webp`、`sanqing-lingbao.webp`、`sanqing-laojun.webp`、`sanqing.webp`（三维殿中的神像立牌见 `src/scene/shrineLayout.ts`，二维仪式见 `src/ui/Ritual2D.tsx`，启屏背景见 `src/ui/Splash.tsx`）；原图在仓库 `docs/art-reference/` | 用户提供的画作，抠图与压缩为 WebP（`scripts/deity-cut/`） | **待用户确认**：作者、来源与可用于上架应用的授权。上架前须在此写明 |
| 入殿与殿内画面 `public/art/entrance/plate-courtyard.webp`、`plate-threshold.webp`、`plate-hall.webp`、`incense-wisp.webp`、`moon-and-mountain-matte.webp`；藏经阁、问事录画面 `place-library.webp`、`place-records.webp` | 用户提供的美术包 `docs/art-reference/sanqing-entrance`（关键帧由内置 ImageGen 生成，见其 IMAGEGEN_PROMPTS.md）与用户发来的书架、书案图；匾上「三清殿」由 `scripts/build-entrance-plates.py` 用 Ma Shan Zheng（OFL）写入 | **待用户确认**：可用于上架应用的授权 |
| 神座、光环、底座（`src/scene/Sanqing.tsx`） | 代码生成的几何造型 | 本项目原创（MIT） |
| 殿堂、香炉、蜡烛、蒲团、石桌（`Hall.tsx`、`StoneTable.tsx`） | 代码生成 | 本项目原创（MIT） |
| 石材、地砖、木纹、烟雾纹理（`materials.ts`） | Canvas 程序生成 | 本项目原创（MIT） |
| 「三清殿」匾额、太极扇面 | Canvas 用设备系统字体绘制 | 本项目原创；不含他人书法 |
| 环境声与钟声（`domain/audio.ts`） | Web Audio 实时合成 | 本项目原创（MIT） |
| 应用图标、启动屏（`public/icon.svg`、`resources/icon.svg`、`resources/splash.svg`） | 手写 SVG，**仍是占位**；尚未生成原生图标与启动屏（Xcode `Assets.xcassets`、Android `res/`） | 本项目原创（MIT） |
| 供品、供桌、烛台、香炉、手部、石案、刻字（`Offerings.tsx`、`Hands.tsx`、`StoneTable.tsx`、`engrave.ts`） | 代码生成 | 本项目原创（MIT） |
| 字体 `public/fonts/wengua-serif-*.woff2` | Noto Serif SC（思源宋体）子集，取自 npm `@expo-google-fonts/noto-serif-sc@0.4.4`，用 `npm run font:subset` 重新生成 | SIL Open Font License 1.1，全文见 `public/fonts/OFL.txt` |
| 毛笔字体 `public/fonts/wengua-brush.woff2`（标题、匾额、「欢迎入殿」） | Ma Shan Zheng（马善政）子集，取自 npm `@expo-google-fonts/ma-shan-zheng@0.4.3`，同一脚本生成 | SIL Open Font License 1.1，全文见 `public/fonts/OFL-MaShanZheng.txt` |

用户提供的三清画作已放入应用（见上表），其授权仍待用户确认。今后若引入外部模型、照片、音乐，须在此登记出处、作者、许可证与下载地址，不得使用需登录却未实际取得授权的素材。

## 运行时依赖

| 包 | 版本 | 许可证 |
| --- | --- | --- |
| react / react-dom | 19.2.9 | MIT |
| three | 0.186.1 | MIT |
| @react-three/fiber | 9.8.2 | MIT |
| lunar-javascript | 1.7.7 | MIT |
| @capacitor/core、android、ios | 7.6.10 | MIT |

开发依赖（vite、vitest、typescript、jsdom、testing-library、@capacitor/cli）均为 MIT 或 Apache-2.0，版本见 `package.json` 与 `package-lock.json`。

## 文本资料

经文、白话、详解、整理注解来自仓库根目录资料包，其来源与授权范围见根目录 `SOURCES.md`。
