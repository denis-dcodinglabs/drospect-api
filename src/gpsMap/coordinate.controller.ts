import {
  Controller,
  Post,
  UploadedFiles,
  UseInterceptors,
  Get,
  Query,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import * as exifr from 'exifr';
import { MetadataExtractor } from './coordinate.service';
import axios from 'axios';
import { Response } from 'express';

@Controller('/extract-gps')
export class UploadController {
  constructor(private readonly coordinateService: MetadataExtractor) {}

  @Post('/')
  @UseInterceptors(FilesInterceptor('images'))
  async uploadFiles(@UploadedFiles() images) {
    const coordinates = [];
    for (const file of images) {
      const gps = await exifr.gps(file.buffer);
      if (gps) {
        coordinates.push({
          __filename: file.originalname,
          latitude: gps.latitude,
          longitude: gps.longitude,
        });
      } else {
        throw new Error('No GPS data found in TIFF file');
      }
    }
    return coordinates;
  }

  @Post('/metadata')
  @UseInterceptors(FilesInterceptor('images'))
  async fetchMetadata(@UploadedFiles() images) {
    const metadataList = [];
    for (const file of images) {
      try {
        const metadata =
          await this.coordinateService.extractMetadataWithAltitude(file.buffer);
        if (metadata) {
          metadataList.push({ relativeAltitude: metadata.relativeAltitude });
        }
      } catch (error) {
        throw new Error('Failed to call API');
      }
    }
    return await metadataList;
  }

  @Get('/expand') // New route for expanding URLs
  async expandUrl(@Query('shortUrl') shortUrl: string, @Res() res: Response) {
    try {
      const response = await axios.get(shortUrl);
      const expandedUrl = response.request.res.responseUrl;
      return res.json({ expandedUrl });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        message:
          'Failed to get address from URL. Please provide a valid google maps url!',
      });
    }
  }
}
