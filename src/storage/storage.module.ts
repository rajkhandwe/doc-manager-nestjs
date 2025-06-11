import { Module } from '@nestjs/common';
import { StorageFactory } from './storage.factory';

@Module({
  providers: [
    StorageFactory,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: (storageFactory: StorageFactory) => {
        return storageFactory.createStorageService();
      },
      inject: [StorageFactory],
    },
  ],
  exports: ['STORAGE_SERVICE'],
})
export class StorageModule {}
