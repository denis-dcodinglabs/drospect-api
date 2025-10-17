import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ExifTool } from "exiftool-vendored";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { randomBytes } from "crypto";
import * as exifr from "exifr";

@Injectable()
export class MetadataExtractor implements OnModuleDestroy {
  private exifTool: ExifTool;

  async extractMetadataWithAltitude(filePath: string | Buffer): Promise<any> {
    let tempFilePath: string | null = null;
    try {
      this.exifTool = new ExifTool();
      // If filePath is a Buffer, write it to a temporary file
      if (Buffer.isBuffer(filePath)) {
        const tmpFileName = randomBytes(16).toString("hex") + ".jpg";
        tempFilePath = join(tmpdir(), tmpFileName);
        await fs.writeFile(tempFilePath, filePath);
        filePath = tempFilePath;
      }

      const metadata = await this.exifTool.read(filePath as string);

      if (metadata) {
        return {
          relativeAltitude: parseFloat(metadata.RelativeAltitude),
        };
      } else {
        throw new Error("No GPS data found in file");
      }
    } catch (error) {
      throw new Error(`Error extracting metadata: ${error.message}`);
    } finally {
      if (tempFilePath) {
        await fs.unlink(tempFilePath); // Clean up the temporary file
      }
      await this.exifTool.end(); // Properly close the exiftool process
    }
  }

  async extractCoordinates(filebuffer: string): Promise<any> {
    for (const filePath of filebuffer) {
      try {
        // Read the file into a Buffer if necessary
        const fileContents = (await fs.readFile(filePath)).toString(); // This assumes filePath is a path to the file
        await exifr.gps(fileContents); // Now passing a Buffer to exifr.gps
      } catch (error) {
        // Handle the error (e.g., continue with the next file)
      }
    }
  }

  onModuleDestroy() {
    this.exifTool.end(); // Ensure the exiftool process is closed when the module is destroyed
  }

  async altitudeFilter(altitude: number): Promise<string> {
    if (altitude <= 20) {
      return "ROOF";
    }
    if (altitude <= 30 && altitude > 20) {
      return "LOW";
    }
    if (altitude < 100 && altitude > 30) {
      return "HIGH";
    } else {
      return "Unacceptable";
    }
  }
}
