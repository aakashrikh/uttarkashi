import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

const WaitingRoom = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isRegistered, isConnected } = useAuth();
    const { t } = useLanguage();
    const [dmStatus, setDmStatus] = useState('online');
    const [submitting, setSubmitting] = useState(false);
    const [position, setPosition] = useState(0);
    const [estimatedWait, setEstimatedWait] = useState(0);

    // Show complaint form: always show if DM is offline, or if navigated with showComplaintForm flag
    const [showComplaintForm, setShowComplaintForm] = useState(
        location.state?.showComplaintForm || false
    );

    // Grievance Form State
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [files, setFiles] = useState([]);

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = React.useRef(null);
    const canvasRef = React.useRef(null);

    const startCamera = async () => {
        try {
            setShowCamera(true);
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            // Wait for render
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch (err) {
            console.error(err);
            alert(t('cameraError'));
            setShowCamera(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => track.stop());
        }
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            const video = videoRef.current;
            canvasRef.current.width = video.videoWidth;
            canvasRef.current.height = video.videoHeight;
            context.drawImage(video, 0, 0);

            canvasRef.current.toBlob((blob) => {
                const capturedFile = new File([blob], "photo_" + Date.now() + ".jpg", { type: "image/jpeg" });
                setFiles(prev => [...prev, capturedFile]);
                stopCamera();
            }, 'image/jpeg');
        }
    };

    const handleFileSelect = (e) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        }
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    useEffect(() => {
        // Initial status check
        if (isConnected) {
            socket.emit('get_dm_status');
        }

        // Poll for DM status every 5 seconds to ensure sync
        const statusInterval = setInterval(() => {
            if (socket.connected) {
                socket.emit('get_dm_status');
            }
        }, 5000);

        if (isRegistered && !location.state?.showComplaintForm) {
            console.log("User registered, joining queue...");
            socket.emit('join_queue');
        }

        // Listen for queue updates
        socket.on('queue_update', (data) => {
            setPosition(data.position);
            setEstimatedWait(data.estimatedWait);
        });

        socket.on('dm_status_update', ({ status }) => {
            console.log("DM Status Update:", status);
            setDmStatus(status);
        });

        socket.on('incoming_call', ({ from }) => {
            navigate(`/video-room/${from}`);
        });

        return () => {
            clearInterval(statusInterval);
            socket.off('queue_update');
            socket.off('dm_status_update');
            socket.off('incoming_call');
        };
    }, [navigate, isRegistered, isConnected, location.state]);

    const handleLeaveQueue = () => {
        socket.emit('leave_queue');
        navigate('/dashboard');
    };

    const handleSubmitGrievance = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData();

        const userStr = localStorage.getItem('sankal_user');
        const user = userStr ? JSON.parse(userStr) : {};

        formData.append('name', user.name || 'Anonymous');
        formData.append('mobile', user.mobile || '');
        formData.append('district', user.district || '');
        formData.append('block', user.block || '');
        formData.append('village', user.village || '');
        formData.append('email', email);
        formData.append('message', message);

        // Append all files
        if (files && files.length > 0) {
            files.forEach(file => {
                formData.append('files', file);
            });
        }

        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${API_URL}/api/grievance`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (data.success) {
                alert(t('grievanceSuccess'));
                navigate('/dashboard');
            } else {
                alert(t('grievanceFail'));
            }
        } catch (err) {
            console.error(err);
            alert(t('grievanceError'));
        } finally {
            setSubmitting(false);
        }
    };

    // Complaint Form Component (reusable for both online and offline states)
    const renderComplaintForm = () => (
        <form onSubmit={handleSubmitGrievance} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 grid md:grid-cols-2 gap-6">
            <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('emailLabel')}</label>
                <input
                    type="email"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t('emailPlaceholder')}
                />
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('messageLabel')}</label>
                <textarea
                    required
                    rows="2"
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder={t('messagePlaceholder')}
                ></textarea>
            </div>

            {/* Attachment Area */}
            <div className="md:col-span-2 border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center gap-4 bg-gray-50 min-h-[160px]">
                <label className="block text-sm font-medium text-gray-700 mb-1 self-start">{t('attachLabel')}</label>

                {/* Files Preview Grid */}
                {files.length > 0 && (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                        {files.map((f, i) => (
                            <div key={i} className="bg-white p-2 border rounded flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-xl">📄</span>
                                    <span className="text-sm text-gray-600 truncate">{f.name}</span>
                                </div>
                                <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 px-2">✕</button>
                            </div>
                        ))}
                    </div>
                )}

                {!showCamera && (
                    <div className="flex gap-4 w-full">
                        <label className="flex-1 cursor-pointer flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition shadow-sm h-32">
                            <span className="text-2xl mb-1">📂</span>
                            <span className="text-xs font-medium text-gray-600">{t('addFiles')}</span>
                            <input
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileSelect}
                            />
                        </label>

                        <button
                            type="button"
                            onClick={startCamera}
                            className="flex-1 flex flex-col items-center justify-center bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition shadow-sm h-32 text-gray-600"
                        >
                            <span className="text-2xl mb-1">📸</span>
                            <span className="text-xs font-medium">{t('addPhoto')}</span>
                        </button>
                    </div>
                )}

                {/* Camera UI */}
                {showCamera && (
                    <div className="w-full flex flex-col items-center gap-2">
                        <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden">
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover"></video>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={capturePhoto}
                                className="bg-green-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow hover:bg-green-700"
                            >
                                {t('capture')}
                            </button>
                            <button
                                type="button"
                                onClick={stopCamera}
                                className="bg-red-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow hover:bg-red-600"
                            >
                                {t('cancel')}
                            </button>
                        </div>
                        <canvas ref={canvasRef} className="hidden"></canvas>
                    </div>
                )}
            </div>

            <div className="md:col-span-2 space-y-3">
                <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-3 text-white rounded-xl font-medium ${submitting ? 'bg-gray-400' : 'bg-primary-600 hover:bg-primary-700'}`}
                >
                    {submitting ? t('submitting') : t('submitGrievance')}
                </button>

                <button
                    type="button"
                    onClick={handleLeaveQueue}
                    className="w-full py-3 text-gray-600 hover:text-gray-800 text-sm"
                >
                    {t('cancelReturn')}
                </button>
            </div>
        </form>
    );

    // If DM is offline OR user explicitly chose to submit complaint
    if (dmStatus === 'offline' || showComplaintForm) {
        return (
            <div className="p-6">
                <div className="mb-6 text-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        {dmStatus === 'offline' ? t('dmOffline') : t('submitComplaintTitle')}
                    </h2>
                    <p className="text-gray-500 text-sm">
                        {dmStatus === 'offline' ? t('submitGrievanceMsg') : t('submitGrievanceMsgOnline')}
                    </p>
                </div>

                {renderComplaintForm()}
            </div>
        );
    }

    // DM is online — show waiting room with option to submit complaint
    return (
        <div className="p-6 text-center">
            <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-800">{t('virtualWaitingRoom')}</h2>
                <p className="text-gray-500 text-sm">{t('waitForTurn')}</p>
                {/* Debug Info */}
                <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-left overflow-auto font-mono">
                    <p><strong>{t('debugStatus')}:</strong></p>
                    <p>{t('dmStatusLabel')}: {dmStatus}</p>
                    <p>{t('connectedLabel')}: {isConnected ? t('yes') : t('no')}</p>
                    <p>{t('registeredLabel')}: {isRegistered ? t('yes') : t('no')}</p>
                    <p>{t('socketIdLabel')}: {socket.id}</p>
                    <button
                        onClick={() => socket.emit('get_dm_status')}
                        className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
                    >
                        {t('forceCheckStatus')}
                    </button>
                </div>
            </div>

            <div className="flex justify-center mb-8">
                <div className="w-32 h-32 rounded-full border-4 border-primary-500 flex items-center justify-center bg-primary-50">
                    <div>
                        <div className="text-4xl font-bold text-primary-700">{position}</div>
                        <div className="text-xs text-primary-600 font-medium">{t('yourToken')}</div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-8">
                <p className="text-gray-600 text-sm">{t('estimatedWait')}</p>
                <p className="text-2xl font-semibold text-gray-800">{estimatedWait} {t('mins')}</p>
            </div>

            <div className="space-y-3">
                <div className="animate-pulse text-sm text-orange-600 font-medium bg-orange-50 py-2 rounded">
                    {t('keepScreenOpen')}
                </div>

                {/* Option to submit written complaint while waiting */}
                <button
                    onClick={() => setShowComplaintForm(true)}
                    className="w-full py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition"
                >
                    {t('writeComplaint')}
                </button>

                <button
                    onClick={handleLeaveQueue}
                    className="w-full py-3 text-red-600 border border-red-200 rounded-xl hover:bg-red-50"
                >
                    {t('leaveQueue')}
                </button>
            </div>
        </div>
    );
};

export default WaitingRoom;
