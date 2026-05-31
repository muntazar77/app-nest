import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsString()
  @MinLength(2)
  name!: string; // unique key (مثلاً: "it", "hr")

  @IsOptional()
  @IsString()
  title?: string;

  @IsString()
  orgId!: string;
}