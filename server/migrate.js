/**
 * migrate.js  —  Copy all data from local MongoDB → Atlas
 * 
 * Usage:  node migrate.js
 * 
 * What it does:
 *   1. Connects to BOTH local and Atlas at the same time
 *   2. For each collection, reads all docs from local and inserts into Atlas
 *   3. Skips docs that already exist (upsert by _id)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const LOCAL_URI = 'mongodb://localhost:27017/tileshow_crm';
const ATLAS_URI = process.env.MONGO_URI; // reads from your .env

const COLLECTIONS = ['users', 'customers', 'visits', 'feedbacks', 'complaints'];

async function migrate() {
  console.log('\n🚀 TileShow CRM — Local → Atlas Migration\n');
  console.log(`📦 Local : ${LOCAL_URI}`);
  console.log(`☁️  Atlas : ${ATLAS_URI}\n`);

  // Open two separate connections
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();

  console.log('✅ Both databases connected\n');

  let grandTotal = 0;

  for (const col of COLLECTIONS) {
    process.stdout.write(`  📋 ${col.padEnd(12)} → `);

    const localCol  = localConn.collection(col);
    const atlasCol  = atlasConn.collection(col);

    const docs = await localCol.find({}).toArray();

    if (docs.length === 0) {
      console.log('(empty, skipped)');
      continue;
    }

    // Upsert each doc by _id so re-running is safe
    const ops = docs.map(doc => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    }));

    const result = await atlasCol.bulkWrite(ops, { ordered: false });
    const count  = result.upsertedCount + result.modifiedCount;
    console.log(`${docs.length} docs  (${result.upsertedCount} inserted, ${result.modifiedCount} updated)`);
    grandTotal += docs.length;
  }

  console.log(`\n✅ Migration complete! ${grandTotal} total documents synced to Atlas.\n`);

  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err.message);
  process.exit(1);
});
