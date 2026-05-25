import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  email!: string; // email الآن (لاحقاً نضيف employeeNumber)

  @IsString()
  passwordHash!: string;
}