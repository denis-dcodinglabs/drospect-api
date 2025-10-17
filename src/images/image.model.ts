import {
  IsBoolean,
  IsInt,
  IsUrl,
  IsNumber,
  IsArray,
  ValidateNested,
  IsOptional,
  IsString,
  IsDate,
} from "class-validator";
import { Type } from "class-transformer";

export class PanelCoordinates {
  @IsNumber()
  min_x: number;

  @IsNumber()
  min_y: number;

  @IsNumber()
  max_x: number;

  @IsNumber()
  max_y: number;

  @IsNumber()
  confidence: number;
}

export class PanelInfoDto {
  @IsInt()
  panelNumber: number;

  @ValidateNested()
  @Type(() => PanelCoordinates)
  coordinates: PanelCoordinates;
}

export class ImageDto {
  @IsInt()
  id: number;

  @IsInt()
  projectId: number;

  @IsUrl()
  image: string;

  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @IsString()
  @IsOptional()
  imageName?: string;

  @IsBoolean()
  isHealthy: boolean;

  @IsBoolean()
  isInspected: boolean;

  @IsString()
  @IsOptional()
  processingStatus?: string; // null | "queued" | "completed"

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  altitude?: string;

  @IsBoolean()
  @IsOptional()
  rgb?: boolean;

  @IsBoolean()
  @IsOptional()
  isFixed?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PanelInfoDto)
  panelInformation?: PanelInfoDto[];

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;

  @IsBoolean()
  isDeleted: boolean;
}
