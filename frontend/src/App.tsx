import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

import { AuthProvider } from './context/AuthContext';
import { useAuthContext } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { ROLE_HOME } from './utils/roleUtils';

// Public pages
import LandingPage from './pages/public/LandingPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPasswordPage';
import PublicResultsPage from './pages/public/PublicResultsPage';

// Voter pages
import VoterDashboard from './pages/voter/VoterDashboard';
import VotingPage from './pages/voter/VotingPage';
import VoterIdApplicationPage from './pages/voter/VoterIdApplicationPage';
import ElectionListPage from './pages/voter/ElectionListPage';

// Candidate pages
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import NominationPage from './pages/candidate/NominationPage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageElectionsPage from './pages/admin/ManageElectionsPage';
import ElectionFormPage from './pages/admin/ElectionFormPage';
import ManageNominationsPage from './pages/admin/ManageNominationsPage';
import ManualResultsEntryPage from './pages/admin/ManualResultsEntryPage';

// Field Officer pages
import FieldOfficerDashboard from './pages/field-officer/FieldOfficerDashboard';
import ApplicationQueuePage from './pages/field-officer/ApplicationQueuePage';
import ConstituencyVotersPage from './pages/field-officer/ConstituencyVotersPage';

// Forum
import ForumPage from './pages/forum/ForumPage';

// Notifications
import NotificationsPage from './pages/NotificationsPage';

function RootRoute() {
  const { user, isAuthenticated } = useAuthContext();
  if (isAuthenticated && user) return <Navigate to={ROLE_HOME[user.role]} replace />;
  return <LandingPage />;
}

function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: '0.5rem',
        }}>403 — Access denied</p>
        <p style={{ fontFamily: "'Inter', system-ui, sans-serif", color: 'var(--muted)' }}>
          You don't have permission to view this page.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--ivory)' }}>
          <Navbar />
          <main style={{ flex: 1 }}>
            <Routes>
              {/* Public */}
              <Route path="/" element={<RootRoute />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/results" element={<PublicResultsPage />} />
<Route path="/unauthorized" element={<UnauthorizedPage />} />

              {/* Voter */}
              <Route path="/voter" element={
                <ProtectedRoute allowedRoles={['VOTER']}>
                  <VoterDashboard />
                </ProtectedRoute>
              } />
              <Route path="/voter/apply" element={
                <ProtectedRoute allowedRoles={['VOTER']}>
                  <VoterIdApplicationPage />
                </ProtectedRoute>
              } />
              <Route path="/voter/elections" element={
                <ProtectedRoute allowedRoles={['VOTER']}>
                  <ElectionListPage />
                </ProtectedRoute>
              } />
              <Route path="/vote/:electionId" element={
                <ProtectedRoute allowedRoles={['VOTER']}>
                  <VotingPage />
                </ProtectedRoute>
              } />

              {/* Candidate */}
              <Route path="/candidate" element={
                <ProtectedRoute allowedRoles={['CANDIDATE']}>
                  <CandidateDashboard />
                </ProtectedRoute>
              } />
              <Route path="/candidate/nominate" element={
                <ProtectedRoute allowedRoles={['CANDIDATE']}>
                  <NominationPage />
                </ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/admin" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/elections" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ManageElectionsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/elections/new" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ElectionFormPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/nominations" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ManageNominationsPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/results/:electionId" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <ManualResultsEntryPage />
                </ProtectedRoute>
              } />

              {/* Field Officer */}
              <Route path="/field-officer" element={
                <ProtectedRoute allowedRoles={['FIELD_OFFICER']}>
                  <FieldOfficerDashboard />
                </ProtectedRoute>
              } />
              <Route path="/field-officer/applications" element={
                <ProtectedRoute allowedRoles={['FIELD_OFFICER', 'ADMIN']}>
                  <ApplicationQueuePage />
                </ProtectedRoute>
              } />
              <Route path="/field-officer/voters" element={
                <ProtectedRoute allowedRoles={['FIELD_OFFICER']}>
                  <ConstituencyVotersPage />
                </ProtectedRoute>
              } />

              {/* Forum */}
              <Route path="/forum/:constituencyId" element={
                <ProtectedRoute>
                  <ForumPage />
                </ProtectedRoute>
              } />

              {/* Notifications */}
              <Route path="/notifications" element={
                <ProtectedRoute>
                  <NotificationsPage />
                </ProtectedRoute>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </div>
        <Toaster position="top-right" toastOptions={{
          style: {
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.875rem',
            background: '#0F1923',
            color: '#fff',
            borderRadius: 8,
          },
          success: { iconTheme: { primary: '#E8622A', secondary: '#fff' } },
        }} />
      </AuthProvider>
    </BrowserRouter>
  );
}
