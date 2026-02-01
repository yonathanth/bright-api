import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MemberResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5, description: 'Local ID from desktop app' })
  localId: number;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: '+251912345678' })
  phoneNumber: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  firstRegisteredAt: string;

  @ApiPropertyOptional({ example: 'https://example.com/profile.jpg' })
  profileImageUrl: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  subscriptionStartDate: string;

  @ApiProperty({ example: '2026-02-01T00:00:00.000Z' })
  subscriptionEndDate: string;

  @ApiProperty({ example: 5 })
  subscriptionUsedCount: number;

  @ApiProperty({ example: 'active' })
  subscriptionStatus: string;

  @ApiProperty({ example: 0 })
  frozen: number;

  @ApiPropertyOptional({ example: null })
  frozenStartDate: string | null;

  @ApiPropertyOptional({ example: null })
  frozenUntilDate: string | null;

  @ApiPropertyOptional({ example: null })
  frozenReason: string | null;

  @ApiProperty({ example: 'active' })
  status: string;

  @ApiPropertyOptional({ example: 1 })
  serviceId: number | null;

  @ApiPropertyOptional({ description: 'Service details if loaded' })
  service?: {
    id: number;
    name: string;
    category: string;
  };

  @ApiProperty({ example: '2026-01-12T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-12T00:00:00.000Z' })
  updatedAt: string;
}

export class MemberWebDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'M001', description: 'Member ID as string' })
  memberId: string;

  @ApiProperty({ example: 'John Doe' })
  fullName: string;

  @ApiProperty({ example: '+251912345678' })
  phone: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  email?: string;

  @ApiPropertyOptional({ example: 'male' })
  gender?: string;

  @ApiProperty({
    example: 'active',
    description: 'Member status from database (no overrides)'
  })
  status: string;

  @ApiPropertyOptional({ example: 'Monthly Membership' })
  serviceType?: string;

  @ApiPropertyOptional({ example: '2026-01-01T00:00:00.000Z' })
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-02-01T00:00:00.000Z' })
  endDate?: string;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  registrationDate: string;

  @ApiPropertyOptional({ example: 'Emergency contact info' })
  emergencyContact?: string;

  @ApiPropertyOptional({ example: 'Additional notes' })
  notes?: string;

  @ApiPropertyOptional({ example: 'gold', description: 'Membership tier' })
  membershipTier?: string;

  @ApiProperty({ example: '2026-01-12T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-12T00:00:00.000Z' })
  updatedAt: string;
}

export class MemberStatsDto {
  @ApiProperty({ example: 150, description: 'Total number of members' })
  totalMembers: number;

  @ApiProperty({ example: 100, description: 'Number of active members' })
  activeMembers: number;

  @ApiProperty({ example: 40, description: 'Number of inactive members' })
  inactiveMembers: number;

  @ApiProperty({ example: 10, description: 'Number of inactive members (including expired subscriptions)' })
  expiredMembers: number;

  @ApiProperty({ example: 5, description: 'New members this month' })
  newThisMonth: number;

  @ApiProperty({ example: 3, description: 'Number of frozen members' })
  frozenMembers: number;

  @ApiProperty({ example: 5, description: 'Number of pending members' })
  pendingMembers: number;
}









