import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { TransactionQueryDto } from './dto/transaction-query.dto';
import { TransactionStatsDto, TransactionWebDto } from './dto/transaction-response.dto';
import { PaginatedResponseDto, createPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {}

  async findAll(query: TransactionQueryDto): Promise<PaginatedResponseDto<TransactionWebDto>> {
    const { page = 1, limit = 20, sortBy = 'transactionDate', sortOrder = 'DESC', transactionType, paymentStatus, memberId, serviceId, startDate, endDate } = query;

    const queryBuilder = this.transactionRepository.createQueryBuilder('transaction')
      .leftJoinAndSelect('transaction.member', 'member')
      .leftJoinAndSelect('transaction.service', 'service');

    // Transaction type filter
    if (transactionType) {
      queryBuilder.andWhere('transaction.transactionType = :transactionType', { transactionType });
    }

    // Payment status filter
    if (paymentStatus) {
      queryBuilder.andWhere('transaction.paymentStatus = :paymentStatus', { paymentStatus });
    }

    // Member filter
    if (memberId) {
      queryBuilder.andWhere('transaction.memberId = :memberId', { memberId });
    }

    // Service filter
    if (serviceId) {
      queryBuilder.andWhere('transaction.serviceId = :serviceId', { serviceId });
    }

    // Date range filter
    if (startDate) {
      queryBuilder.andWhere('transaction.transactionDate >= :startDate', { startDate: new Date(startDate) });
    }
    if (endDate) {
      const endDateTime = new Date(endDate);
      endDateTime.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('transaction.transactionDate <= :endDate', { endDate: endDateTime });
    }

    // Sorting
    const validSortFields = ['transactionDate', 'amount', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'transactionDate';
    queryBuilder.orderBy(`transaction.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const transactions = await queryBuilder.getMany();

    // Transform to web format
    const transformedTransactions = transactions.map(t => this.transformToWebFormat(t));

    return createPaginatedResponse(transformedTransactions, total, page, limit);
  }

  private transformToWebFormat(transaction: Transaction): TransactionWebDto {
    return {
      id: transaction.id,
      memberId: transaction.memberId || 0,
      amount: Number(transaction.amount),
      type: transaction.transactionType as 'income' | 'expense',
      category: transaction.service?.category || 'Uncategorized',
      description: transaction.description || undefined,
      paymentMethod: transaction.paymentMethodId ? undefined : undefined, // TODO: Map paymentMethodId to name if payment methods table exists
      transactionDate: transaction.transactionDate.toISOString(),
      member: transaction.member ? {
        id: transaction.member.id,
        fullName: transaction.member.fullName,
      } : undefined,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  async findOne(id: number): Promise<TransactionWebDto | null> {
    const transaction = await this.transactionRepository.findOne({
      where: { id },
      relations: ['member', 'service'],
    });
    return transaction ? this.transformToWebFormat(transaction) : null;
  }

  async findByMember(memberId: number, query: TransactionQueryDto): Promise<PaginatedResponseDto<TransactionWebDto>> {
    return this.findAll({ ...query, memberId });
  }

  async getStats(): Promise<TransactionStatsDto> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // Get totals
    const incomeResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transactionType = :type', { type: 'income' })
      .andWhere('transaction.paymentStatus = :status', { status: 'paid' })
      .getRawOne();

    const expenseResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transactionType = :type', { type: 'expense' })
      .getRawOne();

    const totalIncome = parseFloat(incomeResult?.total || '0');
    const totalExpenses = parseFloat(expenseResult?.total || '0');

    // Get this month's totals
    const incomeThisMonthResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transactionType = :type', { type: 'income' })
      .andWhere('transaction.paymentStatus = :status', { status: 'paid' })
      .andWhere('transaction.transactionDate >= :startOfMonth', { startOfMonth })
      .getRawOne();

    const expensesThisMonthResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transactionType = :type', { type: 'expense' })
      .andWhere('transaction.transactionDate >= :startOfMonth', { startOfMonth })
      .getRawOne();

    const incomeThisMonth = parseFloat(incomeThisMonthResult?.total || '0');
    const expensesThisMonth = parseFloat(expensesThisMonthResult?.total || '0');

    // Get last month's totals
    const incomeLastMonthResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transactionType = :type', { type: 'income' })
      .andWhere('transaction.paymentStatus = :status', { status: 'paid' })
      .andWhere('transaction.transactionDate >= :startOfLastMonth', { startOfLastMonth })
      .andWhere('transaction.transactionDate < :startOfMonth', { startOfMonth })
      .getRawOne();

    const expensesLastMonthResult = await this.transactionRepository
      .createQueryBuilder('transaction')
      .select('SUM(transaction.amount)', 'total')
      .where('transaction.transactionType = :type', { type: 'expense' })
      .andWhere('transaction.transactionDate >= :startOfLastMonth', { startOfLastMonth })
      .andWhere('transaction.transactionDate < :startOfMonth', { startOfMonth })
      .getRawOne();

    const incomeLastMonth = parseFloat(incomeLastMonthResult?.total || '0');
    const expensesLastMonth = parseFloat(expensesLastMonthResult?.total || '0');

    // Get counts
    const [total] = await Promise.all([
      this.transactionRepository.count(),
    ]);

    // Get last 7 days breakdown
    const last7Days: { date: string; income: number; expense: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayIncomeResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.transactionType = :type', { type: 'income' })
        .andWhere('transaction.paymentStatus = :status', { status: 'paid' })
        .andWhere('transaction.transactionDate >= :date', { date })
        .andWhere('transaction.transactionDate < :nextDate', { nextDate })
        .getRawOne();

      const dayExpenseResult = await this.transactionRepository
        .createQueryBuilder('transaction')
        .select('SUM(transaction.amount)', 'total')
        .where('transaction.transactionType = :type', { type: 'expense' })
        .andWhere('transaction.transactionDate >= :date', { date })
        .andWhere('transaction.transactionDate < :nextDate', { nextDate })
        .getRawOne();

      last7Days.push({
        date: date.toISOString().split('T')[0],
        income: parseFloat(dayIncomeResult?.total || '0'),
        expense: parseFloat(dayExpenseResult?.total || '0'),
      });
    }

    return {
      total,
      totalIncome,
      totalExpense: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      thisMonthIncome: incomeThisMonth,
      thisMonthExpense: expensesThisMonth,
      lastMonthIncome: incomeLastMonth,
      lastMonthExpense: expensesLastMonth,
      last7Days,
    };
  }
}









