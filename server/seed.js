require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');

const User = require('./models/User');
const Customer = require('./models/Customer');
const Visit = require('./models/Visit');
const Feedback = require('./models/Feedback');
const Complaint = require('./models/Complaint');

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([
    User.deleteMany(),
    Customer.deleteMany(),
    Visit.deleteMany(),
    Feedback.deleteMany(),
    Complaint.deleteMany(),
  ]);
  console.log('🗑️  Cleared existing data');

  // Create Admin
  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@tileshow.com',
    password: 'admin123',
    role: 'admin',
    designation: 'Administrator',
    phone: '9876543210',
  });

  // Create Staff members
  const staffData = [
    { name: 'Rahul Sharma', email: 'rahul@tileshow.com', password: 'staff123', designation: 'Senior Sales Executive', phone: '9876543211' },
    { name: 'Priya Patel', email: 'priya@tileshow.com', password: 'staff123', designation: 'Sales Executive', phone: '9876543212' },
    { name: 'Amit Kumar', email: 'amit@tileshow.com', password: 'staff123', designation: 'Floor Manager', phone: '9876543213' },
    { name: 'Sneha Mehta', email: 'sneha@tileshow.com', password: 'staff123', designation: 'Design Consultant', phone: '9876543214' },
    { name: 'Vikram Singh', email: 'vikram@tileshow.com', password: 'staff123', designation: 'Sales Executive', phone: '9876543215' },
  ];

  const staffMembers = await Promise.all(staffData.map((s) => User.create({ ...s, role: 'staff' })));
  console.log(`✅ Created ${staffMembers.length} staff members`);

  // Customer types and visit purposes
  const customerTypes = ['New Customer', 'Existing Customer', 'Contractor', 'Builder', 'Architect', 'Interior Designer'];
  const purposes = ['Tile Enquiry', 'Tile Purchase', 'Design Selection', 'Price Enquiry', 'Sample Selection', 'Product Consultation'];
  const customerNames = [
    'Anand Verma', 'Sunita Joshi', 'Rajesh Nair', 'Kavita Reddy', 'Manoj Gupta',
    'Deepak Shah', 'Pooja Iyer', 'Suresh Bose', 'Geeta Kapoor', 'Arun Pillai',
    'Neha Tiwari', 'Vivek Rao', 'Smita Das', 'Kiran Jain', 'Ravi Chandra',
    'Lata Srivastava', 'Mohan Puri', 'Asha Kulkarni', 'Dinesh Patil', 'Reena Ghosh',
    'Sanjay Malhotra', 'Usha Saxena', 'Girish Batra', 'Nisha Agarwal', 'Tarun Mishra',
    'Padma Venkat', 'Harish Dube', 'Kamala Roy', 'Sunil Pandey', 'Meera Bhatt',
  ];

  const customers = [];
  for (let i = 0; i < 30; i++) {
    const customer = await Customer.create({
      name: customerNames[i],
      mobile: `98765${String(43300 + i).padStart(5, '0')}`,
      email: `customer${i + 1}@email.com`,
      customerType: customerTypes[i % customerTypes.length],
    });
    customers.push(customer);
  }
  console.log(`✅ Created ${customers.length} customers`);

  // Create visits and feedback over last 30 days
  const now = new Date();
  const visits = [];
  for (let i = 0; i < 30; i++) {
    const daysAgo = Math.floor(Math.random() * 30);
    const visitDate = new Date(now);
    visitDate.setDate(visitDate.getDate() - daysAgo);

    const customer = customers[i];
    const staff = staffMembers[i % staffMembers.length];

    const visit = await Visit.create({
      customer: customer._id,
      staff: staff._id,
      visitDate,
      purpose: purposes[i % purposes.length],
    });
    visits.push(visit);
  }
  console.log(`✅ Created ${visits.length} visits`);

  // Create feedback for each visit
  const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const comments = [
    'Excellent service!', 'Very helpful staff.', 'Good collection.', 'Staff was very knowledgeable.',
    'Pricing was explained clearly.', 'Great experience overall.', 'Could improve waiting area.',
    'Staff behavior was excellent.', 'Good variety of tiles.', 'Very professional team.',
    'Needed to wait a bit long.', 'Very satisfied with the visit.', 'Nice ambiance.',
    'Staff was a bit rushed.', 'Great product knowledge shown by staff.',
  ];

  const complaintCategories = ['Staff Behaviour', 'Waiting Time', 'Product Availability', 'Pricing', 'Billing'];
  const complaintDescs = [
    'Staff was not attentive enough.', 'Waited too long before assistance.',
    'Requested tiles were not in stock.', 'Pricing was not clearly explained.',
    'Billing took too long.', 'Staff seemed disinterested.',
  ];

  let complaintCount = 0;
  for (let i = 0; i < visits.length; i++) {
    const visit = visits[i];
    const highRating = i % 4 !== 0; // ~75% positive
    const ratingBase = highRating ? getRandom(4, 5) : getRandom(1, 3);

    const ratings = {
      behaviour: highRating ? getRandom(4, 5) : getRandom(2, 3),
      helpfulness: highRating ? getRandom(4, 5) : getRandom(2, 3),
      productKnowledge: highRating ? getRandom(4, 5) : getRandom(2, 4),
      tileCollection: getRandom(3, 5),
      pricingExplanation: highRating ? getRandom(4, 5) : getRandom(2, 3),
      overallExperience: ratingBase,
    };

    const hasComplaint = !highRating && Math.random() < 0.6;

    const feedback = await Feedback.create({
      visit: visit._id,
      customer: visit.customer,
      staff: visit.staff,
      ratings,
      recommendationScore: highRating ? getRandom(7, 10) : getRandom(1, 5),
      comments: comments[i % comments.length],
      suggestions: i % 3 === 0 ? 'More tile variety would be great.' : '',
      hasComplaint,
    });

    visit.feedbackSubmitted = true;
    await visit.save();

    if (hasComplaint) {
      await Complaint.create({
        feedback: feedback._id,
        customer: visit.customer,
        staff: visit.staff,
        category: complaintCategories[complaintCount % complaintCategories.length],
        description: complaintDescs[complaintCount % complaintDescs.length],
        status: complaintCount % 3 === 0 ? 'Resolved' : complaintCount % 3 === 1 ? 'In Progress' : 'Pending',
        adminRemarks: complaintCount % 3 === 0 ? 'Issue has been addressed and resolved.' : '',
      });
      complaintCount++;
    }
  }

  console.log(`✅ Created ${visits.length} feedback entries and ${complaintCount} complaints`);
  console.log('\n🎉 Seed complete! Login credentials:');
  console.log('   Admin  → admin@tileshow.com   / admin123');
  console.log('   Staff  → rahul@tileshow.com   / staff123');
  console.log('           priya@tileshow.com   / staff123');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
