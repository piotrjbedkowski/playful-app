"""Simple command-line utility to echo a message.

By default it prints "asd", matching the minimal request that seeded the
repository. A custom message can be provided via the ``--message`` option.
"""

from __future__ import annotations

import argparse


def parse_args() -> argparse.Namespace:
    """Create an argument parser and return parsed arguments."""

    parser = argparse.ArgumentParser(
        description="Echo a message to standard output.",
    )
    parser.add_argument(
        "--message",
        default="asd",
        help="Message to echo. Defaults to 'asd'.",
    )
    return parser.parse_args()


def main() -> None:
    """Entrypoint for the echo utility."""

    args = parse_args()
    print(args.message)


if __name__ == "__main__":
    main()
