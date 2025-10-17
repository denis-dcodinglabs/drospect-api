import { IsInt, IsOptional, IsPositive } from 'class-validator';

export class UpdatePanelStatisticsDto {
  @IsInt()
  @IsPositive()
  @IsOptional()
  totalImages?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  healthyPanels?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  unhealthyPanels?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  inspectedPanels?: number;
}
