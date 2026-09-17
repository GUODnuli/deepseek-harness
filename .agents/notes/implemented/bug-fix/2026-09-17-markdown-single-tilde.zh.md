# Agent Note: Markdown 渲染器禁用单波浪号删除线

Status: implemented

[English](2026-09-17-markdown-single-tilde.md) | 中文

## Problem

会话 Markdown 渲染器把 `~内容~`（单波浪号对）解析为 `<del>`；两个相邻片段如 `~100~ ~200~` 会稳定渲染成删除线。GitHub.com 的 GFM 只认 `~~内容~~`，同样的文本在 GitHub 上显示正常、在 DSH 中却出错。

## Decision

`packages/client/ui-primitives/src/markdown/parse.ts` 的两条 mdast 管线现在以 `gfm({ singleTilde: false })` 构造 micromark GFM 扩展。此前管线调用 `gfm()` 未传选项，继承了库默认值 `singleTilde: true`。`markdown.client.spec.tsx` 新增回归用例：渲染 `区间 ~100~ 到 ~200~ 之间，~~真的删除~~ 才是删除线`，断言只有双波浪号片段产生一个 `<del>`，两个单波浪号片段保持原文。

## Alternatives considered

保留库默认值等于维持一种 GitHub.com 自身都不渲染的方言，会继续坑到用波浪号表示约数的用户。转义说明无法帮助已经踩坑的用户。后置把 `<del>` 还原成文本是在和分词器对抗，而不是配置它。

## Measurement

`pnpm vitest run packages/client/ui-primitives/tests/markdown.client.spec.tsx` 33/33 通过，含新增回归用例。
