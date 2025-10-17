import { IsNumber, IsOptional, IsBoolean } from "class-validator";

export class FilterDuplicatesDto {
  @IsNumber()
  projectId: number;

  @IsOptional()
  @IsNumber()
  radiusMeters?: number = 15; // Increased default to 15 meters for better drone GPS tolerance

  @IsOptional()
  @IsNumber()
  timeWindowSeconds?: number = 30; // Increased default to 30 seconds for better coverage

  @IsOptional()
  @IsBoolean()
  keepBestQuality?: boolean = true; // Keep highest quality image from duplicates

  @IsOptional()
  @IsBoolean()
  onlyUnhealthy?: boolean = false; // Changed default to false to process all images
}

export class DuplicateGroup {
  representativeImage: any;
  duplicates: any[];
  groupCenter: { latitude: number; longitude: number };
  groupSize: number;
}
