# PocketStretch 公開準備フルセット — 設計仕様 (Design Spec)

Date: 2026-05-24
Branch: `pre-launch-hardening`（`origin/main` 起点）

## 背景 / Overview

PocketStretch は React Native + Expo (SDK 54) 製のストレッチ／セルフケアアプリ。`origin/main` には Warm Wellness リデザイン・71種のストレッチ・ゴール機能・編集可能プロフィール・GateScreen による全画面ゲートなどが実装済み。

本仕様は **公開（ストア提出）前に潰すべき不具合・法務リスク・運用基盤の不足** をまとめて解消するためのもの。チームによるコードベース再診断（`origin/main` 基準）で確認された、実コードに根拠のある項目だけを対象とする。

## ゴール / Non-Goals

**ゴール:**
- 通知機構を1系統に統一し、「通知タップ→ストレッチ実施」という中核フローを実際に機能させる。
- 通知権限まわりを iOS/Android 両対応で堅牢化する。
- 薬機法・景表法上リスクのある表現を除去し、医療免責を明示する。
- 部位処方のデータバグを修正する。
- 継続率の土台となるストリーク記録を導入する。
- クラッシュ計測・OTA配信・レビュー依頼など公開運用の基盤を整える。

**Non-Goals（今回スコープ外）:**
- 新規ストレッチ種目の追加（既に71種ある）。
- サブスク／広告などの収益化実装（buy-once含め見送り）。
- 動画・GIF・音声ガイド。
- UI の大規模リデザイン（Warm Wellness は完了済み）。
- 多言語化（日本語のみで公開）。

---

## ワークストリーム1：通知アーキテクチャの一本化 + タップ遷移 ★中核

### 現状の問題
通知系統が2つ並存し、互いを破壊している。

- **固定時刻系** `scheduleNotifications(times)`（`src/notifications/index.ts`）: オンボ Step4・Settings の「通知」トグルで使用。毎日指定時刻に `DAILY` 通知を発火、`data.screen='Session'`。
- **スケジューラ系** `scheduleNextStretchNotification(lastCompletedAt, config)`: CompletionScreen・GateScreen スキップ・Settings のスケジューラ変更で使用。最終完了時刻を起点に「次の1件」を `DATE` 通知で予約、`data.screen='Gate'`。`GateScreen` の全画面ゲートを駆動する本来の中核機構。
- 両者とも発火前に `Notifications.cancelAllScheduledNotificationsAsync()` を呼ぶため、**後から動いた方が相手の通知を全消し**する。実挙動が予測不能。
- `App.tsx` の通知応答リスナーは空（コメントのみ）。`data.screen` を誰も読んでおらず、**通知タップ→画面遷移が未実装**。

### 設計：スケジューラに一本化
- **固定時刻系を廃止**：`scheduleNotifications`・`buildDailyTriggers`、および `UserProfile.notificationEnabled` / `notificationTimes` を削除。リマインダーの ON/OFF は `schedulerConfig.enabled` に一本化する。
- **Settings**：「固定時刻の通知」セクション（トグル＋時刻テキスト表示）を削除。「ストレッチ通知」＝スケジューラの ON/OFF・1日の回数・時間帯のみを残す（既存 UI を流用）。
- **オンボ Step4**：3つの固定時刻カードを廃止し、「権限リクエスト＋スケジューラ有効化（デフォルト 08:00〜22:00／3回）」に変更。有効化時に `scheduleNextStretchNotification(new Date().toISOString(), config)` で初回を予約。
- **副次効果**：「完了済みなのに通知が来る」「相互 cancelAll 破壊」は、常に最終完了起点で次の1件のみ予約する構造になるため解消される。

### 設計：通知タップ→Gate 遷移
- `src/navigation/index.tsx` に `createNavigationContainerRef()` で `navigationRef` を作り、`NavigationContainer` の `ref` に渡し export する。
- `App.tsx` で：
  - コールドスタート: `Notifications.getLastNotificationResponseAsync()` を `NavigationContainer` の `onReady` 後に評価。
  - ウォーム: `addNotificationResponseReceivedListener` を維持しつつ、コールバックで `data.screen` を読む。
  - `data.screen === 'Gate'` のとき `navigationRef.navigate('Gate')`。
- **Gate を常時登録に変更**：現状 `gateNeeded` のときだけ条件レンダリングしているため `navigate('Gate')` できない。`Gate` を認証済みスタックに常時登録し、`Main` を初期ルートにする。
  - コールド時の自動ゲート（既存の全画面占有挙動）は、`App.tsx` の `onReady` と `AppState` の `active` 復帰時に `shouldShowGate(lastStretchCompletedAt, schedulerConfig)` を判定して `navigate('Gate')` で再現する。
  - `GateScreen` は表示時に「ゲート不要（`shouldShowGate` が false）」なら `Main` へ即リダイレクトするガードを持つ（通知タップ後に既に完了済みだった等の競合対策）。

### Scheduler 検証（クラッシュ防止）
- 現状 `calcIntervalHours`（`src/utils/scheduler.ts`）は `activeHoursStart >= activeHoursEnd` のとき `activeHours <= 0` となり、`NaN`/`Infinity`/負値を返しうる（`dailyCount > 0` のため throw されない）。これが `scheduleNotificationAsync` に渡るとランタイムエラーの恐れ。
- 対策：
  - `calcIntervalHours` で `activeHours <= 0` を検出したら `RangeError` を投げる（または安全な下限にクランプ）。
  - Settings の `updateSchedulerConfig`（`adjustHour`）で **start < end かつ最低1時間の窓** を強制し、不正な変更を拒否する。

### 影響ファイル
`src/notifications/index.ts`, `src/navigation/index.tsx`, `App.tsx`, `src/screens/GateScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/screens/onboarding/Step4Notifications.tsx`, `src/store/useUserStore.ts`, `src/types/index.ts`, `src/utils/scheduler.ts`。

### テスト
- `calcIntervalHours` の不正入力（start>=end）ガード。
- `updateSchedulerConfig` の窓クランプ（ロジックを純関数に切り出してテスト）。
- 通知応答ハンドラの `data.screen` 分岐（`navigationRef.navigate` がモックで呼ばれること）。

---

## ワークストリーム2：通知権限の堅牢化（Fix 5）

### 現状の問題
`requestPermissions()` は `requestPermissionsAsync()` を直接呼ぶだけ。iOS では一度拒否されると以降ダイアログが出ず、`granted=false` のまま。「ONにしたのに通知が来ない」を招き、App Store ガイドライン的にも弱い。

### 設計
- `ensureNotificationPermission(): Promise<'granted' | 'denied' | 'blocked'>` を新設：
  1. `getPermissionsAsync()` で現状取得。`granted` なら `'granted'`。
  2. `canAskAgain === true` なら `requestPermissionsAsync()` を呼び、結果を返す。
  3. `granted=false` かつ `canAskAgain=false` なら `'blocked'`。
- 呼び出し側（Settings トグル・Step4）：`'blocked'` のとき Alert →`Linking.openSettings()` 誘導、`'denied'` ならトグルを OFF のまま、`'granted'` なら予約処理へ。
- 既存 `requestPermissions()` は本関数に置き換え。

### 影響ファイル
`src/notifications/index.ts`, `src/screens/SettingsScreen.tsx`, `src/screens/onboarding/Step4Notifications.tsx`。

### テスト
`getPermissionsAsync`/`requestPermissionsAsync` をモックし、granted / undetermined→denied / blocked の3分岐を検証。

---

## ワークストリーム3：法務テキスト + 医療免責（Content #1 / #2 / #4）

### 現状の問題
- `src/data/stretches.ts` の `descriptionJa` に、断定的な効果効能表現が残存（薬機法・景表法・ストア審査リスク）。確認済み例：
  - `piriformis-stretch`「坐骨神経痛を予防」「特効」
  - `neck-full`「血行促進」 / `eye-neck-roll`「血行を促進する」
  - `shoulder-full`「四十肩予防」
  - `ankle-rotation`「むくみを解消する」 / `bedtime-legs-up-wall`「静脈還流を促進し…解消する」
  - `chin-tuck`「ストレートネック・スマホ首を改善する」
  - `finger-extensor-stretch`「腱鞘炎予防にも効果的」
  - `diaphragm-breathing`「副交感神経を優位にし…効果的」
  - `wrist-extensor-stretch`「特効」 / `bedtime-progressive-relaxation`「入眠の質向上」 / `bedtime-yin-hip`「入眠をスムーズにする」
- アプリ全体のグローバル免責が存在しない（個別種目に「即中止」記述は5件あるのみ）。
- `shoulder-roll` の `descriptionJa` が医療専門用語のみ（「菱形筋の循環を促進…前鋸筋・小胸筋の短縮を改善」）で、入門種目に不適切。
- `descriptionJa` と `steps` でキープ秒数が食い違う種目がある（旧版 `seated-hip` 等。main 全種目をスイープして確認・修正する）。

### 設計：表現の置換ルール
- 「〜を予防する」→「〜が気になる方に」
- 「〜を解消する／改善する」→「〜のケアに」「〜をやわらげたい時に」
- 「効果的／特効」→ 削除、または「おすすめ」
- 「血行（を）促進する」→「血流の巡りを感じやすい」
- 「副交感神経を優位にし／入眠の質向上」→「リラックスしたい時に」「就寝前のひと息に」
- 効果の断定を避け、**体験・用途の表現**に統一。`shoulder-roll` は平易文へ書き直し。
- 全 `descriptionJa` をスイープし、上記に該当する語を除去。`steps` との秒数矛盾も是正。

### 設計：グローバル免責
- 文言（共通）：「本アプリは医療行為・診断ではありません。痛みや持病・既往のある方は医師にご相談のうえご利用ください。実施中に痛みや違和感を感じたらすぐ中止してください。」
- 配置：
  - **オンボ Step1 上部**に短縮版を1行表示（初回に必ず目に入る）。
  - **Settings に常設フッター**として全文表示。あわせて既存 `docs/privacy-policy.html` への導線（プライバシーポリシー項目）を Settings に追加。

### 影響ファイル
`src/data/stretches.ts`, `src/screens/onboarding/Step1BodyParts.tsx`, `src/screens/SettingsScreen.tsx`（必要なら免責文の定数を `src/data/` に切り出し）。

### テスト
- 禁止語リスト（「予防」「解消」「特効」「血行促進」等）が `descriptionJa` に含まれないことを検査するテスト（リグレッション防止）。

---

## ワークストリーム4：データバグ修正（Content #3）

### 現状の問題
手首ストレッチ3種の `bodyParts` が誤って `['shoulder']`：
- `wrist-flexor-stretch`（stretches.ts L508）
- `wrist-extensor-stretch`（L521）
- `finger-flexor-stretch`（L625）

`finger-extensor-stretch`（L914）は既に `['arm']` で正しい。誤タグのため、ユーザーが「腕」を選んでもこれらが処方されない。

### 設計
- 上記3種の `bodyParts` を `['shoulder'] → ['arm']` に修正。
- `BODY_PRESCRIPTION.arm`（`src/utils/prescription.ts`）に手首系を組み込むか確認・調整（現状 arm は `bicep-wall-stretch`/`tricep-overhead-stretch`/`forearm-rotator-stretch`）。手首をケアしたい腕ユーザー向けに最低1種を arm 処方へ追加検討。
- スポーツ処方（`SPORT_PRESCRIPTION`）が `wrist-*` を参照している箇所はタグ変更後も id 参照なので影響なし（要確認）。

### 影響ファイル
`src/data/stretches.ts`, `src/utils/prescription.ts`。

### テスト
`getPrescription(..., ['arm'], scene)` が手首ストレッチを含むことを検証。

---

## ワークストリーム5：リテンション基盤＝ストリーク（高ROI）

### 現状の問題
`useUserStore` は当日分の `dailyProgress` のみで、翌日には上書きリセット。連続日数・累計が記録されず、CompletionScreen は「種目数・分」しか表示しない。継続動機付けが弱い。

加えて、日付計算が `new Date().toISOString().slice(0,10)`（**UTC基準**）。JST ユーザーでは朝9時に日付が変わるバグ。

### 設計：ストア拡張
- `src/store/useUserStore.ts` に追加：
  - `currentStreak: number`
  - `longestStreak: number`
  - `totalSessions: number`
  - `lastCompletedDate: string | null`（`YYYY-MM-DD`、ローカル日付）
- `getLocalDateString(date = new Date()): string` ヘルパーを新設し、`dailyProgress` の日付計算も含め**ローカル日付に統一**。
- セッション完了時（CompletionScreen の効果内、または新メソッド `recordDailyCompletion()`）：
  - `today = getLocalDateString()`
  - `lastCompletedDate === today` → ストリーク据え置き（本日2回目以降）。
  - `lastCompletedDate === 昨日` → `currentStreak += 1`。
  - それ以外 → `currentStreak = 1`。
  - `longestStreak = max(longestStreak, currentStreak)`、`lastCompletedDate = today`。
  - `totalSessions += 1`（セッション単位）。

### 設計：UI 反映
- **CompletionScreen**：「🔥 N日連続」「累計 M回」を表示。1日目／7日／30日で特別文言。
- **HomeScreen**：ヘッダ付近に小さく「🔥 N日連続」を表示。

### 設計：永続化マイグレーション
- `persist` に `version: 1` を設定し、`migrate` で新フィールドを既定値（streak=0, total=0, lastCompletedDate=null）に補完。既存ユーザーのストア破損を防ぐ。

### 影響ファイル
`src/store/useUserStore.ts`, `src/screens/CompletionScreen.tsx`, `src/screens/HomeScreen.tsx`, `src/types/index.ts`。

### テスト
- ストリーク遷移（今日／昨日／一昨日以前、2回目据え置き、longest 更新）。
- `getLocalDateString` のローカル日付。
- migrate が旧 shape に新フィールドを補完すること。

---

## ワークストリーム6：リリース運用基盤（各 S、相互に独立）

### Sentry（クラッシュ計測）
- `@sentry/react-native` を導入、`App.tsx` で `Sentry.init({ dsn })` し root を `Sentry.wrap`。`app.json` に Expo プラグイン設定。
- **要ユーザー入力**：Sentry DSN・組織/プロジェクト。設定値は後で差し込む（実装はプレースホルダ＋環境変数で進める）。

### EAS Update（OTA配信）
- `app.json` に `updates.url` と `runtimeVersion`（`{ "policy": "appVersion" }`）、`eas.json` の `production` に `"channel": "production"` を追加。
- **要ユーザー入力**：EAS project（`expo` の `owner`/`projectId`）。

### expo-store-review（レビュー依頼）
- `expo-store-review` を導入。CompletionScreen で「累計3回以降」かつ「前回依頼から十分間隔」のときのみ `StoreReview.requestReview()`。
- ストアに `lastReviewRequestAt: string | null` を追加して制御。

### アクセシビリティ（a11y）
- 主要操作要素に `accessibilityLabel` / `accessibilityRole="button"` を付与：`PrimaryButton`、GateScreen「今すぐストレッチする」「スキップ」、SessionScreen「スキップ」「終了」、Settings の各トグル。

### 影響ファイル
`App.tsx`, `app.json`, `eas.json`, `package.json`, `src/screens/CompletionScreen.tsx`, `src/store/useUserStore.ts`, `src/components/PrimaryButton.tsx`, `src/screens/GateScreen.tsx`, `src/screens/SessionScreen.tsx`, `src/screens/SettingsScreen.tsx`。

### 過剰投資の回避
- Sentry のみ導入し、Amplitude/Mixpanel/Firebase Analytics 等は入れない（DAU が付いてから）。
- persist の `migrate` は version 番号付与＋デフォルト補完のみ。凝った変換は書かない。
- a11y は全要素ではなく主要タップ要素に限定。

---

## ワークストリーム7：テスト拡充

各ワークストリームのテストに加え、最低限：
- scheduler の不正設定ガード。
- 権限分岐（granted/denied/blocked）。
- ストリークロジック。
- 手首タグ→arm 処方。
- 禁止語リグレッション（descriptionJa）。
- 通知応答→`navigate('Gate')` の分岐（モック）。

既存89テストを壊さないこと。

---

## スコープ外／格下げした項目（再診断で除外）

- **warmup × office = 0件**：誤検出。`filterByGoals` はシーンで絞らず warmup は難易度2以上で多数ヒットする。さらに `GoalSelectorModal` には空状態メッセージ＋開始ガードが既にある。→ 各ゴールがゼロ件にならないかの**確認のみ**（実装変更なし）。
- **二重通知「最悪8通知/日」**：通知一本化（WS1）で構造的に解消されるため個別対応不要。
- **手順への呼吸法・戻り方の追記**：任意。やるなら難易度3の6種（`lunge`/`pigeon`/`spinal-twist`/`neck-full`/`shoulder-full`/`split-prep-stretch`）に限定。今回はベースライン外（時間が許せば）。
- **HomeScreen 独自カード vs DailyMustCard の二重実装統一**：UX 改善だが公開ブロッカーではない。今回スコープ外。
- **通知時刻の30分刻み**：スケジューラ一本化で時間帯設定に置き換わるため不要。

---

## リスク / 留意点

- **Gate 常時登録への変更**は初期ルーティングに影響する。コールド起動時の全画面ゲート挙動が回帰しないよう、`onReady`＋`AppState` 判定を慎重に実装・手動確認する。
- **固定時刻系の削除**は `UserProfile` の shape を変える。既存ユーザーのストア互換のため persist migrate を必ず入れる。
- **expo-notifications のトリガ／レスポンス API は SDK 54 準拠**で実装する（AGENTS.md 指示：https://docs.expo.dev/versions/v54.0.0/ を確認）。
- Sentry/EAS は**ユーザーのアカウント情報待ち**。値が来るまではプレースホルダで実装を進め、ビルド前に差し込む。

## 実装順序（推奨）

1. WS4（手首タグ）— 独立・低リスク・即効。
2. WS3（法務テキスト＋免責）— データ／文言中心、独立。
3. WS5（ストリーク＋ローカル日付＋migrate）— ストア基盤。
4. WS2（権限堅牢化）— WS1 の前提。
5. WS1（通知一本化＋タップ遷移＋Gate常時登録＋scheduler検証）— 中核・最大。
6. WS6（Sentry／EAS／store-review／a11y）— 仕上げ・運用基盤。
7. WS7 は各段で並行。

各段で `npx jest` を緑に保ち、WS1 完了後は実機/シミュレータで通知タップ→Gate→Session を手動確認する。
