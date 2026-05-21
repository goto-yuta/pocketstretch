# スポーツ特化ストレッチ拡張 実装プラン

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ストレッチライブラリを38種→53種に拡充し、22スポーツへの特化処方対応とオンボーディングのスポーツ選択ステップを追加する。

**Architecture:** 既存の `BODY_PRESCRIPTION` パターンに `SPORT_PRESCRIPTION` レイヤーを追加（union方式）。`Stretch` 型にオプショナルな `sport?: string[]` タグを追加、`UserProfile` に `sport: string` を追加。オンボーディングに `Step3Sport`（自由記入＋サジェスト）を挿入し、`getPrescription` の引数に `sport?: string` を追加して既存の bodyParts 処方と合算する。

**Tech Stack:** React Native + Expo 54、TypeScript、Zustand（AsyncStorage永続化）、React Navigation（NativeStack）、Jest + @testing-library/react-native

---

## ファイル構成

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `src/types/index.ts` | 修正 | Stretch + UserProfile + OnboardingStackParamList |
| `src/data/stretches.ts` | 修正 | 既存38種にsportタグ + 新規15種追加 |
| `src/utils/prescription.ts` | 修正 | SPORT_* 定数 + normalizeSport + getPrescription引数追加 |
| `src/store/useUserStore.ts` | 修正 | sport フィールド + setSport |
| `src/screens/onboarding/Step3Sport.tsx` | 新規 | スポーツ入力画面 |
| `src/screens/onboarding/Step3Notifications.tsx` | リネーム | → Step4Notifications.tsx（中身も変更） |
| `src/navigation/index.tsx` | 修正 | Step3Sport追加、Step4接続 |
| `src/screens/onboarding/Step2Scene.tsx` | 修正 | navigate先をStep3SportへS変更 |
| `src/screens/HomeScreen.tsx` | 修正 | sport を getPrescription に渡す |
| `__tests__/prescription.test.ts` | 修正 | normalizeSport + sport union テスト追加 |
| `__tests__/useUserStore.test.ts` | 修正 | sport初期値 + setSportテスト追加 |

---

## Task 1: 型定義変更

**Files:**
- Modify: `src/types/index.ts`
- Modify: `__tests__/useUserStore.test.ts`

- [ ] **Step 1: `src/types/index.ts` を更新**

```typescript
export type BodyPart = 'neck' | 'shoulder' | 'back' | 'hip' | 'leg';
export type Scene = 'office' | 'home' | 'serious';

export interface Stretch {
  id: string;
  nameJa: string;
  descriptionJa: string;
  image: number;
  durationSeconds: number;
  difficulty: 1 | 2 | 3;
  bodyParts: BodyPart[];
  scenes: Scene[];
  steps: string[];
  recommendedSets: 1 | 2 | 3;
  sport?: string[];
}

export interface UserProfile {
  onboardingCompleted: boolean;
  bodyParts: BodyPart[];
  scene: Scene;
  sport: string;
  notificationEnabled: boolean;
  notificationTimes: string[];
}

export type RootStackParamList = {
  Onboarding: undefined;
  Main: undefined;
  Session: { stretchIds: string[] };
  Completion: { completedStretchIds: string[] };
};

export type OnboardingStackParamList = {
  Step1: undefined;
  Step2: undefined;
  Step3Sport: undefined;
  Step4: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Settings: undefined;
};

export type Goal =
  | 'shoulder-stiffness'
  | 'neck-stiffness'
  | 'lower-back-pain'
  | 'drowsiness'
  | 'eye-strain'
  | 'leg-swelling'
  | 'relax'
  | 'focus'
  | 'warmup'
  | 'cooldown'
  | 'mood-change';

export type DurationFilter = '3min' | '5min' | '10min' | 'any';
```

- [ ] **Step 2: `__tests__/useUserStore.test.ts` の `beforeEach` に `sport: ''` を追加**

`beforeEach` の `useUserStore.setState` 呼び出しを以下に更新（`sport: ''` を追加するだけ）：

```typescript
beforeEach(() => {
  useUserStore.setState({
    onboardingCompleted: false,
    bodyParts: [],
    scene: 'office',
    sport: '',
    notificationEnabled: false,
    notificationTimes: [],
    dailyProgress: { date: '', completedStretchIds: [] },
  });
});
```

- [ ] **Step 3: テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過（`sport` はオプショナルなので既存テストへの影響なし）

- [ ] **Step 4: コミット**

```bash
git add src/types/index.ts __tests__/useUserStore.test.ts
git commit -m "feat: add sport field to Stretch type and UserProfile"
```

---

## Task 2: `stretches.ts` 大規模更新

**Files:**
- Modify: `src/data/stretches.ts`

**注意:** このタスクは2ステップあるが、どちらも `src/data/stretches.ts` のみを編集する。読み込んでから編集すること。

- [ ] **Step 1: 既存38種にsportタグを追加**

以下のIDを持つ各ストレッチに `sport?: string[]` フィールドを追記する。`recommendedSets` の後ろに追加する。タグのないストレッチ（neck-side, shoulder-roll, chest-open, eye-neck-roll, energize-full-stretch, calf-raise-stretch, seated-hip, shoulder-cross）は変更しない。

```
id: 'neck-side'         → 変更なし
id: 'shoulder-roll'     → 変更なし
id: 'chest-open'        → 変更なし
id: 'seated-twist'      sport: ['golf', 'yoga', 'tabletennis'],
id: 'seated-hip'        → 変更なし
id: 'shoulder-cross'    sport: ['tennis', 'baseball', 'badminton', 'volleyball', 'swimming', 'golf'],
id: 'forward-fold'      sport: ['yoga', 'gymnastics', 'dance', 'martial-arts'],
id: 'butterfly'         sport: ['yoga', 'martial-arts', 'gymnastics', 'dance', 'soccer'],
id: 'hamstring'         sport: ['running', 'soccer', 'basketball', 'hiking', 'cycling', 'baseball', 'rugby', 'dance', 'gymnastics'],
id: 'calf'              sport: ['running', 'basketball', 'soccer', 'hiking', 'volleyball', 'badminton', 'skiing'],
id: 'lunge'             sport: ['running', 'soccer', 'basketball', 'hiking', 'martial-arts'],
id: 'pigeon'            sport: ['running', 'soccer', 'basketball', 'hiking', 'cycling', 'golf', 'yoga', 'dance', 'gymnastics', 'skiing', 'martial-arts'],
id: 'spinal-twist'      sport: ['golf', 'yoga', 'badminton', 'martial-arts'],
id: 'neck-full'         sport: ['martial-arts', 'rugby'],
id: 'shoulder-full'     sport: ['swimming', 'tennis', 'badminton', 'volleyball', 'baseball'],
id: 'eye-neck-roll'     → 変更なし
id: 'energize-full-stretch' → 変更なし
id: 'child-pose'        sport: ['yoga', 'hiking', 'skiing', 'surfing', 'gymnastics'],
id: 'supine-knee-hug'   sport: ['running', 'yoga', 'hiking'],
id: 'quad-stretch'      sport: ['running', 'basketball', 'soccer', 'hiking', 'skiing', 'volleyball', 'gymnastics'],
id: 'standing-side-stretch' sport: ['yoga', 'dance', 'gymnastics'],
id: 'ankle-rotation'    sport: ['running', 'soccer', 'basketball', 'hiking', 'badminton'],
id: 'calf-raise-stretch' → 変更なし
id: 'cat-cow'           sport: ['yoga', 'surfing', 'weighttraining', 'cycling'],
id: 'deep-breath-chest-open' sport: ['yoga', 'swimming', 'weighttraining'],
id: 'chin-tuck'         sport: ['cycling', 'road-cycling', 'tabletennis'],
id: 'levator-scapula-stretch' sport: ['cycling', 'road-cycling', 'swimming', 'tabletennis'],
id: 'pec-wall-stretch'  sport: ['swimming', 'baseball', 'volleyball', 'rugby', 'surfing', 'weighttraining'],
id: 'thoracic-open-book' sport: ['golf', 'swimming', 'baseball', 'surfing', 'gymnastics', 'weighttraining'],
id: 'thoracic-extension' sport: ['cycling', 'road-cycling', 'surfing', 'gymnastics'],
id: 'iliopsoas-stretch' sport: ['running', 'cycling', 'soccer', 'baseball', 'skiing', 'swimming', 'surfing', 'road-cycling'],
id: 'piriformis-stretch' sport: ['running', 'cycling', 'road-cycling', 'soccer', 'hiking'],
id: 'pelvic-tilt'       sport: ['running', 'weighttraining', 'yoga'],
id: 'quadratus-lumborum-stretch' sport: ['golf', 'cycling', 'road-cycling', 'tabletennis'],
id: 'wall-slide'        sport: ['volleyball', 'swimming', 'weighttraining'],
id: 'it-band-stretch'   sport: ['running', 'cycling', 'hiking', 'basketball'],
id: 'adductor-stretch'  sport: ['soccer', 'basketball', 'badminton', 'martial-arts', 'skiing', 'dance', 'gymnastics', 'rugby'],
id: 'diaphragm-breathing' sport: ['yoga', 'martial-arts', 'swimming'],
```

例（hamstringへの追加方法）：
```typescript
  {
    id: 'hamstring',
    // ... 既存フィールド ...
    recommendedSets: 2,
    sport: ['running', 'soccer', 'basketball', 'hiking', 'cycling', 'baseball', 'rugby', 'dance', 'gymnastics'],
  },
```

- [ ] **Step 2: 15種の新ストレッチを `ALL_STRETCHES` 配列末尾に追加**

```typescript
  // ── スポーツ特化ストレッチ ────────────────────────────────
  {
    id: 'wrist-flexor-stretch',
    nameJa: '手首屈筋ストレッチ（ゴルフ肘ケア）',
    descriptionJa: '前腕屈筋群（橈側手根屈筋・尺側手根屈筋）と内側上顆の緊張を解放する。ゴルフ・野球・クライミングなど手首を多用するスポーツの必須ケア。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['shoulder'],
    scenes: ['office', 'home', 'serious'],
    steps: ['腕を前に伸ばし、手のひらを上に向ける', '反対の手で指先をつかみ、手前（体側）に引く', '肘は完全に伸ばしたまま', '前腕内側（肘から手首）の伸びを感じながら20秒キープ', '反対側も同様に'],
    recommendedSets: 2,
    sport: ['golf', 'tennis', 'baseball', 'badminton', 'climbing', 'tabletennis', 'road-cycling'],
  },
  {
    id: 'wrist-extensor-stretch',
    nameJa: '手首伸筋ストレッチ（テニス肘ケア）',
    descriptionJa: '前腕伸筋群（橈側手根伸筋・指伸筋）と外側上顆の緊張を解放する。テニス・バドミントンのバックハンドや卓球のラケット操作後に特効。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['shoulder'],
    scenes: ['office', 'home', 'serious'],
    steps: ['腕を前に伸ばし、手のひらを下に向ける', '反対の手で手の甲を下（床）方向に押し下げる', '肘は完全に伸ばしたまま', '前腕外側（肘から手首）の伸びを感じながら20秒キープ', '反対側も同様に'],
    recommendedSets: 2,
    sport: ['tennis', 'badminton', 'tabletennis', 'baseball', 'climbing', 'golf'],
  },
  {
    id: 'sleeper-stretch',
    nameJa: 'スリーパーストレッチ（肩後方関節包）',
    descriptionJa: '棘下筋・小円筋・後方関節包を伸ばし、オーバーヘッドスポーツで起きやすい内旋制限（GIRD）を改善する。投球・スパイク動作の怪我予防に最重要。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['shoulder'],
    scenes: ['home', 'serious'],
    steps: ['ケアしたい側（例：右）を下にして横向きに寝る', '右肩を90度外転、肘を90度に曲げる（腕が天井方向）', '左手で右前腕を持ち、ゆっくり床方向（内旋）へ押し下げる', '肩の後ろ（後方関節包）の伸びを感じながら20秒キープ', '痛みや電気が走る感覚が出たら即中止', '左右各2〜3セット'],
    recommendedSets: 3,
    sport: ['tennis', 'baseball', 'badminton', 'volleyball', 'swimming'],
  },
  {
    id: 'lat-stretch',
    nameJa: '広背筋ストレッチ',
    descriptionJa: '広背筋・大円筋を伸ばす。水泳・野球・クライミング・サーフィンなどパドリング・投球動作で酷使される最大の体幹筋。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['back', 'shoulder'],
    scenes: ['home', 'serious'],
    steps: ['壁または棚に右手を肩より高い位置でつく', 'お尻をゆっくり後方・右斜め方向に引いていく', '脇腹から腰にかけての伸びを感じながら20秒キープ', '反対側も同様に', '腕の高さを変えると伸びる部位が変わる'],
    recommendedSets: 2,
    sport: ['swimming', 'baseball', 'climbing', 'rugby', 'surfing', 'gymnastics', 'weighttraining', 'martial-arts', 'road-cycling'],
  },
  {
    id: 'ankle-dorsiflexion-stretch',
    nameJa: '足関節背屈ストレッチ（ニートゥウォール）',
    descriptionJa: '下腿三頭筋遠位と足関節の背屈可動域を改善する。スクワット深度向上・ジャンプ着地の衝撃吸収改善に直結するリハビリ由来の種目。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['壁に向かって片膝立ちになる', '前足のつま先を壁から5〜7cm離して置く', '踵を床から離さずに膝を壁に向かってゆっくり前に出す', '膝が壁につけば成功（つかなければつま先を壁に近づける）', '10秒キープ×10回、反対側も'],
    recommendedSets: 2,
    sport: ['basketball', 'weighttraining', 'skiing', 'soccer', 'hiking'],
  },
  {
    id: 'ankle-plantar-flexion-stretch',
    nameJa: '足甲・足首底屈ストレッチ',
    descriptionJa: '前脛骨筋・足背靱帯と足関節底屈可動域をケアする。水泳のけ足・ダンスのポワント・体操の美脚線に必要なROMを確保する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['膝立ちになり、足の甲を床につける（正座に近い姿勢）', 'ゆっくりお尻をかかとの方向へ下ろしていく', '足の甲・足首前面の伸びを感じながら20〜30秒キープ', '膝を浮かせると強度UP、痛みがあれば戻す', '足首前面（スネ側）の伸びを意識する'],
    recommendedSets: 2,
    sport: ['swimming', 'dance', 'gymnastics'],
  },
  {
    id: 'tibialis-anterior-stretch',
    nameJa: '前脛骨筋ストレッチ（スネ前面）',
    descriptionJa: '前脛骨筋・長母趾伸筋（スネ前面）の緊張を解放する。スキー・スノーボードのブーツ姿勢で特に疲労しやすい部位。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['立位で片足のつま先を床に向けて甲を地面につける', 'または正座姿勢で足首を伸ばす', 'スネ前面の伸びを感じながら20秒キープ', 'バランスが不安な場合は壁や椅子に手をつく', '反対側も同様に'],
    recommendedSets: 2,
    sport: ['skiing'],
  },
  {
    id: 'plantar-fascia-stretch',
    nameJa: '足底筋膜ストレッチ',
    descriptionJa: '足底筋膜・足趾屈筋群を伸ばし、足底筋膜炎を予防する。長時間歩行・登山・ダンスの後に必須のケア。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['椅子に座り、右足を左のもも（膝付近）の上に乗せる', '右手で足趾（特に親指）をつかみ、足の甲方向（背屈）に反らせる', '足の裏（かかとから指の付け根）の張りを感じながら20秒キープ', '朝の最初の一歩前に行うと特に効果的', '反対側も同様に'],
    recommendedSets: 2,
    sport: ['hiking', 'dance', 'running', 'gymnastics'],
  },
  {
    id: 'patellar-tendon-quad-stretch',
    nameJa: '膝蓋腱・大腿四頭筋ストレッチ（ジャンパー膝予防）',
    descriptionJa: '大腿四頭筋遠位部と膝蓋腱を重点的に伸ばす。バスケ・バレーのジャンプ着地で起きやすいジャンパー膝の予防に特化した種目。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 2,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['片足立ちになり、ケアしたい側の足首をつかむ', '踵をお尻にしっかり密着させる（通常のクアッドストレッチより深く）', 'おへそを引き込み、骨盤を後傾させて腰を反らせない', '膝の前面〜腱の張りを感じながら15秒キープ', '壁に手をついてバランスを補助', '左右各3セット'],
    recommendedSets: 3,
    sport: ['basketball', 'volleyball', 'running'],
  },
  {
    id: 'finger-flexor-stretch',
    nameJa: '指屈筋ストレッチ（クライミング向け）',
    descriptionJa: '浅指屈筋・深指屈筋とA2プーリー周辺の緊張を解放する。ボルダリング・クライミングで最多発する指プーリー損傷の予防に。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['shoulder'],
    scenes: ['home', 'serious'],
    steps: ['反対の手で親指から小指まで一指ずつ背屈方向に伸ばす', '各指10秒、急に力を入れず徐々に圧をかける', '指の付け根（A2プーリー付近）に痛みがあれば即中止', '両手10本指行う', 'ウォームアップ前には軽めに、クライミング後はしっかり行う'],
    recommendedSets: 1,
    sport: ['climbing'],
  },
  {
    id: 'cobra-sphinx-stretch',
    nameJa: 'コブラ／スフィンクスポーズ（胸椎伸展）',
    descriptionJa: '腹直筋の伸展と胸椎後彎の解消を同時に行う。サーフィンのテイクオフ姿勢・水泳のバタフライ種目・体操のバックベンド準備に。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 2,
    bodyParts: ['back'],
    scenes: ['home', 'serious'],
    steps: ['うつ伏せになり、肘を肩の下に置いて前腕を床につける（スフィンクス）', '肘で床を押しながら胸を持ち上げる', '腰が痛い場合はこの前腕バージョンのまま30秒', '余裕があれば手のひらに変えてコブラポーズへ移行', '骨盤を床につけたまま、目線は正面〜やや上に'],
    recommendedSets: 2,
    sport: ['surfing', 'swimming', 'gymnastics', 'yoga'],
  },
  {
    id: 'neck-isometric-activation',
    nameJa: '頸部等尺アクティベーション（コンタクト競技向け）',
    descriptionJa: '頸部の屈筋・伸筋・側屈筋を等尺収縮で活性化する。ラグビーのスクラムや格闘技の接触前の首を安定させ、頸椎捻挫を予防するリハビリ由来の種目。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['neck'],
    scenes: ['home', 'serious'],
    steps: ['背筋を伸ばして座る（または立つ）', '手のひらを額に当て、5秒間前方向に押す（頭は動かさない）', '手のひらを後頭部に当て、5秒間後方向に押す', '右手のひらを右こめかみに当て、5秒間右方向に押す', '左側も同様に', '各方向3セット、息を止めない'],
    recommendedSets: 2,
    sport: ['rugby', 'martial-arts'],
  },
  {
    id: 'shoulder-flexion-overhead-stretch',
    nameJa: '肩屈曲オーバーヘッドストレッチ',
    descriptionJa: '広背筋・三角筋後部を伸ばしながら肩関節屈曲の可動域を最大化する。水泳・体操・サーフィンのオーバーヘッド動作に必要なROMを確保する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 1,
    bodyParts: ['shoulder', 'back'],
    scenes: ['home', 'serious'],
    steps: ['四つん這いになり、両手を肩幅で前方の壁につける（腕が床と並行）', 'お尻をかかと方向にゆっくり引いていく', '腕の付け根〜脇腹にかけての伸びを感じながら20〜30秒キープ', '頭は腕の間に下げる', 'お尻が完全に下りなくてもよい'],
    recommendedSets: 2,
    sport: ['swimming', 'gymnastics', 'surfing', 'yoga'],
  },
  {
    id: 'split-prep-stretch',
    nameJa: 'スプリット準備ストレッチ（前後開脚向け）',
    descriptionJa: 'ハムストリングスと腸腰筋を交互に深くストレッチし、前後開脚（スプリット）に向けた柔軟性を段階的に獲得する。体操・ダンス・武道に。',
    image: placeholder,
    durationSeconds: 40,
    difficulty: 3,
    bodyParts: ['leg', 'hip'],
    scenes: ['serious'],
    steps: ['片膝立ちランジの姿勢から始める（右足前）', '前足をゆっくりまっすぐ前方へ伸ばし、ハムストリングスへ重心移動', '太もも裏の伸びを感じながら20秒キープ', '元のランジ姿勢に戻り、今度は上体を起こして股関節前面（腸腰筋）を20秒', 'これを1セットとして交互に繰り返す', '反対側も同様に'],
    recommendedSets: 3,
    sport: ['gymnastics', 'dance', 'martial-arts'],
  },
  {
    id: 'standing-wall-hamstring',
    nameJa: '壁ハイキック・ハムストリングスストレッチ',
    descriptionJa: '立位で足を壁に沿って高く上げ、ハムストリングスと坐骨神経モビリティを改善する。格闘技のハイキックやダンスのレッグスイングに必要な可動域を獲得する。',
    image: placeholder,
    durationSeconds: 30,
    difficulty: 2,
    bodyParts: ['leg'],
    scenes: ['home', 'serious'],
    steps: ['壁の横に立ち、壁に手をついてバランスを取る', '内側の足（壁側の足）をゆっくり前方〜横方向へ高く上げる', '膝はできるだけ伸ばし、太もも裏の伸びを感じながら30秒キープ', '無理に高く上げず、伸びを感じる範囲で', '反対側も同様に'],
    recommendedSets: 2,
    sport: ['martial-arts', 'dance', 'gymnastics'],
  },
```

- [ ] **Step 3: TypeScriptエラーがないことを確認**

```bash
npx tsc --noEmit
```

Expected: エラーなし（`sport` はオプショナルなのでimageの型エラーなどは出ない）

- [ ] **Step 4: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: PASS（`sport` はオプショナルなので既存テストへの影響なし）

- [ ] **Step 5: コミット**

```bash
git add src/data/stretches.ts
git commit -m "feat: add sport tags to 38 existing stretches and add 15 new sport-specific stretches"
```

---

## Task 3: `prescription.ts` — normalizeSport TDD

**Files:**
- Modify: `__tests__/prescription.test.ts`
- Modify: `src/utils/prescription.ts`

- [ ] **Step 1: `__tests__/prescription.test.ts` に `normalizeSport` のテストを追加**

ファイル末尾に以下を追記：

```typescript
describe('normalizeSport', () => {
  it('matches Japanese sport name exactly', () => {
    expect(normalizeSport('ランニング')).toBe('running');
    expect(normalizeSport('ゴルフ')).toBe('golf');
    expect(normalizeSport('サッカー')).toBe('soccer');
    expect(normalizeSport('筋トレ')).toBe('weighttraining');
    expect(normalizeSport('クライミング')).toBe('climbing');
    expect(normalizeSport('ボルダリング')).toBe('climbing');
  });

  it('matches alias variants', () => {
    expect(normalizeSport('フットボール')).toBe('soccer');
    expect(normalizeSport('ジョギング')).toBe('running');
    expect(normalizeSport('ウエイトトレーニング')).toBe('weighttraining');
    expect(normalizeSport('登山')).toBe('hiking');
    expect(normalizeSport('格闘技')).toBe('martial-arts');
    expect(normalizeSport('空手')).toBe('martial-arts');
    expect(normalizeSport('自転車競技')).toBe('road-cycling');
    expect(normalizeSport('ロードバイク')).toBe('road-cycling');
  });

  it('is case-insensitive for English', () => {
    expect(normalizeSport('RUNNING')).toBe('running');
    expect(normalizeSport('Running')).toBe('running');
    expect(normalizeSport('Soccer')).toBe('soccer');
  });

  it('returns null for unknown sport', () => {
    expect(normalizeSport('謎のスポーツ')).toBeNull();
    expect(normalizeSport('')).toBeNull();
    expect(normalizeSport('   ')).toBeNull();
  });

  it('matches partial input for common variants', () => {
    expect(normalizeSport('マラソン')).toBe('running');
    expect(normalizeSport('新体操')).toBe('gymnastics');
  });
});
```

importに `normalizeSport` を追加：
```typescript
import { getPrescription, getCompletedMinutes, getSessionStretchIds, normalizeSport } from '../src/utils/prescription';
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest __tests__/prescription.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `normalizeSport is not exported`

- [ ] **Step 3: `src/utils/prescription.ts` に SPORT_ALIASES + SPORT_LABEL + SPORT_PRESCRIPTION + normalizeSport を追加**

`import` 文の後、`BODY_PRESCRIPTION` の前に以下を追加：

```typescript
export const SPORT_LABEL: Record<string, string> = {
  running: 'ランニング',
  golf: 'ゴルフ',
  tennis: 'テニス',
  swimming: '水泳',
  cycling: 'サイクリング',
  weighttraining: '筋トレ',
  soccer: 'サッカー',
  baseball: '野球',
  basketball: 'バスケ',
  badminton: 'バドミントン',
  yoga: 'ヨガ',
  hiking: '登山',
  volleyball: 'バレー',
  'martial-arts': '格闘技',
  skiing: 'スキー',
  tabletennis: '卓球',
  dance: 'ダンス',
  climbing: 'クライミング',
  rugby: 'ラグビー',
  surfing: 'サーフィン',
  'road-cycling': '自転車競技',
  gymnastics: '体操',
};

export const SPORT_SUGGESTIONS: Array<{ key: string; label: string }> = Object.entries(SPORT_LABEL).map(
  ([key, label]) => ({ key, label }),
);

const SPORT_ALIASES: Record<string, string[]> = {
  running: ['ランニング', 'ジョギング', 'マラソン', 'running', 'jogging', 'marathon'],
  golf: ['ゴルフ', 'golf'],
  tennis: ['テニス', 'tennis'],
  swimming: ['水泳', 'スイミング', 'swimming'],
  cycling: ['サイクリング', 'cycling'],
  weighttraining: ['筋トレ', 'ウエイトトレーニング', '筋力トレーニング', 'weight training', 'gym', 'ジム'],
  soccer: ['サッカー', 'フットボール', 'soccer', 'football'],
  baseball: ['野球', 'ソフトボール', 'baseball', 'softball'],
  basketball: ['バスケットボール', 'バスケ', 'basketball'],
  badminton: ['バドミントン', 'badminton'],
  yoga: ['ヨガ', 'yoga'],
  hiking: ['登山', 'ハイキング', 'トレッキング', 'hiking', 'mountaineering', 'trekking'],
  volleyball: ['バレーボール', 'バレー', 'volleyball'],
  'martial-arts': ['格闘技', '武道', '空手', '柔道', '柔術', '剣道', 'martial arts', 'karate', 'judo', 'bjj'],
  skiing: ['スキー', 'スノーボード', 'skiing', 'snowboard', 'snowboarding'],
  tabletennis: ['卓球', 'table tennis', 'ping pong', 'ピンポン'],
  dance: ['ダンス', 'ヒップホップ', 'バレエ', 'dance', 'ballet', 'hip hop'],
  climbing: ['クライミング', 'ボルダリング', 'climbing', 'bouldering'],
  rugby: ['ラグビー', 'rugby'],
  surfing: ['サーフィン', '水上スポーツ', 'サップ', 'surfing', 'sup', 'paddleboarding'],
  'road-cycling': ['自転車競技', 'ロードレース', 'ロードバイク', 'road cycling', 'road bike', '自転車'],
  gymnastics: ['体操', '新体操', '器械体操', 'gymnastics', 'rhythmic gymnastics'],
};

const SPORT_PRESCRIPTION: Record<string, string[]> = {
  running: ['iliopsoas-stretch', 'hamstring', 'it-band-stretch', 'calf', 'piriformis-stretch'],
  golf: ['thoracic-open-book', 'spinal-twist', 'quadratus-lumborum-stretch', 'shoulder-cross', 'wrist-flexor-stretch'],
  tennis: ['sleeper-stretch', 'wrist-extensor-stretch', 'shoulder-cross', 'adductor-stretch', 'calf'],
  swimming: ['shoulder-full', 'pec-wall-stretch', 'lat-stretch', 'thoracic-open-book', 'ankle-plantar-flexion-stretch'],
  cycling: ['iliopsoas-stretch', 'hamstring', 'thoracic-extension', 'levator-scapula-stretch', 'quadratus-lumborum-stretch'],
  weighttraining: ['cat-cow', 'thoracic-open-book', 'pec-wall-stretch', 'lat-stretch', 'ankle-dorsiflexion-stretch'],
  soccer: ['adductor-stretch', 'hamstring', 'iliopsoas-stretch', 'calf', 'pigeon'],
  baseball: ['sleeper-stretch', 'shoulder-cross', 'thoracic-open-book', 'wrist-flexor-stretch', 'pigeon'],
  basketball: ['calf', 'quad-stretch', 'ankle-dorsiflexion-stretch', 'hamstring', 'patellar-tendon-quad-stretch'],
  badminton: ['shoulder-full', 'sleeper-stretch', 'calf', 'adductor-stretch', 'wrist-extensor-stretch'],
  yoga: ['cat-cow', 'pigeon', 'butterfly', 'child-pose', 'diaphragm-breathing'],
  hiking: ['quad-stretch', 'calf', 'it-band-stretch', 'piriformis-stretch', 'plantar-fascia-stretch'],
  volleyball: ['shoulder-full', 'pec-wall-stretch', 'calf', 'sleeper-stretch', 'patellar-tendon-quad-stretch'],
  'martial-arts': ['butterfly', 'adductor-stretch', 'pigeon', 'neck-isometric-activation', 'standing-wall-hamstring'],
  skiing: ['quad-stretch', 'adductor-stretch', 'iliopsoas-stretch', 'tibialis-anterior-stretch', 'ankle-dorsiflexion-stretch'],
  tabletennis: ['wrist-flexor-stretch', 'wrist-extensor-stretch', 'levator-scapula-stretch', 'quadratus-lumborum-stretch', 'adductor-stretch'],
  dance: ['butterfly', 'pigeon', 'hamstring', 'thoracic-open-book', 'plantar-fascia-stretch'],
  climbing: ['wrist-flexor-stretch', 'finger-flexor-stretch', 'lat-stretch', 'shoulder-cross', 'pigeon'],
  rugby: ['neck-isometric-activation', 'hamstring', 'adductor-stretch', 'iliopsoas-stretch', 'pec-wall-stretch'],
  surfing: ['cobra-sphinx-stretch', 'thoracic-extension', 'pec-wall-stretch', 'pigeon', 'shoulder-flexion-overhead-stretch'],
  'road-cycling': ['iliopsoas-stretch', 'hamstring', 'thoracic-extension', 'levator-scapula-stretch', 'wrist-flexor-stretch'],
  gymnastics: ['split-prep-stretch', 'thoracic-extension', 'butterfly', 'shoulder-flexion-overhead-stretch', 'ankle-plantar-flexion-stretch'],
};

export function normalizeSport(input: string): string | null {
  if (!input.trim()) return null;
  const normalized = input.trim().toLowerCase();
  // Pass 1: exact match
  for (const [key, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === normalized)) return key;
  }
  // Pass 2: partial includes match
  for (const [key, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a.toLowerCase()) || a.toLowerCase().includes(normalized))) return key;
  }
  return null;
}
```

- [ ] **Step 4: テストが通ることを確認**

```bash
npx jest __tests__/prescription.test.ts --no-coverage 2>&1 | tail -10
```

Expected: `normalizeSport` テストのみ通過、`getPrescription` sport テストはまだ存在しないためここはPASS

- [ ] **Step 5: コミット**

```bash
git add src/utils/prescription.ts __tests__/prescription.test.ts
git commit -m "feat: add normalizeSport, SPORT_PRESCRIPTION, SPORT_ALIASES to prescription.ts"
```

---

## Task 4: `prescription.ts` — `getPrescription` にスポーツ処方を追加（TDD）

**Files:**
- Modify: `__tests__/prescription.test.ts`
- Modify: `src/utils/prescription.ts`

- [ ] **Step 1: `__tests__/prescription.test.ts` にスポーツ処方テストを追加**

ファイル末尾（`normalizeSport` のdescribeの後）に追記：

```typescript
describe('getPrescription with sport', () => {
  it('includes sport prescription stretches', () => {
    const result = getPrescription(mockStretches, [], 'home', 'running');
    // running prescription: iliopsoas-stretch, hamstring, it-band-stretch, calf, piriformis-stretch
    expect(result.stretchIds).toContain('hamstring');
    expect(result.stretchIds).toContain('calf');
    expect(result.stretchIds).toContain('iliopsoas-stretch');
  });

  it('unions bodyParts and sport prescriptions', () => {
    // neck bodyParts → chin-tuck, levator-scapula-stretch, neck-side
    // soccer sport → adductor-stretch, hamstring, iliopsoas-stretch, calf, pigeon (filtered by scene)
    const result = getPrescription(mockStretches, ['neck'], 'home', 'soccer');
    expect(result.stretchIds).toContain('neck-side');
    expect(result.stretchIds).toContain('hamstring');
  });

  it('deduplicates stretches appearing in both prescriptions', () => {
    // hamstring は running にも soccer にも含まれる
    const result = getPrescription(mockStretches, [], 'home', 'running');
    const count = result.stretchIds.filter((id) => id === 'hamstring').length;
    expect(count).toBe(1);
  });

  it('filters sport prescription stretches by scene', () => {
    // pigeon は home/serious のみ。office ユーザーの soccer 処方には含まれない
    const result = getPrescription(mockStretches, [], 'office', 'soccer');
    expect(result.stretchIds).not.toContain('pigeon');
  });

  it('includes sport name in label', () => {
    const result = getPrescription(mockStretches, ['neck'], 'home', 'running');
    expect(result.label).toContain('ランニング');
    expect(result.label).toContain('首こり');
  });

  it('returns sport-only label when bodyParts is empty', () => {
    const result = getPrescription(mockStretches, [], 'home', 'running');
    expect(result.label).toBe('ランニング');
  });

  it('returns empty prescription when both bodyParts and sport are empty', () => {
    const result = getPrescription(mockStretches, [], 'office', undefined);
    expect(result.stretchIds).toHaveLength(0);
    expect(result.label).toBe('');
  });

  it('calculates totalMinutes across both prescriptions', () => {
    const result = getPrescription(mockStretches, ['neck'], 'home', 'running');
    expect(result.totalMinutes).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest __tests__/prescription.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `getPrescription` が `sport` 引数を受け取らないため

- [ ] **Step 3: `src/utils/prescription.ts` の `getPrescription` を更新**

関数シグネチャと実装を以下に置き換える：

```typescript
export function getPrescription(
  stretches: Stretch[],
  bodyParts: BodyPart[],
  scene: Scene,
  sport?: string,
): Prescription {
  const stretchMap = new Map(stretches.map((s) => [s.id, s]));
  const seen = new Set<string>();
  const stretchIds: string[] = [];

  function addIfEligible(id: string) {
    if (seen.has(id)) return;
    const stretch = stretchMap.get(id);
    if (!stretch) return;
    if (!stretch.scenes.includes(scene)) return;
    seen.add(id);
    stretchIds.push(id);
  }

  // bodyParts 処方
  for (const bp of bodyParts) {
    for (const id of BODY_PRESCRIPTION[bp]) {
      addIfEligible(id);
    }
  }

  // スポーツ処方
  if (sport && SPORT_PRESCRIPTION[sport]) {
    for (const id of SPORT_PRESCRIPTION[sport]) {
      addIfEligible(id);
    }
  }

  if (stretchIds.length === 0) {
    return { stretchIds: [], totalMinutes: 0, label: '' };
  }

  const totalSeconds = stretchIds.reduce((sum, id) => {
    const s = stretchMap.get(id);
    return s ? sum + s.durationSeconds * s.recommendedSets : sum;
  }, 0);

  const bodyLabel = bodyParts.map((bp) => BODY_LABEL[bp]);
  const sportLabel = sport && SPORT_LABEL[sport] ? [SPORT_LABEL[sport]] : [];
  const label = [...bodyLabel, ...sportLabel].join(' + ');

  return { stretchIds, totalMinutes: Math.ceil(totalSeconds / 60), label };
}
```

- [ ] **Step 4: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過

- [ ] **Step 5: コミット**

```bash
git add src/utils/prescription.ts __tests__/prescription.test.ts
git commit -m "feat: add sport parameter to getPrescription with union prescription"
```

---

## Task 5: `useUserStore` に `sport` と `setSport` を追加（TDD）

**Files:**
- Modify: `__tests__/useUserStore.test.ts`
- Modify: `src/store/useUserStore.ts`

- [ ] **Step 1: `__tests__/useUserStore.test.ts` にテストを追加**

ファイル末尾の `markStretchesCompleted` describeの後に追記：

```typescript
describe('setSport', () => {
  it('sets sport', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setSport('running'));
    expect(result.current.sport).toBe('running');
  });

  it('initial sport is empty string', () => {
    const { result } = renderHook(() => useUserStore());
    expect(result.current.sport).toBe('');
  });

  it('can clear sport', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setSport('golf'));
    act(() => result.current.setSport(''));
    expect(result.current.sport).toBe('');
  });
});
```

- [ ] **Step 2: テストが失敗することを確認**

```bash
npx jest __tests__/useUserStore.test.ts --no-coverage 2>&1 | tail -10
```

Expected: FAIL — `setSport is not a function` または `sport` が undefined

- [ ] **Step 3: `src/store/useUserStore.ts` を更新**

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { BodyPart, Scene, UserProfile } from '../types';

interface DailyProgress {
  date: string;
  completedStretchIds: string[];
}

interface UserStore extends UserProfile {
  dailyProgress: DailyProgress;
  setBodyParts: (parts: BodyPart[]) => void;
  setScene: (scene: Scene) => void;
  setSport: (sport: string) => void;
  setNotificationEnabled: (enabled: boolean) => void;
  setNotificationTimes: (times: string[]) => void;
  completeOnboarding: () => void;
  markStretchesCompleted: (ids: string[]) => void;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set) => ({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      sport: '',
      notificationEnabled: false,
      notificationTimes: [],
      dailyProgress: { date: '', completedStretchIds: [] },
      setBodyParts: (bodyParts) => set({ bodyParts }),
      setScene: (scene) => set({ scene }),
      setSport: (sport) => set({ sport }),
      setNotificationEnabled: (notificationEnabled) => set({ notificationEnabled }),
      setNotificationTimes: (notificationTimes) => set({ notificationTimes }),
      completeOnboarding: () => set({ onboardingCompleted: true }),
      markStretchesCompleted: (ids) =>
        set((state) => {
          const today = new Date().toISOString().slice(0, 10);
          const existing =
            state.dailyProgress.date === today ? state.dailyProgress.completedStretchIds : [];
          const merged = Array.from(new Set([...existing, ...ids]));
          return { dailyProgress: { date: today, completedStretchIds: merged } };
        }),
    }),
    {
      name: 'user-profile',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
```

- [ ] **Step 4: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過

- [ ] **Step 5: コミット**

```bash
git add src/store/useUserStore.ts __tests__/useUserStore.test.ts
git commit -m "feat: add sport field and setSport to useUserStore"
```

---

## Task 6: `Step3Sport` 画面を作成

**Files:**
- Create: `src/screens/onboarding/Step3Sport.tsx`

注意: このタスクでは navigation に接続しない（Task 7で行う）。`navigation.navigate('Step4')` を呼び出すが、型エラーはTask 7完了後に解消される。

- [ ] **Step 1: `src/screens/onboarding/Step3Sport.tsx` を作成**

```typescript
import React, { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { SPORT_SUGGESTIONS, normalizeSport } from '../../utils/prescription';
import { useUserStore } from '../../store/useUserStore';
import { OnboardingStackParamList } from '../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList>;

export default function Step3Sport() {
  const navigation = useNavigation<Nav>();
  const setSport = useUserStore((s) => s.setSport);
  const [input, setInput] = useState('');

  const filtered = input.trim().length === 0
    ? SPORT_SUGGESTIONS
    : SPORT_SUGGESTIONS.filter((s) =>
        s.label.includes(input) || s.key.toLowerCase().includes(input.toLowerCase())
      );

  function handleSelect(key: string) {
    setSport(key);
    navigation.navigate('Step4');
  }

  function handleSkip() {
    setSport('');
    navigation.navigate('Step4');
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>スポーツを教えてください</Text>
      <Text style={styles.subtitle}>取り組んでいるスポーツに合わせたケアを処方します</Text>

      <TextInput
        style={styles.input}
        placeholder="例：ランニング、ゴルフ、サッカー…"
        value={input}
        onChangeText={setInput}
        autoCapitalize="none"
        returnKeyType="done"
      />

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.key}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable style={styles.suggestion} onPress={() => handleSelect(item.key)}>
            <Text style={styles.suggestionText}>{item.label}</Text>
          </Pressable>
        )}
        style={styles.list}
      />

      <TouchableOpacity style={styles.skip} onPress={handleSkip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 24 },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  list: { flex: 1 },
  suggestion: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: { fontSize: 16, color: '#333' },
  skip: { alignItems: 'center', paddingVertical: 16 },
  skipText: { color: '#aaa', fontSize: 15 },
});
```

- [ ] **Step 2: TypeScriptエラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep "Step3Sport"
```

Expected: `Step4` が未定義の型エラーが出る可能性あり（Task 7で解消する）。`Step3Sport` 自体のエラーがなければOK。

- [ ] **Step 3: コミット**

```bash
git add src/screens/onboarding/Step3Sport.tsx
git commit -m "feat: add Step3Sport onboarding screen with sport text input and suggestions"
```

---

## Task 7: ナビゲーション変更

**Files:**
- Rename + Modify: `src/screens/onboarding/Step3Notifications.tsx` → `src/screens/onboarding/Step4Notifications.tsx`
- Modify: `src/navigation/index.tsx`
- Modify: `src/screens/onboarding/Step2Scene.tsx`

- [ ] **Step 1: `Step3Notifications.tsx` を `Step4Notifications.tsx` にリネームし、コンポーネント名を変更**

`src/screens/onboarding/Step4Notifications.tsx` として新規作成（Step3Notifications.tsxの内容をコピーしてコンポーネント名だけ変更）：

```typescript
import React, { useState } from 'react';
import { Alert, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { requestPermissions, scheduleNotifications } from '../../notifications';
import { useUserStore } from '../../store/useUserStore';

const DEFAULT_TIMES = ['09:00', '13:00', '18:00'];

export default function Step4Notifications() {
  const { completeOnboarding, setNotificationEnabled, setNotificationTimes } = useUserStore();
  const [loading, setLoading] = useState(false);

  async function handleEnable() {
    setLoading(true);
    const granted = await requestPermissions();
    if (!granted) {
      Alert.alert(
        '通知が許可されていません',
        '設定アプリから通知を許可してください',
        [{ text: '設定を開く', onPress: () => Linking.openSettings() }, { text: 'キャンセル' }]
      );
      setLoading(false);
      return;
    }
    await scheduleNotifications(DEFAULT_TIMES);
    setNotificationEnabled(true);
    setNotificationTimes(DEFAULT_TIMES);
    completeOnboarding();
    setLoading(false);
  }

  function handleSkip() {
    setNotificationEnabled(false);
    completeOnboarding();
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>通知でリマインド</Text>
      <Text style={styles.subtitle}>毎日この時間にお知らせします</Text>
      <View style={styles.timesBox}>
        {DEFAULT_TIMES.map((t) => (
          <Text key={t} style={styles.time}>{t}</Text>
        ))}
      </View>
      <Text style={styles.note}>通知時間は後から設定で変更できます</Text>
      <TouchableOpacity style={styles.button} onPress={handleEnable} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '設定中...' : '通知を有効にする'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.skip} onPress={handleSkip}>
        <Text style={styles.skipText}>スキップ</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#555', textAlign: 'center', marginBottom: 24 },
  timesBox: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginBottom: 12 },
  time: { fontSize: 28, fontWeight: 'bold', color: '#4CAF50' },
  note: { textAlign: 'center', color: '#aaa', fontSize: 12, marginBottom: 40 },
  button: { backgroundColor: '#4CAF50', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  skip: { alignItems: 'center' },
  skipText: { color: '#aaa', fontSize: 15 },
});
```

- [ ] **Step 2: `src/navigation/index.tsx` を更新**

```typescript
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useUserStore } from '../store/useUserStore';
import { MainTabParamList, OnboardingStackParamList, RootStackParamList } from '../types';
import Step1BodyParts from '../screens/onboarding/Step1BodyParts';
import Step2Scene from '../screens/onboarding/Step2Scene';
import Step3Sport from '../screens/onboarding/Step3Sport';
import Step4Notifications from '../screens/onboarding/Step4Notifications';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import SessionScreen from '../screens/SessionScreen';
import CompletionScreen from '../screens/CompletionScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const OnboardingStack = createNativeStackNavigator<OnboardingStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function OnboardingNavigator() {
  return (
    <OnboardingStack.Navigator screenOptions={{ headerShown: false }}>
      <OnboardingStack.Screen name="Step1" component={Step1BodyParts} />
      <OnboardingStack.Screen name="Step2" component={Step2Scene} />
      <OnboardingStack.Screen name="Step3Sport" component={Step3Sport} />
      <OnboardingStack.Screen name="Step4" component={Step4Notifications} />
    </OnboardingStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'ホーム' }} />
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ title: '設定' }} />
    </Tab.Navigator>
  );
}

export default function RootNavigator() {
  const onboardingCompleted = useUserStore((s) => s.onboardingCompleted);
  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingCompleted ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <>
            <RootStack.Screen name="Main" component={MainTabs} />
            <RootStack.Screen
              name="Session"
              component={SessionScreen}
              options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
            />
            <RootStack.Screen name="Completion" component={CompletionScreen} />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
```

- [ ] **Step 3: `src/screens/onboarding/Step2Scene.tsx` の navigate先を更新**

`navigation.navigate('Step3')` を `navigation.navigate('Step3Sport')` に変更する。

Step2Scene.tsxを読み込み、`'Step3'` を `'Step3Sport'` に変更する（1箇所のみ）。

- [ ] **Step 4: 旧 `Step3Notifications.tsx` を削除**

```bash
rm src/screens/onboarding/Step3Notifications.tsx
```

- [ ] **Step 5: TypeScriptエラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: Step3Sport/Step4Notifications に関するエラーなし

- [ ] **Step 6: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: PASS

- [ ] **Step 7: コミット**

```bash
git add src/navigation/index.tsx src/screens/onboarding/Step3Sport.tsx src/screens/onboarding/Step4Notifications.tsx src/screens/onboarding/Step2Scene.tsx
git rm src/screens/onboarding/Step3Notifications.tsx
git commit -m "feat: insert Step3Sport into onboarding flow, rename Step3Notifications to Step4Notifications"
```

---

## Task 8: `HomeScreen` を更新してスポーツ処方を反映

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: `src/screens/HomeScreen.tsx` の `useUserStore` と `getPrescription` 呼び出しを更新**

`HomeScreen.tsx` を読み込み、以下の2箇所を変更する：

**変更1:** `useUserStore` の分割代入に `sport` を追加

```typescript
// 変更前
const { bodyParts, scene, dailyProgress } = useUserStore();

// 変更後
const { bodyParts, scene, sport, dailyProgress } = useUserStore();
```

**変更2:** `getPrescription` に `sport` を渡す

```typescript
// 変更前
const prescription = getPrescription(ALL_STRETCHES, bodyParts, scene);

// 変更後
const prescription = getPrescription(ALL_STRETCHES, bodyParts, scene, sport || undefined);
```

- [ ] **Step 2: 全テストが通ることを確認**

```bash
npx jest --no-coverage
```

Expected: 全テスト通過

- [ ] **Step 3: TypeScriptエラーがないことを確認**

```bash
npx tsc --noEmit 2>&1 | grep "HomeScreen"
```

Expected: エラーなし

- [ ] **Step 4: コミット**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: pass sport to getPrescription in HomeScreen"
```

---

## Self-Review

**スペックカバレッジ確認:**
- ✅ Section 1-1: Stretch型にsport追加 → Task 1
- ✅ Section 1-2: UserProfile.sport追加 → Task 1, 5
- ✅ Section 1-3: OnboardingStackParamList更新 → Task 1
- ✅ Section 2-1: 既存38種にsportタグ → Task 2 Step 1
- ✅ Section 2-2: 新規15種追加 → Task 2 Step 2
- ✅ Section 3-1: SPORT_PRESCRIPTION → Task 3
- ✅ Section 3-2: SPORT_ALIASES → Task 3
- ✅ Section 3-3: normalizeSport → Task 3
- ✅ Section 3-4: getPrescription更新 → Task 4
- ✅ Section 3-5: SPORT_LABEL → Task 3
- ✅ Section 4: useUserStore sport + setSport → Task 5
- ✅ Section 5-1: Step3Sport画面 → Task 6
- ✅ Section 5-2: Step4Notificationsリネーム → Task 7
- ✅ Section 5-3/5-4: navigation更新 + Step2変更 → Task 7
- ✅ Section 6: HomeScreen更新 → Task 8

**プレースホルダースキャン:** なし。全ステップに実装コードを記載済み。

**型整合性確認:**
- `OnboardingStackParamList.Step3Sport` はTask 1で追加、Task 6で使用 ✅
- `OnboardingStackParamList.Step4` はTask 1で追加、Task 7で使用 ✅
- `UserProfile.sport: string` はTask 1で追加、Task 5で実装 ✅
- `setPrescription(stretches, bodyParts, scene, sport?)` はTask 4で変更、Task 8で使用 ✅
- `SPORT_SUGGESTIONS` はTask 3でexport、Task 6でimport ✅
- `normalizeSport` はTask 3でexport、Task 6でimport ✅
- `SPORT_LABEL` はTask 3でexport（`DailyMustCard`ラベルは`prescription.label`経由で自動反映） ✅
