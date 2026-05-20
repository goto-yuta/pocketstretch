# スポーツ特化ストレッチ拡張 設計ドキュメント

## 概要

ストレッチライブラリを38種→53種に拡充し、22スポーツへの特化対応を追加する。ユーザーはオンボーディングで自分のスポーツを入力でき、「今日のマスト」処方がボディパーツ＋スポーツの両軸から最適なメニューを組む。

## アーキテクチャ

既存の `BODY_PRESCRIPTION` パターンを踏襲し、`SPORT_PRESCRIPTION` レイヤーを追加する（置き換えではなくunion）。処方関数のシグネチャに `sport?: string` を加えるだけで既存コードへの影響を最小化する。

---

## 1. データモデル変更

### 1-1. `Stretch` 型（`src/types/index.ts`）

```typescript
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
  sport?: string[];  // 追加: 対応スポーツの正規化キー配列
}
```

### 1-2. `UserProfile` 型（`src/types/index.ts`）

```typescript
export interface UserProfile {
  onboardingCompleted: boolean;
  bodyParts: BodyPart[];
  scene: Scene;
  sport: string;  // 追加: 正規化済みスポーツキー or '' (未設定)
  notificationEnabled: boolean;
  notificationTimes: string[];
}
```

### 1-3. ナビゲーション型（`src/types/index.ts`）

```typescript
export type OnboardingStackParamList = {
  Step1: undefined;
  Step2: undefined;
  Step3Sport: undefined;  // 追加
  Step4: undefined;       // Step3 → Step4 にリネーム
};
```

---

## 2. ストレッチデータ拡充（`src/data/stretches.ts`）

### 2-1. 既存38種にsportタグを付与

全ストレッチに `sport?: string[]` を追加。主な対応：

| id | sport タグ例 |
|---|---|
| `hamstring` | `['running', 'soccer', 'basketball', 'hiking', 'cycling', 'baseball', 'rugby', 'dance', 'gymnastics']` |
| `calf` | `['running', 'basketball', 'soccer', 'hiking', 'volleyball', 'badminton', 'skiing']` |
| `iliopsoas-stretch` | `['running', 'cycling', 'soccer', 'baseball', 'skiing', 'swimming', 'surfing', 'road-cycling']` |
| `thoracic-open-book` | `['golf', 'swimming', 'baseball', 'surfing', 'gymnastics', 'weighttraining']` |
| `pigeon` | `['running', 'soccer', 'basketball', 'hiking', 'cycling', 'golf', 'yoga', 'dance', 'gymnastics', 'skiing', 'martial-arts']` |
| `shoulder-cross` | `['tennis', 'baseball', 'badminton', 'volleyball', 'swimming', 'golf']` |
| `adductor-stretch` | `['soccer', 'basketball', 'badminton', 'martial-arts', 'skiing', 'dance', 'gymnastics', 'rugby']` |
| `butterfly` | `['yoga', 'martial-arts', 'gymnastics', 'dance', 'soccer']` |
| `it-band-stretch` | `['running', 'cycling', 'hiking', 'basketball']` |
| `pec-wall-stretch` | `['swimming', 'baseball', 'volleyball', 'rugby', 'surfing', 'weighttraining']` |
| `cat-cow` | `['yoga', 'surfing', 'weighttraining', 'cycling']` |
| `child-pose` | `['yoga', 'hiking', 'skiing', 'surfing', 'gymnastics']` |
| `quad-stretch` | `['running', 'basketball', 'soccer', 'hiking', 'skiing', 'volleyball', 'gymnastics']` |
| `spinal-twist` | `['golf', 'yoga', 'badminton', 'martial-arts']` |
| `diaphragm-breathing` | `['yoga', 'martial-arts', 'swimming']` |
| `piriformis-stretch` | `['running', 'cycling', 'road-cycling', 'soccer', 'hiking']` |
| `levator-scapula-stretch` | `['cycling', 'road-cycling', 'swimming', 'tabletennis']` |
| `wall-slide` | `['volleyball', 'swimming', 'weighttraining']` |
| `ankle-rotation` | `['running', 'soccer', 'basketball', 'hiking', 'badminton']` |
| `quadratus-lumborum-stretch` | `['golf', 'cycling', 'road-cycling', 'tabletennis']` |
| `chin-tuck` | `['cycling', 'road-cycling', 'tabletennis']` |
| `forward-fold` | `['yoga', 'gymnastics', 'dance', 'martial-arts']` |
| `lunge` | `['running', 'soccer', 'basketball', 'hiking', 'martial-arts']` |
| `seated-twist` | `['golf', 'yoga', 'tabletennis']` |
| `thoracic-extension` | `['cycling', 'road-cycling', 'surfing', 'gymnastics']` |
| `pelvic-tilt` | `['running', 'weighttraining', 'yoga']` |
| `standing-side-stretch` | `['yoga', 'dance', 'gymnastics']` |
| `supine-knee-hug` | `['running', 'yoga', 'hiking']` |
| `shoulder-full` | `['swimming', 'tennis', 'badminton', 'volleyball', 'baseball']` |
| `neck-full` | `['martial-arts', 'rugby']` |
| `deep-breath-chest-open` | `['yoga', 'swimming', 'weighttraining']` |

タグなし（汎用のまま）: `neck-side`, `shoulder-roll`, `chest-open`, `eye-neck-roll`, `energize-full-stretch`, `calf-raise-stretch`, `seated-hip`, `shoulder-cross` は `sport` フィールドを省略（どのスポーツにも使える汎用種目）。

### 2-2. 新規15種ストレッチ

以下を `ALL_STRETCHES` 配列末尾に追加する（全てスポーツ医学ベース）：

#### `wrist-flexor-stretch` — 手首屈筋ストレッチ（ゴルフ肘ケア）
```typescript
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
```

#### `wrist-extensor-stretch` — 手首伸筋ストレッチ（テニス肘ケア）
```typescript
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
```

#### `sleeper-stretch` — スリーパーストレッチ（肩後方関節包）
```typescript
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
```

#### `lat-stretch` — 広背筋ストレッチ
```typescript
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
```

#### `ankle-dorsiflexion-stretch` — 足関節背屈ストレッチ（ニートゥウォール）
```typescript
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
```

#### `ankle-plantar-flexion-stretch` — 足甲・足首底屈ストレッチ
```typescript
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
```

#### `tibialis-anterior-stretch` — 前脛骨筋ストレッチ
```typescript
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
```

#### `plantar-fascia-stretch` — 足底筋膜ストレッチ
```typescript
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
```

#### `patellar-tendon-quad-stretch` — 膝蓋腱・大腿四頭筋ストレッチ
```typescript
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
```

#### `finger-flexor-stretch` — 指屈筋ストレッチ（クライミング向け）
```typescript
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
```

#### `cobra-sphinx-stretch` — コブラ／スフィンクスポーズ
```typescript
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
```

#### `neck-isometric-activation` — 頸部等尺アクティベーション
```typescript
{
  id: 'neck-isometric-activation',
  nameJa: '頸部等尺アクティベーション（コンタクト競技向け）',
  descriptionJa: '頸部の屈筋・伸筋・側屈筋を等尺収縮で活性化する。ラグビーのスクラムや格闘技の接触前の首を安定させ、頸椎捻挫（むち打ち）を予防するリハビリ由来の種目。',
  image: placeholder,
  durationSeconds: 30,
  difficulty: 1,
  bodyParts: ['neck'],
  scenes: ['home', 'serious'],
  steps: ['背筋を伸ばして座る（または立つ）', '手のひらを額に当て、5秒間前方向に押す（頭は動かさない）', '手のひらを後頭部に当て、5秒間後方向に押す', '右手のひらを右こめかみ当て、5秒間右方向に押す', '左側も同様に', '各方向3セット、息を止めない'],
  recommendedSets: 2,
  sport: ['rugby', 'martial-arts'],
},
```

#### `shoulder-flexion-overhead-stretch` — 肩屈曲オーバーヘッドストレッチ
```typescript
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
```

#### `split-prep-stretch` — スプリット準備ストレッチ
```typescript
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
```

#### `standing-wall-hamstring` — 壁ハイキック・ハムストリングス
```typescript
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

---

## 3. `prescription.ts` 拡張

### 3-1. `SPORT_PRESCRIPTION` マッピング

```typescript
const SPORT_PRESCRIPTION: Record<string, string[]> = {
  running:      ['iliopsoas-stretch', 'hamstring', 'it-band-stretch', 'calf', 'piriformis-stretch'],
  golf:         ['thoracic-open-book', 'spinal-twist', 'quadratus-lumborum-stretch', 'shoulder-cross', 'wrist-flexor-stretch'],
  tennis:       ['sleeper-stretch', 'wrist-extensor-stretch', 'shoulder-cross', 'adductor-stretch', 'calf'],
  swimming:     ['shoulder-full', 'pec-wall-stretch', 'lat-stretch', 'thoracic-open-book', 'ankle-plantar-flexion-stretch'],
  cycling:      ['iliopsoas-stretch', 'hamstring', 'thoracic-extension', 'levator-scapula-stretch', 'quadratus-lumborum-stretch'],
  weighttraining: ['cat-cow', 'thoracic-open-book', 'pec-wall-stretch', 'lat-stretch', 'ankle-dorsiflexion-stretch'],
  soccer:       ['adductor-stretch', 'hamstring', 'iliopsoas-stretch', 'calf', 'pigeon'],
  baseball:     ['sleeper-stretch', 'shoulder-cross', 'thoracic-open-book', 'wrist-flexor-stretch', 'pigeon'],
  basketball:   ['calf', 'quad-stretch', 'ankle-dorsiflexion-stretch', 'hamstring', 'patellar-tendon-quad-stretch'],
  badminton:    ['shoulder-full', 'sleeper-stretch', 'calf', 'adductor-stretch', 'wrist-extensor-stretch'],
  yoga:         ['cat-cow', 'pigeon', 'butterfly', 'child-pose', 'diaphragm-breathing'],
  hiking:       ['quad-stretch', 'calf', 'it-band-stretch', 'piriformis-stretch', 'plantar-fascia-stretch'],
  volleyball:   ['shoulder-full', 'pec-wall-stretch', 'calf', 'sleeper-stretch', 'patellar-tendon-quad-stretch'],
  'martial-arts': ['butterfly', 'adductor-stretch', 'pigeon', 'neck-isometric-activation', 'standing-wall-hamstring'],
  skiing:       ['quad-stretch', 'adductor-stretch', 'iliopsoas-stretch', 'tibialis-anterior-stretch', 'ankle-dorsiflexion-stretch'],
  tabletennis:  ['wrist-flexor-stretch', 'wrist-extensor-stretch', 'levator-scapula-stretch', 'quadratus-lumborum-stretch', 'adductor-stretch'],
  dance:        ['butterfly', 'pigeon', 'hamstring', 'thoracic-open-book', 'plantar-fascia-stretch'],
  climbing:     ['wrist-flexor-stretch', 'finger-flexor-stretch', 'lat-stretch', 'shoulder-cross', 'pigeon'],
  rugby:        ['neck-isometric-activation', 'hamstring', 'adductor-stretch', 'iliopsoas-stretch', 'pec-wall-stretch'],
  surfing:      ['cobra-sphinx-stretch', 'thoracic-extension', 'pec-wall-stretch', 'pigeon', 'shoulder-flexion-overhead-stretch'],
  'road-cycling': ['iliopsoas-stretch', 'hamstring', 'thoracic-extension', 'levator-scapula-stretch', 'wrist-flexor-stretch'],
  gymnastics:   ['split-prep-stretch', 'thoracic-extension', 'butterfly', 'shoulder-flexion-overhead-stretch', 'ankle-plantar-flexion-stretch'],
};
```

### 3-2. `SPORT_ALIASES` マッピング

```typescript
const SPORT_ALIASES: Record<string, string[]> = {
  running:        ['ランニング', 'ジョギング', 'マラソン', 'running', 'jogging', 'marathon'],
  golf:           ['ゴルフ', 'golf'],
  tennis:         ['テニス', 'tennis'],
  swimming:       ['水泳', 'スイミング', 'swimming'],
  cycling:        ['サイクリング', 'cycling', '自転車'],
  weighttraining: ['筋トレ', 'ウエイトトレーニング', '筋力トレーニング', 'weight training', 'gym', 'ジム'],
  soccer:         ['サッカー', 'フットボール', 'soccer', 'football'],
  baseball:       ['野球', 'ソフトボール', 'baseball', 'softball'],
  basketball:     ['バスケットボール', 'バスケ', 'basketball'],
  badminton:      ['バドミントン', 'badminton'],
  yoga:           ['ヨガ', 'yoga'],
  hiking:         ['登山', 'ハイキング', 'トレッキング', 'hiking', 'mountaineering', 'trekking'],
  volleyball:     ['バレーボール', 'バレー', 'volleyball'],
  'martial-arts': ['格闘技', '武道', '空手', '柔道', '柔術', '剣道', 'martial arts', 'karate', 'judo', 'bjj'],
  skiing:         ['スキー', 'スノーボード', 'skiing', 'snowboard', 'snowboarding'],
  tabletennis:    ['卓球', 'table tennis', 'ping pong', 'ピンポン'],
  dance:          ['ダンス', 'ヒップホップ', 'バレエ', 'dance', 'ballet', 'hip hop'],
  climbing:       ['クライミング', 'ボルダリング', 'climbing', 'bouldering'],
  rugby:          ['ラグビー', 'rugby'],
  surfing:        ['サーフィン', '水上スポーツ', 'サップ', 'surfing', 'sup', 'paddleboarding'],
  'road-cycling': ['自転車競技', 'ロードレース', 'ロードバイク', 'road cycling', 'road bike'],
  gymnastics:     ['体操', '新体操', '器械体操', 'gymnastics', 'rhythmic gymnastics'],
};
```

### 3-3. `normalizeSport` 関数

```typescript
export function normalizeSport(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  for (const [key, aliases] of Object.entries(SPORT_ALIASES)) {
    if (aliases.some((a) => a.toLowerCase() === normalized || normalized.includes(a.toLowerCase()))) {
      return key;
    }
  }
  return null;
}
```

### 3-4. `getPrescription` 更新

```typescript
export function getPrescription(
  stretches: Stretch[],
  bodyParts: BodyPart[],
  scene: Scene,
  sport?: string,
): Prescription {
  // 既存のbodyParts処方ロジック（変更なし）
  // + sport処方をunion
  if (sport && SPORT_PRESCRIPTION[sport]) {
    for (const id of SPORT_PRESCRIPTION[sport]) {
      if (seen.has(id)) continue;
      const stretch = stretchMap.get(id);
      if (!stretch) continue;
      if (!stretch.scenes.includes(scene)) continue;
      seen.add(id);
      stretchIds.push(id);
    }
  }
  // ラベルにスポーツを追記
  const sportLabel = sport ? SPORT_LABEL[sport] : null;
  const label = [...bodyParts.map((bp) => BODY_LABEL[bp]), ...(sportLabel ? [sportLabel] : [])].join(' + ');
  // ...
}
```

### 3-5. `SPORT_LABEL` マッピング

```typescript
const SPORT_LABEL: Record<string, string> = {
  running: 'ランニング', golf: 'ゴルフ', tennis: 'テニス',
  swimming: '水泳', cycling: 'サイクリング', weighttraining: '筋トレ',
  soccer: 'サッカー', baseball: '野球', basketball: 'バスケ',
  badminton: 'バドミントン', yoga: 'ヨガ', hiking: '登山',
  volleyball: 'バレー', 'martial-arts': '格闘技', skiing: 'スキー',
  tabletennis: '卓球', dance: 'ダンス', climbing: 'クライミング',
  rugby: 'ラグビー', surfing: 'サーフィン',
  'road-cycling': '自転車競技', gymnastics: '体操',
};
```

---

## 4. ストア変更（`src/store/useUserStore.ts`）

```typescript
interface UserStore extends UserProfile {
  // 既存フィールド...
  setSport: (sport: string) => void;  // 追加
}

// 初期値
sport: '',

// 実装
setSport: (sport) => set({ sport }),
```

---

## 5. オンボーディング変更

### 5-1. `src/screens/onboarding/Step3Sport.tsx`（新規作成）

- `TextInput`（プレースホルダー：「例：ランニング、ゴルフ、サッカー…」）
- 入力に応じてリアルタイムで候補をフィルタリング（FlatList）
- 候補タップ → `normalizeSport` で正規化 → `setSport` → `Step4` へ
- スキップボタン（スポーツなし）→ `Step4` へ

### 5-2. `src/screens/onboarding/Step4Notifications.tsx`（Step3をリネーム）

- ファイル名変更：`Step3Notifications.tsx` → `Step4Notifications.tsx`
- コンポーネント名変更：`Step3Notifications` → `Step4Notifications`

### 5-3. `src/navigation/index.tsx`（更新）

```typescript
// Step3 → Step4 へリネーム + Step3Sport 追加
<Stack.Screen name="Step3Sport" component={Step3Sport} />
<Stack.Screen name="Step4" component={Step4Notifications} />
```

### 5-4. `src/screens/onboarding/Step2Scene.tsx`（更新）

```typescript
// Step3 → Step3Sport に変更
navigation.navigate('Step3Sport');
```

---

## 6. `HomeScreen` 変更

```typescript
const { bodyParts, scene, sport, dailyProgress } = useUserStore();
const prescription = getPrescription(ALL_STRETCHES, bodyParts, scene, sport || undefined);
```

`DailyMustCard` のラベルに自動でスポーツ名が追記される（prescription.ts側で処理）。

---

## テスト方針

### 更新するテスト
- `__tests__/filterStretches.test.ts`: `Stretch` モックに `sport?: string[]` を追加（オプショナルなので既存テストへの影響なし）
- `__tests__/prescription.test.ts`: `normalizeSport`・スポーツ処方・union動作のテストを追加

### 新規テスト
- `__tests__/prescription.test.ts` への追記：
  - `normalizeSport('ランニング')` → `'running'`
  - `normalizeSport('フットボール')` → `'soccer'`
  - `normalizeSport('謎のスポーツ')` → `null`
  - スポーツ + ボディパーツ union（重複除去確認）
  - シーンフィルタリング（スポーツ処方にも適用されること）

---

## ファイル変更サマリー

| ファイル | 変更種別 |
|---|---|
| `src/types/index.ts` | 修正（Stretch + UserProfile + OnboardingStackParamList） |
| `src/data/stretches.ts` | 修正（38種にsportタグ + 15種追加） |
| `src/utils/prescription.ts` | 修正（SPORT_PRESCRIPTION + SPORT_ALIASES + SPORT_LABEL + normalizeSport + getPrescription引数追加） |
| `src/store/useUserStore.ts` | 修正（sport追加 + setSport） |
| `src/screens/onboarding/Step3Sport.tsx` | 新規作成 |
| `src/screens/onboarding/Step3Notifications.tsx` | リネーム → Step4Notifications.tsx |
| `src/navigation/index.tsx` | 修正（Step3Sport追加、Step4への接続） |
| `src/screens/onboarding/Step2Scene.tsx` | 修正（navigate先をStep3SportへS変更） |
| `src/screens/HomeScreen.tsx` | 修正（sport取得 + getPrescriptionに渡す） |
| `__tests__/prescription.test.ts` | 修正（normalizeSport + sport union テスト追加） |
| `__tests__/useUserStore.test.ts` | 修正（sport初期値 + setSportテスト追加） |
