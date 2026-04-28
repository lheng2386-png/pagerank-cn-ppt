# PageRank 中文汇报 PPT

> 中文版 PageRank 算法机制课程汇报项目。  
> 主题：**理解图在社会科学与自然科学中的作用：PageRank 算法机制**。

本仓库用于存放一套可编辑的中文 PowerPoint 汇报材料，内容围绕 PageRank 的提出背景、核心公式、迭代机制、五节点示例、阻尼系数以及图思想在社会科学与自然科学中的应用展开。

---

## 在线展示与下载

- **GitHub Pages 展示页**：`https://lheng2386-png.github.io/pagerank-cn-ppt/`
- **PPT 成品下载**：[`output/output.pptx`](./output/output.pptx)
- **幻灯片总览预览图**：[`scratch/contact-sheet.png`](./scratch/contact-sheet.png)

> 如果展示页暂时无法打开，请先检查仓库 `Settings → Pages` 是否已开启，并确认部署分支为 `main / root`。

---

## 项目内容

```text
pagerank-cn-ppt/
├── README.md                 # 项目说明文档
├── index.html                # GitHub Pages 展示页
├── output/
│   └── output.pptx           # 最终中文 PPT 成品
├── scratch/
│   ├── contact-sheet.png     # 所有幻灯片的预览总览图
│   └── quality-report.json   # PPTX 结构检查报告
└── src/
    └── deck.mjs              # 使用 @oai/artifact-tool 生成 PPT 的脚本
```

---

## PPT 内容结构

本套 PPT 共 **11 页**，主要结构如下：

1. **封面**：PageRank 与图思想
2. **问题引入**：搜索引擎为什么需要图
3. **论文背景**：Brin 与 Page 原论文背景
4. **核心直觉**：链接投票不是简单计数，而是带权推荐
5. **核心公式**：PageRank 公式与符号解释
6. **算法流程**：初始化、传播、归一、收敛
7. **迭代示例**：五节点 PageRank 计算演示
8. **阻尼系数**：随机浏览者模型与收敛问题
9. **应用扩展**：社会科学与自然科学中的图中心性思想
10. **算法边界**：链接操纵、新网页冷启动、相关性不足等问题
11. **小组贡献与参考文献**

---

## 项目亮点

- **中文课堂汇报友好**：内容围绕课程展示设计，解释不堆公式，强调直觉和机制。
- **图思想清晰**：从网页链接出发，引出有向图、入链、出链、中心性等概念。
- **结构完整**：包含背景、公式、流程、示例、应用、局限与参考文献。
- **可编辑可复用**：`output/output.pptx` 可直接下载后用 PowerPoint 或 WPS 修改。
- **脚本化生成**：`src/deck.mjs` 支持后续继续用代码方式重生成 PPT。

---

## 重新生成 PPT

如果需要通过源码重新生成 PPT，请在安装依赖后的环境中运行：

```bash
node src/deck.mjs
```

生成结果会写入：

```text
output/output.pptx
```

预览图和检查报告会写入：

```text
scratch/
```

---

## 质量检查

当前项目包含 `scratch/quality-report.json`，用于记录 PPTX 的结构检查结果。检查内容包括：

- 幻灯片页数
- 媒体资源数量
- 图片资源有效性
- 占位符文本
- 输出目录异常文件
- 警告与失败项

当前版本检查结果显示：

```text
slide_count: 11
warnings: []
failures: []
```

---

## 适用场景

本项目适合用于：

- 课程小组汇报
- 算法机制讲解
- 图论与网络科学入门展示
- PageRank 算法课堂演示
- 个人 GitHub 作品集展示

---

## 后续可优化方向

- 增加每页幻灯片单独截图，提升网页展示效果。
- 增加 PageRank 迭代过程的 Python 代码示例。
- 增加更直观的有向图可视化和迭代动画。
- 将成员姓名、班级、课程名称替换为正式汇报信息。

---

## 参考资料

1. Sergey Brin and Lawrence Page, *The Anatomy of a Large-Scale Hypertextual Web Search Engine*.
2. Ian Rogers, *The Google PageRank Algorithm and How It Works*.
3. 董文慧、熊回香、杜瑾、王妍妍：《基于学者画像的科研合作者推荐研究》，数据分析与知识发现，2022。

---

## 仓库 Description 建议

```text
中文版 PageRank 算法机制课程汇报 PPT，包含可编辑 PPT、生成脚本、预览图与 GitHub Pages 展示页。
```
