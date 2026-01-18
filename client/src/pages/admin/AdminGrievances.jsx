import React, { useEffect, useState } from 'react';
import { socket } from '../../lib/socket';
import { getFullUrl } from '../../lib/api';

const AdminGrievances = () => {
    const [grievances, setGrievances] = useState([]);

    useEffect(() => {
        socket.emit('get_grievances');

        const handleGrievanceUpdate = (updatedGrievances) => setGrievances(updatedGrievances);
        socket.on('grievance_update', handleGrievanceUpdate);

        return () => {
            socket.off('grievance_update', handleGrievanceUpdate);
        };
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Pending Issues</h2>
                    <p className="text-slate-500 text-sm">Review/respond to offline complaints</p>
                </div>
                <div className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-bold border border-indigo-100 shadow-sm">
                    Total: {grievances.length}
                </div>
            </div>

            <div className="bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-xl shadow-slate-200/40 overflow-hidden min-h-[400px]">
                {grievances.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-4xl mb-4 opacity-50">✨</div>
                        <h3 className="font-bold text-slate-600">All caught up</h3>
                        <p className="text-sm text-slate-400 mt-2">No pending grievances.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100 p-2">
                        {grievances.map((g) => (
                            <div key={g.id} className="p-6 bg-white rounded-2xl mb-2 hover:shadow-md transition-all border border-transparent hover:border-slate-100 group">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-3">
                                    <div>
                                        <h4 className="font-bold text-slate-800 text-lg">{g.citizenName}</h4>
                                        <p className="text-sm text-slate-500 flex items-center gap-2">
                                            <span>📍 {g.village}, {g.block}</span>
                                            {g.email && <span className="text-slate-300">• {g.email}</span>}
                                        </p>
                                    </div>
                                    <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">
                                        {new Date(g.timestamp).toLocaleDateString()} {new Date(g.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>

                                <p className="text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 leading-relaxed">
                                    {g.message}
                                </p>

                                {/* Files and Actions Toolbar */}
                                <div className="flex flex-wrap items-center gap-3 border-t border-slate-50 pt-3">
                                    {g.fileUrls && g.fileUrls.length > 0 ? (
                                        g.fileUrls.map((url, idx) => (
                                            <a key={idx} href={getFullUrl(url)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition border border-blue-100">
                                                <span>📎</span> Document {idx + 1}
                                            </a>
                                        ))
                                    ) : g.fileUrl ? (
                                        <a href={getFullUrl(g.fileUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 transition border border-blue-100">
                                            <span>📎</span> View Document
                                        </a>
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">No attachments</span>
                                    )}

                                    <div className="ml-auto flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                        {g.email && (
                                            <a href={`mailto:${g.email}?subject=Response to Grievance [ID: ${g.id}]`} className="flex-1 md:flex-none flex items-center justify-center gap-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-50 transition shadow-sm">
                                                ✉️ Reply Email
                                            </a>
                                        )}
                                    </div>
                                </div>

                                {/* Remark Section */}
                                <div className="mt-4 pt-3 border-t border-dashed border-slate-200">
                                    {g.remark ? (
                                        <div className="text-sm text-green-700 bg-green-50 px-4 py-3 rounded-xl border border-green-100 flex items-center gap-2">
                                            <span className="font-bold">✓ Official Remark:</span>
                                            <span>{g.remark}</span>
                                        </div>
                                    ) : (
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="Add official remark/resolution note..."
                                                className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 transition outline-none"
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        socket.emit('update_grievance', { id: g.id, remark: e.target.value });
                                                    }
                                                }}
                                            />
                                            <button className="bg-slate-900 text-white px-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg shadow-slate-900/10">
                                                Save
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminGrievances;
