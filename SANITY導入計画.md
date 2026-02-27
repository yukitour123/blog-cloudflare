# Sanity CMS 導入計画

現在のMarkdown + posts.jsonベースの記事管理を、Sanity CMSに移行する。
フロントエンド（HTML/CSS/JS）はそのまま維持し、`main.js` からSanityのAPIを呼び出してデータを取得する方式にする。

---

## 現状

| 項目 | 現在の方式 |
|------|-----------|
| 記事管理 | `content/posts.json` + `content/posts/` 内のMarkdownファイル |
| 記事表示 | `main.js` が `fetch()` でposts.jsonとMDファイルを読み込み、marked.jsで変換 |
| フロント | 純粋なHTML/CSS/JS（フレームワークなし） |
| ホスティング | Netlify |

## 移行後

| 項目 | 移行後の方式 |
|------|-------------|
| 記事管理 | Sanity Studio（ブラウザ上のCMS管理画面）で記事を作成・編集 |
| 記事表示 | `main.js` が `fetch()` でSanity Content Lake APIを呼び出してデータ取得 |
| フロント | 純粋なHTML/CSS/JS（変更なし） |
| ホスティング | Netlify（変更なし）+ Sanity Studio（sanity.io上にデプロイ） |

---

## 導入ステップ

### ステップ1: Sanity Studioのセットアップ

リポジトリ内に `studio/` サブディレクトリを作成し、Sanity Studioプロジェクトを構築する。

```
npm create sanity@latest -- --output-path ./studio
```

対話形式で以下を設定する：
- Sanityアカウントの作成 or ログイン
- プロジェクト名の入力
- データセット名（`production`）
- TypeScript: No（シンプルに保つ）

### ステップ2: 記事スキーマの定義

Sanity Studioに「ブログ記事（post）」のスキーマを定義する。

```
studio/schemaTypes/post.js
```

定義するフィールド：

| フィールド | 型 | 説明 |
|-----------|-----|------|
| title | string | 記事タイトル |
| slug | slug | URLスラッグ（タイトルから自動生成） |
| date | date | 公開日 |
| cover | image | カバー画像 |
| body | array of block | 本文（リッチテキスト） |

### ステップ3: フロントエンドの修正

`js/main.js` を修正して、Sanity Content Lake API（GROQ）からデータを取得するようにする。

#### 変更内容

1. **Sanity設定値の追加**（projectId, dataset）
2. **トップページ**：`posts.json` の代わりにSanity APIから記事一覧を取得
3. **記事ページ**：Markdown読み込みの代わりにSanity APIから本文を取得
4. **本文レンダリング**：marked.jsの代わりにSanityのPortable Text（リッチテキスト）をHTMLに変換

Sanity APIはブラウザから直接呼び出せる（CDN経由）：
```
https://<projectId>.api.sanity.io/v2024-01-01/data/query/<dataset>?query=<GROQ>
```

#### post.htmlの変更
- `marked.js` のCDN読み込みを削除（不要になる）
- 代わりにPortable TextをHTMLに変換するロジックを追加

### ステップ4: 不要ファイルの整理

Sanity移行後に不要になるファイル：
- `content/posts.json` → Sanityで管理
- `content/posts/` → Sanityで管理

※ バックアップとして当面残しておくことも可能

### ステップ5: DESIGN.mdの更新

技術構成の表とフォルダ構成を更新して、Sanity CMSの情報を反映する。

---

## フォルダ構成（移行後）

```
brog-traial/
├── index.html              ← トップページ（変更なし）
├── post.html               ← 記事表示ページ（marked.js削除）
├── css/
│   └── style.css           ← スタイル（変更なし）
├── js/
│   └── main.js             ← Sanity API連携に修正
├── content/                ← バックアップとして残す（任意）
├── images/                 ← ローカル画像（カバー画像はSanityで管理）
├── studio/                 ← 【新規】Sanity Studio
│   ├── sanity.config.js
│   ├── sanity.cli.js
│   ├── schemaTypes/
│   │   ├── index.js
│   │   └── post.js         ← ブログ記事スキーマ
│   └── package.json
├── DESIGN.md
└── SANITY導入計画.md        ← この計画書
```

---

## 検証計画

### 自動テスト
- `npm run dev` でSanity Studioのローカル起動を確認

### 手動テスト
1. Sanity Studioで記事を1つ作成する
2. ブラウザでトップページ（`index.html`）を開き、Sanityの記事がカード一覧に表示されることを確認
3. カードをクリックして記事ページ（`post.html`）に遷移し、本文が正しく表示されることを確認
4. いいね機能が引き続き動作することを確認

---

## 前提条件・注意事項

- Sanityの無料プラン（Free tier）で利用可能（個人ブログには十分）
- Sanityアカウントの作成が必要（`npm create sanity@latest` 実行時にブラウザで登録）
- Sanity APIはCDN経由の読み取りは無料。書き込みはStudio経由のみ
- Content LakeのAPIトークンは不要（読み取り専用の公開データセットを使用）
