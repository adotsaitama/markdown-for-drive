# Markdown for Drive

React 18 + Vite 5 + TypeScript 5 で構築した Markdown ワークスペースです。
CodeMirror 6 のMarkdown編集、react-markdownのプレビュー、Blue Topazの
ライト/ダークテーマ、編集・分割・表示の3モードを確認できます。

```bash
npm install
cp .env.example .env.local
# .env.local の VITE_GOOGLE_CLIENT_ID にOAuth WebクライアントIDを設定
npm run dev
```

- `/` — ファイル未オープン画面
- `/?state=...` — Google Driveの「アプリで開く」から実ファイルを開く

認証はGoogle Identity Servicesのトークンフローを使い、要求スコープは
`drive.file` と `drive.install` だけです。アクセストークンはメモリのみに保持します。
`drive.file` では他ツールが作成した未オープンのファイルや `images` フォルダが
見えない制約があります。将来フルDriveスコープへ変更する場合は、アクセス範囲拡大を
明示したうえでOAuth同意画面とスコープを再設計してください。

エディタとプレビューパイプラインの検証:

```bash
npm run typecheck
npm run verify:pipeline
npm run verify:drive
```

プロダクションビルドは `npm run build`、ビルド結果の確認は `npm run preview` です。
