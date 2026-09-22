import { useState } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdPersonAdd } from 'react-icons/md';

const CUSTOMER_TYPES = ['New Customer', 'Existing Customer', 'Contractor', 'Builder', 'Architect', 'Interior Designer', 'Other'];
const PURPOSES = ['Tile Enquiry', 'Tile Purchase', 'Design Selection', 'Price Enquiry', 'Sample Selection', 'Product Consultation', 'Other'];

const emptyCustomer = { name: '', mobile: '', email: '', customerType: 'New Customer', address: '' };
const emptyVisit = { purpose: 'Tile Enquiry', notes: '' };

export default function RegisterVisit() {
  const [step, setStep] = useState(1);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [visit, setVisit] = useState(emptyVisit);
  const [createdVisit, setCreatedVisit] = useState(null);
  const [saving, setSaving] = useState(false);

  const handleCustomerSubmit = async (e) => {
    e.preventDefault();
    if (!customer.name || !customer.mobile) return toast.error('Name and mobile are required');
    setStep(2);
  };

  const handleVisitSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Create customer first
      const { data: cust } = await api.post('/customers', customer);
      // Then create visit
      const { data: vis } = await api.post('/visits', { customer: cust._id, ...visit });
      setCreatedVisit(vis);
      setStep(3);
      toast.success('Visit registered successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to register visit');
    } finally { setSaving(false); }
  };

  const reset = () => {
    setStep(1);
    setCustomer(emptyCustomer);
    setVisit(emptyVisit);
    setCreatedVisit(null);
  };

  return (
    <>
      <Topbar title="Register Customer Visit" subtitle="Record a new customer visit" />
      <div className="page-content">

        {/* Stepper */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 32, maxWidth: 600 }}>
          {[1, 2, 3].map((s, i) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 14,
                background: step >= s ? 'var(--gradient-primary)' : 'var(--bg-card)',
                border: step >= s ? 'none' : '1px solid var(--border-glass)',
                color: step >= s ? 'white' : 'var(--text-muted)',
                boxShadow: step === s ? 'var(--shadow-glow-purple)' : 'none',
                transition: 'all 0.3s'
              }}>{step > s ? '✓' : s}</div>
              {i < 2 && (
                <div style={{
                  flex: 1, height: 2, margin: '0 8px',
                  background: step > s ? 'var(--gradient-primary)' : 'var(--border-glass)',
                  transition: 'all 0.3s'
                }} />
              )}
            </div>
          ))}
        </div>

        <div className="card fade-in" style={{ maxWidth: 600 }}>
          {step === 1 && (
            <>
              <div className="card-header">
                <span className="card-title">👤 Step 1: Customer Information</span>
              </div>
              <form onSubmit={handleCustomerSubmit}>
                <div className="modal-body">
                  <div className="form-grid-2">
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input className="form-control" placeholder="Customer name" value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Mobile Number *</label>
                      <input className="form-control" placeholder="9876543210" value={customer.mobile} onChange={e => setCustomer({ ...customer, mobile: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Email (Optional)</label>
                      <input className="form-control" type="email" placeholder="customer@email.com" value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Customer Type</label>
                      <select className="form-control" value={customer.customerType} onChange={e => setCustomer({ ...customer, customerType: e.target.value })}>
                        {CUSTOMER_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address (Optional)</label>
                    <input className="form-control" placeholder="Customer address" value={customer.address} onChange={e => setCustomer({ ...customer, address: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="submit" className="btn btn-primary">Next: Visit Details →</button>
                </div>
              </form>
            </>
          )}

          {step === 2 && (
            <>
              <div className="card-header">
                <span className="card-title">🏪 Step 2: Visit Details</span>
              </div>
              <form onSubmit={handleVisitSubmit}>
                <div className="modal-body">
                  {/* Customer summary */}
                  <div style={{ padding: '10px 14px', background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 8, marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--accent-purple-light)', fontWeight: 700, marginBottom: 4 }}>CUSTOMER</div>
                    <div style={{ fontWeight: 600 }}>{customer.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{customer.mobile} · {customer.customerType}</div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Visit Purpose *</label>
                    <select className="form-control" value={visit.purpose} onChange={e => setVisit({ ...visit, purpose: e.target.value })}>
                      {PURPOSES.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Notes (Optional)</label>
                    <textarea className="form-control" rows={3} placeholder="Any special notes about this visit..." value={visit.notes} onChange={e => setVisit({ ...visit, notes: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>← Back</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    <MdPersonAdd />
                    {saving ? 'Registering...' : 'Register Visit'}
                  </button>
                </div>
              </form>
            </>
          )}

          {step === 3 && createdVisit && (
            <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
              <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Visit Registered!
              </div>
              <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 24 }}>
                Customer visit has been successfully recorded.
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 24, fontSize: 13 }}>
                <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>Visit ID</div>
                <div style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--accent-cyan-light)', fontSize: 12 }}>{createdVisit._id}</div>
              </div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <button className="btn btn-primary" onClick={reset}><MdPersonAdd /> New Visit</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
