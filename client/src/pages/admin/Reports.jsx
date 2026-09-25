import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdFileDownload, MdFilterList, MdPictureAsPdf, MdTableChart } from 'react-icons/md';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Reports() {
  const [staff, setStaff] = useState([]);
  const [filters, setFilters] = useState({ startDate: '', endDate: '', staff: '', hasComplaint: '' });
  const [loadingXlsx, setLoadingXlsx] = useState(false);
  const [loadingPdf, setLoadingPdf]   = useState(false);

  useEffect(() => {
    api.get('/staff').then(r => setStaff(r.data)).catch(() => {});
  }, []);

  const buildParams = () => {
    const p = new URLSearchParams();
    if (filters.staff)        p.set('staff', filters.staff);
    if (filters.startDate)    p.set('startDate', filters.startDate);
    if (filters.endDate)      p.set('endDate', filters.endDate);
    if (filters.hasComplaint) p.set('hasComplaint', filters.hasComplaint);
    return p.toString();
  };

  /* ── Excel Export ── */
  const handleExcelExport = async () => {
    setLoadingXlsx(true);
    try {
      const token = localStorage.getItem('tileshow_token');
      const response = await fetch(`/api/reports/export?${buildParams()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `TileShow_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Excel report downloaded!');
    } catch {
      toast.error('Failed to generate Excel report');
    } finally {
      setLoadingXlsx(false);
    }
  };

  /* ── PDF Export (client-side via jsPDF + autoTable) ── */
  const handlePdfExport = async () => {
    setLoadingPdf(true);
    try {
      const token = localStorage.getItem('tileshow_token');
      const response = await fetch(`/api/reports/export-data?${buildParams()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Fetch failed');
      const { rows } = await response.json();

      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      /* ── Cover header ── */
      doc.setFillColor(107, 33, 168);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), 60, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('TileShow CRM — Feedback Report', 40, 38);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const dateStr = `Generated: ${new Date().toLocaleString('en-IN')}`;
      const filterStr = [
        filters.startDate ? `From: ${filters.startDate}` : '',
        filters.endDate   ? `To: ${filters.endDate}`     : '',
        filters.hasComplaint ? `Filter: ${filters.hasComplaint === 'true' ? 'With Complaints' : 'No Complaints'}` : '',
      ].filter(Boolean).join('   |   ');
      doc.text(`${dateStr}${filterStr ? '   |   ' + filterStr : ''}`, 40, 52);

      /* ── Table ── */
      const columns = [
        'Customer', 'Mobile', 'Type', 'Visit Date', 'Purpose', 'Staff',
        'Beh.', 'Help.', 'Prod.', 'Tile', 'Price', 'Exp.', 'Rec.', 'Rating',
        'Complaint', 'Comments',
      ];

      const tableRows = rows.map(r => [
        r.customerName, r.mobile, r.customerType, r.visitDate,
        r.purpose, r.staffName,
        r.behaviour, r.helpfulness, r.productKnowledge, r.tileCollection,
        r.pricing, r.overall, r.recommendation, r.overallRating,
        r.complaint, r.comments,
      ]);

      autoTable(doc, {
        startY: 70,
        head: [columns],
        body: tableRows,
        styles: {
          fontSize: 7.5,
          cellPadding: 4,
          overflow: 'linebreak',
          valign: 'middle',
          font: 'helvetica',
        },
        headStyles: {
          fillColor: [107, 33, 168],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          halign: 'center',
        },
        alternateRowStyles: { fillColor: [243, 232, 255] },
        didParseCell(data) {
          // Highlight "Yes" complaints in red
          if (data.column.index === 14 && data.cell.raw === 'Yes' && data.section === 'body') {
            data.cell.styles.textColor  = [180, 0, 0];
            data.cell.styles.fontStyle  = 'bold';
            data.cell.styles.fillColor  = [255, 228, 228];
          }
        },
        columnStyles: {
          0:  { cellWidth: 55 },
          1:  { cellWidth: 50 },
          2:  { cellWidth: 40 },
          3:  { cellWidth: 45 },
          4:  { cellWidth: 50 },
          5:  { cellWidth: 50 },
          6:  { cellWidth: 22 },
          7:  { cellWidth: 22 },
          8:  { cellWidth: 22 },
          9:  { cellWidth: 22 },
          10: { cellWidth: 28 },
          11: { cellWidth: 28 },
          12: { cellWidth: 24 },
          13: { cellWidth: 28 },
          14: { cellWidth: 36 },
          15: { cellWidth: 'auto' },
        },
        margin: { left: 20, right: 20 },
        // Footer with page numbers
        didDrawPage(data) {
          const pg = doc.internal.getCurrentPageInfo().pageNumber;
          const total = doc.internal.getNumberOfPages();
          doc.setFontSize(8);
          doc.setTextColor(140);
          doc.text(
            `Page ${pg} of ${total}`,
            data.settings.margin.left,
            doc.internal.pageSize.getHeight() - 12,
          );
          doc.text(
            'TileShow CRM — Confidential',
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 12,
            { align: 'center' },
          );
        },
      });

      const filename = `TileShow_Report_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.pdf`;
      doc.save(filename);
      toast.success('PDF report downloaded!');
    } catch {
      toast.error('Failed to generate PDF report');
    } finally {
      setLoadingPdf(false);
    }
  };

  const reportFields = [
    'Customer Name', 'Mobile Number', 'Customer Type', 'Visit Date', 'Visit Purpose',
    'Staff Name', 'Behaviour Rating', 'Helpfulness Rating', 'Product Knowledge',
    'Tile Collection Rating', 'Pricing Explanation', 'Overall Experience',
    'Recommendation Score', 'Overall Rating', 'Complaint', 'Customer Comments', 'Suggestions',
  ];

  return (
    <>
      <Topbar title="Reports & Export" subtitle="Export feedback reports as Excel or PDF" />
      <div className="page-content">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          {/* Filter Panel */}
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title"><MdFilterList /> Filter Options</span>
            </div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Start Date</label>
                <input type="date" className="form-control"
                  value={filters.startDate}
                  onChange={e => setFilters({ ...filters, startDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End Date</label>
                <input type="date" className="form-control"
                  value={filters.endDate}
                  onChange={e => setFilters({ ...filters, endDate: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">Staff Member</label>
                <select className="form-control"
                  value={filters.staff}
                  onChange={e => setFilters({ ...filters, staff: e.target.value })}>
                  <option value="">All Staff</option>
                  {staff.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Complaint Filter</label>
                <select className="form-control"
                  value={filters.hasComplaint}
                  onChange={e => setFilters({ ...filters, hasComplaint: e.target.value })}>
                  <option value="">All Feedback</option>
                  <option value="false">No Complaints</option>
                  <option value="true">With Complaints</option>
                </select>
              </div>

              {/* Export Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
                <button
                  id="btn-export-excel"
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', padding: '12px 10px', fontSize: 14, gap: 6 }}
                  onClick={handleExcelExport}
                  disabled={loadingXlsx || loadingPdf}>
                  <MdTableChart style={{ fontSize: 18 }} />
                  {loadingXlsx ? 'Generating…' : 'Export Excel'}
                </button>

                <button
                  id="btn-export-pdf"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    gap: 6, padding: '12px 10px', fontSize: 14, fontWeight: 600,
                    borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff', transition: 'opacity .2s',
                    opacity: (loadingPdf || loadingXlsx) ? 0.65 : 1,
                  }}
                  onClick={handlePdfExport}
                  disabled={loadingPdf || loadingXlsx}>
                  <MdPictureAsPdf style={{ fontSize: 18 }} />
                  {loadingPdf ? 'Generating…' : 'Export PDF'}
                </button>
              </div>

              <div style={{
                marginTop: 12, padding: '10px 14px',
                background: 'rgba(16,185,129,0.06)',
                border: '1px solid rgba(16,185,129,0.15)',
                borderRadius: 8, fontSize: 12, color: '#34d399',
              }}>
                ✅ Report includes all filtered feedback records
              </div>
            </div>
          </div>

          {/* Preview Fields */}
          <div className="card fade-in">
            <div className="card-header">
              <span className="card-title">📋 Report Columns Preview</span>
              <span className="badge badge-cyan">{reportFields.length} columns</span>
            </div>
            <div className="card-body" style={{ padding: '12px 20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                {reportFields.map((field, i) => (
                  <div key={field} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 4px', borderBottom: '1px solid rgba(255,255,255,0.03)',
                    fontSize: 13, color: 'var(--text-secondary)',
                  }}>
                    <span style={{
                      width: 20, height: 20, borderRadius: 4,
                      background: 'rgba(124,58,237,0.15)', color: '#a78bfa',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 10, fontWeight: 800, flexShrink: 0,
                    }}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {field}
                  </div>
                ))}
              </div>
            </div>
          </div>        </div>
      </div>
    </>
  );
}
