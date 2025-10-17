import { IsString, MinLength, IsInt } from "class-validator";

export class CreateCommentDto {
  @IsInt()
  imageId: number;
  @IsString()
  @MinLength(6)
  comment: string;

  username: string;
}

export class GetCommentsByProjectIdDto {
  @IsInt()
  imageId: number;
}
