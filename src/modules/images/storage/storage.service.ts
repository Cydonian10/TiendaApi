export interface StorageService {
  save(file: Express.Multer.File): Promise<string>;
  remove(url: string): Promise<void>;
}
