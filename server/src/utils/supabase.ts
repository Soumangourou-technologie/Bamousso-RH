import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import { Buffer } from 'node:buffer';
// Interface locale compatible Multer pour éviter les problèmes de types
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
  path?: string;
  filename?: string;
}

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://dummy.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'dummy_key'; 

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn('Supabase URL or Service Key is missing. File uploads might fail.');
}

export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export const uploadToSupabase = async (file: MulterFile, bucket: string = 'bamousso'): Promise<string | null> => {
  // Try Supabase upload if credentials exist
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    try {
      let fileBuffer = file.buffer;
      
      // If using diskStorage, buffer is missing, read from file path
      if (!fileBuffer && file.path) {
        fileBuffer = fs.readFileSync(file.path);
      }

      if (fileBuffer) {
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileBuffer, {
            contentType: file.mimetype,
            upsert: false
          });

        if (error) {
          console.error('Supabase upload error (Bucket: %s):', bucket, error.message);
          console.error('Full Error:', error);
          // Don't return null yet, try fallback
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

          return publicUrl;
        }
      }
    } catch (error) {
      console.error('Error uploading to Supabase:', error);
    }
  }

  // Fallback to local file if it exists (diskStorage)
  if (file.filename) {
    console.log('Using local file fallback:', file.filename);
    return `/uploads/${file.filename}`;
  }

  return null;
};
