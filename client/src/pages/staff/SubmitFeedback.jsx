import { useState, useEffect } from 'react';
import Topbar from '../../components/Topbar';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { MdSend } from 'react-icons/md';

const COMPLAINT_CATS = ['Staff Behaviour', 'Waiting Time', 'Product Availability', 'Pricing', 'Billing', 'Product Information', 'Delivery', 'Other'];

const RatingInput = ({ label, value, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}</label>
    <div className="rating-input">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" className={`rating-star-btn${value >= n ? ' active' : ''}`}
          onClick={() => onChange(n)}>
          ★
        </button>
      ))}
      {value > 0 && <span style={{ fontSize: 13, color: 'var(--text-muted)', marginLeft: 6 }}>{value}/5</span>}
    </div>
  </div>
);

export default function SubmitFeedback() {
  const [visits, setVisits] = useState([]);
  const [selectedVisit, setSelectedVisit] = useState('');
  const [ratings, setRatings] = useState({ behaviour: 0, helpfulness: 0, productKnowledge: 0, tileCollection: 0, pricingExplanation: 0, overallExperience: 0 });
  const [recommendationScore, setRecommendationScore] = useState(0);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [hasComplaint, setHasComplaint] = useState(false);
  const [complaintCategory, setComplaintCategory] = useState('Other');
  const [complaintDescription, setComplaintDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/visits').then(r => {
      const unsubmitted = r.data.visits.filter(v => !v.feedbackSubmitted);
      setVisits(unsubmitted);
      if (unsubmitted.length > 0) setSelectedVisit(unsubmitted[0]._id);
    }).catch(() => toast.error('Could not load visits'));
  }, []);

  const selectedVisitData = visits.find(v => v._id === selectedVisit);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedVisit) return toast.error('Please select a visit');
    if (Object.values(ratings).some(r => r === 0)) return toast.error('Please rate all categories');
    if (recommendationScore === 0) return toast.error('Please provide a recommendation score');
    if (hasComplaint && !complaintDescription) return toast.error('Please describe the complaint');

    setSaving(true);
    try {
      await api.post('/feedback', {
        visitId: selectedVisit, ratings, recommendationScore, comments, suggestions,
        hasComplaint, complaintCategory, complaintDescription
      });
      toast.success('Feedback submitted successfully!');
      setSubmitted(true);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit feedback');
    } finally { setSaving(false); }
  };

  if (submitted) {
    return (
      <>
        <Topbar title="Submit Feedback" />
        <div className="page-content">
          <div className="card fade-in" style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
            <div className="card-body" style={{ padding: 48 }}>
              <div style={{ fontSize: 72, marginBottom: 20 }}>🎉</div>
              <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Feedback Submitted!
              </div>
              <div style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
                Thank you! The customer feedback has been recorded successfully.
              </div>
              <button className="btn btn-primary" onClick={() => { setSubmitted(false); window.location.reload(); }}>
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Topbar title="Submit Customer Feedback" subtitle="Record customer ratings and feedback" />
      <div className="page-content">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Left Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Visit Selection */}
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">📋 Select Visit</span>
                </div>
                <div className="card-body">
                  {visits.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>
                      <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                      No pending visits. Register a visit first.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {visits.map(v => (
                        <div key={v._id}
                          onClick={() => setSelectedVisit(v._id)}
                          style={{
                            padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                            border: `1px solid ${selectedVisit === v._id ? 'rgba(124,58,237,0.5)' : 'var(--border-glass)'}`,
                            background: selectedVisit === v._id ? 'rgba(124,58,237,0.1)' : 'rgba(255,255,255,0.02)',
                            transition: 'all 0.2s'
                          }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{v.customer?.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {v.purpose} · {new Date(v.visitDate).toLocaleDateString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Ratings */}
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">⭐ Ratings</span>
                </div>
                <div className="card-body">
                  <RatingInput label="Staff Behaviour" value={ratings.behaviour} onChange={v => setRatings({ ...ratings, behaviour: v })} />
                  <RatingInput label="Helpfulness" value={ratings.helpfulness} onChange={v => setRatings({ ...ratings, helpfulness: v })} />
                  <RatingInput label="Product Knowledge" value={ratings.productKnowledge} onChange={v => setRatings({ ...ratings, productKnowledge: v })} />
                  <RatingInput label="Tile Collection" value={ratings.tileCollection} onChange={v => setRatings({ ...ratings, tileCollection: v })} />
                  <RatingInput label="Pricing Explanation" value={ratings.pricingExplanation} onChange={v => setRatings({ ...ratings, pricingExplanation: v })} />
                  <RatingInput label="Overall Experience" value={ratings.overallExperience} onChange={v => setRatings({ ...ratings, overallExperience: v })} />
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Recommendation */}
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">🎯 Recommendation Score</span>
                </div>
                <div className="card-body">
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                    How likely is this customer to recommend us? (1 = Not likely, 10 = Highly likely)
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <button key={n} type="button"
                        className={`btn btn-sm ${recommendationScore === n ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ minWidth: 40 }}
                        onClick={() => setRecommendationScore(n)}>
                        {n}
                      </button>
                    ))}
                  </div>
                  {recommendationScore > 0 && (
                    <div style={{ marginTop: 12, fontSize: 13, color: recommendationScore >= 7 ? 'var(--status-success)' : 'var(--status-error)' }}>
                      {recommendationScore >= 9 ? '🌟 Promoter' : recommendationScore >= 7 ? '👍 Satisfied' : recommendationScore >= 5 ? '😐 Neutral' : '👎 Detractor'}
                    </div>
                  )}
                </div>
              </div>

              {/* Comments */}
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">💬 Comments & Suggestions</span>
                </div>
                <div className="card-body">
                  <div className="form-group">
                    <label className="form-label">Customer Comments</label>
                    <textarea className="form-control" rows={3} placeholder="What did the customer say?" value={comments} onChange={e => setComments(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Suggestions for Improvement</label>
                    <textarea className="form-control" rows={2} placeholder="Any suggestions?" value={suggestions} onChange={e => setSuggestions(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Complaint */}
              <div className="card fade-in">
                <div className="card-header">
                  <span className="card-title">⚠️ Complaint</span>
                </div>
                <div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={hasComplaint} onChange={e => setHasComplaint(e.target.checked)}
                        style={{ width: 16, height: 16, accentColor: 'var(--accent-purple)' }} />
                      <span style={{ fontSize: 14 }}>Customer has a complaint</span>
                    </label>
                  </div>
                  {hasComplaint && (
                    <>
                      <div className="form-group">
                        <label className="form-label">Complaint Category</label>
                        <select className="form-control" value={complaintCategory} onChange={e => setComplaintCategory(e.target.value)}>
                          {COMPLAINT_CATS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Complaint Description *</label>
                        <textarea className="form-control" rows={3} placeholder="Describe the complaint in detail..." value={complaintDescription} onChange={e => setComplaintDescription(e.target.value)} />
                      </div>
                    </>
                  )}
                </div>
              </div>

              <button type="submit" className="btn btn-primary" style={{ justifyContent: 'center', padding: 14, fontSize: 15 }} disabled={saving || visits.length === 0}>
                <MdSend />
                {saving ? 'Submitting...' : 'Submit Feedback'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
