# Markdown for Drive

React 18 + Vite 5 + TypeScript 5 で構築した Markdown ワークスペースです。
CodeMirror 6 のMarkdown編集、react-markdownのプレビュー、Blue Topazの
ライト/ダークテーマ、編集・分割・表示の3モードを確認できます。

```bash
npm install
npm run dev
```

- `/` — ファイル未オープン画面
- `/editor` — モック文書ワークスペース

エディタとプレビューパイプラインの検証:

```bash
npm run typecheck
npm run verify:pipeline
```

プロダクションビルドは `npm run build`、ビルド結果の確認は `npm run preview` です。
