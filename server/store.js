// In-memory storage for active sockets and queue state
export const store = {
    users: {}, // socketId -> { id, name, role, mobile, ... }
    waitingQueue: [], // Array of socketIds
    activeSessions: {}, // sessionId -> { citizenId, dmId, startTime, messages: [] }
    completedSessions: [], // Kept for runtime cache if needed, but primarily using MongoDB now
    dmSocketId: null, // Track DM connection
    dmStatus: 'offline', // 'online' | 'offline' | 'busy'
    dmLastOnline: null, 
    manualQueueTime: null, 
    grievances: [], // Kept for runtime consistency if needed
};

// No-ops for backward compatibility during refactor
export const saveData = () => {};
export const loadData = () => {};

