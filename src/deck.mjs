import {
  Presentation,
  PresentationFile,
  row,
  column,
  grid,
  panel,
  text,
  shape,
  rule,
  fill,
  hug,
  fixed,
  wrap,
  grow,
  fr,
  auto,
} from "@oai/artifact-tool";
import { writeFile } from "node:fs/promises";

const W = 1920;
const H = 1080;

const theme = {
  ink: "#17242A",
  muted: "#52636B",
  soft: "#EDF3F1",
  line: "#C8D9D4",
  teal: "#166B6B",
  teal2: "#1E8A7A",
  coral: "#E86F51",
  gold: "#D8A034",
  blue: "#2F6E9E",
  white: "#FFFFFF",
  paleGold: "#F7E7BE",
  paleCoral: "#F9D6CC",
  paleBlue: "#DCEAF4",
};

const font = "Microsoft YaHei";
const mono = "Menlo";

const deck = Presentation.create({
  slideSize: { width: W, height: H },
});

function t(value, options = {}) {
  return text(value, {
    width: options.width ?? fill,
    height: options.height ?? hug,
    name: options.name,
    columnSpan: options.columnSpan,
    rowSpan: options.rowSpan,
    style: {
      fontFace: options.fontFace ?? font,
      fontSize: options.size ?? 28,
      color: options.color ?? theme.ink,
      bold: options.bold ?? false,
      italic: options.italic ?? false,
      lineSpacing: options.lineSpacing ?? 1.15,
      alignment: options.align,
      ...options.style,
    },
  });
}

function eyebrow(value, color = theme.teal) {
  return t(value, {
    width: wrap(720),
    size: 22,
    bold: true,
    color,
    style: { characterSpacing: 1.5 },
  });
}

function titleBlock(title, subtitle, accent = theme.teal) {
  return column({ width: fill, height: hug, gap: 18 }, [
    eyebrow("PageRank 算法机制", accent),
    t(title, { name: "slide-title", size: 54, bold: true, width: wrap(1280), lineSpacing: 1.08 }),
    subtitle
      ? t(subtitle, { name: "subtitle", size: 25, color: theme.muted, width: wrap(1280), lineSpacing: 1.2 })
      : null,
  ].filter(Boolean));
}

function slideRoot(slide, children, bg = theme.white) {
  slide.background.fill = bg;
  slide.compose(
    column(
      {
        name: "slide-root",
        width: fill,
        height: fill,
        padding: { x: 88, y: 66 },
        gap: 32,
      },
      children,
    ),
    { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 },
  );
}

function chip(label, color) {
  return panel(
    {
      width: hug,
      height: hug,
      padding: { x: 18, y: 9 },
      fill: color,
      borderRadius: "rounded-full",
    },
    t(label, { width: hug, size: 19, bold: true, color: theme.white }),
  );
}

function miniCard(label, body, color) {
  return panel(
    {
      width: fill,
      height: hug,
      padding: { x: 26, y: 24 },
      fill: "#FFFFFF",
      line: { color: theme.line, width: 1.2 },
      borderRadius: 12,
    },
    column({ width: fill, height: fill, gap: 14 }, [
      t(label, { size: 23, bold: true, color }),
      t(body, { size: 23, color: theme.ink, lineSpacing: 1.25 }),
    ]),
  );
}

function addCover() {
  const slide = deck.slides.add();
  slide.background.fill = "#F6F1E7";
  slide.compose(
    grid(
      {
        width: fill,
        height: fill,
        padding: { x: 96, y: 78 },
        columns: [fr(0.92), fr(1.08)],
        rows: [auto, fr(1), auto],
        columnGap: 56,
      },
      [
        row({ columnSpan: 2, width: fill, height: hug, justify: "between", align: "center" }, [
          eyebrow("第五组 · 理解图在社会科学与自然科学中的作用（3）", theme.teal),
          t("中文汇报 PPT", { width: hug, size: 21, color: theme.muted, bold: true }),
        ]),
        column({ width: fill, height: fill, justify: "center", gap: 28 }, [
          t("PageRank：让链接投票", { size: 82, bold: true, width: fill, lineSpacing: 1.02 }),
          t("从网页排序到网络科学的中心性思想", {
            size: 34,
            width: wrap(720),
            color: theme.muted,
            lineSpacing: 1.18,
          }),
          row({ width: fill, height: hug, gap: 12 }, [
            chip("论文阅读", theme.teal),
            chip("算法机制", theme.coral),
            chip("五人分工", theme.blue),
          ]),
        ]),
        panel(
          {
            width: fill,
            height: fill,
            padding: { x: 42, y: 38 },
            fill: "#17242A",
            borderRadius: 24,
          },
          column({ width: fill, height: fill, gap: 26, justify: "center" }, [
            row({ width: fill, height: hug, gap: 24, align: "center" }, [
              node("A", theme.coral, 84),
              t("→", { width: fixed(42), size: 42, color: "#CFE5E0", align: "center" }),
              node("B", theme.gold, 84),
              t("→", { width: fixed(42), size: 42, color: "#CFE5E0", align: "center" }),
              node("C", theme.teal2, 84),
            ]),
            row({ width: fill, height: hug, gap: 24, align: "center", justify: "center" }, [
              node("D", theme.blue, 84),
              t("↗", { width: fixed(42), size: 42, color: "#CFE5E0", align: "center" }),
              node("E", "#8D5A97", 84),
              t("↘", { width: fixed(42), size: 42, color: "#CFE5E0", align: "center" }),
              node("A", theme.coral, 84),
            ]),
            t("一个网页的重要性，来自指向它的网页本身有多重要。", {
              size: 34,
              bold: true,
              color: theme.white,
              width: wrap(720),
              lineSpacing: 1.18,
            }),
          ]),
        ),
        t("汇报目标：说明 PageRank 的实现机制，并连接社会科学与自然科学中的图思想。", {
          columnSpan: 2,
          size: 22,
          color: theme.muted,
          width: fill,
        }),
      ],
    ),
    { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 },
  );
}

function node(label, color, size = 68) {
  return panel(
    {
      width: fixed(size),
      height: fixed(size),
      fill: color,
      borderRadius: "rounded-full",
      padding: 0,
      align: "center",
      justify: "center",
    },
    t(label, { width: fill, size: Math.round(size * 0.38), bold: true, color: theme.white, align: "center" }),
  );
}

function addContext() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("为什么搜索引擎需要“图”的思想？", "互联网不是孤立网页的列表，而是由超链接组成的巨大有向图。"),
    grid({ width: fill, height: grow(1), columns: [fr(1), fr(1), fr(1)], columnGap: 28 }, [
      miniCard("问题", "关键词匹配只能知道“相关”，很难判断哪个网页更值得排在前面。", theme.coral),
      miniCard("图视角", "网页是节点，链接是边；一个链接可以看作一次“推荐”或“投票”。", theme.teal),
      miniCard("核心判断", "被许多高质量网页指向的网页，应当获得更高排名。", theme.blue),
    ]),
    panel(
      { width: fill, height: hug, padding: { x: 30, y: 22 }, fill: theme.soft, borderRadius: 14 },
      t("PageRank 的贡献：把“谁指向谁”转化为可迭代计算的排名分数。", {
        size: 30,
        bold: true,
        color: theme.teal,
      }),
    ),
  ]);
}

function addPaper() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("论文背景：从 BackRub 到 Google", "Brin 与 Page 在早期论文中把网页链接结构作为搜索质量的关键证据。", theme.blue),
    grid({ width: fill, height: grow(1), columns: [fr(0.85), fr(1.15)], columnGap: 44 }, [
      column({ width: fill, height: fill, gap: 18 }, [
        t("The Anatomy of a Large-Scale Hypertextual Web Search Engine", {
          size: 35,
          bold: true,
          width: fill,
          lineSpacing: 1.12,
        }),
        rule({ width: fixed(180), stroke: theme.blue, weight: 5 }),
        t("两位作者将网页集合建模为链接图，并提出用链接结构衡量网页重要性。PageRank 不是只数入链数量，而是让高排名网页的链接拥有更大权重。", {
          size: 27,
          color: theme.muted,
          lineSpacing: 1.28,
        }),
      ]),
      column({ width: fill, height: fill, gap: 22 }, [
        processStep("1", "抓取网页与链接", "形成大规模有向图"),
        processStep("2", "计算网页重要性", "用 PageRank 迭代分数"),
        processStep("3", "结合文本匹配", "把相关性与权威性一起用于排序"),
      ]),
    ]),
    t("参考：Brin & Page 原论文；Ian Rogers 的 PageRank 讲义。", { size: 16, color: theme.muted }),
  ]);
}

function processStep(num, label, body) {
  return row({ width: fill, height: hug, gap: 20, align: "center" }, [
    node(num, theme.gold, 58),
    column({ width: fill, height: hug, gap: 6 }, [
      t(label, { size: 28, bold: true }),
      t(body, { size: 22, color: theme.muted }),
    ]),
  ]);
}

function addIntuition() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("直觉：链接不是一人一票，而是“带权投票”", "PageRank 把网页之间的引用关系变成声誉流动。", theme.coral),
    grid({ width: fill, height: grow(1), columns: [fr(1.05), fr(0.95)], columnGap: 40 }, [
      panel(
        { width: fill, height: fill, padding: { x: 34, y: 32 }, fill: "#17242A", borderRadius: 20 },
        column({ width: fill, height: fill, gap: 28, justify: "center" }, [
          row({ width: fill, height: hug, gap: 20, align: "center", justify: "center" }, [
            node("A", theme.coral, 76),
            t("→", { width: fixed(40), size: 38, color: theme.white, align: "center" }),
            node("C", theme.teal2, 96),
            t("←", { width: fixed(40), size: 38, color: theme.white, align: "center" }),
            node("B", theme.gold, 76),
          ]),
          row({ width: fill, height: hug, gap: 20, align: "center", justify: "center" }, [
            node("D", theme.blue, 76),
            t("→", { width: fixed(40), size: 38, color: theme.white, align: "center" }),
            node("C", theme.teal2, 96),
            t("←", { width: fixed(40), size: 38, color: theme.white, align: "center" }),
            node("E", "#8D5A97", 76),
          ]),
          t("C 的高分来自多个节点的推荐，尤其来自本身也重要的节点。", {
            width: wrap(720),
            size: 28,
            bold: true,
            color: theme.white,
            align: "center",
          }),
        ]),
      ),
      column({ width: fill, height: fill, justify: "center", gap: 24 }, [
        bullet("入链越多，通常越可能重要。"),
        bullet("来自高质量网页的链接，比普通链接贡献更大。"),
        bullet("一个网页的分数会平均分给它指向的所有网页。"),
        bullet("排名是全图共同决定的，需要反复迭代直到稳定。"),
      ]),
    ]),
  ]);
}

function bullet(value) {
  return row({ width: fill, height: hug, gap: 16, align: "start" }, [
    shape({ width: fixed(14), height: fixed(14), fill: theme.coral, borderRadius: "rounded-full" }),
    t(value, { size: 29, lineSpacing: 1.25, color: theme.ink }),
  ]);
}

function addFormula() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("核心公式：每个网页接收来自入链网页的分数", "阻尼系数 d 通常取 0.85，用来模拟用户继续点击链接的概率。"),
    panel(
      { width: fill, height: fixed(230), padding: { x: 44, y: 34 }, fill: "#17242A", borderRadius: 22 },
      column({ width: fill, height: fill, gap: 16, justify: "center" }, [
        t("PR(A) = (1 - d) / N + d × Σ PR(Tᵢ) / C(Tᵢ)", {
          fontFace: mono,
          size: 48,
          bold: true,
          color: theme.white,
          align: "center",
        }),
        t("Tᵢ 表示所有指向 A 的网页；C(Tᵢ) 表示 Tᵢ 的出链数量；N 是网页总数。", {
          size: 25,
          color: "#CFE5E0",
          align: "center",
        }),
      ]),
    ),
    grid({ width: fill, height: grow(1), columns: [fr(1), fr(1), fr(1)], columnGap: 28 }, [
      miniCard("(1-d)/N", "随机跳转项：即使没有入链，也保留基础访问概率。", theme.gold),
      miniCard("d × Σ", "沿链接传播项：从指向它的网页接收分数。", theme.teal),
      miniCard("/ C(Tᵢ)", "分摊机制：出链越多，每条链接分到的权重越小。", theme.coral),
    ]),
  ]);
}

function addWorkflow() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("实现机制：初始化、传播、归一、收敛", "算法本质上是在链接图上反复更新每个节点的概率分布。", theme.teal2),
    column({ width: fill, height: grow(1), gap: 22, justify: "center" }, [
      flowRow("01", "建立链接矩阵", "把每个网页的出链转成转移概率。", theme.blue),
      flowArrow(),
      flowRow("02", "初始化 PR 值", "通常每个网页从 1/N 开始。", theme.gold),
      flowArrow(),
      flowRow("03", "按公式迭代更新", "每轮从入链网页接收被分摊的权重。", theme.coral),
      flowArrow(),
      flowRow("04", "判断是否收敛", "当相邻两轮变化足够小，输出最终排名。", theme.teal),
    ]),
  ]);
}

function flowRow(num, label, body, color) {
  return row({ width: fill, height: hug, gap: 24, align: "center" }, [
    panel(
      { width: fixed(96), height: fixed(62), fill: color, borderRadius: 12, align: "center", justify: "center" },
      t(num, { width: fill, size: 27, bold: true, color: theme.white, align: "center" }),
    ),
    column({ width: fill, height: hug, gap: 4 }, [
      t(label, { size: 31, bold: true, lineSpacing: 1.05 }),
      t(body, { size: 23, color: theme.muted, lineSpacing: 1.05 }),
    ]),
  ]);
}

function flowArrow() {
  return t("↓", { width: fixed(96), size: 27, color: theme.muted, align: "center" });
}

function addExample() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("小例子：五个节点的排名会逐轮拉开", "下面用简化网络演示迭代结果，重点看“高质量入链”如何改变分数。", theme.gold),
    grid({ width: fill, height: grow(1), columns: [fr(0.82), fr(1.18)], columnGap: 42 }, [
      column({ width: fill, height: fill, gap: 20, justify: "center" }, [
        row({ width: fill, height: hug, gap: 18, align: "center", justify: "center" }, [
          node("A", theme.coral, 72), t("→", { width: fixed(35), size: 34, color: theme.muted, align: "center" }), node("C", theme.teal2, 92),
        ]),
        row({ width: fill, height: hug, gap: 18, align: "center", justify: "center" }, [
          node("B", theme.gold, 72), t("→", { width: fixed(35), size: 34, color: theme.muted, align: "center" }), node("C", theme.teal2, 92), t("→", { width: fixed(35), size: 34, color: theme.muted, align: "center" }), node("A", theme.coral, 72),
        ]),
        row({ width: fill, height: hug, gap: 18, align: "center", justify: "center" }, [
          node("D", theme.blue, 72), t("→", { width: fixed(35), size: 34, color: theme.muted, align: "center" }), node("C", theme.teal2, 92), t("←", { width: fixed(35), size: 34, color: theme.muted, align: "center" }), node("E", "#8D5A97", 72),
        ]),
      ]),
      authoredTable([
        ["轮次", "A", "B", "C", "D", "E"],
        ["初始", "0.20", "0.20", "0.20", "0.20", "0.20"],
        ["第1轮", "0.20", "0.03", "0.54", "0.03", "0.20"],
        ["第2轮", "0.49", "0.03", "0.33", "0.03", "0.12"],
        ["稳定后", "0.38", "0.04", "0.42", "0.04", "0.12"],
      ]),
    ]),
    t("注：数值用于课堂演示，展示迭代趋势；实际计算取决于完整链接矩阵与收敛阈值。", { size: 16, color: theme.muted }),
  ]);
}

function authoredTable(rows) {
  return column(
    {
      width: fill,
      height: fill,
      gap: 0,
      justify: "center",
    },
    rows.map((cells, r) =>
      grid(
        {
          width: fill,
          height: fixed(r === 0 ? 58 : 72),
          columns: [fr(1.1), fr(1), fr(1), fr(1), fr(1), fr(1)],
          columnGap: 0,
        },
        cells.map((cell, c) =>
          panel(
            {
              width: fill,
              height: fill,
              padding: { x: 14, y: 12 },
              fill: r === 0 ? theme.teal : c === 3 && r > 0 ? "#E7F4EF" : "#FFFFFF",
              line: { color: theme.line, width: 1 },
              align: "center",
              justify: "center",
            },
            t(cell, {
              width: fill,
              size: r === 0 ? 22 : 24,
              bold: r === 0 || (c === 3 && r > 0),
              color: r === 0 ? theme.white : theme.ink,
              align: "center",
            }),
          ),
        ),
      ),
    ),
  );
}

function addDamping() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("阻尼系数解决两个现实问题", "真实用户不会永远沿链接点击，也可能突然输入新网址或重新搜索。", theme.coral),
    grid({ width: fill, height: grow(1), columns: [fr(1), fr(1)], columnGap: 42 }, [
      column({ width: fill, height: fill, gap: 24, justify: "center" }, [
        miniCard("死胡同节点", "没有出链的网页会让分数无法继续传播，需要把它的概率重新分配到全图。", theme.coral),
        miniCard("小圈套", "几个网页互相链接可能困住随机浏览者，随机跳转项让概率能够跳出局部循环。", theme.gold),
      ]),
      panel(
        { width: fill, height: fill, padding: { x: 36, y: 34 }, fill: "#17242A", borderRadius: 22 },
        column({ width: fill, height: fill, justify: "center", gap: 20 }, [
          t("随机浏览者模型", { size: 40, bold: true, color: theme.white }),
          t("以 d 的概率继续点击当前网页上的链接；以 1-d 的概率随机跳到任意网页。", {
            size: 31,
            color: "#CFE5E0",
            lineSpacing: 1.25,
          }),
          rule({ width: fixed(200), stroke: theme.coral, weight: 5 }),
          t("这让排名计算既反映链接结构，又能在数学上稳定收敛。", {
            size: 28,
            bold: true,
            color: theme.white,
          }),
        ]),
      ),
    ]),
  ]);
}

function addApplications() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("为什么它能跨越社会科学与自然科学？", "PageRank 体现的是图中心性：节点的重要性由网络关系共同塑造。", theme.blue),
    grid({ width: fill, height: grow(1), columns: [fr(1), fr(1), fr(1)], columnGap: 28 }, [
      miniCard("社会科学", "用于识别社交网络中的关键人物、信息扩散核心、合作网络中的影响者。", theme.coral),
      miniCard("自然科学", "用于分析蛋白质相互作用、生态网络、神经连接等复杂系统中的关键节点。", theme.teal),
      miniCard("知识发现", "用于论文引用、学者合作、推荐系统等任务，把“关系”转化为排序。", theme.blue),
    ]),
    panel(
      { width: fill, height: hug, padding: { x: 30, y: 22 }, fill: "#F6F1E7", borderRadius: 14 },
      t("启示：图不是只画关系，而是提供一种计算机制，让关系产生可比较的量化结果。", {
        size: 30,
        bold: true,
        color: theme.ink,
      }),
    ),
  ]);
}

function addLimitations() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("理解 PageRank，也要理解它的边界", "算法强大，但并不等于“真理排名”。", theme.teal),
    grid({ width: fill, height: grow(1), columns: [fr(0.95), fr(1.05)], columnGap: 42 }, [
      column({ width: fill, height: fill, justify: "center", gap: 22 }, [
        bullet("链接可以被操纵，例如链接农场和互相刷链接。"),
        bullet("新网页天然缺少入链，可能被低估。"),
        bullet("重要性不等于相关性，搜索仍需要结合文本和用户意图。"),
      ]),
      panel(
        { width: fill, height: fill, padding: { x: 42, y: 36 }, fill: theme.soft, borderRadius: 22 },
        column({ width: fill, height: fill, justify: "center", gap: 18 }, [
          t("课堂结论", { size: 35, bold: true, color: theme.teal }),
          t("PageRank 的真正价值，不只在搜索排序，而在于它展示了图结构如何被转化为可计算、可解释、可迁移的知识。", {
            size: 38,
            bold: true,
            lineSpacing: 1.18,
          }),
        ]),
      ),
    ]),
  ]);
}

function addContrib() {
  const slide = deck.slides.add();
  slideRoot(slide, [
    titleBlock("小组贡献与参考资料", "五位成员各自负责一个环节，最后合并为完整汇报。", theme.gold),
    grid({ width: fill, height: grow(1), columns: [fr(1.05), fr(0.95)], columnGap: 42 }, [
      column({ width: fill, height: fill, gap: 12 }, [
        contrib("成员1", "论文背景与 PageRank 问题提出"),
        contrib("成员2", "核心公式、符号解释与阻尼系数"),
        contrib("成员3", "五节点示例、迭代过程与表格"),
        contrib("成员4", "社会科学与自然科学应用扩展"),
        contrib("成员5", "PPT 统稿、版式设计与现场讲解"),
      ]),
      panel(
        { width: fill, height: fill, padding: { x: 30, y: 28 }, fill: "#17242A", borderRadius: 22 },
        column({ width: fill, height: fill, gap: 17 }, [
          t("参考文献", { size: 32, bold: true, color: theme.white }),
          sourceLine("[1] Sergey Brin and Lawrence Page, The Anatomy of a Large-Scale Hypertextual Web Search Engine."),
          sourceLine("[2] Ian Rogers, The Google PageRank Algorithm and How It Works."),
          sourceLine("[3] 董文慧、熊回香、杜瑾、王妍妍，基于学者画像的科研合作者推荐研究，数据分析与知识发现，2022。"),
        ]),
      ),
    ]),
  ]);
}

function contrib(name, body) {
  return row({ width: fill, height: hug, gap: 18, align: "center" }, [
    panel(
      { width: fixed(92), height: fixed(52), fill: theme.gold, borderRadius: 12, align: "center", justify: "center" },
      t(name, { width: fill, size: 21, bold: true, color: theme.white, align: "center" }),
    ),
    t(body, { size: 25, color: theme.ink }),
  ]);
}

function sourceLine(value) {
  return t(value, { size: 21, color: "#CFE5E0", lineSpacing: 1.22 });
}

addCover();
addContext();
addPaper();
addIntuition();
addFormula();
addWorkflow();
addExample();
addDamping();
addApplications();
addLimitations();
addContrib();

const pptxBlob = await PresentationFile.exportPptx(deck);
await pptxBlob.save("output/output.pptx");

for (let i = 0; i < deck.slides.count; i += 1) {
  const slide = deck.slides.getItem(i);
  const png = await slide.export({ format: "png" });
  await writeFile(`scratch/slide-${String(i + 1).padStart(2, "0")}.png`, Buffer.from(await png.arrayBuffer()));
}
