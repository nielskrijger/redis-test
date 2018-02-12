# redis-test

This script tests the performance of three types of Redis queries:

- `KEYS <random>:*`
- `SCAN x MATCH <random>:* COUNT y` where `x` is a cursor iterated until it is depleted, and `y` a configurable number of scanned items.
- `GET <random>`