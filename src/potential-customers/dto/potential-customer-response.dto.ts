export class PotentialCustomerResponseDto {
  id: number;
  fullName: string;
  phoneNumber: string;
  email: string | null;
  registeredAt: Date;
  status: 'pending' | 'converted' | 'ignored';
  convertedAt: Date | null;
  convertedToMemberId: number | null;
  serviceId: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

