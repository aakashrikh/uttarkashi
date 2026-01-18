import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';

import CitizenLogin from './pages/auth/CitizenLogin';
import AdminLogin from './pages/auth/AdminLogin';
import CitizenDashboard from './pages/citizen/Dashboard';
import WaitingRoom from './pages/citizen/WaitingRoom';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminGrievances from './pages/admin/AdminGrievances';
import AdminHistory from './pages/admin/AdminHistory';

import VideoRoom from './components/video/VideoRoom';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRole }) => {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated) return <Navigate to="/" />;
    if (allowedRole && user.role !== allowedRole) return <Navigate to="/" />;

    return children;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <div className="min-h-screen text-slate-900 font-sans">
                    <Routes>
                        {/* Admin Routes */}
                        <Route path="/admin/login" element={<AdminLogin />} />
                        <Route path="/admin" element={<AdminLayout />}>
                            <Route path="dashboard" element={
                                <ProtectedRoute allowedRole="dm">
                                    <AdminDashboard />
                                </ProtectedRoute>
                            } />
                            <Route path="grievances" element={
                                <ProtectedRoute allowedRole="dm">
                                    <AdminGrievances />
                                </ProtectedRoute>
                            } />
                            <Route path="history" element={
                                <ProtectedRoute allowedRole="dm">
                                    <AdminHistory />
                                </ProtectedRoute>
                            } />
                        </Route>

                        {/* Public/Citizen Routes */}
                        <Route path="/" element={<PublicLayout />}>
                            <Route index element={<CitizenLogin />} />
                            <Route path="login" element={<CitizenLogin />} />

                            <Route path="dashboard" element={
                                <ProtectedRoute allowedRole="citizen">
                                    <CitizenDashboard />
                                </ProtectedRoute>
                            } />

                            <Route path="waiting-room" element={
                                <ProtectedRoute allowedRole="citizen">
                                    <WaitingRoom />
                                </ProtectedRoute>
                            } />
                        </Route>

                        {/* Video Route - Independent Layout */}
                        <Route path="/video-room/:id" element={
                            <ProtectedRoute>
                                <VideoRoom />
                            </ProtectedRoute>
                        } />

                    </Routes>
                </div>
            </Router>
        </AuthProvider>
    );
}

export default App;
