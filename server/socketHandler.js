import { store, saveData } from './store.js';
import { Session, Grievance } from './models.js'; // Import MongoDB Models

export const setupSocketHandlers = (io) => {
    io.on('connection', (socket) => {
        console.log('User connected:', socket.id);

        // --- Authentication / Identification ---
        socket.on('register_user', (userData) => {
            // userData: { name, mobile, role: 'citizen' | 'dm' }
            store.users[socket.id] = { ...userData, id: socket.id, socketId: socket.id };
            console.log(`[Register] User registered: ${userData.name} (${userData.role}) - Socket: ${socket.id}`);

            if (userData.role === 'dm') {
                store.dmSocketId = socket.id;
                store.dmStatus = 'online';
                store.dmLastOnline = new Date().toISOString();
                io.emit('dm_status_update', { status: 'online', lastOnline: store.dmLastOnline });
                saveData();
                console.log(`[Register] DM registered with Socket ID: ${store.dmSocketId}`);
            }

            socket.emit('registration_success', { id: socket.id });
        });

        // --- Queue Management ---
        socket.on('join_queue', () => {
            const user = store.users[socket.id];
            console.log(`[Socket ${socket.id}] Attempting to join queue. User found: ${!!user}`);

            if (user) {
                if (!store.waitingQueue.includes(socket.id)) {
                    store.waitingQueue.push(socket.id);
                    console.log(`[Queue] Added ${user.name} (${socket.id}). New Length: ${store.waitingQueue.length}`);

                    // Notify user they joined
                    socket.emit('queue_update', {
                        position: store.waitingQueue.length,
                        estimatedWait: calculateWaitTime(store.waitingQueue.length)
                    });

                    // Notify DM of new waiting list
                    notifyDmOfQueue(io);
                } else {
                    console.log(`[Queue] User ${user.name} already in queue.`);
                    // Send update anyway in case client missed it
                    socket.emit('queue_update', {
                        position: store.waitingQueue.indexOf(socket.id) + 1,
                        estimatedWait: calculateWaitTime(store.waitingQueue.indexOf(socket.id) + 1)
                    });
                }
            } else {
                console.warn(`[Socket ${socket.id}] Join failed: User not registered in store.`);
                // Optionally tell client to re-register?
            }
        });

        socket.on('leave_queue', () => {
            store.waitingQueue = store.waitingQueue.filter(id => id !== socket.id);
            notifyDmOfQueue(io);
        });

        // --- DM Actions ---
        socket.on('get_queue', () => {
            // DM requests current queue
            if (store.users[socket.id]?.role === 'dm') {
                notifyDmOfQueue(io);
            }
        });

        // Get DM Status
        socket.on('get_dm_status', () => {
            socket.emit('dm_status_update', { status: store.dmStatus, lastOnline: store.dmLastOnline });
        });

        socket.on('call_user', ({ targetSocketId }) => {
            // DM initiates call
            if (store.users[socket.id]?.role === 'dm') {
                console.log(`DM calling ${targetSocketId}`);
                io.to(targetSocketId).emit('incoming_call', { from: socket.id });
                store.dmStatus = 'busy';
                io.emit('dm_status_update', { status: 'busy' });

                // Remove from queue
                store.waitingQueue = store.waitingQueue.filter(id => id !== targetSocketId);
                notifyDmOfQueue(io);
            }
        });

        // --- WebRTC Signaling ---
        socket.on('offer', (data) => {
            io.to(data.target).emit('offer', {
                sdp: data.sdp,
                caller: socket.id
            });
        });

        socket.on('answer', (data) => {
            io.to(data.target).emit('answer', {
                sdp: data.sdp,
                responder: socket.id
            });
        });

        socket.on('ice_candidate', (data) => {
            io.to(data.target).emit('ice_candidate', {
                candidate: data.candidate
            });
        });

        // --- Google Meet Signaling ---
        socket.on('share_meet_link', ({ target, link }) => {
            console.log(`[Meet] Sharing link from ${socket.id} to ${target}: ${link}`);
            io.to(target).emit('receive_meet_link', { link, from: socket.id });

            // Should we update status?
            store.dmStatus = 'busy'; // DM is now in a meeting
            io.emit('dm_status_update', { status: 'busy' });
        });

        // --- Chat & File Sharing ---
        socket.on('chat_message', ({ target, message }) => {
            // message: { sender: 'citizen'|'dm', type: 'text'|'file', content: string, url?: string, timestamp: string }
            io.to(target).emit('chat_message', message);

            // Store message in active session (mapped by either citizenId or dmId)
            // For MVP, since we don't have robust session IDs, we'll temporarily store in a lookup or just attach to completedSessions later.
            // A better way for MVP:
            const sessionId = [socket.id, target].sort().join('-'); // Simple unique ID for the pair
            if (!store.activeSessions[sessionId]) {
                store.activeSessions[sessionId] = { messages: [] };
            }
            store.activeSessions[sessionId].messages.push(message);
        });

        socket.on('end_call', async ({ target }) => {
            // Identify the correct citizen and DM
            let citizenId = target;
            let dmId = socket.id;
            // If the person ending (socket.id) is the Citizen, then target is DM. Swap.
            if (store.users[target]?.role === 'dm') {
                citizenId = socket.id;
                dmId = target;
            } else if (store.users[socket.id]?.role === 'dm') {
                citizenId = target;
                dmId = socket.id;
            }

            // Generate Session ID
            const sessionId = Date.now().toString();

            // Emit call_ended with sessionId
            io.to(target).emit('call_ended', { sessionId });
            socket.emit('call_ended', { sessionId }); // Also tell the caller

            store.dmStatus = 'online';
            store.dmLastOnline = new Date().toISOString();
            io.emit('dm_status_update', { status: 'online', lastOnline: store.dmLastOnline });

            // Only log if we have a valid citizen interaction
            if (store.users[citizenId]?.role === 'citizen') {
                const activeSessionId = [citizenId, dmId].sort().join('-');

                try {
                    const session = new Session({
                        sessionId: sessionId,
                        citizenName: store.users[citizenId]?.name || 'Unknown',
                        citizenMobile: store.users[citizenId]?.mobile || 'N/A',
                        startTime: new Date(), 
                        endTime: new Date(),
                        duration: '00:00', 
                        notes: '',
                        messages: store.activeSessions[activeSessionId]?.messages || []
                    });
                    
                    await session.save();
                    console.log(`[Session] Saved session ${sessionId} to DB`);
                } catch (err) {
                    console.error("Error saving session:", err);
                }

                // Cleanup active session
                delete store.activeSessions[activeSessionId];
            }
        });

        socket.on('submit_rating', async ({ sessionId, rating, role }) => {
            try {
                const update = {};
                if (role === 'citizen') update.citizenRating = rating;
                else if (role === 'dm') update.dmRating = rating;

                await Session.findOneAndUpdate({ sessionId: sessionId }, update);
                console.log(`[Rating] Session ${sessionId} rated by ${role}: ${rating} stars`);
            } catch (err) {
                console.error("Error submitting rating:", err);
            }
        });

        // --- Logs & Admin Features ---
        socket.on('get_logs', async () => {
            if (store.users[socket.id]?.role === 'dm') {
                const sessions = await Session.find().sort({ endTime: -1 }).limit(50);
                socket.emit('logs_update', sessions);
            }
        });

        socket.on('get_grievances', async () => {
            if (store.users[socket.id]?.role === 'dm') {
                const grievances = await Grievance.find().sort({ timestamp: -1 });
                socket.emit('grievance_update', grievances);
            }
        });

        socket.on('update_grievance', async ({ id, remark, status }) => {
            if (store.users[socket.id]?.role === 'dm') {
                try {
                    const grievance = await Grievance.findOne({ id: id });
                    if (grievance) {
                        if (remark !== undefined) grievance.remark = remark;
                        if (status !== undefined) grievance.status = status;
                        await grievance.save();

                        // API Update for all DMs
                        const grievances = await Grievance.find().sort({ timestamp: -1 });
                        socket.emit('grievance_update', grievances);
                    }
                } catch (err) {
                    console.error("Error updating grievance:", err);
                }
            }
        });

        socket.on('get_my_history', async () => {
            const myMobile = store.users[socket.id]?.mobile;
            if (myMobile) {
                const history = await Session.find({ citizenMobile: myMobile }).sort({ endTime: -1 });
                socket.emit('history_update', history);
            }
        });

        socket.on('set_queue_time', ({ time }) => {
            if (store.users[socket.id]?.role === 'dm') {
                store.manualQueueTime = time ? parseInt(time) : null;
                // Push update to all waiting users
                store.waitingQueue.forEach((socketId, index) => {
                    io.to(socketId).emit('queue_update', {
                        position: index + 1,
                        estimatedWait: calculateWaitTime(index + 1)
                    });
                });
                // Confirm to DM
                socket.emit('queue_time_updated', { manualTime: store.manualQueueTime });
                saveData(); // Persist changes
            }
        });

        // --- Disconnect ---
        socket.on('disconnect', () => {
            console.log('User disconnected:', socket.id);

            // Cleanup
            if (store.dmSocketId === socket.id) {
                store.dmSocketId = null;
                store.dmStatus = 'offline';
                io.emit('dm_status_update', { status: 'offline', lastOnline: store.dmLastOnline });
            }

            // Remove from queue
            if (store.waitingQueue.includes(socket.id)) {
                store.waitingQueue = store.waitingQueue.filter(id => id !== socket.id);
                notifyDmOfQueue(io); // Notify DM connection dropped
            }

            delete store.users[socket.id];
        });
    });
};

async function notifyDmOfQueue(io) {
    if (store.dmSocketId) {
        console.log(`Notifying DM (${store.dmSocketId}) of queue update. Queue length: ${store.waitingQueue.length}`);
        
        // Use Promise.all to fetch ratings for each user in queue
        const queueDetails = await Promise.all(store.waitingQueue.map(async id => {
            const user = store.users[id];
            if (!user) return null;

            // Fetch last session rating from DB
            const lastSession = await Session.findOne({ citizenMobile: user.mobile, citizenRating: { $exists: true } })
                                           .sort({ endTime: -1 });

            return {
                ...user,
                lastCitizenRating: lastSession ? lastSession.citizenRating : null, 
                lastDmRating: lastSession ? lastSession.dmRating : null 
            };
        }));

        io.to(store.dmSocketId).emit('queue_update_dm', queueDetails.filter(Boolean));
    } else {
        console.log("Cannot notify DM: No DM socket ID registered.");
    }
}

function calculateWaitTime(position) {
    if (store.manualQueueTime !== null && store.manualQueueTime !== undefined) {
        return store.manualQueueTime;
    }
    return position * 10; // Default 10 mins per person
}
