# redis-test

This script tests the performance of various types of Redis commands.

Example output:

```
Inserting 1000000 redis keys, this may take a while... please be patient
Finished inserting 1000000 redis keys                    13387.73 ms

------ TESTS -------
Fetched 100 records using "GET <id>"                         6.76 ms
Fetched 100 records using "KEYS <id>:*"                  17380.17 ms
Fetched 100 records using "SCAN <id>:* COUNT 1000"       36758.67 ms
Fetched 50000 records using "MGET <id1> <id2> ..."         418.71 ms
```
