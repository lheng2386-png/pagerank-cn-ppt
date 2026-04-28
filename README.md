# PageRank 中文汇报 PPT

这是一个用于课程汇报的中文 PowerPoint 项目，主题为“理解图在社会科学与自然科学中的作用：PageRank 算法机制”。项目包含可编辑的 PPT 成品、生成脚本和预览图。

## 项目内容

- `output/output.pptx`：最终中文 PPT 成品，共 11 页。
- `src/deck.mjs`：使用 `@oai/artifact-tool` 生成 PPT 的脚本。
- `scratch/contact-sheet.png`：所有幻灯片的预览总览图。
- `scratch/quality-report.json`：PPTX 结构检查报告。

## PPT 结构

1. 封面：PageRank 与图思想
2. 搜索引擎为什么需要图
3. Brin 与 Page 原论文背景
4. 链接投票的直觉
5. PageRank 核心公式
6. 算法实现流程
7. 五节点迭代示例
8. 阻尼系数与随机浏览者模型
9. 社会科学与自然科学中的应用
10. 算法边界与课堂结论
11. 五人贡献与参考文献

## 重新生成 PPT

在已安装依赖的环境中运行：

```bash
node src/deck.mjs
```

生成结果会写入 `output/output.pptx`，预览图会写入 `scratch/`。

## 建议的 GitHub 仓库 Description

```text
中文版 PageRank 算法机制课程汇报 PPT，包含可编辑 PPT、生成脚本与预览图。
```

## 参考资料

- Sergey Brin and Lawrence Page, *The Anatomy of a Large-Scale Hypertextual Web Search Engine*.
- Ian Rogers, *The Google PageRank Algorithm and How It Works*.
- 董文慧、熊回香、杜瑾、王妍妍：《基于学者画像的科研合作者推荐研究》，数据分析与知识发现，2022。
