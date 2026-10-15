import { useState, useRef } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  MdPersonAdd,
  MdPersonSearch,
  MdCheckCircle,
  MdShoppingBag,
  MdCancel,
  MdWhatsapp,
  MdVisibility,
  MdContentCopy,
  MdOpenInNew,
  MdPhoneIphone,
} from 'react-icons/md';

const CUSTOMER_TYPES = [
  'New Customer',
  'Existing Customer',
  'Contractor',
  'Builder',
  'Architect',
  'Interior Designer',
  'Other',
];

const PURPOSES = [
  'Tile Enquiry',
  'Tile Purchase',
  'Design Selection',
  'Price Enquiry',
  'Sample Selection',
  'Product Consultation',
  'Other',
];

const LEAD_SOURCES = [
  'Social Media',
  'Friends & Family',
  'Google / Online Search',
  'Architect / Interior Designer',
  'Builder / Contractor Referral',
  'Walk-in / Signboard',
  'Other',
];

const NON_PURCHASE_REASONS = [
  'High Price / Budget Constraint',
  'Design / Size Not Available',
  'Out of Stock / Lead Time',
  'Just Exploring / Browsing',
  'Better Offer Elsewhere',
  'Need Family / Architect Approval',
  'Quality Not As Expected',
  'Other',
];

const REPEAT_VISIT_REASONS = [
  'Follow-up on Previous Enquiry',
  'Price Negotiation / Received Discount / Ready to Purchase',
  'Bringing Family / Architect for Final Approval',
  'Looking for Alternative Designs / Sizes',
  'Checking Stock Arrival / Lead Time Update',
  'Additional Purchase for Another Area / Floor',
  'Tile Exchange / Replacement / Shortage',
  'Complaint or Product Issue',
  'Other Follow-up',
];

const POPULAR_TILE_STOCKS = [
  'GVT 2x4 (600x1200 mm)',
  'PGVT Big Slab (800x1600 mm)',
  'Double Charge 2x2 (600x600 mm)',
  'Bathroom Wall 300x450 mm',
  'Wooden Plank 200x1200 mm',
  'Kitchen Highlighter 300x600 mm',
  'Moroccan Designer Tiles',
  'Full Body Parking 16x16',
  'Subway White Glossy',
  'Step & Riser 4ft Bullnose',
  'Exterior Stone Cladding',
];

const emptyCustomer = {
  name: '',
  mobile: '',
  email: '',
  customerType: 'New Customer',
  source: 'Walk-in / Signboard',
  address: '',
};

const emptyVisit = {
  purpose: 'Tile Enquiry',
  purchaseStatus: 'Purchased',
  nonPurchaseReason: '',
  repeatReason: 'Follow-up on Previous Enquiry',
  source: 'Walk-in / Signboard',
  totalBillingValue: '',
  stockRequested: '',
  stockAvailable: 'Yes',
  stockNotes: '',
  notes: '',
};

export default function RegisterVisit() {
  const [step, setStep] = useState(1);
  const [mobile, setMobile] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [existingCustomer, setExistingCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [selectedCustomerId, setSelectedCustomerId] = useState(null);
  const [visit, setVisit] = useState(emptyVisit);
  const [createdVisit, setCreatedVisit] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const debounceRef = useRef(null);

  const handleMobileChange = (val) => {
    setMobile(val);
    setExistingCustomer(null);
    setCustomerHistory(null);
    setIsNewCustomer(false);
    setSelectedCustomerId(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length >= 10) {
      debounceRef.current = setTimeout(async () => {
        setLookupLoading(true);
        try {
          const { data } = await api.get(`/customers?search=${val}`);
          const match = data.find((c) => c.mobile === val);
          if (match) {
            setExistingCustomer(match);
            try {
              const hist = await api.get(`/customers/${match._id}/history`);
              setCustomerHistory(hist.data);
              if (hist.data.isRepeatVisitor) {
                toast(`🔔 Repeat Visitor Alert! Customer is visiting for Visit #${hist.data.nextVisitNumber}`, {
                  icon: '🔁',
                  duration: 5000,
                });
              }
            } catch (err) {
              console.error('History lookup error:', err);
            }
          } else {
            setIsNewCustomer(true);
            setCustomer({ ...emptyCustomer, mobile: val });
          }
        } catch {
          setIsNewCustomer(true);
          setCustomer({ ...emptyCustomer, mobile: val });
        } finally {
          setLookupLoading(false);
        }
      }, 500);
    }
  };

  const useExisting = () => {
    setSelectedCustomerId(existingCustomer._id);
    setCustomer(existingCustomer);
    setVisit((prev) => ({
      ...prev,
      source: existingCustomer.source || 'Walk-in / Signboard',
      repeatReason: prev.repeatReason || 'Follow-up on Previous Enquiry',
    }));
    setStep(2);
  };

  const handleCustomerSubmit = (e) => {
    e.preventDefault();
    if (!customer.name || !customer.mobile) return toast.error('Name and mobile are required');
    setVisit((prev) => ({
      ...prev,
      source: customer.source || 'Walk-in / Signboard',
    }));
    setStep(2);
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    if (visit.purchaseStatus === 'Not Purchased' && !visit.nonPurchaseReason) {
      return toast.error('Please specify the reason why the customer did not purchase');
    }

    if (customerHistory?.isRepeatVisitor && !visit.repeatReason) {
      return toast.error('Please select the reason for this repeat visit');
    }

    setSaving(true);
    try {
      let custId = selectedCustomerId;
      if (!custId) {
        try {
          const { data: cust } = await api.post('/customers', customer);
          custId = cust._id;
        } catch (err) {
          if (err.response?.status === 409) {
            custId = err.response.data.customer._id;
            toast('Customer already exists – reusing existing record.', { icon: 'ℹ️' });
          } else {
            throw err;
          }
        }
      }
      const { data: vis } = await api.post('/visits', {
        customer: custId,
        source: visit.source || customer.source,
        ...visit,
      });

      const customerInfo = (vis.customer && typeof vis.customer === 'object' && vis.customer.name)
        ? vis.customer
        : (existingCustomer || customer);

      const tokenOrId = vis.feedbackToken || vis._id;
      const feedbackLink = vis.feedbackLink || `${window.location.origin}/feedback/${tokenOrId}`;

      setCreatedVisit({
        ...vis,
        customer: customerInfo,
        feedbackLink,
      });
      setStep(3);
      toast.success('Visit registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register visit');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(1);
    setMobile('');
    setExistingCustomer(null);
    setCustomerHistory(null);
    setIsNewCustomer(false);
    setSelectedCustomerId(null);
    setCustomer(emptyCustomer);
    setVisit(emptyVisit);
    setCreatedVisit(null);
  };

  return (
    <>
      <Topbar title="Register Customer Visit" subtitle="Record customer visit, purchase status, sources & repeat visit reasons" />
      <div className="page-content">
        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, maxWidth: 640 }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  background: step >= s ? 'var(--gradient-primary)' : 'var(--bg-card)',
                  border: step >= s ? 'none' : '1px solid var(--border-glass)',
                  color: step >= s ? 'white' : 'var(--text-muted)',
                  boxShadow: step === s ? 'var(--shadow-glow-purple)' : 'none',
                  transition: 'all 0.3s',
                }}
              >
                {step > s ? '✓' : s}
              </div>
              {i < 2 && (
                <div
                  style={{
                    flex: 1,
                    height: 2,
                    margin: '0 8px',
                    background: step > s ? 'var(--gradient-primary)' : 'var(--border-glass)',
                    transition: 'all 0.3s',
                  }}
                />
              )}
            </div>
          ))}
        </div>

        <div className="card fade-in" style={{ maxWidth: 640 }}>
          {/* STEP 1: Mobile Lookup & Repeat Visitor Alert */}
          {step === 1 && (
            <>
              <div className="card-header">
                <span className="card-title">🔍 Step 1: Customer Details</span>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Mobile Number *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      className="form-control"
                      placeholder="Enter 10-digit mobile number"
                      value={mobile}
                      maxLength={15}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      style={{ paddingRight: 40 }}
                    />
                    {lookupLoading && (
                      <span
                        style={{
                          position: 'absolute',
                          right: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 18,
                          color: 'var(--accent-purple-light)',
                        }}
                      >
                        ⟳
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    We'll check if this customer is already registered and if they visited previously
                  </div>
                </div>

                {/* Existing Customer & Repeat Visitor Notification Box */}
                {existingCustomer && (
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: 12,
                      marginTop: 10,
                      background: customerHistory?.isRepeatVisitor
                        ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(124,58,237,0.06) 100%)'
                        : 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(6,182,212,0.06) 100%)',
                      border: customerHistory?.isRepeatVisitor
                        ? '2px solid rgba(245,158,11,0.45)'
                        : '1px solid rgba(16,185,129,0.3)',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {customerHistory?.isRepeatVisitor ? (
                          <span style={{ fontSize: 20 }}>🔁</span>
                        ) : (
                          <MdCheckCircle style={{ color: '#34d399', fontSize: 20 }} />
                        )}
                        <span
                          style={{
                            fontWeight: 800,
                            fontSize: 14,
                            color: customerHistory?.isRepeatVisitor ? '#b45309' : '#059669',
                          }}
                        >
                          {customerHistory?.isRepeatVisitor
                            ? `REPEAT VISITOR ALERT: VISIT #${customerHistory.nextVisitNumber}`
                            : 'Existing Customer Found'}
                        </span>
                      </div>

                      {customerHistory?.isRepeatVisitor && (
                        <span
                          style={{
                            padding: '3px 10px',
                            borderRadius: 12,
                            background: '#f59e0b',
                            color: '#ffffff',
                            fontWeight: 800,
                            fontSize: 11,
                          }}
                        >
                          Visited {customerHistory.totalVisits} Time{customerHistory.totalVisits !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div style={{ fontWeight: 700, fontSize: 16 }}>{existingCustomer.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>
                      📱 {existingCustomer.mobile} · {existingCustomer.customerType}
                    </div>
                    <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 3, fontWeight: 600 }}>
                      📣 Lead Source: {existingCustomer.source || 'Walk-in / Signboard'}
                    </div>

                    {/* REPEAT VISITOR HISTORY & REASON NOTIFICATION */}
                    {customerHistory?.isRepeatVisitor && customerHistory.previousVisits?.length > 0 && (
                      <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid rgba(245,158,11,0.25)' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span>📜</span> PREVIOUS VISIT HISTORY & REASONS:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {customerHistory.previousVisits.map((pv, idx) => (
                            <div
                              key={pv._id}
                              style={{
                                background: '#ffffff',
                                padding: '10px 12px',
                                borderRadius: 8,
                                border: '1px solid rgba(0,0,0,0.08)',
                                fontSize: 12,
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <span style={{ fontWeight: 700, color: '#7c3aed' }}>
                                  Visit #{pv.visitNumber || idx + 1} ({new Date(pv.visitDate || pv.createdAt).toLocaleDateString('en-IN')})
                                </span>
                                <span
                                  style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: 10,
                                    background: pv.purchaseStatus === 'Purchased' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                                    color: pv.purchaseStatus === 'Purchased' ? '#059669' : '#dc2626',
                                  }}
                                >
                                  {pv.purchaseStatus === 'Purchased' ? '✓ Purchased' : '✗ Not Purchased'}
                                </span>
                              </div>
                              <div style={{ color: 'var(--text-secondary)' }}>
                                <strong>Purpose:</strong> {pv.purpose} {pv.staff?.name ? `· Staff: ${pv.staff.name}` : ''}
                              </div>
                              {pv.purchaseStatus === 'Not Purchased' && pv.nonPurchaseReason && (
                                <div style={{ color: '#dc2626', fontWeight: 600, marginTop: 2 }}>
                                  ⚠️ Why they didn't buy: {pv.nonPurchaseReason}
                                </div>
                              )}
                              {pv.repeatReason && (
                                <div style={{ color: '#0891b2', fontWeight: 600, marginTop: 2 }}>
                                  🔁 Reason for this return: {pv.repeatReason}
                                </div>
                              )}
                              {pv.notes && (
                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                                  "{pv.notes}"
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <button className="btn btn-primary" style={{ flex: 1 }} onClick={useExisting}>
                        ✓ Proceed to Log Visit #{customerHistory?.nextVisitNumber || 2}
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ flex: 1 }}
                        onClick={() => {
                          setExistingCustomer(null);
                          setCustomerHistory(null);
                          setIsNewCustomer(true);
                          setCustomer({ ...emptyCustomer, mobile });
                        }}
                      >
                        + Register as New
                      </button>
                    </div>
                  </div>
                )}

                {/* New customer form */}
                {isNewCustomer && !existingCustomer && (
                  <form onSubmit={handleCustomerSubmit}>
                    <div
                      style={{
                        padding: '10px 14px',
                        borderRadius: 8,
                        marginBottom: 16,
                        background: 'rgba(124,58,237,0.08)',
                        border: '1px solid rgba(124,58,237,0.2)',
                      }}
                    >
                      <div style={{ fontSize: 12, color: '#a78bfa', fontWeight: 700 }}>
                        <MdPersonSearch style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        New Customer (Visit #1) — Please fill in their contact details
                      </div>
                    </div>
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">Full Name *</label>
                        <input
                          className="form-control"
                          placeholder="Customer name"
                          value={customer.name}
                          onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Mobile</label>
                        <input
                          className="form-control"
                          value={mobile}
                          readOnly
                          style={{ opacity: 0.7, cursor: 'not-allowed' }}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Email (Optional)</label>
                        <input
                          className="form-control"
                          type="email"
                          placeholder="customer@email.com"
                          value={customer.email}
                          onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Customer Type</label>
                        <select
                          className="form-control"
                          value={customer.customerType}
                          onChange={(e) => setCustomer({ ...customer, customerType: e.target.value })}
                        >
                          {CUSTOMER_TYPES.map((t) => (
                            <option key={t}>{t}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-grid-2">
                      <div className="form-group">
                        <label className="form-label">How did they hear about us? *</label>
                        <select
                          className="form-control"
                          value={customer.source}
                          onChange={(e) => setCustomer({ ...customer, source: e.target.value })}
                        >
                          {LEAD_SOURCES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Address (Optional)</label>
                        <input
                          className="form-control"
                          placeholder="Customer city or area"
                          value={customer.address}
                          onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="modal-footer" style={{ paddingTop: 8 }}>
                      <button type="submit" className="btn btn-primary" style={{ minWidth: 160 }}>
                        Next: Visit Details →
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </>
          )}

          {/* STEP 2: Visit Details & Repeat Reason */}
          {step === 2 && (
            <>
              <div className="card-header">
                <span className="card-title">
                  🏪 Step 2: Visit Details {customerHistory?.isRepeatVisitor ? `(Visit #${customerHistory.nextVisitNumber})` : ''}
                </span>
              </div>
              <form onSubmit={handleVisitSubmit}>
                <div className="modal-body">
                  {/* Customer Preview Strip */}
                  <div
                    style={{
                      padding: '12px 16px',
                      background: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(6,182,212,0.05) 100%)',
                      border: '1px solid rgba(124,58,237,0.2)',
                      borderRadius: 10,
                      marginBottom: 20,
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--accent-purple-light)', fontWeight: 700, marginBottom: 4 }}>
                      {customerHistory?.isRepeatVisitor
                        ? `🔁 REPEAT CUSTOMER (VISITING FOR VISIT #${customerHistory.nextVisitNumber})`
                        : '+ NEW CUSTOMER VISIT'}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{customer.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      📱 {customer.mobile} · {customer.customerType}
                    </div>
                  </div>

                  {/* REPEAT VISIT REASON FIELD */}
                  {customerHistory?.isRepeatVisitor && (
                    <div
                      className="form-group fade-in"
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(245,158,11,0.08)',
                        border: '1px solid rgba(245,158,11,0.35)',
                        borderRadius: 10,
                        marginBottom: 16,
                      }}
                    >
                      <label className="form-label" style={{ color: '#b45309', fontWeight: 800 }}>
                        🔔 What is the reason for this Repeat Visit (Visit #{customerHistory.nextVisitNumber})? *
                      </label>
                      <select
                        className="form-control"
                        value={visit.repeatReason}
                        onChange={(e) => setVisit({ ...visit, repeatReason: e.target.value })}
                        required
                        style={{ borderColor: 'rgba(245,158,11,0.5)', background: '#ffffff', fontWeight: 600 }}
                      >
                        {REPEAT_VISIT_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Captures why the customer returned to the showroom after their previous visit.
                      </div>
                    </div>
                  )}

                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Visit Purpose *</label>
                      <select
                        className="form-control"
                        value={visit.purpose}
                        onChange={(e) => setVisit({ ...visit, purpose: e.target.value })}
                      >
                        {PURPOSES.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">How did they find our shop? *</label>
                      <select
                        className="form-control"
                        value={visit.source}
                        onChange={(e) => setVisit({ ...visit, source: e.target.value })}
                      >
                        {LEAD_SOURCES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Showroom Stock & Demand Enquiry */}
                  <div
                    className="form-group fade-in"
                    style={{
                      padding: '14px 16px',
                      background: 'linear-gradient(135deg, rgba(6,182,212,0.06) 0%, rgba(124,58,237,0.04) 100%)',
                      border: '1.5px solid rgba(6,182,212,0.25)',
                      borderRadius: 12,
                      marginTop: 6,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 800, color: '#0891b2', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>📦</span> Tile Stock / Design Inquired by Customer *
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>Stock Available in Showroom?</span>
                        <div style={{ display: 'flex', gap: 4, background: '#ffffff', padding: '2px 4px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.1)' }}>
                          <button
                            type="button"
                            onClick={() => setVisit({ ...visit, stockAvailable: 'Yes' })}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: 'none',
                              background: visit.stockAvailable === 'Yes' ? '#10b981' : 'transparent',
                              color: visit.stockAvailable === 'Yes' ? '#ffffff' : '#059669',
                              transition: 'all 0.2s',
                            }}
                          >
                            ✓ Yes (In Stock)
                          </button>
                          <button
                            type="button"
                            onClick={() => setVisit({
                              ...visit,
                              stockAvailable: 'No',
                              purchaseStatus: visit.purchaseStatus === 'Purchased' ? 'Not Purchased' : visit.purchaseStatus,
                              nonPurchaseReason: !visit.nonPurchaseReason ? 'Out of Stock / Lead Time' : visit.nonPurchaseReason,
                            })}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 6,
                              fontSize: 11,
                              fontWeight: 800,
                              cursor: 'pointer',
                              border: 'none',
                              background: visit.stockAvailable === 'No' ? '#ef4444' : 'transparent',
                              color: visit.stockAvailable === 'No' ? '#ffffff' : '#dc2626',
                              transition: 'all 0.2s',
                            }}
                          >
                            ✗ No (Out of Stock)
                          </button>
                        </div>
                      </div>
                    </div>

                    <input
                      className="form-control"
                      placeholder="e.g. GVT 2x4 Statuario, Wooden Plank 200x1200, Moroccan Wall..."
                      value={visit.stockRequested}
                      onChange={(e) => setVisit({ ...visit, stockRequested: e.target.value })}
                      style={{ background: '#ffffff', fontWeight: 600, fontSize: 13, marginBottom: 8 }}
                    />

                    {/* Quick selectable popular tile categories */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {POPULAR_TILE_STOCKS.map((stk) => (
                        <button
                          key={stk}
                          type="button"
                          onClick={() => setVisit({ ...visit, stockRequested: stk })}
                          style={{
                            padding: '3px 9px',
                            borderRadius: 14,
                            fontSize: 11,
                            fontWeight: 600,
                            border: visit.stockRequested === stk ? '1.5px solid #0891b2' : '1px solid rgba(0,0,0,0.08)',
                            background: visit.stockRequested === stk ? 'rgba(6,182,212,0.15)' : '#ffffff',
                            color: visit.stockRequested === stk ? '#0891b2' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          {stk}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Purchase Status Switcher — 3 options */}
                  <div className="form-group" style={{ marginTop: 8 }}>
                    <label className="form-label" style={{ fontWeight: 700 }}>
                      Purchase Outcome on This Visit *
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {[
                        { status: 'Purchased', icon: '🛍️', activeColor: '#059669', activeBg: 'rgba(16,185,129,0.14)', activeBorder: '#059669' },
                        { status: 'Not Purchased', icon: '❌', activeColor: '#991b1b', activeBg: 'rgba(239,68,68,0.14)', activeBorder: '#dc2626' },
                        { status: 'Interested', icon: '⭐', activeColor: '#92400e', activeBg: 'rgba(245,158,11,0.14)', activeBorder: '#f59e0b' },
                      ].map(({ status, icon, activeColor, activeBg, activeBorder }) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setVisit({ ...visit, purchaseStatus: status, nonPurchaseReason: status !== 'Not Purchased' ? '' : visit.nonPurchaseReason })}
                          style={{
                            padding: '12px 8px',
                            borderRadius: 10,
                            border: visit.purchaseStatus === status ? `2px solid ${activeBorder}` : '1px solid rgba(124,58,237,0.18)',
                            background: visit.purchaseStatus === status ? activeBg : '#ffffff',
                            color: visit.purchaseStatus === status ? activeColor : 'var(--text-secondary)',
                            fontWeight: 700,
                            fontSize: 12,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexDirection: 'column',
                            gap: 6,
                            transition: 'all 0.2s',
                          }}
                        >
                          <span style={{ fontSize: 18 }}>{icon}</span>
                          <span>{status}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Total Billing Value Input */}
                  {visit.purchaseStatus === 'Purchased' && (
                    <div
                      className="form-group fade-in"
                      style={{
                        padding: '14px 16px',
                        background: 'linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(6,182,212,0.05) 100%)',
                        border: '1.5px solid rgba(16,185,129,0.35)',
                        borderRadius: 10,
                        marginTop: 14,
                      }}
                    >
                      <label className="form-label" style={{ color: '#047857', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>💰</span> Total Billing Value (₹) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{
                          position: 'absolute',
                          left: 12,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          fontSize: 16,
                          fontWeight: 700,
                          color: '#059669',
                        }}>
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="1"
                          className="form-control"
                          placeholder="Enter invoice/bill amount (e.g. 45000)"
                          value={visit.totalBillingValue}
                          onChange={(e) => setVisit({ ...visit, totalBillingValue: e.target.value })}
                          style={{
                            paddingLeft: 30,
                            fontSize: 15,
                            fontWeight: 700,
                            borderColor: 'rgba(16,185,129,0.5)',
                            background: '#ffffff',
                            color: '#065f46',
                          }}
                        />
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        Enter the total invoice/bill amount generated for this customer visit.
                      </div>
                    </div>
                  )}

                  {/* Reason for not purchasing */}
                  {visit.purchaseStatus === 'Not Purchased' && (
                    <div
                      className="form-group fade-in"
                      style={{
                        padding: '14px 16px',
                        background: 'rgba(239,68,68,0.06)',
                        border: '1px solid rgba(239,68,68,0.25)',
                        borderRadius: 10,
                        marginTop: 14,
                      }}
                    >
                      <label className="form-label" style={{ color: '#dc2626', fontWeight: 700 }}>
                        What is the reason they did not purchase on this visit? *
                      </label>
                      <select
                        className="form-control"
                        value={visit.nonPurchaseReason}
                        onChange={(e) => setVisit({ ...visit, nonPurchaseReason: e.target.value })}
                        required
                        style={{ borderColor: 'rgba(239,68,68,0.4)', background: '#ffffff' }}
                      >
                        <option value="">Select reason…</option>
                        {NON_PURCHASE_REASONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="form-group" style={{ marginTop: 14 }}>
                    <label className="form-label">Notes (Optional)</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      placeholder="Customer requirements, price discussed, feedback or follow-up note..."
                      value={visit.notes}
                      onChange={(e) => setVisit({ ...visit, notes: e.target.value })}
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>
                    ← Back
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <MdPersonAdd />
                    {saving ? 'Registering...' : `Register Visit ${customerHistory?.isRepeatVisitor ? `#${customerHistory.nextVisitNumber}` : ''}`}
                  </button>
                </div>
              </form>
            </>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && createdVisit && (
            <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>
                {createdVisit.purchaseStatus === 'Purchased' ? '🎉' : createdVisit.purchaseStatus === 'Interested' ? '⭐' : '📋'}
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  marginBottom: 8,
                  background: 'var(--gradient-primary)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Visit #{createdVisit.visitNumber || 1} Recorded Successfully!
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
                Customer visit outcome and history have been updated.
              </div>

              {/* Outcome badges */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
                <div style={{
                  padding: '8px 16px', borderRadius: 20, fontWeight: 700, fontSize: 13,
                  background: createdVisit.purchaseStatus === 'Purchased' ? 'rgba(16,185,129,0.12)' : createdVisit.purchaseStatus === 'Interested' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                  color: createdVisit.purchaseStatus === 'Purchased' ? '#059669' : createdVisit.purchaseStatus === 'Interested' ? '#b45309' : '#dc2626',
                  border: `1px solid ${createdVisit.purchaseStatus === 'Purchased' ? 'rgba(16,185,129,0.3)' : createdVisit.purchaseStatus === 'Interested' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                }}>
                  {createdVisit.purchaseStatus === 'Purchased' ? '✓ Purchased' : createdVisit.purchaseStatus === 'Interested' ? '⭐ Interested' : `✗ Not Purchased: ${createdVisit.nonPurchaseReason || 'Other'}`}
                </div>
                {createdVisit.totalBillingValue > 0 && (
                  <div style={{
                    padding: '8px 16px', borderRadius: 20, fontWeight: 800, fontSize: 13,
                    background: 'rgba(16,185,129,0.15)', color: '#047857', border: '1.5px solid rgba(16,185,129,0.4)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    💰 Billing: ₹{Number(createdVisit.totalBillingValue).toLocaleString('en-IN')}
                  </div>
                )}
                {createdVisit.repeatReason && (
                  <div style={{ padding: '8px 16px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#b45309', fontWeight: 700, fontSize: 13, border: '1px solid rgba(245,158,11,0.3)' }}>
                    🔁 {createdVisit.repeatReason}
                  </div>
                )}
                {createdVisit.stockRequested && (
                  <div style={{
                    padding: '8px 16px', borderRadius: 20,
                    background: createdVisit.stockAvailable === 'Yes' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                    color: createdVisit.stockAvailable === 'Yes' ? '#047857' : '#dc2626',
                    fontWeight: 700, fontSize: 13,
                    border: createdVisit.stockAvailable === 'Yes' ? '1px solid rgba(16,185,129,0.35)' : '1px solid rgba(239,68,68,0.35)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    📦 {createdVisit.stockRequested} ({createdVisit.stockAvailable === 'Yes' ? '✓ In Stock' : '✗ Out of Stock'})
                  </div>
                )}
                <div style={{ padding: '8px 16px', borderRadius: 20, background: 'rgba(124,58,237,0.1)', color: '#6d28d9', fontWeight: 700, fontSize: 13, border: '1px solid rgba(124,58,237,0.25)' }}>
                  📣 {createdVisit.source || 'Walk-in / Signboard'}
                </div>
              </div>

              {/* Always display Customer Feedback & Complaint Link with WhatsApp, Copy, and Live Form Preview */}
              {(() => {
                const cust = (createdVisit.customer && typeof createdVisit.customer === 'object' && createdVisit.customer.name)
                  ? createdVisit.customer
                  : (existingCustomer || customer);
                const custName = cust?.name || 'Valued Customer';
                const rawMobile = cust?.mobile || mobile || '';
                const cleanDigits = rawMobile.replace(/\D/g, '');
                const phoneForWhatsApp = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
                const link = createdVisit.feedbackLink || `${window.location.origin}/feedback/${createdVisit.feedbackToken || createdVisit._id}`;

                const messageText = `Dear ${custName}, thank you for visiting TileShow!\n\nWe value your feedback. Please click the link below to share your experience or register any complaint:\n${link}\n\nYour response helps us serve you better. 🙏`;

                const waUrl = `https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(messageText)}`;

                return (
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(37,211,102,0.06) 0%, rgba(124,58,237,0.06) 100%)',
                    border: '1.5px solid rgba(37,211,102,0.4)',
                    borderRadius: 16,
                    padding: '24px',
                    marginBottom: 24,
                    textAlign: 'left',
                    boxShadow: '0 8px 24px rgba(37,211,102,0.08)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 800, color: '#047857' }}>
                        <span style={{ fontSize: 20 }}>📲</span> Customer Complaint & Feedback Link
                      </div>
                      {rawMobile && (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: 'rgba(37,211,102,0.15)',
                          color: '#065f46',
                          padding: '4px 12px',
                          borderRadius: 20,
                          fontSize: 12,
                          fontWeight: 700,
                        }}>
                          <MdPhoneIphone style={{ fontSize: 14 }} /> {custName} ({cleanDigits.length === 10 ? `+91 ${cleanDigits}` : rawMobile})
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                      Send this unique, secure complaint & feedback form link to the customer via WhatsApp or copy the link below. The customer can rate their showroom experience and submit any complaints without logging in.
                    </div>

                    {/* Link display & copy */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      background: '#ffffff',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 10,
                      padding: '8px 12px',
                      marginBottom: 16,
                    }}>
                      <input
                        type="text"
                        readOnly
                        value={link}
                        style={{
                          flex: 1,
                          border: 'none',
                          background: 'transparent',
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ padding: '4px 10px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        onClick={() => {
                          navigator.clipboard.writeText(link);
                          toast.success('Form link copied to clipboard!');
                        }}
                      >
                        <MdContentCopy /> Copy Link
                      </button>
                    </div>

                    {/* Action Buttons: WhatsApp, Live Preview, Open in New Tab */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-primary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          textDecoration: 'none',
                          background: 'linear-gradient(135deg, #25d366, #128c7e)',
                          fontSize: 14,
                          fontWeight: 700,
                          padding: '10px 18px',
                          boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
                        }}
                      >
                        <MdWhatsapp style={{ fontSize: 18 }} /> Send via WhatsApp
                      </a>

                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          fontSize: 14,
                          fontWeight: 700,
                          padding: '10px 18px',
                        }}
                        onClick={() => setShowPreviewModal(true)}
                      >
                        <MdVisibility style={{ fontSize: 18 }} /> Live Form Preview
                      </button>

                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-ghost"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          textDecoration: 'none',
                          fontSize: 13,
                          padding: '10px 14px',
                        }}
                      >
                        <MdOpenInNew style={{ fontSize: 16 }} /> Open in New Tab
                      </a>
                    </div>
                  </div>
                );
              })()}

              {/* Visit ID */}
              <div style={{ padding: '12px 16px', background: 'rgba(124,58,237,0.03)', borderRadius: 8, marginBottom: 24, fontSize: 13, border: '1px solid rgba(124,58,237,0.1)' }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Visit Record ID</div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-purple)', fontSize: 13 }}>
                  {createdVisit._id}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={reset}>
                  <MdPersonAdd /> Register Another Visit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Form Preview Modal */}
      {showPreviewModal && createdVisit && (
        <div
          className="modal-overlay"
          onClick={() => setShowPreviewModal(false)}
          style={{ zIndex: 9999, background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
        >
          <div
            className="modal"
            style={{
              maxWidth: 720,
              width: '95%',
              height: '88vh',
              maxHeight: 820,
              display: 'flex',
              flexDirection: 'column',
              padding: 0,
              borderRadius: 16,
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="modal-header"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '14px 20px',
                borderBottom: '1px solid var(--border-glass)',
                background: 'var(--bg-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(124,58,237,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-purple)',
                    fontSize: 16,
                  }}
                >
                  <MdVisibility />
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>Customer Feedback & Complaint Form Preview</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    Exact view for {createdVisit.customer?.name || 'Customer'}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <a
                  href={createdVisit.feedbackLink || `${window.location.origin}/feedback/${createdVisit.feedbackToken || createdVisit._id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, textDecoration: 'none' }}
                >
                  <MdOpenInNew /> Open in Full Tab
                </a>
                <button
                  type="button"
                  className="btn btn-ghost btn-icon btn-sm"
                  onClick={() => setShowPreviewModal(false)}
                  style={{ fontSize: 16 }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ flex: 1, position: 'relative', background: '#f8fafc' }}>
              <iframe
                src={createdVisit.feedbackLink || `${window.location.origin}/feedback/${createdVisit.feedbackToken || createdVisit._id}`}
                title="Customer Form Live Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
