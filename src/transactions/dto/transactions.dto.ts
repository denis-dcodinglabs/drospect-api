import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class TransactionDto {
  @IsNotEmpty()
  @IsNumber()
  projectId: number; // or number, depending on your project ID type

  @IsNotEmpty()
  @IsNumber()
  credits: number;

  @IsOptional()
  @IsString()
  projectName?: string; // Optional field

  @IsOptional()
  @IsNumber()
  inspectedPanels?: number; // Optional field
}
