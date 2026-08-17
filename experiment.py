"""Confidential fraud-score inference with HEIR + OpenFHE.

The payment platform owns sensitive transaction features. It encrypts those
features before sending them to an external fraud-model service. The service
evaluates its scoring circuit over ciphertexts only, and the payment platform
decrypts the score and applies its local policy.

This is still a single-process demo: the client/service boundary is modeled
by functions, not by separate network processes. All transactions are
synthetic and the score is not a real fraud decision.
"""

from dataclasses import dataclass
import time

from heir import compile
from heir.mlir import I64, Secret


@dataclass(frozen=True)
class TransactionFeatures:
    """Synthetic sensitive features held by the payment platform."""

    transaction_id: str
    amount_1000_yen: int
    tx_count_24h: int
    distance_10km: int
    device_new_flag: int
    merchant_risk: int


@dataclass(frozen=True)
class EncryptedScoreRequest:
    """The only payload the external model service receives."""

    transaction_id: str
    ciphertexts: tuple[object, ...]


TRANSACTIONS = (
    TransactionFeatures("tx-001", amount_1000_yen=8, tx_count_24h=2, distance_10km=1, device_new_flag=0, merchant_risk=1),
    TransactionFeatures("tx-002", amount_1000_yen=75, tx_count_24h=12, distance_10km=18, device_new_flag=1, merchant_risk=6),
    TransactionFeatures("tx-003", amount_1000_yen=20, tx_count_24h=4, distance_10km=3, device_new_flag=0, merchant_risk=2),
    TransactionFeatures("tx-004", amount_1000_yen=35, tx_count_24h=7, distance_10km=8, device_new_flag=1, merchant_risk=4),
)

REVIEW_THRESHOLD = 400


@compile()
def private_fraud_score(
    amount_1000_yen: Secret[I64],
    tx_count_24h: Secret[I64],
    distance_10km: Secret[I64],
    device_new_flag: Secret[I64],
    merchant_risk: Secret[I64],
):
    """Compute a synthetic fraud score from encrypted transaction features.

    The final interaction term makes this a small polynomial model instead of
    a plain invoice sum: a new device is more suspicious for a large payment.
    The coefficients represent the model provider's scoring logic.
    """

    return (
        amount_1000_yen * 3
        + tx_count_24h * 20
        + distance_10km * 4
        + device_new_flag * 120
        + merchant_risk * 15
        + amount_1000_yen * device_new_flag
    )


def plain_fraud_score(features: TransactionFeatures) -> int:
    """Reference calculation used only by client-side verification."""

    return (
        features.amount_1000_yen * 3
        + features.tx_count_24h * 20
        + features.distance_10km * 4
        + features.device_new_flag * 120
        + features.merchant_risk * 15
        + features.amount_1000_yen * features.device_new_flag
    )


def encrypt_at_payment_platform(
    features: TransactionFeatures,
) -> EncryptedScoreRequest:
    """Encrypt features locally; transaction_id remains a routing identifier."""

    return EncryptedScoreRequest(
        transaction_id=features.transaction_id,
        ciphertexts=(
            private_fraud_score.encrypt_amount_1000_yen(features.amount_1000_yen),
            private_fraud_score.encrypt_tx_count_24h(features.tx_count_24h),
            private_fraud_score.encrypt_distance_10km(features.distance_10km),
            private_fraud_score.encrypt_device_new_flag(features.device_new_flag),
            private_fraud_score.encrypt_merchant_risk(features.merchant_risk),
        ),
    )


def evaluate_at_external_model_service(request: EncryptedScoreRequest):
    """Evaluate a score without accepting any plaintext transaction fields."""

    return private_fraud_score.eval(*request.ciphertexts)


def apply_local_policy(score: int) -> str:
    """Apply the payment platform's policy after it decrypts the score."""

    return "manual_review" if score >= REVIEW_THRESHOLD else "allow"


def main() -> None:
    setup_started = time.perf_counter()
    private_fraud_score.setup()
    setup_seconds = time.perf_counter() - setup_started

    # Payment platform side: encrypt each transaction before it leaves.
    encrypt_started = time.perf_counter()
    encrypted_requests = [
        encrypt_at_payment_platform(features) for features in TRANSACTIONS
    ]
    encrypt_seconds = time.perf_counter() - encrypt_started

    # External service side: only transaction_id plus five ciphertexts cross.
    eval_started = time.perf_counter()
    encrypted_responses = [
        (
            request.transaction_id,
            evaluate_at_external_model_service(request),
        )
        for request in encrypted_requests
    ]
    eval_seconds = time.perf_counter() - eval_started

    # Payment platform side: decrypt and apply its policy locally.
    decrypt_started = time.perf_counter()
    actual_scores = [
        int(private_fraud_score.decrypt_result(result_ciphertext))
        for _, result_ciphertext in encrypted_responses
    ]
    decrypt_seconds = time.perf_counter() - decrypt_started

    expected_scores = [plain_fraud_score(features) for features in TRANSACTIONS]

    print("HEIR + OpenFHE confidential fraud-score inference experiment")
    print("  use case: an external fraud model scores private payment transactions")
    print("  encrypted fields: amount, 24h transaction count, distance, new-device flag, merchant risk")
    print("  model service input: transaction_id + 5 ciphertexts per transaction")
    print("  model circuit: weighted score + amount*new_device interaction")
    print(f"  local policy: score >= {REVIEW_THRESHOLD} -> manual_review")

    for features, expected, actual in zip(
        TRANSACTIONS, expected_scores, actual_scores
    ):
        print(f"  transaction: {features.transaction_id}")
        print(
            "    client features: "
            f"amount=¥{features.amount_1000_yen * 1000:,}, "
            f"tx_count_24h={features.tx_count_24h}, "
            f"distance={features.distance_10km * 10}km, "
            f"new_device={features.device_new_flag}, "
            f"merchant_risk={features.merchant_risk}"
        )
        print(f"    expected plaintext score: {expected}")
        print(f"    decrypted FHE score: {actual}")
        print(f"    local policy result: {apply_local_policy(actual)}")

        if actual != expected:
            raise RuntimeError(
                f"FHE score mismatch for {features.transaction_id}: "
                f"expected {expected}, got {actual}"
            )

    print(f"  setup (context/key): {setup_seconds:.3f}s")
    print(f"  encrypt {len(TRANSACTIONS)} transactions: {encrypt_seconds:.3f}s")
    print(f"  encrypted eval {len(TRANSACTIONS)} transactions: {eval_seconds:.3f}s")
    print(f"  decrypt {len(TRANSACTIONS)} scores: {decrypt_seconds:.3f}s")
    print("  verification: PASS")


if __name__ == "__main__":
    main()
