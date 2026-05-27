// src/modules/roles/dto/set-role-permissions.dto.ts
import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class SetRolePermissionsDto {
  @IsArray()
  @IsString({ each: true })
  permissionIds!: string[];
}