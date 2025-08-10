# 分析・ダッシュボード機能

## 概要

問い合わせ管理システムの分析・ダッシュボード機能は、問い合わせの統計情報、対応時間分析、リアルタイム更新機能を提供します。

## 機能一覧

### 基本統計情報
- 問い合わせ件数統計（総数、新規、対応中、解決済み、クローズ）
- 平均対応時間・解決時間
- アプリ別・カテゴリ別・優先度別・ステータス別統計
- 日別トレンド分析

### 対応時間分析
- 初回対応時間・解決時間の平均・中央値
- 対応時間分布（0-1時間、1-4時間、4-24時間、24時間以上）
- SLA達成率
- カテゴリ別・優先度別対応時間分析

### リアルタイム更新
- WebSocketによるリアルタイム統計更新
- 新規問い合わせ・状態変更の即座通知
- ダッシュボードの自動更新

## API エンドポイント

### 基本統計情報取得
```http
GET /api/analytics/statistics
```

**クエリパラメータ:**
- `appId`: アプリケーションID（オプション）
- `startDate`: 開始日（ISO 8601形式）
- `endDate`: 終了日（ISO 8601形式）
- `categories`: カテゴリフィルター（カンマ区切り）
- `statuses`: ステータスフィルター（カンマ区切り）
- `priorities`: 優先度フィルター（カンマ区切り）

**レスポンス例:**
```json
{
  "totalInquiries": 1250,
  "newInquiries": 45,
  "inProgressInquiries": 120,
  "resolvedInquiries": 980,
  "closedInquiries": 105,
  "averageResponseTimeHours": 2.5,
  "averageResolutionTimeHours": 24.8,
  "categoryBreakdown": [
    {
      "category": "バグ報告",
      "count": 450,
      "percentage": 36.0,
      "averageResponseTimeHours": 1.8
    }
  ],
  "appBreakdown": [
    {
      "appId": "app-uuid-1",
      "appName": "モバイルアプリ",
      "count": 600,
      "percentage": 48.0,
      "averageResponseTimeHours": 2.2,
      "newCount": 20,
      "resolvedCount": 480
    }
  ],
  "dailyTrend": [
    {
      "date": "2024-01-01",
      "totalInquiries": 42,
      "newInquiries": 42,
      "resolvedInquiries": 38,
      "averageResponseTimeHours": 2.1
    }
  ]
}
```

### 対応時間分析取得
```http
GET /api/analytics/response-time
```

**レスポンス例:**
```json
{
  "averageFirstResponseTimeHours": 2.3,
  "averageResolutionTimeHours": 24.5,
  "medianFirstResponseTimeHours": 1.8,
  "medianResolutionTimeHours": 18.2,
  "slaComplianceRate": 87.5,
  "responseTimeDistribution": [
    {
      "timeRangeHours": "0-1",
      "count": 320,
      "percentage": 25.6
    },
    {
      "timeRangeHours": "1-4",
      "count": 650,
      "percentage": 52.0
    }
  ],
  "responseTimeByPriority": [
    {
      "priority": "high",
      "averageResponseTimeHours": 0.8,
      "averageResolutionTimeHours": 6.2,
      "count": 125,
      "slaTargetHours": 4,
      "complianceRate": 95.2
    }
  ]
}
```

### リアルタイム統計取得
```http
GET /api/analytics/realtime
```

**レスポンス例:**
```json
{
  "timestamp": "2024-01-15T10:30:00Z",
  "totalInquiries": 1250,
  "newInquiriesLast24h": 48,
  "resolvedInquiriesLast24h": 52,
  "averageResponseTimeLast24h": 2.1,
  "activeUsers": 15,
  "pendingInquiries": 165
}
```

### ダッシュボードサマリー取得
```http
GET /api/analytics/dashboard?appId=optional-app-id
```

**レスポンス例:**
```json
{
  "basic": {
    "totalInquiries": 1250,
    "newInquiries": 45,
    "inProgressInquiries": 120,
    "resolvedInquiries": 980,
    "closedInquiries": 105
  },
  "performance": {
    "averageResponseTimeHours": 2.3,
    "averageResolutionTimeHours": 24.5,
    "slaComplianceRate": 87.5
  },
  "realtime": {
    "newInquiriesLast24h": 48,
    "resolvedInquiriesLast24h": 52,
    "pendingInquiries": 165,
    "averageResponseTimeLast24h": 2.1
  },
  "breakdown": {
    "byApp": [...],
    "byCategory": [...],
    "byPriority": [...],
    "byStatus": [...]
  },
  "trend": [...],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

## WebSocket リアルタイム更新

### 接続
```javascript
const socket = io('/analytics', {
  auth: {
    token: 'your-jwt-token'
  }
});
```

### イベント購読

#### リアルタイム統計の購読
```javascript
socket.on('realtime-stats', (data) => {
  console.log('リアルタイム統計更新:', data);
  // ダッシュボードの更新処理
});
```

#### 特定アプリの統計購読
```javascript
socket.emit('subscribe-app-stats', { appId: 'your-app-id' });

socket.on('app-stats', (data) => {
  console.log('アプリ統計更新:', data);
});
```

#### フィルター付き統計の購読
```javascript
socket.emit('subscribe-stats', {
  appId: 'your-app-id',
  categories: ['バグ報告', '機能要望'],
  startDate: '2024-01-01T00:00:00Z',
  endDate: '2024-01-31T23:59:59Z'
});

socket.on('filtered-stats', (data) => {
  console.log('フィルター統計更新:', data);
});
```

#### 新規問い合わせ通知
```javascript
socket.on('inquiry-created', (data) => {
  console.log('新規問い合わせ:', data.inquiry);
  // 通知表示やカウンター更新
});
```

#### 状態変更通知
```javascript
socket.on('inquiry-status-changed', (data) => {
  console.log('状態変更:', data.inquiry);
  // ステータス表示の更新
});
```

## 使用例

### React コンポーネントでの使用例

```typescript
import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';

interface DashboardData {
  basic: {
    totalInquiries: number;
    newInquiries: number;
    // ...
  };
  // ...
}

const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 初期データ取得
    fetchDashboardData();

    // WebSocket接続
    const newSocket = io('/analytics', {
      auth: { token: localStorage.getItem('token') }
    });

    newSocket.on('realtime-stats', (data) => {
      // リアルタイム統計でダッシュボードを更新
      setDashboardData(prev => prev ? {
        ...prev,
        realtime: data
      } : null);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard');
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error('ダッシュボードデータ取得エラー:', error);
    }
  };

  if (!dashboardData) {
    return <div>読み込み中...</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="stats-cards">
        <div className="stat-card">
          <h3>総問い合わせ数</h3>
          <p>{dashboardData.basic.totalInquiries}</p>
        </div>
        <div className="stat-card">
          <h3>新規問い合わせ</h3>
          <p>{dashboardData.basic.newInquiries}</p>
        </div>
        <div className="stat-card">
          <h3>平均対応時間</h3>
          <p>{dashboardData.performance.averageResponseTimeHours.toFixed(1)}時間</p>
        </div>
        <div className="stat-card">
          <h3>SLA達成率</h3>
          <p>{dashboardData.performance.slaComplianceRate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="charts">
        {/* チャートコンポーネント */}
      </div>
    </div>
  );
};

export default AnalyticsDashboard;
```

## 認証・権限

分析機能へのアクセスには以下の権限が必要です：

- **admin**: 全ての分析機能にアクセス可能
- **support**: 基本統計と対応時間分析にアクセス可能
- **viewer**: 読み取り専用で統計情報を閲覧可能

## パフォーマンス考慮事項

- 大量データの処理には適切なインデックスが設定されています
- リアルタイム更新は30秒間隔で実行されます
- WebSocket接続数の制限により、同時接続数を監視しています
- 複雑なクエリはキャッシュ機能を活用しています

## トラブルシューティング

### よくある問題

1. **WebSocket接続エラー**
   - JWT トークンの有効性を確認
   - CORS設定を確認

2. **統計データが更新されない**
   - データベース接続を確認
   - ログでエラーメッセージを確認

3. **パフォーマンスが遅い**
   - データベースインデックスを確認
   - クエリの実行計画を分析

### ログ確認

```bash
# アプリケーションログ
tail -f logs/application.log | grep Analytics

# エラーログ
tail -f logs/error.log | grep Analytics
```