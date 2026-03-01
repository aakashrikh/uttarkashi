import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { socket } from '../../lib/socket';
import { useAuth } from '../../context/AuthContext';

import RatingModal from '../common/RatingModal';

const VideoRoom = () => {
    const { id: targetId } = useParams(); // ID of the person we are connecting to
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role'); // 'dm' or undefined (citizen)

    const navigate = useNavigate();

    const [status, setStatus] = useState('Initializing...');

    // Meet State
    const [meetLink, setMeetLink] = useState('');
    const [linkShared, setLinkShared] = useState(false);
    const [saveAsDefault, setSaveAsDefault] = useState(false);

    // Chat State
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const fileInputRef = useRef(null);

    // Rating State
    const [showRating, setShowRating] = useState(false);
    const [sessionId, setSessionId] = useState(null);

    useEffect(() => {
        if (role === 'dm') {
            const preferredLink = localStorage.getItem('preferred_meet_link');
            if (preferredLink) {
                // Auto-share Digital Office Link
                setMeetLink(preferredLink);
                setStatus('Connecting to Digital Office...');

                // Small delay to ensure socket readiness
                setTimeout(() => {
                    socket.emit('share_meet_link', { target: targetId, link: preferredLink });
                    setLinkShared(true);
                    setStatus('Digital Office Active 🟢 Waiting for citizen...');
                }, 1000);
            } else {
                setStatus('Please create a Google Meet link and share it.');
            }

            // Handshake Response: Listen for citizen request
            socket.on('request_meet_link', () => {
                const currentLink = meetLink || localStorage.getItem('preferred_meet_link');
                if (currentLink) {
                    console.log("Resending link...", currentLink);
                    socket.emit('share_meet_link', { target: targetId, link: currentLink });
                }
            });
        } else {
            setStatus('Waiting for DM to share meeting link...');
            socket.emit('request_meet_link', { target: targetId });
        }

        // Listeners
        socket.on('receive_meet_link', ({ link }) => {
            setMeetLink(link);
            setStatus('Meeting Ready');
        });

        socket.on('call_ended', ({ sessionId }) => {
            // Call ended by other party
            setSessionId(sessionId);
            setShowRating(true);
        });

        // Chat Listener
        socket.on('chat_message', (message) => {
            setMessages(prev => [...prev, message]);
        });

        return () => {
            socket.off('receive_meet_link');
            socket.off('call_ended');
            socket.off('chat_message');
        };
    }, [targetId, role]);

    const handleCreateMeet = () => {
        window.open('https://meet.google.com/new', '_blank');
    };

    const handleShareLink = () => {
        if (!meetLink) return alert("Please paste the Google Meet link first.");

        if (saveAsDefault) {
            localStorage.setItem('preferred_meet_link', meetLink);
        }

        socket.emit('share_meet_link', { target: targetId, link: meetLink });
        setLinkShared(true);
        setStatus('Link Shared. Waiting for citizen to join...');
    };

    const handleJoinMeet = () => {
        if (meetLink) {
            window.open(meetLink, '_blank');
            setStatus('In Meeting');
        }
    };

    // Handle end call
    const handleEndCall = () => {
        // Also close the tab? No, let them close it.
        // Just trigger rating.
        socket.emit('end_call', { target: targetId });
    };

    const handleRatingSubmit = (rating) => {
        if (sessionId) {
            socket.emit('submit_rating', {
                sessionId,
                rating,
                role: role === 'dm' ? 'dm' : 'citizen'
            });
        }
        navigate(role === 'dm' ? '/admin/dashboard' : '/dashboard');
    };

    // Chat Functions
    const sendMessage = (type, content, url = null) => {
        const message = {
            sender: role === 'dm' ? 'dm' : 'citizen',
            type,
            content,
            url,
            timestamp: new Date().toISOString()
        };
        // Emit to socket
        socket.emit('chat_message', { target: targetId, message });
        // Add to local state
        setMessages(prev => [...prev, message]);
        setNewMessage('');
    };

    const handleSendText = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;
        sendMessage('text', newMessage);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const API_URL = import.meta.env.VITE_API_URL || '';
            const res = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            sendMessage('file', file.name, data.url);
        } catch (error) {
            console.error("Upload failed", error);
            alert("File upload failed");
        }
    };

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center shadow-sm">
                <h2 className="text-xl font-bold text-gray-800">
                    {role === 'dm' ? 'Session with Citizen' : 'Session with DM'}
                </h2>
                <div className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium">
                    {status}
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Main Action Area */}
                <div className={`flex-1 flex items-center justify-center bg-gray-100 relative ${showChat ? 'w-2/3' : 'w-full'} transition-all`}>

                    <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto text-4xl">
                            📹
                        </div>

                        {role === 'dm' ? (
                            <>
                                <h3 className="text-2xl font-bold text-gray-800">
                                    {localStorage.getItem('preferred_meet_link') ? 'Digital Office Active' : 'Start Google Meet'}
                                </h3>

                                {localStorage.getItem('preferred_meet_link') ? (
                                    <div className="space-y-4">
                                        <p className="text-green-600 font-medium bg-green-50 p-3 rounded-lg border border-green-100">
                                            Link automatically shared with citizen.
                                        </p>
                                        <button
                                            onClick={() => window.open(localStorage.getItem('preferred_meet_link'), '_blank')}
                                            className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition text-lg flex items-center justify-center gap-2"
                                        >
                                            <span>🚀</span> Launch Digital Office
                                        </button>
                                        <p className="text-xs text-gray-400">
                                            Issues? <button onClick={() => {
                                                localStorage.removeItem('preferred_meet_link');
                                                window.location.reload();
                                            }} className="underline hover:text-red-500">Reset Configuration</button>
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-gray-500">Create a new meeting and paste the link below.</p>

                                        <button
                                            onClick={handleCreateMeet}
                                            className="w-full py-3 bg-blue-50 text-blue-700 font-semibold rounded-lg hover:bg-blue-100 transition flex items-center justify-center gap-2"
                                        >
                                            <span>➕</span> Create Google Meet
                                        </button>

                                        <div className="relative text-left">
                                            <label className="text-xs font-semibold text-gray-500 ml-1">Meeting Link</label>
                                            <div className="relative mt-1">
                                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                    🔗
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Paste Google Meet Link here..."
                                                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={meetLink}
                                                    onChange={(e) => setMeetLink(e.target.value)}
                                                    disabled={linkShared}
                                                />
                                            </div>

                                            {/* In-flow Configuration */}
                                            {!linkShared && (
                                                <div className="mt-3 flex items-center gap-2">
                                                    <input
                                                        type="checkbox"
                                                        id="saveDefault"
                                                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                                                        checked={saveAsDefault}
                                                        onChange={(e) => setSaveAsDefault(e.target.checked)}
                                                    />
                                                    <label htmlFor="saveDefault" className="text-sm text-gray-600 cursor-pointer select-none">
                                                        Save as my <strong>Digital Office</strong> (Auto-use next time)
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        {!linkShared ? (
                                            <button
                                                onClick={handleShareLink}
                                                className="w-full py-3 bg-primary-600 text-white font-bold rounded-lg hover:bg-primary-700 shadow-lg transition"
                                            >
                                                Share Link & Start
                                            </button>
                                        ) : (
                                            <div className="bg-green-50 text-green-700 p-3 rounded-lg border border-green-200">
                                                Link Shared Successfully! <br />
                                                {saveAsDefault && <span className="text-xs font-bold text-green-800">Saved to Digital Office configuration.</span>}
                                            </div>
                                        )}
                                    </>
                                )}
                            </>
                        ) : (
                            <>
                                <h3 className="text-2xl font-bold text-gray-800">Join Video Call</h3>
                                {meetLink ? (
                                    <>
                                        <p className="text-gray-500">The DM has started the meeting. Please join below.</p>
                                        <p className="text-xs text-center text-gray-400 mb-2">Google Meet</p>
                                        <button
                                            onClick={handleJoinMeet}
                                            className="w-full py-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 shadow-lg transition text-lg flex items-center justify-center gap-2"
                                        >
                                            <span>📞</span> Join Google Meet
                                        </button>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="animate-pulse flex justify-center">
                                            <div className="h-3 w-3 bg-gray-400 rounded-full mx-1"></div>
                                            <div className="h-3 w-3 bg-gray-400 rounded-full mx-1 animation-delay-200"></div>
                                            <div className="h-3 w-3 bg-gray-400 rounded-full mx-1 animation-delay-400"></div>
                                        </div>
                                        <p className="text-gray-500">Waiting for DM to share Google Meet link...</p>
                                    </div>
                                )}
                            </>
                        )}

                        <div className="border-t border-gray-100 pt-6 mt-6">
                            <button
                                onClick={handleEndCall}
                                className="px-8 py-3 bg-red-50 text-red-600 font-bold rounded-lg hover:bg-red-100 transition border border-red-200"
                            >
                                End Session & Rate
                            </button>
                        </div>
                    </div>


                    {/* Chat Toggle (Floating) */}
                    <button
                        onClick={() => setShowChat(!showChat)}
                        className="absolute bottom-6 right-6 p-4 bg-white text-primary-600 rounded-full shadow-lg hover:scale-105 transition border border-gray-200 z-10"
                        title="Toggle Chat"
                    >
                        💬
                    </button>
                </div>

                {/* Chat Panel */}
                {showChat && (
                    <div className="w-1/3 bg-white border-l border-gray-200 flex flex-col shadow-2xl z-20">
                        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Chat & Files</h3>
                            <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {messages.map((msg, i) => (
                                <div key={i} className={`flex flex-col ${msg.sender === (role === 'dm' ? 'dm' : 'citizen') ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[80%] p-3 rounded-lg ${msg.sender === (role === 'dm' ? 'dm' : 'citizen') ? 'bg-primary-600 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                                        {msg.type === 'text' ? (
                                            <p>{msg.content}</p>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className="text-2xl">📄</span>
                                                <a href={msg.url} target="_blank" rel="noopener noreferrer" className="underline truncate">
                                                    {msg.content}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs text-gray-400 mt-1">
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ))}
                        </div>

                        <form onSubmit={handleSendText} className="p-4 border-t border-gray-200 bg-gray-50">
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-gray-200 rounded-lg transition"
                                    title="Attach File"
                                >
                                    📎
                                </button>
                                <input
                                    type="text"
                                    placeholder="Type a message..."
                                    className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                />
                                <button
                                    type="submit"
                                    className="bg-primary-600 text-white p-2 rounded-full hover:bg-primary-700 transition"
                                >
                                    ➤
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <RatingModal
                isOpen={showRating}
                onSubmit={handleRatingSubmit}
                role={role === 'dm' ? 'dm' : 'citizen'}
            />
        </div>
    );
};


export default VideoRoom;
