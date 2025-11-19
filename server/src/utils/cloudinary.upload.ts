/**
 * Cloudinary Upload Utilities
 * Helper functions for uploading images to Cloudinary
 */

import cloudinary from '../config/cloudinary';
import { logger } from './logger';
import streamifier from 'streamifier';

interface UploadOptions {
  folder?: string;
  transformation?: any[];
  format?: string;
}

/**
 * Upload a single image buffer to Cloudinary
 */
export const uploadImageToCloudinary = (
  buffer: Buffer,
  options: UploadOptions = {}
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const defaultOptions = {
      folder: options.folder || 'reviews',
      resource_type: 'image' as const,
      transformation: options.transformation || [
        { width: 1000, height: 1000, crop: 'limit' },
        { quality: 'auto:good' },
        { fetch_format: 'auto' },
      ],
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) {
          logger.error('❌ Cloudinary upload error:', error);
          reject(error);
        } else if (result) {
          logger.info(`✅ Image uploaded to Cloudinary: ${result.public_id}`);
          resolve(result.secure_url);
        } else {
          reject(new Error('Upload failed with no error or result'));
        }
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Upload multiple images to Cloudinary
 */
export const uploadMultipleImages = async (
  files: Express.Multer.File[],
  options: UploadOptions = {}
): Promise<string[]> => {
  try {
    const uploadPromises = files.map((file) =>
      uploadImageToCloudinary(file.buffer, options)
    );

    const imageUrls = await Promise.all(uploadPromises);
    logger.info(`✅ Uploaded ${imageUrls.length} images to Cloudinary`);

    return imageUrls;
  } catch (error: any) {
    logger.error('❌ Multiple image upload error:', error);
    throw new Error('Failed to upload images');
  }
};

/**
 * Delete an image from Cloudinary
 */
export const deleteImageFromCloudinary = async (imageUrl: string): Promise<void> => {
  try {
    // Extract public_id from URL
    const urlParts = imageUrl.split('/');
    const publicIdWithExtension = urlParts[urlParts.length - 1];
    const publicId = publicIdWithExtension.split('.')[0];
    const folder = urlParts[urlParts.length - 2];
    const fullPublicId = `${folder}/${publicId}`;

    await cloudinary.uploader.destroy(fullPublicId);
    logger.info(`✅ Deleted image from Cloudinary: ${fullPublicId}`);
  } catch (error: any) {
    logger.error('❌ Cloudinary delete error:', error);
    throw new Error('Failed to delete image');
  }
};
