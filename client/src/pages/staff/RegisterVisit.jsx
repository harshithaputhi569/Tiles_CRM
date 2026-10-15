import { useState, useRef } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdPersonAdd, MdPersonSearch, MdCheckCircle, MdShoppingBag, MdCancel } from 'react-icons/md';

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
      setCreatedVisit(vis);
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
                {createdVisit.repeatReason && (
                  <div style={{ padding: '8px 16px', borderRadius: 20, background: 'rgba(245,158,11,0.12)', color: '#b45309', fontWeight: 700, fontSize: 13, border: '1px solid rgba(245,158,11,0.3)' }}>
                    🔁 {createdVisit.repeatReason}
                  </div>
                )}
                <div style={{ padding: '8px 16px', borderRadius: 20, background: 'rgba(124,58,237,0.1)', color: '#6d28d9', fontWeight: 700, fontSize: 13, border: '1px solid rgba(124,58,237,0.25)' }}>
                  📣 {createdVisit.source || 'Walk-in / Signboard'}
                </div>
              </div>

              {/* Feedback Link — Send via WhatsApp / Copy */}
              {createdVisit.feedbackLink && (
                <div style={{
                  padding: '18px 20px',
                  background: 'linear-gradient(135deg, rgba(37,211,102,0.08) 0%, rgba(18,140,126,0.06) 100%)',
                  border: '1px solid rgba(37,211,102,0.35)',
                  borderRadius: 14,
                  marginBottom: 24,
                  textAlign: 'left',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#059669', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    📱 Share Feedback & Complaint Form Link
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
                    Send <strong>{createdVisit.customer?.name || 'this customer'}</strong> a unique link via WhatsApp or copy it to share via SMS. The customer can rate their experience and raise a complaint.
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    <a
                      href={`https://wa.me/${(createdVisit.customer?.mobile || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Dear ${createdVisit.customer?.name || 'Customer'}, thank you for visiting TileShow!\n\nWe value your feedback. Please take a moment to share your experience:\n${createdVisit.feedbackLink}\n\nYour response helps us serve you better. 🙏`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none', background: 'linear-gradient(135deg, #25d366, #128c7e)', fontSize: 14, padding: '10px 18px' }}
                    >
                      <MdCheckCircle style={{ fontSize: 16 }} /> Send via WhatsApp
                    </a>
                    <button
                      className="btn btn-ghost"
                      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
                      onClick={() => { navigator.clipboard.writeText(createdVisit.feedbackLink); toast.success('Feedback link copied to clipboard!'); }}
                    >
                      📋 Copy Link
                    </button>
                  </div>
                </div>
              )}

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
    </>
  );
}
