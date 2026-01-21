import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 5, description: 'Local ID from desktop app' })
  localId: number;

  @ApiProperty({ example: 'income' })
  transactionType: string;

  @ApiProperty({ example: 1500.00 })
  amount: number;

  @ApiProperty({ example: '2026-01-12T00:00:00.000Z' })
  transactionDate: string;

  @ApiProperty({ example: 'Monthly membership payment' })
  description: string;

  @ApiPropertyOptional({ example: 1 })
  memberId: number | null;

  @ApiPropertyOptional({ description: 'Member details if loaded' })
  member?: {
    id: number;
    fullName: string;
  };

  @ApiPropertyOptional({ example: 1 })
  serviceId: number | null;

  @ApiPropertyOptional({ description: 'Service details if loaded' })
  service?: {
    id: number;
    name: string;
  };

  @ApiProperty({ example: 'paid' })
  paymentStatus: string;

  @ApiPropertyOptional({ example: '2026-01-12T00:00:00.000Z' })
  subscriptionPeriodStart: string | null;

  @ApiPropertyOptional({ example: '2026-02-12T00:00:00.000Z' })
  subscriptionPeriodEnd: string | null;

  @ApiProperty({ example: '2026-01-12T00:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-01-12T00:00:00.000Z' })
  updatedAt: string;
}

export class TransactionWebDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 3316 })
  memberId: number;

  @ApiProperty({ example: 2200.00 })
  amount: number;

  @ApiProperty({ example: 'income', enum: ['income', 'expense'] })
  type: 'income' | 'expense';

  @ApiProperty({ example: 'Exercise' })
  category: string;

  @ApiProperty({ example: 'Renewal payment for Full Package 1 Month -Women' })
  description?: string;

  @ApiPropertyOptional({ example: 'Cash' })
  paymentMethod?: string;

  @ApiProperty({ example: '2026-01-17T10:04:51.660Z' })
  transactionDate: string;

  @ApiPropertyOptional({
    description: 'Member details if loaded',
    example: { id: 3316, fullName: 'John Doe' },
  })
  member?: {
    id: number;
    fullName: string;
  };

  @ApiProperty({ example: '2026-01-17T10:05:33.113Z' })
  createdAt: string;
}

export class TransactionStatsDto {
  @ApiProperty({ example: 500, description: 'Total number of transactions' })
  total: number;

  @ApiProperty({ example: 150000.00, description: 'Total income' })
  totalIncome: number;

  @ApiProperty({ example: 25000.00, description: 'Total expenses' })
  totalExpense: number;

  @ApiProperty({ example: 125000.00, description: 'Net profit (income - expenses)' })
  netProfit: number;

  @ApiProperty({ example: 45000.00, description: 'Income this month' })
  thisMonthIncome: number;

  @ApiProperty({ example: 8000.00, description: 'Expenses this month' })
  thisMonthExpense: number;

  @ApiProperty({ example: 42000.00, description: 'Income last month' })
  lastMonthIncome: number;

  @ApiProperty({ example: 7500.00, description: 'Expenses last month' })
  lastMonthExpense: number;

  @ApiProperty({
    example: [
      { date: '2026-01-12', income: 5000, expense: 500 },
      { date: '2026-01-11', income: 3500, expense: 0 },
    ],
    description: 'Financial summary for the last 7 days',
  })
  last7Days: { date: string; income: number; expense: number }[];
}









