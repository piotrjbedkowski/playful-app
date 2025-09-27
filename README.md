# Playful Echo Utility

This repository currently contains a minimal command-line helper that simply
echoes a message to standard output. It defaults to printing `asd`, mirroring
the seed input, but you can supply any custom message.

## Usage

```bash
python -m src.echo_asd          # prints "asd"
python -m src.echo_asd --message "hello"  # prints "hello"
```

The project intentionally keeps dependencies to a minimum—only the Python
standard library is used—so it should run anywhere a modern version of Python is
available.
