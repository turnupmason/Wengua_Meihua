# 内容来源与授权范围

本仓库将代码授权与资料来源分开记录。

- `src/`、`scripts/`、`tests/`、`web/`、原创工程说明为本项目新编写内容；原创程序代码采用根目录 MIT 许可。
- `sources/original/grades64.txt`、`meihua-volumes-1-3.txt`、`yijing64.txt` 为用户提供，保留原文件。古籍本体属历史文本；现代白话、整理和编校可能有独立权利。上传行为不证明资料全部公有领域，也不授予第三方白话一个新的 MIT 许可。发行产品时应按自己掌握的来源权利使用或重写现代译文。
- `sources/revised` 与 `data` 为以上资料的结构化及有记录的修订，相应原文与译文的权利状态随来源保留。新补白话为本次基于古典文本所写的表述。
- `sources/references` 保存维基文库古典文本对照快照，附每页标题、固定修订号、规范链接、获取日期与署名信息。历史原文的公有领域地位与网站编校层不同；如使用其受保护的编校/修改层，保留署名并遵循该页标示的 CC BY-SA 4.0 等相应条件。参见 [维基文库版权说明](https://zh.wikisource.org/wiki/Wikisource:版权信息)。
- 外部交叉校对网站只记录链接与必要古典字词证据，没有搬运其整篇现代解读。

统一 source ID、文件 SHA-256 与页修订号见 `data/source-manifest.json`。每次文字订正见 `data/editorial-patches.json`。这些记录支持追溯，不等于完成了所有来源的出版授权核验。

新增 `sources/original/zhouyi64-detailed.docx` 为用户新上传原件，未改写。`sources/extracted` 保留全文提取，`sources/commentary` 是带来源的整理参考，`sources/review` 保存隔离与处置记录；沿用用户资料原有权利状态，不整体改授MIT。`data/details` 与SQLite导入的结构映射为本项目生成，所引用文本仍保留原来源。新写经义说明明确标注，不署名为原稿列出的作者。
