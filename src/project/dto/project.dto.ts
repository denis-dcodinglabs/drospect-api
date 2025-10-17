import {
  IsString,
  IsBoolean,
  IsOptional,
  MinLength,
  IsNumber,
  IsPositive,
} from "class-validator";

export class CreateProjectDto {
  // @IsString()
  @MinLength(1, {
    message: "Name needs to be longer than 1 character", // Custom error message
  })
  name: string;

  @IsOptional()
  description: string | null;

  @MinLength(6)
  @IsOptional()
  location: string | null;

  @IsNumber({}, { message: "Latitude needs to be a number" })
  @IsOptional()
  latitude: number | null; // This will accept float values

  @IsNumber({}, { message: "Longitude needs to be a number" })
  @IsOptional()
  longitude: number | null; // This will accept float values

  @IsPositive({ message: "Megawatt must be a positive number" }) // Ensure it's positive
  @IsNumber({}, { message: "Megawatt needs to be a number" }) // Ensure megawatt is a number
  @IsOptional()
  megawatt: number;

  @IsBoolean()
  @IsOptional()
  isactive: boolean;

  createdByUserId: string;
}
export class UpdateProjectDto {
  @IsString()
  @MinLength(1)
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsOptional()
  @IsPositive({ message: "Megawatt must be a positive number" }) // Ensure it's positive
  @IsNumber({}, { message: "Megawatt needs to be a number" }) // Ensure megawatt is a number
  megawatt?: number;

  @IsOptional()
  drone: JSON;
}
