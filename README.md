# Metaverse MVP

Three.js + Rapier + WebSocket を使った最小構成のマルチプレイヤー3D空間。
スマホ・PCブラウザから同じ仮想空間に複数人が接続し、リアルタイムで互いのアバターが見える。

---

## 目的

- ブラウザだけで動くマルチプレイヤー3D空間の最小実装
- 認証・バックエンドなしで「同じ空間に複数人がいる体験」を最速で実現
- PC（WASD + マウス）とスマホ（ジョイスティック）の両方に対応

---

## 機能

- 3D空間に床・壁が存在し、Rapier物理エンジンで衝突判定
- スマホ: ニップルジョイスティックで移動、タッチドラッグで視点変更
- PC: WASD / 矢印キーで移動、マウスで視点変更（PointerLock）
- スペースキー or ジャンプボタンでジャンプ（物理ジャンプ）
- WebSocketで複数人の座標をリアルタイム同期
- 他プレイヤーはオレンジのボックスアバターとして表示（lerp補間でヌルヌル）
- 自分は半透明の青いアバター（一人称視点で自分が視界を遮らない）
- アバター頭上にユーザーIDの先頭4文字を表示
- 切断時は自動で3秒後に再接続

---

## 技術スタック

| レイヤー | ライブラリ | バージョン |
|---|---|---|
| 3Dレンダリング | three | ^0.165.0 |
| 物理エンジン | @dimforge/rapier3d-compat | ^0.12.0 |
| スマホ入力 | nipplejs | ^0.10.1 |
| バンドラー | vite | ^5.0.0 |
| WebSocketサーバー | ws | ^8.0.0 |
| サーバーランタイム | Node.js | >=20 |

---

## ディレクトリ構成

```
metaverse-mvp/
├── server/
│   ├── package.json
│   ├── server.js          # WebSocketサーバー (Node.js + ws)
│   └── rooms.js           # ルーム・ユーザー管理
└── client/
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.js
        ├── world/
        │   ├── scene.js       # Three.js シーン・ライト・霧
        │   ├── physics.js     # Rapier 物理ワールド
        │   └── floor.js       # 床・壁の生成
        ├── player/
        │   ├── localPlayer.js     # 自プレイヤー（入力・移動・カメラ）
        │   └── remotePlayer.js    # 他プレイヤー（補間・アバター管理）
        ├── network/
        │   └── socket.js      # WebSocket接続・送受信
        └── ui/
            └── joystick.js    # スマホ用ジョイスティック
```

---

## セットアップ・起動

### 必要環境

- Node.js 20以上

### サーバー起動

```bash
cd server
npm install
node server.js
# → 0.0.0.0:3001 で待受
# → 他の端末は ws://<PCのIPアドレス>:3001 を使う
```

### クライアント起動

```bash
cd client
npm install
npm run dev
# → http://localhost:5173 で起動
```

---

## 使い方

### PC

1. `http://localhost:5173` をブラウザで開く
2. **Enter** ボタンをクリック
3. 画面をクリックして PointerLock を取得
4. 操作:

| キー | 動作 |
|---|---|
| W / ↑ | 前進 |
| S / ↓ | 後退 |
| A / ← | 左移動 |
| D / → | 右移動 |
| Space | ジャンプ |
| マウス | 視点変更 |
| ESC | PointerLock 解除 |

### スマホ

1. PCと同一LAN上で `http://<PCのIPアドレス>:5173` を開く
2. **Enter** をタップ（iOS の場合、DeviceOrientation 許可ダイアログが表示される）
3. 左下のジョイスティックで移動
4. 右半分のエリアをドラッグして視点変更
5. 右下の **↑** ボタンでジャンプ

### 動作確認方法

1. PC と スマホ（または2つのブラウザタブ）で同時に接続
2. 両方の画面に相手のオレンジのアバターが見えれば成功

---

## WebSocket 通信仕様

### クライアント → サーバー（20回/秒）

```json
{
  "type": "move",
  "position": { "x": 0, "y": 1, "z": 0 },
  "rotationY": 0.0,
  "timestamp": 1700000000000
}
```

### サーバー → 全クライアント（ブロードキャスト）

```json
{
  "type": "players",
  "data": {
    "<userId>": {
      "position": { "x": 0, "y": 1, "z": 0 },
      "rotationY": 0.0,
      "timestamp": 1700000000000
    }
  }
}
```

### 接続時

```json
{ "type": "init", "userId": "<uuid>" }
```

---

## 環境変数

| 変数名 | デフォルト | 説明 |
|---|---|---|
| `VITE_WS_URL` | `未設定時はアクセス中のホスト名を使って自動決定` | WebSocketサーバーのURL |

通常は `client/.env` を設定しなくても、`http://<PCのIPアドレス>:5173` で開けば `ws://<PCのIPアドレス>:3001` に自動接続する。

クライアント配信先と WebSocket サーバーが別ホストのときだけ `client/.env` に設定:

```
VITE_WS_URL=ws://192.168.1.10:3001
```

---

## スコープ外（次フェーズ以降）

- 認証・ユーザー名設定
- ルーム分割（複数ワールド）
- ボイスチャット（WebRTC）
- アバターのアニメーション（歩行・待機モーション）
- 空間のカスタム（Blenderモデルのimport）
- VRデバイス対応（WebXR）
