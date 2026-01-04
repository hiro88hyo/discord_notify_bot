# Discord Notify Bot

Cloudflare Workers 上で動作し、暗号資産（仮想通貨）の価格を定期的にチェックして Discord に通知するボットです。

## 特徴

- **Cloudflare Workers**: サーバーレスで低コスト・高可用性。
- **定期実行**: Cloudflare Workers の Cron Triggers を利用して定期的に価格をチェックします。
- **柔軟な設定**: Upstash Redis に保存された設定（JSON）に基づいて、複数の通貨ペア、閾値、条件（以上/以下）を監視できます。
- **ステート管理**: 通知の重複を防ぐために、前回の通知状態やクールダウンを Redis で管理します。
- **CoinGecko API**: 価格データの取得に CoinGecko API (Simple Price) を使用します。

## 必要要件

- [Bun](https://bun.sh/) (ランタイムおよびパッケージマネージャー)
- Cloudflare アカウント (Workers のデプロイ用)
- [Upstash](https://upstash.com/) アカウント (Redis データベース用)
- Discord Webhook URL (通知の送信先)
- (オプション) CoinGecko Demo API Key (レート制限緩和のため推奨)

## セットアップ

### 1. インストール

パッケージをインストールします。

```bash
bun install
```

### 2. 環境変数の設定

`wrangler.toml` を作成し、必要な環境変数を設定します。`wrangler.toml.sample` をコピーして使用できます。

```bash
cp wrangler.toml.sample wrangler.toml
```

`wrangler.toml` の `[vars]` セクションを編集します。

```toml
[vars]
DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/..."
UPSTASH_REDIS_REST_URL = "https://<YOUR_UPSTASH_URL>.upstash.io"
UPSTASH_REDIS_REST_TOKEN = "<YOUR_UPSTASH_TOKEN>"
# COINGECKO_API_KEY = "CG-..." # オプション
```

### 3. 通知ルールの設定 (Redis)

監視ルールは Upstash Redis のキー `discord_notify_bot:config:rules` に JSON 形式で保存します。

**JSON スキーマ:**

```json
{
  "rules": [
    {
      "coinId": "bitcoin",       // CoinGecko API ID
      "currency": "usd",         // 通貨 (usd, jpy など)
      "threshold": 50000,        // 閾値
      "direction": "above",      // "above" (以上) または "below" (以下)
      "cooldownMs": 3600000      // 通知後のクールダウン時間 (ミリ秒, デフォルト1時間)
    }
  ]
}
```

**設定例:**

Redis の CLI またはコンソールで以下のコマンドを実行して設定します。

```bash
SET discord_notify_bot:config:rules '{"rules": [{"coinId": "bitcoin", "currency": "usd", "threshold": 100000, "direction": "above", "cooldownMs": 3600000}, {"coinId": "ethereum", "currency": "usd", "threshold": 2000, "direction": "below", "cooldownMs": 3600000}]}'
```

## ローカル開発

ローカルでサーバーを起動してテストできます。

```bash
bun run dev
```

ローカルサーバーが起動したら、手動でチェックをトリガーできます。

```bash
curl -X POST http://localhost:8787/trigger
```

## デプロイ

Cloudflare Workers にデプロイします。

```bash
bun run deploy
```

デプロイ後、`wrangler.toml` の `[triggers]` 設定に従って定期実行（デフォルトでは10分毎）が開始されます。

## 技術スタック

- **Language**: TypeScript
- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/)
- **Database**: Upstash Redis
- **Validation**: Zod
- **Date Utility**: date-fns
- **Package Manager**: Bun
