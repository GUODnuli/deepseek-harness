# Agent Note: Markdown renderer disables single-tilde strikethrough

Status: implemented

English | [中文](2026-09-17-markdown-single-tilde.zh.md)

## Problem

The chat Markdown renderer parses `~content~` (single tilde pairs) as `<del>`; two nearby spans such as `~100~ ~200~` reliably render struck through. GitHub.com GFM only treats `~~content~~` as strikethrough, so text that renders fine there is misrendered in DSH.

## Decision

Both mdast arms in `packages/client/ui-primitives/src/markdown/parse.ts` now construct the micromark GFM extension as `gfm({ singleTilde: false })`. The pipeline previously called `gfm()` with no options, inheriting the library default `singleTilde: true`. A regression test in `markdown.client.spec.tsx` renders `区间 ~100~ 到 ~200~ 之间，~~真的删除~~ 才是删除线` and asserts exactly one `<del>` for the double-tilde span while the single-tilde spans stay literal.

## Alternatives considered

Keeping the library default would preserve a non-GitHub dialect that GitHub.com itself does not render, continuing to surprise users who write tildes as approximations. Escaping documentation does not help users who already hit this in normal prose. Post-processing `<del>` elements back to text would fight the tokenizer instead of configuring it.

## Measurement

`pnpm vitest run packages/client/ui-primitives/tests/markdown.client.spec.tsx` passes 33/33, including the new regression case.
