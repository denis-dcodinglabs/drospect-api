import { IsNumber, IsUrl } from 'class-validator';

export class CreateImageDto {
  @IsUrl()
  image: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}
