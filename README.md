# HEIR FHE lab

HEIR（Homomorphic Encryption Intermediate Representation）とOpenFHEを、Docker Composeで試すための最小実験です。

この実験では、次の流れを確認します。

1. クライアントが `7` と `8` を暗号化する
2. サーバー相当の評価処理が、暗号文だけを使って `x * y + x + y` を計算する
3. クライアントが結果を復号し、`71` になることを検証する

## 実行

PowerShellでこのフォルダに移動して実行します。

```powershell
docker compose build
docker compose run --rm experiment
```

成功時は、最後に次の表示が出ます。

```text
decrypted FHE result: 71
verification: PASS
```

## 構成

- `Dockerfile`: Python 3.12、C++ビルド環境、HEIR/OpenFHE
- `compose.yaml`: 実験コンテナの起動定義
- `experiment.py`: 暗号化・暗号文上の評価・復号・検証

これはFHEの仕組みを理解するための小さな算術回路です。実用的なAIモデルを暗号化推論する実験では、モデル変換、暗号方式の選択、非線形関数の近似、精度と遅延の評価が別途必要になります。

## 参照

- [HEIR公式Getting Started](https://heir.dev/docs/getting_started/)
- [HEIR公式リポジトリ](https://github.com/google/heir)
- [HEIRのPythonパッケージ](https://pypi.org/project/heir-py/)
