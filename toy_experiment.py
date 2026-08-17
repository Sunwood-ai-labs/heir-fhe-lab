"""Small HEIR + OpenFHE arithmetic baseline.

This is the original two-input example kept as a baseline for comparison with
the more realistic usage-billing experiment in ``experiment.py``.
"""

import time

from heir import compile
from heir.mlir import I64, Secret


@compile()
def private_expression(x: Secret[I64], y: Secret[I64]):
    return x * y + x + y


def main() -> None:
    x_plain = 7
    y_plain = 8
    expected = x_plain * y_plain + x_plain + y_plain

    setup_started = time.perf_counter()
    private_expression.setup()
    setup_seconds = time.perf_counter() - setup_started

    encrypt_started = time.perf_counter()
    x_ciphertext = private_expression.encrypt_x(x_plain)
    y_ciphertext = private_expression.encrypt_y(y_plain)
    encrypt_seconds = time.perf_counter() - encrypt_started

    eval_started = time.perf_counter()
    result_ciphertext = private_expression.eval(x_ciphertext, y_ciphertext)
    eval_seconds = time.perf_counter() - eval_started

    decrypt_started = time.perf_counter()
    actual = private_expression.decrypt_result(result_ciphertext)
    decrypt_seconds = time.perf_counter() - decrypt_started

    print("HEIR + OpenFHE toy arithmetic baseline")
    print("  circuit: x * y + x + y")
    print(f"  expected plaintext result: {expected}")
    print(f"  decrypted FHE result: {actual}")
    print(f"  setup: {setup_seconds:.3f}s")
    print(f"  encrypt: {encrypt_seconds:.3f}s")
    print(f"  encrypted eval: {eval_seconds:.3f}s")
    print(f"  decrypt: {decrypt_seconds:.3f}s")

    if actual != expected:
        raise RuntimeError(f"FHE result mismatch: expected {expected}, got {actual}")

    print("  verification: PASS")


if __name__ == "__main__":
    main()
