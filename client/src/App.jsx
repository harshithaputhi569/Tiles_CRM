import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { SidebarProvider } from './context/SidebarContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';

// Pages
import Login from './pages/Login';
import AdminDashboard from './pages/admin/AdminDashboard';
import StaffManagement from './pages/admin/StaffManagement';
import FeedbackManagement from './pages/admin/FeedbackManagement';
import ComplaintManagement from './pages/admin/ComplaintManagement';
import AllVisits from './pages/admin/AllVisits';
import Analytics from './pages/admin/Analytics';
import Reports from './pages/admin/Reports';
import StaffDashboard from './pages/staff/StaffDashboard';
import RegisterVisit from './pages/staff/RegisterVisit';
import MyVisits from './pages/staff/MyVisits';
import SubmitFeedback from './pages/staff/SubmitFeedback';
import MyPerformance from './pages/staff/MyPerformance';

// Public page — no auth required
import CustomerFeedbackForm from './pages/CustomerFeedbackForm';

function AppLayout({ children }) {
  return (
    <SidebarProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#12122a',
                color: '#f0f0ff',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                fontSize: 14,
              },
              success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Public — Customer Feedback Form (no login required) */}
          <Route path="/feedback/:token" element={<CustomerFeedbackForm />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={
            <ProtectedRoute role="admin">
              <AppLayout><AdminDashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute role="admin">
              <AppLayout><Analytics /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/staff" element={
            <ProtectedRoute role="admin">
              <AppLayout><StaffManagement /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/visits" element={
            <ProtectedRoute role="admin">
              <AppLayout><AllVisits /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/feedback" element={
            <ProtectedRoute role="admin">
              <AppLayout><FeedbackManagement /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/complaints" element={
            <ProtectedRoute role="admin">
              <AppLayout><ComplaintManagement /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/admin/reports" element={
            <ProtectedRoute role="admin">
              <AppLayout><Reports /></AppLayout>
            </ProtectedRoute>
          } />

          {/* Staff Routes */}
          <Route path="/staff/dashboard" element={
            <ProtectedRoute role="staff">
              <AppLayout><StaffDashboard /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/staff/visit" element={
            <ProtectedRoute role="staff">
              <AppLayout><RegisterVisit /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/staff/my-visits" element={
            <ProtectedRoute role="staff">
              <AppLayout><MyVisits /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/staff/feedback" element={
            <ProtectedRoute role="staff">
              <AppLayout><SubmitFeedback /></AppLayout>
            </ProtectedRoute>
          } />
          <Route path="/staff/performance" element={
            <ProtectedRoute role="staff">
              <AppLayout><MyPerformance /></AppLayout>
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
