import { Module } from '@nestjs/common';
import { MetadataExtractor } from './coordinate.service';
import { UploadController } from './coordinate.controller';

@Module({
  controllers: [UploadController],
  exports: [MetadataExtractor],
  providers: [MetadataExtractor],
})
export class MetadataModule {}
