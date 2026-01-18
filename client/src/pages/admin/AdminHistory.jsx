import React, { useEffect, useState } from 'react';
import { socket } from '../../lib/socket';
import { uttarkashiData } from '../../data/uttarkashi_data';

const AdminHistory = () => {
    const [logs, setLogs] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null); // Mobile number

    // Reporting Feature State
    const [reportBlock, setReportBlock] = useState('');
    const [reportVillage, setReportVillage] = useState('');
    const [reportAvailableVillages, setReportAvailableVillages] = useState([]);

    useEffect(() => {
        socket.emit('get_logs');
        const handleLogsUpdate = (updatedLogs) => setLogs(updatedLogs);
        socket.on('logs_update', handleLogsUpdate);
        return () => socket.off('logs_update', handleLogsUpdate);
    }, []);

    const getUserLogs = (mobile) => {
        return logs.filter(log => log.citizenMobile === mobile);
    };

    const handleReportBlockChange = (e) => {
        const blockName = e.target.value;
        setReportBlock(blockName);
        setReportVillage('');
        if (blockName) {
            const blockData = uttarkashiData.blocks.find(b => b.name === blockName);
            setReportAvailableVillages(blockData ? blockData.villages : []);
        } else {
            setReportAvailableVillages([]);
        }
    };

    const downloadReport = () => {
        let filteredLogs = logs;
        if (reportBlock) filteredLogs = filteredLogs.filter(log => log.block === reportBlock);
        if (reportVillage) filteredLogs = filteredLogs.filter(log => log.village === reportVillage);

        if (filteredLogs.length === 0) {
            alert("No records found for the selected filters.");
            return;
        }

        const headers = ["Date", "Time", "Citizen Name", "Mobile", "District", "Block", "Village", "Session ID"];
        const csvRows = [headers.join(',')];

        filteredLogs.forEach(log => {
            const dateObj = new Date(log.endTime);
            const row = [
                dateObj.toLocaleDateString(),
                dateObj.toLocaleTimeString(),
                `"${log.citizenName}"`,
                log.citizenMobile,
                log.district || 'Uttarkashi',
                log.block || 'N/A',
                log.village || 'N/A',
                log.id
            ];
            csvRows.push(row.join(','));
        });

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${reportBlock || 'All'}_${reportVillage || 'All'}_${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header & Controls */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Interaction History</h3>
                    <p className="text-sm text-slate-500">Track and export citizen sessions</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <select
                        className="bg-white border-none text-sm font-bold text-slate-600 rounded-xl px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-50 transition min-w-[140px]"
                        value={reportBlock}
                        onChange={handleReportBlockChange}
                    >
                        <option value="">All Blocks</option>
                        {uttarkashiData.blocks.map(b => (
                            <option key={b.name} value={b.name}>{b.name}</option>
                        ))}
                    </select>

                    <select
                        className="bg-white border-none text-sm font-bold text-slate-600 rounded-xl px-4 py-3 shadow-sm outline-none focus:ring-2 focus:ring-blue-500 hover:bg-slate-50 transition disabled:opacity-50 min-w-[140px]"
                        value={reportVillage}
                        onChange={(e) => setReportVillage(e.target.value)}
                        disabled={!reportBlock}
                    >
                        <option value="">All Villages</option>
                        {reportAvailableVillages.map(v => (
                            <option key={v} value={v}>{v}</option>
                        ))}
                    </select>

                    <button
                        onClick={downloadReport}
                        className="flex items-center gap-2 bg-slate-900 text-white text-sm font-bold px-6 py-3 rounded-xl hover:bg-slate-700 transition shadow-lg shadow-slate-900/10"
                    >
                        <span>📥</span> Export CSV
                    </button>
                </div>
            </div>

            {/* Table Area */}
            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[500px]">
                {logs.length === 0 ? (
                    <div className="p-12 text-center text-slate-400">
                        No logs available yet.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200/50">
                                    <th className="px-8 py-5 bg-slate-50/50">Citizen</th>
                                    <th className="px-8 py-5 bg-slate-50/50">Location</th>
                                    <th className="px-8 py-5 bg-slate-50/50 text-center">Sessions</th>
                                    <th className="px-8 py-5 bg-slate-50/50 text-right">Action</th>
                                </tr>
                            </thead >
                            <tbody className="divide-y divide-slate-100">
                                {/* Group logs by mobile to show unique users */}
                                {Object.values(logs
                                    .filter(log => {
                                        if (reportBlock && log.block !== reportBlock) return false;
                                        if (reportVillage && log.village !== reportVillage) return false;
                                        return true;
                                    })
                                    .reduce((acc, log) => {
                                        const key = log.citizenMobile;
                                        if (!acc[key]) {
                                            acc[key] = {
                                                mobile: log.citizenMobile,
                                                name: log.citizenName,
                                                block: log.block || '-',
                                                village: log.village,
                                                count: 0
                                            };
                                        }
                                        acc[key].count += 1;
                                        return acc;
                                    }, {})).map((user, index) => (
                                        <tr key={user.mobile} className="group hover:bg-blue-50/30 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="font-bold text-slate-800 text-lg">{user.name}</div>
                                                <div className="text-xs text-slate-500 font-medium">{user.mobile}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wide">
                                                    {user.block}, {user.village}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-center">
                                                <span className="font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-lg shadow-sm">
                                                    {user.count}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5 text-right">
                                                <button
                                                    onClick={() => setSelectedUser(user.mobile)}
                                                    className="bg-white text-blue-600 border border-slate-200 hover:border-blue-200 hover:bg-blue-50 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                                                >
                                                    View History →
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table >
                    </div >
                )}
            </div >

            {/* Detailed History Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-bold text-slate-800">History: {selectedUser}</h3>
                                <p className="text-xs text-slate-500">Session details and transcripts</p>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-500 transition"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
                            {getUserLogs(selectedUser).map((log, index) => (
                                <div key={log.id} className="border border-slate-200 rounded-2xl p-6 hover:shadow-lg transition-shadow bg-white">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <span className="font-bold text-slate-800 block text-lg mb-2">
                                                Session {getUserLogs(selectedUser).length - index}
                                            </span>
                                            <div className="flex gap-3">
                                                {log.citizenRating && (
                                                    <span className="text-xs font-bold bg-amber-100 text-amber-700 px-3 py-1 rounded-full border border-amber-200">
                                                        Citizen Rated: ★ {log.citizenRating}
                                                    </span>
                                                )}
                                                {log.dmRating && (
                                                    <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100">
                                                        You Rated: ★ {log.dmRating}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                                            {new Date(log.endTime).toLocaleString()}
                                        </span>
                                    </div>

                                    {/* Chat Transcript */}
                                    <div className="bg-slate-50/80 rounded-xl p-5 text-sm max-h-80 overflow-y-auto space-y-3 border border-slate-100 custom-scrollbar">
                                        {log.messages && log.messages.length > 0 ? (
                                            log.messages.map((msg, i) => (
                                                <div key={i} className={`flex gap-3 ${msg.sender === 'dm' ? 'flex-row-reverse' : ''}`}>
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${msg.sender === 'dm' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                                        {msg.sender === 'dm' ? 'DM' : 'CZ'}
                                                    </div>
                                                    <div className={`flex flex-col max-w-[80%] ${msg.sender === 'dm' ? 'items-end' : 'items-start'}`}>
                                                        <div className={`px-4 py-2 rounded-2xl ${msg.sender === 'dm' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none'}`}>
                                                            {msg.type === 'text' ? (
                                                                <p className="leading-relaxed">{msg.content}</p>
                                                            ) : (
                                                                <a
                                                                    href={msg.url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="underline flex items-center gap-2 font-bold"
                                                                >
                                                                    📎 {msg.content}
                                                                </a>
                                                            )}
                                                        </div>
                                                        <span className="text-[10px] text-slate-400 mt-1 font-medium bg-white px-1 rounded">
                                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-slate-400 italic text-center py-4">No chat messages in this session.</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminHistory;
