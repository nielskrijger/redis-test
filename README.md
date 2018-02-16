# redis-test

This script tests the performance of various types of Redis commands.

Example output:

```
Inserting 100000 redis keys, this may take a while... please be patient
Finished inserting 100000 redis keys                      1306.22 ms

------ TESTS -------
Fetched 100 records using "GET <id>"                         4.08 ms
Executed 100 "KEYS <id>:*" operations                     1110.48 ms
Executed 100 "SCAN <id>:* COUNT 1000" operations          2654.74 ms
Fetched 100 records using 1 "MGET <id1> <id2> ..."           1.25 ms
```
