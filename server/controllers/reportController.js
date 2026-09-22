const ExcelJS = require('exceljs');
const Feedback = require('../models/Feedback');

// @route GET /api/reports/export  [admin]
const exportFeedbackExcel = async (req, res) => {
  const { startDate, endDate, staff, rating, hasComplaint } = req.query;
  const filter = {};
  if (staff) filter.staff = staff;
  if (rating) filter.overallRating = { $gte: Number(rating) };
  if (hasComplaint !== undefined) filter.hasComplaint = hasComplaint === 'true';
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const feedbacks = await Feedback.find(filter)
    .populate('customer', 'name mobile customerType')
    .populate('staff', 'name')
    .populate({ path: 'visit', select: 'purpose visitDate' })
    .sort({ createdAt: -1 });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TileShow CRM';
  const sheet = workbook.addWorksheet('Feedback Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  sheet.columns = [
    { header: 'Customer Name', key: 'customerName', width: 20 },
    { header: 'Mobile', key: 'mobile', width: 15 },
    { header: 'Customer Type', key: 'customerType', width: 18 },
    { header: 'Visit Date', key: 'visitDate', width: 15 },
    { header: 'Visit Purpose', key: 'purpose', width: 20 },
    { header: 'Staff Name', key: 'staffName', width: 20 },
    { header: 'Behaviour Rating', key: 'behaviour', width: 18 },
    { header: 'Helpfulness Rating', key: 'helpfulness', width: 18 },
    { header: 'Product Knowledge', key: 'productKnowledge', width: 20 },
    { header: 'Tile Collection', key: 'tileCollection', width: 18 },
    { header: 'Pricing Explanation', key: 'pricing', width: 20 },
    { header: 'Overall Experience', key: 'overall', width: 20 },
    { header: 'Recommendation Score', key: 'recommendation', width: 22 },
    { header: 'Overall Rating', key: 'overallRating', width: 15 },
    { header: 'Complaint', key: 'complaint', width: 12 },
    { header: 'Comments', key: 'comments', width: 35 },
    { header: 'Suggestions', key: 'suggestions', width: 35 },
  ];

  // Style header row
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  feedbacks.forEach((f) => {
    sheet.addRow({
      customerName: f.customer?.name || '',
      mobile: f.customer?.mobile || '',
      customerType: f.customer?.customerType || '',
      visitDate: f.visit?.visitDate ? new Date(f.visit.visitDate).toLocaleDateString('en-IN') : '',
      purpose: f.visit?.purpose || '',
      staffName: f.staff?.name || '',
      behaviour: f.ratings.behaviour,
      helpfulness: f.ratings.helpfulness,
      productKnowledge: f.ratings.productKnowledge,
      tileCollection: f.ratings.tileCollection,
      pricing: f.ratings.pricingExplanation,
      overall: f.ratings.overallExperience,
      recommendation: f.recommendationScore,
      overallRating: f.overallRating,
      complaint: f.hasComplaint ? 'Yes' : 'No',
      comments: f.comments,
      suggestions: f.suggestions,
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=TileShow_Feedback_Report_${Date.now()}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { exportFeedbackExcel };
