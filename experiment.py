"""Privacy-preserving B2B SaaS usage billing with HEIR + OpenFHE.

The tenant encrypts usage metrics before sending them to the billing service.
The service evaluates the invoice circuit over ciphertexts only, and the
tenant decrypts the resulting invoice amount locally.

This is still a single-process demo: the client/service boundary is modeled
by functions, not by separate network processes.
"""

from dataclasses import dataclass
import time

from heir import compile
from heir.mlir import I64, Secret


@dataclass(frozen=True)
class TenantUsage:
    """Synthetic usage data held by a tenant."""

    tenant_id: str
    api_calls_k: int
    storage_gb: int
    active_users: int
    support_tickets: int


@dataclass(frozen=True)
class EncryptedInvoiceRequest:
    """The only payload the billing service receives in this demo."""

    tenant_id: str
    ciphertexts: tuple[object, ...]


TENANT_USAGE = (
    TenantUsage("acme", api_calls_k=12, storage_gb=8, active_users=3, support_tickets=2),
    TenantUsage("beta", api_calls_k=48, storage_gb=25, active_users=10, support_tickets=7),
    TenantUsage("gamma", api_calls_k=4, storage_gb=3, active_users=1, support_tickets=0),
)


@compile()
def private_invoice(
    api_calls_k: Secret[I64],
    storage_gb: Secret[I64],
    active_users: Secret[I64],
    support_tickets: Secret[I64],
):
    """Compute a synthetic invoice in cents from encrypted usage metrics.

    Rates are deliberately integer-valued so this first realistic example
    avoids floating-point encoding and focuses on the FHE data flow.
    """

    return (
        1000  # base fee: $10.00
        + api_calls_k * 125  # $1.25 per 1,000 API calls
        + storage_gb * 75  # $0.75 per GB
        + active_users * 500  # $5.00 per active user
        + support_tickets * 150  # $1.50 per support ticket
    )


def plain_invoice(usage: TenantUsage) -> int:
    """Reference calculation used only by the client-side verification."""

    return (
        1000
        + usage.api_calls_k * 125
        + usage.storage_gb * 75
        + usage.active_users * 500
        + usage.support_tickets * 150
    )


def encrypt_at_client(usage: TenantUsage) -> EncryptedInvoiceRequest:
    """Encrypt usage locally; tenant_id remains a routing identifier."""

    return EncryptedInvoiceRequest(
        tenant_id=usage.tenant_id,
        ciphertexts=(
            private_invoice.encrypt_api_calls_k(usage.api_calls_k),
            private_invoice.encrypt_storage_gb(usage.storage_gb),
            private_invoice.encrypt_active_users(usage.active_users),
            private_invoice.encrypt_support_tickets(usage.support_tickets),
        ),
    )


def evaluate_at_billing_service(request: EncryptedInvoiceRequest):
    """Evaluate an invoice without accepting any plaintext usage fields."""

    return private_invoice.eval(*request.ciphertexts)


def main() -> None:
    setup_started = time.perf_counter()
    private_invoice.setup()
    setup_seconds = time.perf_counter() - setup_started

    # Client side: each tenant encrypts its usage before the request leaves.
    encrypt_started = time.perf_counter()
    encrypted_requests = [encrypt_at_client(usage) for usage in TENANT_USAGE]
    encrypt_seconds = time.perf_counter() - encrypt_started

    # Service side: only tenant_id plus four ciphertexts cross this boundary.
    eval_started = time.perf_counter()
    encrypted_responses = [
        (request.tenant_id, evaluate_at_billing_service(request))
        for request in encrypted_requests
    ]
    eval_seconds = time.perf_counter() - eval_started

    # Client side: each tenant decrypts its own invoice result.
    decrypt_started = time.perf_counter()
    actual_invoices = [
        int(private_invoice.decrypt_result(result_ciphertext))
        for _, result_ciphertext in encrypted_responses
    ]
    decrypt_seconds = time.perf_counter() - decrypt_started

    expected_invoices = [plain_invoice(usage) for usage in TENANT_USAGE]

    print("HEIR + OpenFHE privacy-preserving SaaS billing experiment")
    print("  use case: a billing service calculates usage-based invoices")
    print("  encrypted fields: api_calls_k, storage_gb, active_users, support_tickets")
    print("  service input: tenant_id + 4 ciphertexts per tenant")
    print("  invoice circuit: 1000 + api_calls_k*125 + storage_gb*75 + active_users*500 + support_tickets*150")

    for usage, expected, actual in zip(TENANT_USAGE, expected_invoices, actual_invoices):
        print(f"  tenant: {usage.tenant_id}")
        print(
            "    client usage: "
            f"api_calls_k={usage.api_calls_k}, storage_gb={usage.storage_gb}, "
            f"active_users={usage.active_users}, support_tickets={usage.support_tickets}"
        )
        print(f"    expected invoice: {expected} cents (${expected / 100:.2f})")
        print(f"    decrypted FHE invoice: {actual} cents (${actual / 100:.2f})")

        if actual != expected:
            raise RuntimeError(
                f"FHE invoice mismatch for {usage.tenant_id}: "
                f"expected {expected}, got {actual}"
            )

    print(f"  setup (context/key): {setup_seconds:.3f}s")
    print(f"  encrypt {len(TENANT_USAGE)} requests: {encrypt_seconds:.3f}s")
    print(f"  encrypted eval {len(TENANT_USAGE)} requests: {eval_seconds:.3f}s")
    print(f"  decrypt {len(TENANT_USAGE)} results: {decrypt_seconds:.3f}s")
    print("  verification: PASS")


if __name__ == "__main__":
    main()
