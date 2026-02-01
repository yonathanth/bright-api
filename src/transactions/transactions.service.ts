import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    const rawType = transaction.transactionType;
    const validTypes: TransactionWebDto['type'][] = ['income', 'expense', 'positive_return', 'negative_return'];
    const type = validTypes.includes(rawType as TransactionWebDto['type']) ? (rawType as TransactionWebDto['type']) : 'income';
    return {
      id: transaction.id,
      memberId: transaction.memberId || 0,
      amount: Number(transaction.amount),
      type,
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

  /**
   * All date boundaries use UTC for consistent behaviour regardless of server timezone.
   * Inflows = income (paid) + positive_return; Outflows = expense + negative_return.
   */
  async getStats(): Promise<TransactionStatsDto> {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const d = now.getUTCDate();
    const startOfMonth = new Date(Date.UTC(y, m, 1));
    const startOfLastMonth = new Date(Date.UTC(y, m - 1, 1));

    const inflowsWhere =
      "((transaction.transactionType = 'income' AND transaction.paymentStatus = 'paid') OR transaction.transactionType = 'positive_return')";
    const outflowsWhere =
      "(transaction.transactionType = 'expense' OR transaction.transactionType = 'negative_return')";

    const totalIncome = parseFloat(
      (
        await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where(inflowsWhere)
          .getRawOne()
      )?.total || '0',
    );
    const totalOutflows = parseFloat(
      (
        await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where(outflowsWhere)
          .getRawOne()
      )?.total || '0',
    );

    const thisMonthIncome = parseFloat(
      (
        await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where(inflowsWhere)
          .andWhere('transaction.transactionDate >= :startOfMonth', { startOfMonth })
          .getRawOne()
      )?.total || '0',
    );
    const thisMonthOutflows = parseFloat(
      (
        await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where(outflowsWhere)
          .andWhere('transaction.transactionDate >= :startOfMonth', { startOfMonth })
          .getRawOne()
      )?.total || '0',
    );

    const lastMonthIncome = parseFloat(
      (
        await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where(inflowsWhere)
          .andWhere('transaction.transactionDate >= :startOfLastMonth', { startOfLastMonth })
          .andWhere('transaction.transactionDate < :startOfMonth', { startOfMonth })
          .getRawOne()
      )?.total || '0',
    );
    const lastMonthOutflows = parseFloat(
      (
        await this.transactionRepository
          .createQueryBuilder('transaction')
          .select('SUM(transaction.amount)', 'total')
          .where(outflowsWhere)
          .andWhere('transaction.transactionDate >= :startOfLastMonth', { startOfLastMonth })
          .andWhere('transaction.transactionDate < :startOfMonth', { startOfMonth })
          .getRawOne()
      )?.total || '0',
    );

    const totalCount = await this.transactionRepository.count();

    const last7Days: { date: string; income: number; outflows: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(Date.UTC(y, m, d - i));
      const dayEnd = new Date(Date.UTC(y, m, d - i + 1));
      const dayIncome = parseFloat(
        (
          await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where(inflowsWhere)
            .andWhere('transaction.transactionDate >= :dayStart', { dayStart })
            .andWhere('transaction.transactionDate < :dayEnd', { dayEnd })
            .getRawOne()
        )?.total || '0',
      );
      const dayOutflows = parseFloat(
        (
          await this.transactionRepository
            .createQueryBuilder('transaction')
            .select('SUM(transaction.amount)', 'total')
            .where(outflowsWhere)
            .andWhere('transaction.transactionDate >= :dayStart', { dayStart })
            .andWhere('transaction.transactionDate < :dayEnd', { dayEnd })
            .getRawOne()
        )?.total || '0',
      );
      last7Days.push({
        date: dayStart.toISOString().split('T')[0],
        income: dayIncome,
        outflows: dayOutflows,
      });
    }

    return {
      total: totalCount,
      totalIncome,
      totalOutflows,
      netProfit: totalIncome - totalOutflows,
      thisMonthIncome,
      thisMonthOutflows,
      lastMonthIncome,
      lastMonthOutflows,
      last7Days,
    };
  }
}









