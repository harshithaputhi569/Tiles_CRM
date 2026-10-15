require('dotenv').config();
const mongoose = require('mongoose');

async function seedRepeats() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const Visit = mongoose.model('Visit', new mongoose.Schema({}, { strict: false }));
  const Customer = mongoose.model('Customer', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const staffList = await User.find({ role: 'staff' });
  const staff1 = staffList[0]?._id;
  const staff2 = staffList[1]?._id || staff1;
  const staff3 = staffList[2]?._id || staff1;

  // Find first 6 customers who already have 1 visit
  const existingVisits = await Visit.find().limit(10);
  if (existingVisits.length < 6) {
    console.log('Not enough visits');
    await mongoose.disconnect();
    return;
  }

  // Ensure first visits have visitNumber: 1
  for (const v of existingVisits) {
    await Visit.updateOne({ _id: v._id }, { $set: { visitNumber: 1, isRepeatVisit: false } });
  }

  // Customer 0: 2 visits (Visit 1 didn't buy due to Price, Visit 2 returned for Price Negotiation and Purchased!)
  const cust0 = existingVisits[0].customer;
  await Visit.updateOne({ _id: existingVisits[0]._id }, {
    $set: { purchaseStatus: 'Not Purchased', nonPurchaseReason: 'High Price / Budget Constraint' }
  });
  await Visit.create({
    customer: cust0,
    staff: staff2,
    visitDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), // 5 days ago
    visitNumber: 2,
    isRepeatVisit: true,
    repeatReason: 'Price Negotiation / Received Discount / Ready to Purchase',
    purpose: 'Tile Purchase',
    purchaseStatus: 'Purchased',
    source: existingVisits[0].source || 'Friends & Family',
    notes: 'Came back after discussing 5% discount. Confirmed living room vitrified tiles order.',
    feedbackSubmitted: true,
  });

  // Customer 1: 2 visits (Visit 1 needed family approval, Visit 2 brought family and bought!)
  const cust1 = existingVisits[1].customer;
  await Visit.updateOne({ _id: existingVisits[1]._id }, {
    $set: { purchaseStatus: 'Not Purchased', nonPurchaseReason: 'Need Family / Architect Approval' }
  });
  await Visit.create({
    customer: cust1,
    staff: staff1,
    visitDate: new Date(Date.now() - 3 * 24 * 3600 * 1000), // 3 days ago
    visitNumber: 2,
    isRepeatVisit: true,
    repeatReason: 'Bringing Family / Architect for Final Approval',
    purpose: 'Design Selection',
    purchaseStatus: 'Purchased',
    source: existingVisits[1].source || 'Social Media',
    notes: 'Brought spouse to verify glossy vs matte finish for bathroom tiles. Finalized!',
    feedbackSubmitted: true,
  });

  // Customer 2: 2 visits (Visit 1 design not available, Visit 2 checked new catalog, still deciding)
  const cust2 = existingVisits[2].customer;
  await Visit.updateOne({ _id: existingVisits[2]._id }, {
    $set: { purchaseStatus: 'Not Purchased', nonPurchaseReason: 'Design / Size Not Available' }
  });
  await Visit.create({
    customer: cust2,
    staff: staff3,
    visitDate: new Date(Date.now() - 2 * 24 * 3600 * 1000), // 2 days ago
    visitNumber: 2,
    isRepeatVisit: true,
    repeatReason: 'Looking for Alternative Designs / Sizes',
    purpose: 'Tile Enquiry',
    purchaseStatus: 'Not Purchased',
    nonPurchaseReason: 'Out of Stock / Lead Time',
    source: existingVisits[2].source || 'Google / Online Search',
    notes: 'Looked at new 600x1200 Italian marble series. Lead time is 10 days, customer will check back.',
    feedbackSubmitted: false,
  });

  // Customer 3: 3 visits! (Visit 1 browsing -> Visit 2 price issue -> Visit 3 purchased!)
  const cust3 = existingVisits[3].customer;
  await Visit.updateOne({ _id: existingVisits[3]._id }, {
    $set: { purchaseStatus: 'Not Purchased', nonPurchaseReason: 'Just Exploring / Browsing' }
  });
  // Visit 2
  await Visit.create({
    customer: cust3,
    staff: staff1,
    visitDate: new Date(Date.now() - 12 * 24 * 3600 * 1000), // 12 days ago
    visitNumber: 2,
    isRepeatVisit: true,
    repeatReason: 'Follow-up on Previous Enquiry',
    purpose: 'Price Enquiry',
    purchaseStatus: 'Not Purchased',
    nonPurchaseReason: 'High Price / Budget Constraint',
    source: existingVisits[3].source || 'Walk-in / Signboard',
    notes: 'Came back with room measurements. Total budget was tight.',
    feedbackSubmitted: true,
  });
  // Visit 3
  await Visit.create({
    customer: cust3,
    staff: staff1,
    visitDate: new Date(Date.now() - 1 * 24 * 3600 * 1000), // 1 day ago
    visitNumber: 3,
    isRepeatVisit: true,
    repeatReason: 'Price Negotiation / Received Discount / Ready to Purchase',
    purpose: 'Tile Purchase',
    purchaseStatus: 'Purchased',
    source: existingVisits[3].source || 'Walk-in / Signboard',
    notes: 'Approved customized bundle price with manager discount. Full payment done.',
    feedbackSubmitted: true,
  });

  // Customer 4: 3 visits! (Visit 1 bought -> Visit 2 bought more for 2nd floor -> Visit 3 extra boxes)
  const cust4 = existingVisits[4].customer;
  await Visit.updateOne({ _id: existingVisits[4]._id }, {
    $set: { purchaseStatus: 'Purchased' }
  });
  // Visit 2
  await Visit.create({
    customer: cust4,
    staff: staff2,
    visitDate: new Date(Date.now() - 8 * 24 * 3600 * 1000),
    visitNumber: 2,
    isRepeatVisit: true,
    repeatReason: 'Additional Purchase for Another Area / Floor',
    purpose: 'Tile Purchase',
    purchaseStatus: 'Purchased',
    source: existingVisits[4].source || 'Architect / Interior Designer',
    notes: 'Ordered tiles for master bedroom and balcony.',
    feedbackSubmitted: true,
  });
  // Visit 3
  await Visit.create({
    customer: cust4,
    staff: staff2,
    visitDate: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    visitNumber: 3,
    isRepeatVisit: true,
    repeatReason: 'Tile Shortage / Need Extra Boxes',
    purpose: 'Tile Purchase',
    purchaseStatus: 'Purchased',
    source: existingVisits[4].source || 'Architect / Interior Designer',
    notes: 'Mason needed 3 additional boxes of matching batch code.',
    feedbackSubmitted: false,
  });

  // Update customerType to 'Existing Customer' for repeat visitors
  await Customer.updateMany(
    { _id: { $in: [cust0, cust1, cust2, cust3, cust4] } },
    { $set: { customerType: 'Existing Customer' } }
  );

  console.log('Seeded repeat visits successfully!');
  await mongoose.disconnect();
}

seedRepeats().catch(console.error);
