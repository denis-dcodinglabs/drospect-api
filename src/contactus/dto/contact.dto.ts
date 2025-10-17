import { IsString, IsEmail, MinLength } from 'class-validator';

export class SendMailDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  message: string;
}

export class SendClientEmailDto {
  @IsString()
  @MinLength(1)
  subject: string;

  @IsString()
  @MinLength(1)
  message: string;
}
