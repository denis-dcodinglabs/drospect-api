import { IsNumber, IsString, IsOptional, IsIn } from "class-validator";

export class ImageStatisticsDto {
  @IsNumber()
  totalImages: number;

  @IsNumber()
  @IsOptional()
  rgbImages?: number;

  @IsNumber()
  @IsOptional()
  thermalImages?: number;

  @IsNumber()
  @IsOptional()
  unhealthyImages?: number;

  @IsNumber()
  @IsOptional()
  healthyImages?: number;

  @IsNumber()
  @IsOptional()
  processedImages?: number;
}

export class ScopitoStatusUpdateDto {
  @IsNumber()
  inspectionId: number;

  @IsString()
  @IsIn(["COMPLETED", "FAILED"])
  status: "COMPLETED" | "FAILED";

  @IsOptional()
  imageStatistics?: ImageStatisticsDto;

  @IsOptional()
  statistics?: ImageStatisticsDto; // Add this to match your payload structure

  @IsString()
  @IsOptional()
  processingDetails?: string;

  @IsString()
  @IsOptional()
  errorMessage?: string;
}
