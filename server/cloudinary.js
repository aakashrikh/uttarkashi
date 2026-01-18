
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';

dotenv.config();

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer Storage
export const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'sankal-samwad-uploads',
        allowed_formats: ['jpg', 'png', 'pdf', 'doc', 'docx'],
        resource_type: 'auto' // Detects image/video/raw
    }
});

export { cloudinary };
