
import mongoose from 'mongoose';

const grievanceSchema = new mongoose.Schema({
    id: String, // Keeping string ID for compatibility with existing frontend
    citizenName: String,
    citizenMobile: String,
    email: String,
    district: { type: String, default: 'Uttarkashi' },
    block: { type: String, default: 'N/A' },
    village: { type: String, default: 'N/A' },
    message: String,
    fileUrl: String, // Main file
    fileUrls: [String], // All files
    timestamp: { type: Date, default: Date.now },
    remark: String,
    status: { type: String, default: 'pending' } // pending, resolved
});

const sessionSchema = new mongoose.Schema({
    sessionId: String,
    citizenName: String,
    citizenMobile: String,
    startTime: Date,
    endTime: Date,
    duration: String, // "10:23"
    notes: String,
    messages: [{
        sender: String, // 'dm' or 'citizen'
        type: String, // 'text' or 'file'
        content: String,
        url: String,
        timestamp: Date
    }],
    citizenRating: Number,
    dmRating: Number
});

// Optional: for persistent DM profile/status if needed later
const userSchema = new mongoose.Schema({
    socketId: String,
    role: String, // 'dm', 'citizen'
    name: String,
    isOnline: Boolean,
    lastSeen: Date
});

export const Grievance = mongoose.model('Grievance', grievanceSchema);
export const Session = mongoose.model('Session', sessionSchema);
export const User = mongoose.model('User', userSchema);
