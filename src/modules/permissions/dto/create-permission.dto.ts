import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const PERMISSION_ACTIONS = ['manage', 'create', 'read', 'update', 'delete'] as const;
export const PERMISSION_SUBJECTS = ['all', 'User', 'Role', 'Permission', 'Employee'] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];
export type PermissionSubject = (typeof PERMISSION_SUBJECTS)[number];

export class CreatePermissionDto {
  @IsString()
  @IsIn(PERMISSION_ACTIONS)
  action!: PermissionAction;

  @IsString()
  @IsIn(PERMISSION_SUBJECTS)
  subject!: PermissionSubject;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;
}