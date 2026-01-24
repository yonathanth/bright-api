import { ApiProperty } from '@nestjs/swagger';

export class AdminProfileDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'admin@gym.com' })
  email: string;

  @ApiProperty({ example: 'John Admin' })
  name: string;

  @ApiProperty({ example: 'admin' })
  role: string;
}

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
  })
  tokenType: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 86400,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'Admin user profile',
    type: AdminProfileDto,
  })
  user: AdminProfileDto;
}















