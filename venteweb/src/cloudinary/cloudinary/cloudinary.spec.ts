import { CloudinaryProvider } from './cloudinary';

describe('CloudinaryProvider', () => {
  it('should register CLOUDINARY token with a factory', () => {
    expect(CloudinaryProvider.provide).toBe('CLOUDINARY');
    expect(typeof CloudinaryProvider.useFactory).toBe('function');
  });
});
