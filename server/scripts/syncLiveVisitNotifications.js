require('dotenv').config();
const mongoose = require('mongoose');
require('../models/User');
require('../models/Customer');
const Visit = require('../models/Visit');
const Notification = require('../models/Notification');

async function sync() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Delete generated / dummy notifications (Rajesh Nair, etc.)
  const del = await Notification.deleteMany({
    $or: [
      { 'metadata.customerName': 'Rajesh Nair' },
      { 'metadata.customerName': { $regex: /dummy|sample|test|fake/i } },
    ],
  });
  console.log('Deleted generated / sample notifications:', del.deletedCount);

  // 2. Find real visits registered by staff (Oct 2026)
  const visits = await Visit.find({
    createdAt: { $gte: new Date('2026-10-01') },
  })
    .populate('customer')
    .populate('staff')
    .sort({ createdAt: 1 });

  console.log(`Found ${visits.length} real visits logged by staff`);

  for (const v of visits) {
    if (!v.customer || !v.staff) continue;

    const existingAdminNotif = await Notification.findOne({
      referenceId: v._id,
      type: 'visit',
      role: 'admin',
    });

    if (!existingAdminNotif) {
      const custName = v.customer.name;
      const custMobile = v.customer.mobile;
      const custType = v.customer.customerType || 'New Customer';
      const custAddress = v.customer.address || '';
      const staffName = v.staff.name;
      const purpose = v.purpose || 'Showroom Visit';
      const pStatus = v.purchaseStatus || 'Not Purchased';
      const billing = v.totalBillingValue || 0;
      const isRepeat = v.isRepeatVisit || false;
      const vNum = v.visitNumber || 1;

      const meta = {
        customerName: custName,
        customerMobile: custMobile,
        customerType: custType,
        address: custAddress,
        staffName,
        staffId: v.staff._id,
        visitId: v._id,
        visitPurpose: purpose,
        purchaseStatus: pStatus,
        totalBillingValue: billing,
        nonPurchaseReason: v.nonPurchaseReason || '',
        isRepeatVisit: isRepeat,
        visitNumber: vNum,
        repeatReason: v.repeatReason || '',
        stockRequested: v.stockRequested || '',
        stockAvailable: v.stockAvailable || 'Yes',
        stockNotes: v.stockNotes || '',
        source: v.source || v.customer.source || 'Walk-in / Signboard',
        notes: v.notes || '',
        feedbackToken: v.feedbackToken || '',
        feedbackLink: `http://localhost:5173/feedback/${v.feedbackToken || v._id}`,
        visitDate: v.visitDate || v.createdAt,
      };

      const adminTitle = isRepeat
        ? `🔁 Repeat Customer Visit (#${vNum}): ${custName}`
        : `👤 Live Customer Visit: ${custName}`;
      const adminMsg = `${staffName} logged customer ${custName} (${custMobile}) • ${purpose} • Status: ${pStatus}${
        pStatus === 'Purchased' && billing > 0 ? ` • Bill: ₹${billing.toLocaleString('en-IN')}` : ''
      }${v.stockRequested ? ` • Stock: ${v.stockRequested} [${v.stockAvailable || 'Yes'}]` : ''}`;

      await Notification.create({
        recipient: null,
        role: 'admin',
        title: adminTitle,
        message: adminMsg,
        type: 'visit',
        referenceId: v._id,
        metadata: meta,
        link: '/admin/visits',
        isRead: false,
        createdAt: v.createdAt,
        updatedAt: v.createdAt,
      });

      const staffTitle = isRepeat
        ? `🔁 Repeat Visit (#${vNum}) Registered: ${custName}`
        : `✅ Customer Visit Registered: ${custName}`;
      const staffMsg = `Customer ${custName} (${custMobile}) logged for ${purpose} • Status: ${pStatus}${
        billing > 0 ? ` • Bill: ₹${billing.toLocaleString('en-IN')}` : ''
      }`;

      await Notification.create({
        recipient: v.staff._id,
        role: 'staff',
        title: staffTitle,
        message: staffMsg,
        type: 'visit',
        referenceId: v._id,
        metadata: meta,
        link: '/staff/visits',
        isRead: true,
        readBy: [v.staff._id],
        createdAt: v.createdAt,
        updatedAt: v.createdAt,
      });

      console.log(`✅ Backfilled live notifications for ${custName} (${v._id})`);
    }
  }

  const finalNotifications = await Notification.find().sort({ createdAt: -1 });
  console.log(`\n🎉 Total notifications in DB now: ${finalNotifications.length}`);
  finalNotifications.forEach((n) => {
    console.log(`- [${n.role}] [${n.type}] ${n.title} | ${n.metadata?.customerName} (${n.metadata?.customerMobile})`);
  });

  process.exit(0);
}

sync().catch((err) => {
  console.error('Sync failed:', err);
  process.exit(1);
});
