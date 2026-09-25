const ExcelJS = require('exceljs');
const Feedback = require('../models/Feedback');

// Helper: build filter from query params
const buildFilter = ({ startDate, endDate, staff, hasComplaint }) => {
  const filter = {};
  if (staff) filter.staff = staff;
  if (hasComplaint !== undefined && hasComplaint !== '') filter.hasComplaint = hasComplaint === 'true';
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  return filter;
};

// Helper: fetch feedbacks with populated refs
const fetchFeedbacks = (filter) =>
  Feedback.find(filter)
    .populate('customer', 'name mobile customerType')
    .populate('staff', 'name')
    .populate({ path: 'visit', select: 'purpose visitDate' })
    .sort({ createdAt: -1 });

// Helper: map feedback doc to a flat row
const toRow = (f) => ({
  customerName: f.customer?.name || '',
  mobile: f.customer?.mobile || '',
  customerType: f.customer?.customerType || '',
  visitDate: f.visit?.visitDate ? new Date(f.visit.visitDate).toLocaleDateString('en-IN') : '',
  purpose: f.visit?.purpose || '',
  staffName: f.staff?.name || '',
  behaviour: f.ratings?.behaviour ?? '',
  helpfulness: f.ratings?.helpfulness ?? '',
  productKnowledge: f.ratings?.productKnowledge ?? '',
  tileCollection: f.ratings?.tileCollection ?? '',
  pricing: f.ratings?.pricingExplanation ?? '',
  overall: f.ratings?.overallExperience ?? '',
  recommendation: f.recommendationScore ?? '',
  overallRating: f.overallRating ?? '',
  complaint: f.hasComplaint ? 'Yes' : 'No',
  comments: f.comments || '',
  suggestions: f.suggestions || '',
  hasComplaint: f.hasComplaint,
});

// @route GET /api/reports/export  [admin]
const exportFeedbackExcel = async (req, res) => {
  const filter = buildFilter(req.query);
  const feedbacks = await fetchFeedbacks(filter);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'TileShow CRM';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet('Feedback Report', {
    pageSetup: { paperSize: 9, orientation: 'landscape' },
  });

  sheet.columns = [
    { header: 'Customer Name',      key: 'customerName',    width: 22 },
    { header: 'Mobile',             key: 'mobile',          width: 15 },
    { header: 'Customer Type',      key: 'customerType',    width: 18 },
    { header: 'Visit Date',         key: 'visitDate',       width: 14 },
    { header: 'Visit Purpose',      key: 'purpose',         width: 20 },
    { header: 'Staff Name',         key: 'staffName',       width: 20 },
    { header: 'Behaviour',          key: 'behaviour',       width: 12 },
    { header: 'Helpfulness',        key: 'helpfulness',     width: 13 },
    { header: 'Product Knowledge',  key: 'productKnowledge',width: 18 },
    { header: 'Tile Collection',    key: 'tileCollection',  width: 16 },
    { header: 'Pricing Expl.',      key: 'pricing',         width: 14 },
    { header: 'Ovr. Experience',    key: 'overall',         width: 16 },
    { header: 'Recommend Score',    key: 'recommendation',  width: 16 },
    { header: 'Overall Rating',     key: 'overallRating',   width: 14 },
    { header: 'Complaint',          key: 'complaint',       width: 12 },
    { header: 'Comments',           key: 'comments',        width: 35 },
    { header: 'Suggestions',        key: 'suggestions',     width: 35 },
  ];

  // Style header row
  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6B21A8' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF4A0080' } },
      left:   { style: 'thin', color: { argb: 'FF4A0080' } },
      bottom: { style: 'thin', color: { argb: 'FF4A0080' } },
      right:  { style: 'thin', color: { argb: 'FF4A0080' } },
    };
  });

  feedbacks.forEach((f, idx) => {
    const rowData = toRow(f);
    const row = sheet.addRow(rowData);
    row.height = 20;

    // Alternate shading
    const rowBg = idx % 2 === 0 ? 'FFF3E8FF' : 'FFFFFFFF';
    row.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: false };
      cell.font = { size: 10, name: 'Calibri' };
    });

    // Red highlight for complaint rows
    if (f.hasComplaint) {
      const cell = row.getCell('complaint');
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE4E4' } };
      cell.font = { bold: true, color: { argb: 'FFCC0000' }, size: 10, name: 'Calibri' };
    }
  });

  // Freeze header & enable autofilter
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to:   { row: 1, column: sheet.columns.length },
  };

  // Write to buffer first — prevents truncated/corrupt output when streaming
  const buffer = await workbook.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="TileShow_Report_${Date.now()}.xlsx"`);
  res.setHeader('Content-Length', buffer.length);
  res.end(buffer);
};

// @route GET /api/reports/export-data  [admin]
// Returns flat JSON rows so the client can generate a PDF without a server-side PDF lib
const exportFeedbackData = async (req, res) => {
  const filter = buildFilter(req.query);
  const feedbacks = await fetchFeedbacks(filter);
  const rows = feedbacks.map(toRow);
  res.json({ count: rows.length, rows });
};

module.exports = { exportFeedbackExcel, exportFeedbackData };
