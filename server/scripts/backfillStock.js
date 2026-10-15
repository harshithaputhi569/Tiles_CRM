require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');

const POPULAR_TILE_STOCKS = [
  'GVT 2x4 (600x1200 mm)',
  'PGVT Big Slab (800x1600 mm)',
  'Double Charge 2x2 (600x600 mm)',
  'Bathroom Wall 300x450 mm',
  'Wooden Plank 200x1200 mm',
  'Kitchen Highlighter 300x600 mm',
  'Moroccan Designer Tiles',
  'Full Body Parking 16x16',
  'Subway White Glossy 3x12',
  'Step & Riser 4ft Bullnose',
  'Exterior Stone Cladding',
];

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/tiles_crm';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  const Visit = mongoose.model('Visit', new mongoose.Schema({}, { strict: false }));
  const visits = await Visit.find().sort({ createdAt: 1 });
  console.log(`Found ${visits.length} visits to update with stock inquiries`);

  let updatedCount = 0;
  for (let i = 0; i < visits.length; i++) {
    const v = visits[i];
    // Assign a realistic stock item
    const stockName = v.stockRequested || POPULAR_TILE_STOCKS[i % POPULAR_TILE_STOCKS.length];
    
    // If they didn't purchase because Out of Stock, or 20% of other visits:
    let isAvailable = 'Yes';
    if (v.nonPurchaseReason && v.nonPurchaseReason.toLowerCase().includes('stock')) {
      isAvailable = 'No';
    } else if (v.purchaseStatus === 'Not Purchased' && i % 4 === 0) {
      isAvailable = 'No';
    } else if (v.purchaseStatus === 'Purchased') {
      isAvailable = 'Yes';
    } else {
      isAvailable = (i % 5 === 0) ? 'No' : 'Yes';
    }

    await Visit.updateOne(
      { _id: v._id },
      {
        $set: {
          stockRequested: stockName,
          stockAvailable: isAvailable,
        },
      }
    );
    updatedCount++;
  }

  console.log(`Updated ${updatedCount} visits with stock data.`);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
