require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  const Visit = mongoose.model('Visit', new mongoose.Schema({}, { strict: false }));
  const agg = await Visit.aggregate([
    { $group: { _id: '$customer', count: { $sum: 1 } } },
    { $match: { count: { $gte: 2 } } },
  ]);
  console.log('Repeat customers count (2+ visits):', agg.length);
  console.log(agg);
  await mongoose.disconnect();
}
run();
