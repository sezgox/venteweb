// cloudinary.service.ts

import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryResponse } from './cloudinary.response';


const streamifier = require('streamifier');

@Injectable()
export class CloudinaryService {

    uploadFile(file: Express.Multer.File, folder: string): Promise<CloudinaryResponse> {
        return new Promise<CloudinaryResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {filename_override: file.originalname.split('.')[0], folder},
            (error, result) => {
            if (error) return reject(error);
            resolve(result);
            },
        );

        streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    }

    async deleteFile(publicId: string): Promise<any> {
        try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result; // Ej: { result: 'ok' } si se eliminó correctamente
        } catch (error) {
        throw new Error(`Error al borrar la imagen: ${error.message}`);
        }
    }
}
