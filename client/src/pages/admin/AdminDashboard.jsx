import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../../lib/socket';

import { useAuth } from '../../context/AuthContext';


const AdminDashboard = () => {
    const navigate = useNavigate();
    const { isRegistered, isConnected } = useAuth();
    const [queue, setQueue] = useState([]);
    const [dmStatus, setDmStatus] = useState('online');

    // Stats State (Counts only)
    const [grievanceCount, setGrievanceCount] = useState(0);
    const [processedCount, setProcessedCount] = useState(0);

    // Manual overrides
    const [manualTime, setManualTime] = useState('');

    // Digital Office State
    const [meetLink, setMeetLink] = useState('');
    const [showLinkModal, setShowLinkModal] = useState(false);

    const saveMeetLink = () => {
        if (!meetLink) {
            alert("Please enter a valid link.");
            return;
        }
        localStorage.setItem('preferred_meet_link', meetLink);
        setShowLinkModal(false);
        alert("Digital Office Configured! Future calls will use this link automatically.");
    };

    useEffect(() => {
        if (isRegistered) {
            console.log("DM Registered, fetching initial data...");
            socket.emit('get_queue');
            socket.emit('get_dm_status');
            // We just need counts now, assuming the server sends updates even if we don't fetch full lists?
            // Actually, we might want to fetch full lists just to get counts if the server doesn't support "get_counts".
            // For now, let's fetch lists but only store length.
            socket.emit('get_logs');
            socket.emit('get_grievances');
        }

        const storedLink = localStorage.getItem('preferred_meet_link');
        if (storedLink) setMeetLink(storedLink);

        const handleQueueUpdate = (updatedQueue) => setQueue(updatedQueue);
        const handleStatusUpdate = ({ status }) => setDmStatus(status);

        // Just Update Counts
        const handleLogsUpdate = (updatedLogs) => {
            const today = new Date().toISOString().split('T')[0];
            const todaysLogs = updatedLogs.filter(log => log.endTime.startsWith(today));
            const uniqueUsers = new Set(todaysLogs.map(log => log.citizenMobile)).size;
            setProcessedCount(uniqueUsers);
        };

        const handleGrievanceUpdate = (updatedGrievances) => setGrievanceCount(updatedGrievances.length);

        const handleQueueTimeUpdate = ({ manualTime }) => {
            alert(`Queue time updated to ${manualTime ? manualTime + ' mins' : 'Auto'}`);
        };

        socket.on('queue_update_dm', handleQueueUpdate);
        socket.on('dm_status_update', handleStatusUpdate);
        socket.on('logs_update', handleLogsUpdate);
        socket.on('grievance_update', handleGrievanceUpdate);
        socket.on('queue_time_updated', handleQueueTimeUpdate);

        return () => {
            socket.off('queue_update_dm', handleQueueUpdate);
            socket.off('dm_status_update', handleStatusUpdate);
            socket.off('logs_update', handleLogsUpdate);
            socket.off('grievance_update', handleGrievanceUpdate);
            socket.off('queue_time_updated', handleQueueTimeUpdate);
        };
    }, [isRegistered]);


    const handleCallUser = (citizenId) => {
        socket.emit('call_user', { targetSocketId: citizenId });
        navigate(`/video-room/${citizenId}?role=dm`);
    };

    const handleUpdateQueueTime = (e) => {
        e.preventDefault();
        socket.emit('set_queue_time', { time: manualTime });
    };

    return (
        <div className="space-y-8">
            {/* Dashboard Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Welcome & Status Card */}
                <div className="lg:col-span-4 bg-white/60 backdrop-blur-md border border-white/60 rounded-3xl p-6 shadow-xl shadow-slate-200/40 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            Welcome back, {useAuth().user?.name || 'Administrator'} 👋
                        </h2>
                        <p className="text-slate-500 font-medium mt-1">Here is what's happening in your district today.</p>
                    </div>

                    {/* Status Pills */}
                    <div className="flex items-center gap-3 bg-white/50 p-2 rounded-2xl border border-white/60">
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                            <span className="text-xs font-bold uppercase tracking-wider">{isConnected ? 'System Online' : 'Offline'}</span>
                        </div>
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-100 ${dmStatus === 'online' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                            <span className="text-xs font-bold uppercase tracking-wider">{dmStatus}</span>
                        </div>
                    </div>
                </div>

                {/* Stat 1: LIVE Queue */}
                <div className="relative group overflow-hidden bg-gradient-to-br from-blue-600 to-blue-700 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/30">
                    <div className="absolute top-0 right-0 p-4 opacity-10 text-9xl font-bold leading-none select-none">Q</div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-blue-100 font-medium text-sm uppercase tracking-wider">Waiting Now</p>
                                <h3 className="text-4xl font-bold mt-2">{queue.length}</h3>
                            </div>
                            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl">
                                👥
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2 text-xs font-medium text-blue-100">
                            <span className="bg-blue-500/30 px-2 py-0.5 rounded text-white">Live</span>
                            <span>Citizens in lobby</span>
                        </div>
                    </div>
                </div>

                {/* Stat 2: Completed */}
                <div className="relative group overflow-hidden bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">Processed Today</p>
                            <h3 className="text-4xl font-bold text-slate-800 mt-2">{processedCount}</h3>
                        </div>
                        <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl text-xl">
                            ✅
                        </div>
                    </div>
                    <div className="mt-4 text-xs font-medium text-emerald-600">
                        Successful Interactions
                    </div>
                </div>

                {/* Stat 3: Avg Wait (Interactive) */}
                <div className="relative group overflow-hidden bg-white rounded-3xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-slate-200/50">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-slate-500 font-medium text-sm uppercase tracking-wider">Wait Time</p>
                            <div className="flex items-baseline gap-1 mt-2">
                                <h3 className="text-4xl font-bold text-slate-800">{manualTime || 'Auto'}</h3>
                                {manualTime && <span className="text-sm font-medium text-slate-400">min</span>}
                            </div>
                        </div>

                        <button
                            onClick={() => setShowLinkModal(true)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1 transition-all ${localStorage.getItem('preferred_meet_link')
                                ? 'bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100'
                                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                }`}
                        >
                            {localStorage.getItem('preferred_meet_link') ? '✨ Office Active' : '⚙️ Setup Office'}
                        </button>
                    </div>

                    <form onSubmit={handleUpdateQueueTime} className="mt-4 flex gap-2 relative z-20">
                        <input
                            type="number"
                            placeholder="Set Override"
                            className="w-full bg-slate-50 border-none rounded-lg text-xs px-2 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
                            value={manualTime}
                            onChange={(e) => setManualTime(e.target.value)}
                        />
                        <button type="submit" className="bg-slate-900 text-white rounded-lg px-2 text-xs hover:bg-slate-700">Set</button>
                    </form>
                </div>

                {/* Stat 4: Grievances (Clickable) */}
                <div
                    onClick={() => navigate('/admin/grievances')}
                    className="cursor-pointer relative group overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-500/20 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/30"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-indigo-100 font-medium text-sm uppercase tracking-wider">Pending Issues</p>
                            <h3 className="text-4xl font-bold mt-2">{grievanceCount}</h3>
                        </div>
                        <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl group-hover:bg-white/30 transition">
                            📬
                        </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-medium text-indigo-100">
                        <span className="bg-indigo-500/30 px-2 py-0.5 rounded">Action Required</span>
                        <span className="group-hover:translate-x-1 transition">View All →</span>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* LEFT COL: Live Queue (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <span>👥</span> Waiting Citizens
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{queue.length}</span>
                        </h3>
                    </div>

                    {queue.length === 0 ? (
                        <div className="bg-white/60 backdrop-blur-md rounded-3xl p-12 text-center border border-white/60 shadow-lg shadow-slate-200/40">
                            <div className="text-6xl mb-4 grayscale opacity-20">☕</div>
                            <h3 className="text-lg font-bold text-slate-600">The Lobby is Empty</h3>
                            <p className="text-slate-400">All citizens have been attended to.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {queue.map((citizen, index) => (
                                <div key={citizen.id} className="group bg-white rounded-2xl p-5 border border-slate-100 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 hover:-translate-y-0.5 flex flex-col sm:flex-row items-center gap-6">

                                    {/* Avatar / Number */}
                                    <div className="relative">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-500/30">
                                            {index + 1}
                                        </div>
                                        {index === 0 && (
                                            <div className="absolute -top-2 -right-2 bg-rose-500 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                                                NEXT
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 text-center sm:text-left">
                                        <h4 className="text-lg font-bold text-slate-800 flex items-center justify-center sm:justify-start gap-2">
                                            {citizen.name}
                                            {citizen.lastCitizenRating && (
                                                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                                                    ★ {citizen.lastCitizenRating}
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-sm font-medium text-slate-500 flex items-center justify-center sm:justify-start gap-2 mt-1">
                                            <span>📍 {citizen.block}, {citizen.village}</span>
                                            <span className="text-slate-300">•</span>
                                            <span>📞 {citizen.mobile}</span>
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            Waiting since: {new Date(citizen.timestamp || Date.now()).toLocaleTimeString()}
                                        </p>
                                    </div>

                                    {/* Action */}
                                    <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                                        <button
                                            onClick={() => handleCallUser(citizen.id)}
                                            className="flex-1 sm:w-32 py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-blue-600 hover:shadow-blue-500/30 transition-all active:scale-95"
                                        >
                                            Start Call
                                        </button>
                                        <button className="flex-1 sm:w-32 py-3 text-slate-500 hover:bg-slate-100 font-medium rounded-xl transition text-sm">
                                            Skip
                                        </button>
                                    </div>

                                </div>
                            ))}
                        </div>
                    )}
                </div>


                {/* RIGHT COL: Quick Actions (1/3) */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <span>⚡</span> Quick Management
                    </h3>

                    <div className="grid gap-4">
                        {/* Grievances Button */}
                        <button
                            onClick={() => navigate('/admin/grievances')}
                            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all hover:scale-[1.02] text-left group"
                        >
                            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                                📬
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 group-hover:text-indigo-700 transition">Issues & Complaints</h4>
                            <p className="text-sm text-slate-500 mt-1">Review {grievanceCount} pending offline grievances.</p>
                            <div className="mt-4 flex items-center text-xs font-bold text-indigo-600">
                                Open Inbox <span className="ml-1 group-hover:translate-x-1 transition">→</span>
                            </div>
                        </button>

                        {/* History Button */}
                        <button
                            onClick={() => navigate('/admin/history')}
                            className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xl shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-500/10 transition-all hover:scale-[1.02] text-left group"
                        >
                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition">
                                📜
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 group-hover:text-blue-700 transition">History & Records</h4>
                            <p className="text-sm text-slate-500 mt-1">Access session logs, transcripts, and exports.</p>
                            <div className="mt-4 flex items-center text-xs font-bold text-blue-600">
                                View Archives <span className="ml-1 group-hover:translate-x-1 transition">→</span>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Config Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-slate-800">Configure Digital Office</h3>
                            <button onClick={() => setShowLinkModal(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                        </div>

                        <p className="text-sm text-slate-500 mb-4 bg-blue-50 p-3 rounded-xl border border-blue-100">
                            <strong>Tip:</strong> Create a <a href="https://meet.google.com/new" target="_blank" className="text-blue-600 underline">recurring Google Meet link</a> and paste it here. It will be reused for all future calls.
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Permanent Meeting Link</label>
                                <input
                                    type="url"
                                    placeholder="https://meet.google.com/abc-defg-hij"
                                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition font-medium text-slate-800"
                                    value={meetLink}
                                    onChange={(e) => setMeetLink(e.target.value)}
                                />
                            </div>

                            <button onClick={saveMeetLink} className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-900/20">
                                Save Configuration
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
