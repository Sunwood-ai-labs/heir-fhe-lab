# HEIR FHE lab

HEIR（Homomorphic Encryption Intermediate Representation）とOpenFHEを、Docker Composeで試すための実験リポジトリです。

## 実験の題材: SaaSの利用量ベース請求

`experiment.py` は、B2B SaaSの請求サービスを想定しています。

顧客テナントが次の利用量を暗号化して送信し、請求サービスは利用量の平文を見ずに請求額（セント単位）を計算します。

- API呼び出し数（1,000回単位）
- ストレージ使用量（GB）
- アクティブユーザー数
- サポートチケット数

計算回路は次の整数式です。

```text
1000
+ api_calls_k * 125
+ storage_gb * 75
+ active_users * 500
+ support_tickets * 150
```

つまり、サービス側は `tenant_id` と4つの暗号文だけを受け取り、暗号文のまま請求額を算出します。テナント側が復号して、最終的な請求額を確認します。

このリポジトリの実験は単一プロセスです。`encrypt_at_client` と `evaluate_at_billing_service` で境界を表現しているため、実際のネットワーク分離や鍵配送を再現するものではありません。また、料金と利用量は合成データです。

## 実行

PowerShellでこのフォルダに移動して実行します。

```powershell
docker compose build
docker compose run --rm experiment
```

成功時は、各テナントの復号結果と最後の次の表示が出ます。

```text
tenant: acme
decrypted FHE invoice: 4900 cents ($49.00)
verification: PASS
```

初回のイメージビルドでは、HEIR Pythonパッケージに加えてOpenFHE v1.5.1をソースからビルドします。そのため、初回だけ時間がかかります。

## 最小例との比較

元の2入力の算術回路は [`toy_experiment.py`](./toy_experiment.py) に残しています。

```powershell
docker compose run --rm --entrypoint python experiment toy_experiment.py
```

`experiment.py` の方は、複数の入力項目を持つ業務ロジック、複数テナント、クライアント／サービス境界を含むため、FHEを実際のシステムに組み込む際の最初の考え方に近い構成です。

## 構成

- `Dockerfile`: Python 3.12、C++ビルド環境、HEIR/OpenFHE
- `compose.yaml`: 実験コンテナの起動定義
- `experiment.py`: 暗号化請求計算の実験
- `toy_experiment.py`: 2入力の算術回路を使ったベースライン

次の段階では、固定小数点、複数回のリクエストをまたぐ鍵管理、実ネットワーク越しのクライアント／サービス分離、暗号化推論モデルなどを検討できます。

## 参照

- [HEIR公式Getting Started](https://heir.dev/docs/getting_started/)
- [HEIR公式リポジトリ](https://github.com/google/heir)
- [HEIRのPythonパッケージ](https://pypi.org/project/heir-py/)
- [OpenFHE公式リポジトリ](https://github.com/openfheorg/openfhe-development)
