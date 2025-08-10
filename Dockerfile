# マルチステージビルド
FROM node:18-alpine AS builder

WORKDIR /app

# パッケージファイルをコピー
COPY package*.json ./

# 依存関係をインストール
RUN npm ci --only=production && npm cache clean --force

# ソースコードをコピー
COPY . .

# アプリケーションをビルド
RUN npm run build

# 本番用イメージ
FROM node:18-alpine AS production

WORKDIR /app

# 必要なパッケージをインストール
RUN apk add --no-cache dumb-init

# 非rootユーザーを作成
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# ビルド成果物をコピー
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --chown=nestjs:nodejs package*.json ./

# ログディレクトリを作成
RUN mkdir -p logs && chown nestjs:nodejs logs

# ユーザーを切り替え
USER nestjs

# ポートを公開
EXPOSE 3001

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js

# アプリケーションを起動
CMD ["dumb-init", "node", "dist/main"]