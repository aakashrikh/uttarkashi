import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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

import { setupSocketHandlers } from './socketHandler.js';

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));
app.use(express.json());

// Basic health check
app.get('/', (req, res) => {
    res.send('Sankal Samwad API is running');
});

// Configure Multer for file uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Serve uploaded files statically
app.use('/uploads', express.static(uploadDir));

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
    // Return the URL to access the file
    // Return the URL to access the file
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename, originalName: req.file.originalname });
});

// Grievance Submission Endpoint (Offline Mode)
import { store, saveData } from './store.js';

app.post('/api/grievance', upload.array('files', 10), (req, res) => {
    const { name, mobile, email, district, block, village, message } = req.body;

    // Handle Multiple Files
    let fileUrls = [];
    if (req.files && req.files.length > 0) {
        fileUrls = req.files.map(file => `/uploads/${file.filename}`);
    }

    // Backend compatibility: fileUrl is the first file, fileUrls is all of them
    const mainFileUrl = fileUrls.length > 0 ? fileUrls[0] : null;

    const grievance = {
        id: Date.now().toString(),
        citizenName: name,
        citizenMobile: mobile,
        email: email,
        district: district || 'Uttarkashi',
        block: block || 'N/A',
        village: village || 'N/A',
        message: message,
        fileUrl: mainFileUrl, // Legacy support
        fileUrls: fileUrls,   // New multi-file support
        timestamp: new Date().toISOString()
    };

    store.grievances.unshift(grievance);
    saveData();
    console.log(`[Grievance] New grievance from ${name} (${mobile}) with ${fileUrls.length} files`);

    // Notify DM if connected (or will see on refresh)
    if (store.dmSocketId) {
        io.to(store.dmSocketId).emit('grievance_update', store.grievances);
    }

    res.json({ success: true, message: "Grievance submitted successfully" });
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
