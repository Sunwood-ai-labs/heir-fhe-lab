# HEIR FHE lab

HEIR（Homomorphic Encryption Intermediate Representation）とOpenFHEを、Docker Composeで試すための実験リポジトリです。

## 実験の題材: 取引明細を見せない不正検知

`experiment.py` は、決済プラットフォームが外部の不正検知モデルサービスを利用する状況を想定しています。

決済プラットフォームは、顧客の取引明細を外部サービスに見せたくありません。一方で、外部サービスのモデルを自社に持ち込むことも避けたい、という構図です。

次の機密性の高い特徴量を決済プラットフォーム側で暗号化して送信します。

- 取引金額
- 直近24時間の取引回数
- 前回位置からの距離
- 新しい端末かどうか
- 加盟店リスクスコア

外部サービスは `transaction_id` と5つの暗号文だけを受け取り、暗号文のままスコアを計算します。決済プラットフォームがスコアを復号し、自分のポリシーで `allow` / `manual_review` を決めます。

スコア回路には、単純な重み付き和に加えて「高額取引 × 新端末」の相互作用項も入れています。

```text
amount * 3
+ tx_count_24h * 20
+ distance * 4
+ new_device * 120
+ merchant_risk * 15
+ amount * new_device
```

この実験は単一プロセスで、`encrypt_at_payment_platform` と `evaluate_at_external_model_service` が境界を表現しています。実ネットワーク分離、鍵配送、モデル秘匿まで再現するものではありません。取引データとスコア係数はすべて合成データで、実際の不正判定には使えません。

なお、現在の実験では比較・閾値判定を復号後に決済側で行っています。比較自体を暗号文のまま行うには、近似多項式や別の回路設計が必要になります。

## 実行

PowerShellでこのフォルダに移動して実行します。

```powershell
docker compose build
docker compose run --rm experiment
```

成功時は、各取引の暗号化スコアと最後の次の表示が出ます。

```text
transaction: tx-002
decrypted FHE score: 822
local policy result: manual_review
verification: PASS
```

初回のイメージビルドでは、HEIR Pythonパッケージに加えてOpenFHE v1.5.1をソースからビルドします。そのため、初回だけ時間がかかります。

## 最小例との比較

元の2入力の算術回路は [`toy_experiment.py`](./toy_experiment.py) に残しています。

```powershell
docker compose run --rm --entrypoint python experiment toy_experiment.py
```

`experiment.py` の方は、取引明細という機密データ、外部モデルサービス、暗号文上の多項式スコア、復号後のローカルポリシーを含むため、FHEを実際のシステムに組み込む際の価値が見えやすい構成です。

## 構成

- `Dockerfile`: Python 3.12、C++ビルド環境、HEIR/OpenFHE
- `compose.yaml`: 実験コンテナの起動定義
- `experiment.py`: 暗号化された取引特徴量の不正検知スコア実験
- `toy_experiment.py`: 2入力の算術回路を使ったベースライン

## スライド

実験の流れを説明する5枚のPNGスライドを `slides/out/` に収録しています。

- [`01.png`](./slides/out/01.png): なぜFHEが必要か
- [`02.png`](./slides/out/02.png): 平文推論とFHEの違い
- [`03.png`](./slides/out/03.png): クライアント／外部モデル／復号の流れ
- [`04.png`](./slides/out/04.png): 暗号化推論モデルの中身
- [`05.png`](./slides/out/05.png): 確認できたことと残課題

再生成する場合は、Windows PowerShellで次を実行します。

```powershell
$env:NODE_PATH = 'D:\Prj\render-svg-layouts-skill\node_modules'
node .\slides\build_fhe_slides.js
```

スライドはApple HIG準拠をうたうものではなく、階層・簡潔さ・視認性を重視したApple-inspiredの資料デザインです。

次の段階では、固定小数点、複数回のリクエストをまたぐ鍵管理、実ネットワーク越しのクライアント／サービス分離、暗号化推論モデルなどを検討できます。

## 参照

- [HEIR公式Getting Started](https://heir.dev/docs/getting_started/)
- [HEIR公式リポジトリ](https://github.com/google/heir)
- [HEIRのPythonパッケージ](https://pypi.org/project/heir-py/)
- [OpenFHE公式リポジトリ](https://github.com/openfheorg/openfhe-development)
