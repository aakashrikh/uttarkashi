import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data', 'store.json');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
}

// In-memory storage for MVP
export const store = {
    users: {}, // socketId -> { id, name, role, mobile, ... }
    waitingQueue: [], // Array of socketIds
    activeSessions: {}, // sessionId -> { citizenId, dmId, startTime, messages: [] }
    completedSessions: [], // Array of { id, citizenName, mobile, startTime, endTime, duration, notes, messages: [] }
    dmSocketId: null, // Track DM connection
    dmStatus: 'offline', // 'online' | 'offline' | 'busy'
    dmLastOnline: null, // Date ISO string
    manualQueueTime: null, // Override for estimated wait time (in minutes)
    grievances: [], // Array of { id, citizenName, citizenMobile, email, district, block, village, message, fileUrl, timestamp }
};

export const saveData = () => {
    try {
        const dataToSave = {
            completedSessions: store.completedSessions,
            manualQueueTime: store.manualQueueTime,
            dmLastOnline: store.dmLastOnline,
            grievances: store.grievances,
            // We can also save users map if we want to persist profiles, 
            // but socketIds change on reconnect, so maybe just keep history for now.
            // Let's save users to keep their profile data (name/mobile) mapped to their ID (if we had stable IDs).
            // For MVP, simple persistence of history is key.
        };
        fs.writeFileSync(DATA_FILE, JSON.stringify(dataToSave, null, 2));
    } catch (error) {
        console.error('Error saving data:', error);
    }
};

export const loadData = () => {
    try {
        if (fs.existsSync(DATA_FILE)) {
            const rawData = fs.readFileSync(DATA_FILE, 'utf8');
            const data = JSON.parse(rawData);

            if (data.completedSessions) store.completedSessions = data.completedSessions;
            if (data.manualQueueTime) store.manualQueueTime = data.manualQueueTime;
            if (data.dmLastOnline) store.dmLastOnline = data.dmLastOnline;
            if (data.grievances) store.grievances = data.grievances;

            console.log('Data loaded from store.json');
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
};

// Load immediately on module evaluation
loadData();
