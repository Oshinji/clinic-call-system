# 院内呼び出しシステム（clinic-call-system）

診察室のPCで整理番号を入力すると、待合室のモニターに番号が大きく表示され、音声で「整理番号、7番のかた、第2診察室へ、おはいりください」と2回読み上げます。

- 費用：ゼロ（Firebase無料枠・GitHub Pages無料枠）
- 必要なもの：ネットにつながる待合室モニター（テレビ可）、診察室のPC、Googleアカウント、GitHubアカウント
- 作った人：茨城の整形外科クリニックで週4日働く理学療法士（コードはClaudeに書いてもらいました）

## まず動きを見たい人へ（設定不要のデモ）

https://oshinji.github.io/clinic-call-system/demo.html

左に待合室モニター、右に診察室の操作パネルを並べたデモです。Firebaseの設定なしで、番号の表示と音声読み上げまで体験できます（データはブラウザの中だけでやり取りしています）。

## ファイル

| ファイル | 役割 |
|---|---|
| `call.html` | 診察室PCで開く操作パネル。`?room=1`（第1診察室）`?room=2`（第2診察室） |
| `call-monitor.html` | 待合室モニターで開く本番用ページ。普段は `base.html` を表示し、呼び出し時だけ番号を重ねる |
| `call-test.html` | テスト用モニター。本番に影響せず動作確認できる |
| `base.html` | 待機画面（院名・時計）。院名は中の「○○クリニック」を書き換える |
| `firebase-config.js` | Firebaseの接続設定。**自分のプロジェクトの値に書き換える（必須）** |
| `audio/` | 呼び出し音声（整理番号1〜300・診察室1〜2ぶん、生成済み） |
| `tools/generate_call_audio.py` | 音声を作り直すときのスクリプト（301番以上が必要なとき等） |
| `demo.html` / `demo-firebase.js` | デモ用。`?demo=1` を付けたときだけFirebaseの代わりに動く。本番には影響しない |

## 一番かんたんな導入方法：Claudeに全部頼む

Claude Code（またはブラウザ版Claude）に、次の文をそのまま送ってください。

```
https://github.com/（あなたのアカウント）/clinic-call-system をうちのクリニック用に設定して、
待合室のモニターと診察室のPCで動く状態にしたい。README.md を読んで、必要な作業を全部やって。
自分（人間）がやらないといけない作業（アカウント作成、ブラウザでボタンを押す、パスワードを決める等）が
出てきたら、その都度「いま何をすればいいか」を1つずつ教えて。
```

Claudeが自分で進められない作業は次の6つです。ここだけは自分で操作します。

| # | 自分でやること | 目安 |
|---|---|---|
| 1 | GitHubのアカウントを作り、このリポジトリを「Fork」する（右上のボタン） | 5分 |
| 2 | Googleアカウントで https://console.firebase.google.com を開き、プロジェクトを1つ作る（名前は自由） | 5分 |
| 3 | Firebaseの画面で「Realtime Database」を作成（場所は asia-southeast1）と「Authentication」でメール／パスワードを有効化。スタッフ用のメールとパスワードを1組決めて登録 | 10分 |
| 4 | Firebaseの「ルール」画面に、Claudeが出したルールを貼って「公開」を押す | 2分 |
| 5 | Firebaseの「プロジェクトの設定」からWebアプリの設定値（apiKey等）をコピーしてClaudeに渡す（Claudeが `firebase-config.js` に入れます） | 5分 |
| 6 | GitHubのリポジトリ設定で「Pages」を有効にする（Claudeが場所を案内します） | 3分 |

公開されたURLを、待合室のモニターと診察室のPCで開けば完成です。

## 手で進めたい人向けの手順

1. このリポジトリをForkする
2. Firebaseでプロジェクトを作成 → Realtime Database（asia-southeast1）を有効化
3. Authentication → メール／パスワードを有効化 → スタッフ用アカウントを1つ追加
4. Realtime Databaseの「ルール」に以下を貼って公開

```json
{
  "rules": {
    ".read": false,
    ".write": false,
    "call": {
      "current": { ".read": true,  ".write": "auth != null" },
      "log":     { ".read": "auth != null", ".write": "auth != null" },
      "test":    { ".read": true,  ".write": "auth != null" }
    }
  }
}
```

5. プロジェクトの設定 → マイアプリ → Webアプリを追加 → 表示される `apiKey / authDomain / databaseURL / projectId` を `firebase-config.js` に貼る
6. GitHubのリポジトリ → Settings → Pages → Branch を `main` にして保存。数分後に `https://（アカウント名）.github.io/clinic-call-system/` で公開される
7. `base.html` の「○○クリニック」を自院名に書き換える（任意）

## 使い方

- **待合室モニター**：`https://…/clinic-call-system/call-monitor.html` を開く。朝1回「音声を有効にする」ボタンを押す（テレビのリモコンなら決定ボタン）
- **診察室PC**：`https://…/clinic-call-system/call.html?room=1` を開いてログイン。整理番号を入れて「呼び出し」
- **テスト**：両方のURLの末尾に `&test=1` を付ける（`call-monitor.html?test=1` / `call.html?room=1&test=1`）。本番モニターには何も出ない
- **待機画面を差し替える**：同じフォルダに自院の案内ページを置き、`call-monitor.html?base=ページ名.html` で指定

## 運用上の注意（実際に運用して分かったこと）

- **テレビのブラウザは日本語を読み上げられない**ことが多いので、音声は `audio/` の事前生成ファイルを再生します。整理番号が300を超える場合は `tools/generate_call_audio.py` の `NUM_MAX` を変えて実行してください（要 Python と `pip install edge-tts`）
- **朝1回の音声有効化**はブラウザの仕様です。忘れると音が鳴りません。スタッフ向けマニュアルの一番上に書いておくのがおすすめです
- **32型など小さいモニター**でも収まるよう、画面端に6%の余白を取っています
- URLは他人に見られても問題ありません。呼び出しはログインしないと押せません

## ライセンス

自由に使ってください（MIT）。改変・再配布も可。
