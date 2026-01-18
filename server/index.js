import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import { storage } from './cloudinary.js';
import { Grievance } from './models.js';
import { setupSocketHandlers } from './socketHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const app = express();
const httpServer = createServer(app);

const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:4173",
    process.env.CLIENT_URL // Deployed Client URL
].filter(Boolean);

const io = new Server(httpServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sankal-samwad')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));


// Basic health check
app.get('/', (req, res) => {
    res.send('Sankal Samwad API is running');
});

// Configure Multer with Cloudinary Storage
const upload = multer({ storage: storage });

// Serve React App Static Files
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
}

// Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }
    // Cloudinary returns the full URL in `req.file.path`
    res.json({ url: req.file.path, filename: req.file.filename, originalName: req.file.originalname });
});

// Grievance Submission Endpoint
app.post('/api/grievance', upload.array('files', 10), async (req, res) => {
    try {
        const { name, mobile, email, district, block, village, message } = req.body;

        // Handle Multiple Files
        let fileUrls = [];
        if (req.files && req.files.length > 0) {
            fileUrls = req.files.map(file => file.path); // Cloudinary URL
        }

        // Backend compatibility
        const mainFileUrl = fileUrls.length > 0 ? fileUrls[0] : null;

        const grievance = new Grievance({
            id: Date.now().toString(), // Keep ID for frontend compatibility
            citizenName: name,
            citizenMobile: mobile,
            email: email,
            district: district || 'Uttarkashi',
            block: block || 'N/A',
            village: village || 'N/A',
            message: message,
            fileUrl: mainFileUrl,
            fileUrls: fileUrls,
            timestamp: new Date()
        });

        await grievance.save();
        console.log(`[Grievance] New grievance from ${name} saved to DB`);

        // Notify DM if connected (We need to refactor store.dmSocketId logic to be persistent or just broadcast to 'dm' room)
        // For now, let's keep it simple: emit to all for verification, or we need to manage socket rooms properly.
        // Better: SocketHandler manages rooms. Here we can use io.emit for simplicity or rely on client polling/socket logic.
        // Actually, let's just emit 'grievance_update' to everyone or a specific room?
        // To keep it compatible with existing socket logic, we should probably fetch from DB and emit.
        // But socketHandler has the logic.
        
        // Let's grab all grievances and emit? (Might be heavy)
        // Optimization: Just emit the new one and let frontend add it? 
        // Current frontend expects full list in `grievance_update`.
        const allGrievances = await Grievance.find().sort({ timestamp: -1 });
        io.emit('grievance_update', allGrievances); 

        res.json({ success: true, message: "Grievance submitted successfully" });
    } catch (error) {
        console.error("Grievance Error:", error);
        res.status(500).json({ success: false, message: "Failed to submit grievance" });
    }
});

// Setup Socket Handlers
setupSocketHandlers(io);

// Catch-all route to serve React App for non-API requests
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.status(404).send('Client build not found. Please run build script.');
    }
});

const PORT = process.env.PORT || 3000;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
