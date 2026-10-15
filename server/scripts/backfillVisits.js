require('dotenv').config();
const mongoose = require('mongoose');

async function backfill() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const Visit = mongoose.model('Visit', new mongoose.Schema({}, { strict: false }));
  const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));

  const visits = await Visit.find();
  console.log(`Found ${visits.length} visits to backfill`);

  const sources = [
    'Social Media',
    'Friends & Family',
    'Google / Online Search',
    'Architect / Interior Designer',
    'Builder / Contractor Referral',
    'Walk-in / Signboard',
  ];

  const reasons = [
    'High Price / Budget Constraint',
    'Design / Size Not Available',
    'Out of Stock / Lead Time',
    'Just Exploring / Browsing',
    'Better Offer Elsewhere',
    'Need Family / Architect Approval',
    'Quality Not As Expected',
  ];

  let pCount = 0;
  let npCount = 0;

  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    const source = sources[i % sources.length];
    
    // Determine purchase outcome:
    // If purpose is 'Tile Purchase', always Purchased.
    // Otherwise, realistic 60/40 distribution
    const isPurchased = v.purpose === 'Tile Purchase' ? true : (i % 3 !== 0);
    const status = isPurchased ? 'Purchased' : 'Not Purchased';
    const reason = isPurchased ? '' : reasons[(i * 3) % reasons.length];

    if (isPurchased) pCount++;
    else npCount++;

    await Visit.updateOne(
      { _id: v._id },
      {
        $set: {
          purchaseStatus: status,
          nonPurchaseReason: reason,
          source: source,
        },
      }
    );

    if (v.customer) {
      await Customer.updateOne(
        { _id: v.customer },
        {
          $set: { source: source },
        }
      );
    }
  }

  // Also backfill any remaining customers without source
  await Customer.updateMany(
    { source: { $exists: false } },
    { $set: { source: 'Walk-in / Signboard' } }
  );

  console.log(`Backfill complete: ${pCount} Purchased, ${npCount} Not Purchased across ${visits.length} visits.`);
  await mongoose.disconnect();
}

backfill().catch(console.error);
