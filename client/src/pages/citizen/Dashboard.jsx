import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { socket } from '../../lib/socket';

const Dashboard = () => {
    const { user } = useAuth();
    const { t } = useLanguage();
    const navigate = useNavigate();
    const [dmStatus, setDmStatus] = useState('offline'); // offline, online, busy

    const [history, setHistory] = useState([]);

    useEffect(() => {
        // Listen for DM status updates
        socket.on('dm_status_update', ({ status }) => {
            setDmStatus(status);
        });

        // Listen for history
        socket.on('history_update', (data) => {
            setHistory(data);
        });

        // Check initial status
        socket.emit('get_dm_status');
        socket.emit('get_my_history');

        return () => {
            socket.off('dm_status_update');
            socket.off('history_update');
        };
    }, []);

    const handleJoinQueue = () => {
        socket.emit('join_queue');
        navigate('/waiting-room');
    };

    const handleSubmitComplaint = () => {
        navigate('/waiting-room', { state: { showComplaintForm: true } });
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-gray-800">{t('welcome')}, {user?.name}</h2>
                <p className="text-gray-500 text-sm">{user?.village}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center h-full flex flex-col justify-center">
                    <div className="text-sm text-gray-500 mb-2">{t('dmStatus')}</div>
                    <div className={`text-2xl font-bold capitalize ${dmStatus === 'online' ? 'text-green-600' :
                        dmStatus === 'busy' ? 'text-orange-500' : 'text-gray-400'
                        }`}>
                        {t(dmStatus)}
                    </div>
                </div>

                <div className="flex flex-col gap-3 justify-center">
                    <button
                        onClick={handleJoinQueue}
                        className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition transform active:scale-95 flex items-center justify-center ${dmStatus === 'offline'
                            ? 'bg-gray-400 text-white cursor-not-allowed opacity-60'
                            : 'bg-primary-600 text-white hover:bg-primary-700'
                            }`}
                        disabled={dmStatus === 'offline'}
                    >
                        {t('connectDm')}
                    </button>

                    <button
                        onClick={handleSubmitComplaint}
                        className="w-full py-4 rounded-xl font-bold text-lg shadow-lg transition transform active:scale-95 flex items-center justify-center bg-orange-500 text-white hover:bg-orange-600"
                    >
                        {t('submitComplaint')}
                    </button>
                </div>
            </div>

            <div className="mt-8">
                <h3 className="font-semibold text-gray-700 mb-4">{t('pastInteractions')}</h3>
                {history.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                        {t('noPastInteractions')}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {history.map((item, i) => (
                            <div key={i} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex justify-between items-center">
                                <div>
                                    <div className="text-sm font-semibold text-gray-800">{t('interactionWithDm')}</div>
                                    <div className="text-xs text-gray-500">{new Date(item.endTime).toDateString()}</div>
                                </div>
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{t('completed')}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
