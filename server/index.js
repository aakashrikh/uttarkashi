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
    "https://www.sankalpsanwad.com",
    "https://sankalpsanwad.com",
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

// --- Authentication Endpoints (Msg91) ---
app.post('/api/auth/send-otp', async (req, res) => {
    const { mobile } = req.body;
    if (!mobile || mobile.length !== 10) {
        return res.status(400).json({ success: false, message: 'Invalid mobile number' });
    }

    const authKey = process.env.MSG91_AUTH_KEY;
    const templateId = process.env.MSG91_TEMPLATE_ID;

    if (!authKey || !templateId) {
        console.warn("Msg91 credentials missing. Simulating OTP send.");
        return res.json({ success: true, message: 'Simulated OTP sent (credentials missing)' });
    }

    try {
        const response = await fetch(`https://control.msg91.com/api/v5/otp?template_id=${templateId}&mobile=91${mobile}&authkey=${authKey}`, {
            method: 'GET',
        });
        const data = await response.json();

        if (data.type === 'success') {
            res.json({ success: true, message: 'OTP sent successfully' });
        } else {
            res.status(400).json({ success: false, message: data.message || 'Failed to send OTP' });
        }
    } catch (error) {
        console.error("Msg91 Send OTP Error:", error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
        return res.status(400).json({
            success: false,
            message: 'Mobile and OTP required'
        });
    }

    const authKey = "442923AbXWYZCF0j67dd2b54P1";

    if (!authKey) {
        console.warn("MSG91 credentials missing. Simulating OTP verify.");

        if (otp.length === 4) {
            return res.json({
                success: true,
                message: 'Simulated OTP verified'
            });
        }

        return res.status(400).json({
            success: false,
            message: 'Invalid OTP (Simulation)'
        });
    }

    const template = `Use ${otp} as your OTP for Weazy account verification. This is confidential. Please do not share it with anyone. Team Weazy`;

    const url = `https://api.msg91.com/api/sendhttp.php?authkey=${authKey}&sender=WZYINF&mobiles=91${mobile}&route=4&DLT_TE_ID=1007510009222316169&message=${encodeURIComponent(template)}&response=json&PE_ID=1001439787567400424`;

    try {

        const response = await fetch(url, {
            method: "GET"
        });

        const data = await response.json();

        if (data.type === "success") {
            return res.json({
                success: true,
                message: "OTP verified successfully"
            });
        }

        return res.status(400).json({
            success: false,
            message: data.message || "OTP verification failed"
        });

    } catch (error) {

        console.error("MSG91 Verify OTP Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });

    }
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
