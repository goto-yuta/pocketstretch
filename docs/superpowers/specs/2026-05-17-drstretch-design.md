# DrStretch Self-Care App — Design Spec
Date: 2026-05-17

## Overview
ドクターストレッチの代替となるセルフケアスマホアプリ。ユーザーの悩み部位・シーンに合わせたストレッチを提示し、プッシュ通知 + フォアグラウンド占有でストレッチを実施させる。

## Tech Stack
- **Framework:** React Native + Expo (managed workflow)
- **Navigation:** React Navigation (Stack + Tab)
- **State:** Zustand (軽量、永続化はexpo-secure-store / AsyncStorage)
- **Notifications:** expo-notifications (ローカル通知)
- **Screen awake:** expo-keep-awake
- **Content:** ローカルバンドル（TypeScript定数 + assets/stretches/）

## Data Models

```typescript
type BodyPart = 'neck' | 'shoulder' | 'back' | 'hip' | 'leg';
type Scene = 'office' | 'home' | 'serious';

interface Stretch {
  id: string;
  nameJa: string;
  descriptionJa: string;
  image: ImageSourcePropType;
  durationSeconds: number;      // 1ポーズの秒数 (20〜60)
  difficulty: 1 | 2 | 3;       // 1=オフィス可, 2=自宅向け, 3=本格
  bodyParts: BodyPart[];
  scenes: Scene[];
  steps: string[];              // 手順テキスト配列
}

interface UserProfile {
  onboardingCompleted: boolean;
  bodyParts: BodyPart[];        // 気になる部位（複数）
  scene: Scene;                 // デフォルトシーン
  notificationEnabled: boolean;
  notificationTimes: string[];  // ["09:00", "14:00", "18:00"]
}
```

## Screens

### 1. Onboarding (初回のみ、3ステップ)
- **Step1:** 気になる部位を選ぶ（複数選択: 首/肩/腰/股関節/脚）
- **Step2:** シーンを選ぶ（単一: オフィス/自宅ライト/本格）
- **Step3:** 通知時間を設定（タイムピッカー、複数設定可）

### 2. Home
- 今日のおすすめ（プロフィールに合う3〜5種）
- シーンで探す（office / home / serious カード）
- 部位で探す（グリッド）
- 右上に設定アイコン

### 3. Session（全画面占有）
- 残り枚数インジケーター（X/N）
- ストレッチ画像（大）
- 種目名 + 説明テキスト
- カウントダウンタイマー（円形）
- スキップボタン
- 終了ボタン → 確認ダイアログ（「本当に終了しますか？」）
- 自動で次のポーズへ遷移
- 完了画面「お疲れ様でした！」

### 4. Settings
- 通知のON/OFF と時間変更
- 部位・シーン変更（オンボーディング画面を再表示）

## Notification Flow
1. ユーザーが設定した時刻に毎日ローカル通知を発火
2. 通知タップ → Session画面をフォアグラウンドで全画面表示
3. Session中は `expo-keep-awake` でスリープ防止
4. 終了 or 完了でHome画面に戻る

## Content
- 初期コンテンツ: 約30種のストレッチ（全部位・全シーンをカバー）
- 画像: プレースホルダー画像でスタート（後から差し替え可能な構造）
- `data/stretches.ts` に全コンテンツを定義

## Navigation Structure
```
RootStack
├── Onboarding (初回のみ)
│   ├── Step1BodyParts
│   ├── Step2Scene
│   └── Step3Notifications
├── Main (Tab)
│   ├── Home
│   └── Settings
└── Session (Modal, 全画面)
    └── Completion
```

## Error Handling
- 通知許可が拒否された場合: 設定アプリへ誘導するバナーを表示
- コンテンツがゼロ件の場合: 「条件を変更してみてください」メッセージ

## Out of Scope (MVP)
- バックエンド / ユーザー認証
- 動画コンテンツ
- ソーシャル機能
- AI によるメニュー生成
