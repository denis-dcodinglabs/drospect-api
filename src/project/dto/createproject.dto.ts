import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  IsNumber,
  IsPositive,
} from 'class-validator';

export class CreateProjectDto {
  @MinLength(1)
  name: string;

  @IsOptional()
  description: string | null;

  @MinLength(6)
  @IsOptional()
  location: string;

  @IsNumber({}, { message: 'Latitude needs to be a number' }) // Ensure latitude is a number
  latitude: number; // This will accept float values

  @IsNumber({}, { message: 'Longitude needs to be a number' }) // Ensure longitude is a number
  longitude: number; // This will accept float values

  @IsPositive({ message: 'Megawatt must be a positive number' }) // Ensure it's positive
  @IsNumber({}, { message: 'Megawatt needs to be a number' }) // Ensure megawatt is a number
  megawatt: number;

  @IsBoolean()
  @IsOptional()
  isactive: boolean;

  createdByUserId: string;
}
