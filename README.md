# わたしの買い物メモ

iPhoneでも迷わず使えることを目指した、端末内完結型の買い物メモです。

## 開発

````bash
npm install
npm run dev
````

## 検証

````bash
npm run lint
npm run build
````

`main` ブランチへpushすると、GitHub ActionsからGitHub Pagesへ公開されます。リポジトリの Settings → Pages → Source で「GitHub Actions」を選択してください。

データはブラウザのローカルストレージに保存されます。別端末との同期や自動バックアップは行いません。
