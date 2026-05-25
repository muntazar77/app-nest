import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PERMISSION_ACTIONS = ['manage', 'create', 'read', 'update', 'delete'] as const;
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export class CreatePermissionDto {
  @IsString()
  @IsIn(PERMISSION_ACTIONS)
  action!: PermissionAction;

  @IsString()
  @MaxLength(64)
  subject!: string; // e.g. "User", "Role", "Permission"

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}