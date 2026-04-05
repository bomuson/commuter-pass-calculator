# commuter-pass-calculator

通勤の **1か月定期券** と **通常切符（往復）** のどちらが得かを試算する、シンプルな静的Webツールです。
公開サイト：
http://bomuson.main.jp/commuter-pass-calculator/

## 機能
- 定期券料金と通常切符の往復料金を入力
- 購入日から1か月のカレンダーを生成
- 日本の祝日を表示
- 出勤日をチェックして損得を試算
- 料金の初期値をブラウザに保存
- 初回起動時チュートリアル表示

## GitHub Pages 向け構成
このリポジトリは **`main` ブランチの `/docs` フォルダ** を公開元にする想定です。

```text
commuter-pass-calculator/
├── README.md
└── docs/
    ├── index.html
    ├── styles.css
    ├── app.js
    └── .nojekyll
```

## GitHub Pages 公開手順
1. GitHub で新しいリポジトリ `commuter-pass-calculator` を作成
2. このフォルダ一式をアップロード
3. GitHub の **Settings → Pages** を開く
4. **Build and deployment** で **Deploy from a branch** を選択
5. Branch を **`main`**、Folder を **`/docs`** に設定
6. 保存後、数分待つ
7. 公開URLにアクセス

GitHub Pages では、公開元フォルダの最上位に `index.html` が必要です。公開元はブランチのルートか `/docs` を選べます。 citeturn423722search0turn423722search1

## ローカル確認
`docs/index.html` をブラウザで開いて動作確認できます。

## 補足
- このツールは静的HTML/CSS/JavaScriptのみで動作します
- データ保存にはブラウザの `localStorage` を使っています
- 同じ端末・同じブラウザで保存内容が維持されます
