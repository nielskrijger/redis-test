const redis = require('redis');
const uuid = require('uuid');
const _ = require('lodash');
const numeral = require('numeral');
const { promisify } = require('util');

const NR_OF_KEYS = 100000;
const INSERT_BATCH_SIZE = 10000;
const TTL = 10000; // Add TTL just for realism
const SAMPLE_SIZE = 100; // Number of KEYS and SCAN operations
const SCAN_BATCH_SIZE = 1000; // Number of lookups in one scan
const LEFT_PAD = 50; // Number of characters (whitespace) before printing response
const RESULT_PAD = 14;
const CHANCE_OF_TWO_ITEMS = 0.1; // We test with "key:item" where some keys have 2 items

client = redis.createClient();

const getAsync = promisify(client.get).bind(client);
const mgetAsync = promisify(client.mget).bind(client);
const flusdbAsync = promisify(client.flushdb).bind(client);
const keysAsync = promisify(client.keys).bind(client);
const scanAsync = promisify(client.scan).bind(client);

client.on('error', err => {
  console.log(`Error: ${err}`);
});

async function generateAll(nrOfItems) {
  console.log(`Inserting ${nrOfItems} redis keys, this may take a while... please be patient`);
  const timer = new Timer();
  let total = 0;
  let ids = [];
  while (total < nrOfItems) {
    const batchSize = Math.min(INSERT_BATCH_SIZE, nrOfItems - total);
    total += batchSize;
    ids = ids.concat(await insertBatch(batchSize));
  }
  printTime(`Finished inserting ${nrOfItems} redis keys`, timer.stop());
  return ids;
}

function insertBatch(nrOfItems) {
  return new Promise((resolve, reject) => {
    const array = [];
    multi = client.batch();

    const addItem = (multi, value) => {
      const id = uuid.v4(); // v4 is completely random, no sequential ordering
      array.push(id);
      multi.set(`${id}:${value}`, value, 'EX', TTL);
    }

    for (let i = 0; i < nrOfItems; i++) {
      addItem(multi, 1);
      if (i < nrOfItems - 1 && Math.random() < CHANCE_OF_TWO_ITEMS) {
        addItem(multi, 2);
        i++;
      }
    }

    multi.exec((err) => {
      if (err) return reject(err);
      resolve(array);
    });
  });
}

async function keysTest(ids) {
  const testTimer = new Timer();
  const responseTimes = [];
  const promises = ids.map(id => {
    const timer = new Timer();
    return keysAsync(`${id}:*`).then(() => {
      responseTimes.push(timer.stop());
    });
  });
  await Promise.all(promises);
  printTime(`Executed ${ids.length} "KEYS <id>:*" operations`, testTimer.stop());
}

async function scanTest(ids) {
  const testTimer = new Timer();
  const responseTimes = [];
  const promises = ids.map(async (id) => {
    const timer = new Timer();
    await scan('0', `${id}:*`).then(() => {
      responseTimes.push(timer.stop());
    });
  });
  await Promise.all(promises);
  printTime(`Executed ${ids.length} "SCAN <id>:* COUNT ${SCAN_BATCH_SIZE}" operations`, testTimer.stop());
}

async function scan(cursor, pattern) {
  const reply = await scanAsync(cursor, 'MATCH', pattern, 'COUNT', `${SCAN_BATCH_SIZE}`);
  cursor = reply[0];
  if (cursor === '0') return;
  return scan(cursor, pattern)
}

async function getTest(ids) {
  const testTimer = new Timer();
  const responseTimes = [];
  const promises = ids.map(async id => {
    const timer = new Timer();
    await getAsync(id);
    responseTimes.push(timer.stop());
  });
  await Promise.all(promises);
  printTime(`Fetched ${ids.length} records using "GET <id>"`, testTimer.stop());
}

async function mgetTest(ids) {
  const testTimer = new Timer();
  const newIds = ids.map(e => `${e}:1`);
  const results = await mgetAsync(newIds);
  printTime(`Fetched ${results.length} records using 1 "MGET <id1> <id2> ..."`, testTimer.stop());
}

function sampleIds(ids, count) {
  const sample = new Set();
  while (sample.size < count) {
    sample.add(_.sample(ids));
  }
  return Array.from(sample);
}

function printTime(value, ms) {
  const formattedTime = numeral(ms).format('0.00');
  console.log(_.padEnd(value, LEFT_PAD), _.padStart(formattedTime, RESULT_PAD), 'ms');
}

async function main() {
  await flusdbAsync();
  const ids = await generateAll(NR_OF_KEYS);
  console.log('');
  console.log('------ TESTS -------');
  await getTest(sampleIds(ids, SAMPLE_SIZE));
  await keysTest(sampleIds(ids, SAMPLE_SIZE));
  await scanTest(sampleIds(ids, SAMPLE_SIZE));
  await mgetTest(sampleIds(ids, SAMPLE_SIZE));
}

class Timer {
  constructor() {
    this.start = process.hrtime();
    this.ms = null;
  }

  /**
   * Stops timer and returns duration in milliseconds. Prints the result
   * to stdout if timer has label.
   */
  stop(label) {
    const end = process.hrtime(this.start);
    this.ms = end[0] * 1000 + end[1] / 1000000;
    this.msRounded = Math.round(this.ms * 100) / 100;
    if (label) {
      console.log(`${label}: ${this.msRounded}ms`);
    }
    return this.msRounded;
  }
}

main().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});