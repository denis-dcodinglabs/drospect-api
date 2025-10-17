import {
  IsString,
  Length,
  IsNumber,
  IsEmail,
  IsOptional,
} from "class-validator";

export class RegisterUserDto {
  @IsString()
  @Length(3, 15)
  username: string;

  @IsString()
  @Length(6, 15)
  password: string;

  @IsString()
  @Length(3, 15)
  name: string;

  @IsEmail()
  @Length(5, 50)
  email: string;

  @IsNumber()
  @IsOptional()
  role?: number;

  @IsNumber()
  @IsOptional()
  credits?: number;
}
