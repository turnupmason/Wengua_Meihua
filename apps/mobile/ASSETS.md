# 资源与授权清单

## 美术、纹理、声音

| 资源 | 来源 | 授权 |
| --- | --- | --- |
| 三清像（`src/scene/Sanqing.tsx`） | 代码生成的几何造型 | 本项目原创（MIT） |
| 殿堂、香炉、蜡烛、蒲团、石桌（`Hall.tsx`、`StoneTable.tsx`） | 代码生成 | 本项目原创（MIT） |
| 石材、地砖、木纹、烟雾纹理（`materials.ts`） | Canvas 程序生成 | 本项目原创（MIT） |
| 「三清殿」匾额、太极扇面 | Canvas 用设备系统字体绘制 | 本项目原创；不含他人书法 |
| 环境声与钟声（`domain/audio.ts`） | Web Audio 实时合成 | 本项目原创（MIT） |
| 应用图标、启动屏占位（`public/icon.svg`、`resources/`） | 手写 SVG | 本项目原创（MIT） |
| 供品、供桌、烛台、香炉、手部、石案、刻字（`Offerings.tsx`、`Hands.tsx`、`StoneTable.tsx`、`engrave.ts`） | 代码生成 | 本项目原创（MIT） |
| 字体 `public/fonts/wengua-serif-*.woff2` | Noto Serif SC（思源宋体）子集，取自 npm `@expo-google-fonts/noto-serif-sc@0.4.4`，用 `npm run font:subset` 重新生成 | SIL Open Font License 1.1，全文见 `public/fonts/OFL.txt` |

用户提供的三清参考照片只用于造型参考，**未放入应用**（来源与授权未确认）。今后若引入外部模型、照片、音乐，须在此登记出处、作者、许可证与下载地址，不得使用需登录却未实际取得授权的素材。

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
