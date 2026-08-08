import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'admin@ferreteria.com' })
  email: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'secret123' })
  password: string;
}
