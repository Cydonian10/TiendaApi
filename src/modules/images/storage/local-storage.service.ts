import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { Injectable } from '@nestjs/common';
import { StorageService } from './storage.service';

const UPLOADS_DIR = join(process.cwd(), 'uploads');

@Injectable()
export class LocalStorageService implements StorageService {
  async save(file: Express.Multer.File): Promise<string> {
    return `/uploads/${file.filename}`;
  }

  async remove(url: string): Promise<void> {
    const filename = url.split('/').pop();
    if (!filename) return;
    const filePath = join(UPLOADS_DIR, filename);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}