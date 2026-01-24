import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { SyncPayloadDto } from './dto/sync-payload.dto';
import { SyncResponseDto, DetailedSyncResultsDto, SyncResultDto } from './dto/sync-response.dto';
import { Service } from '../entities/service.entity';
import { Member } from '../entities/member.entity';
import { Attendance } from '../entities/attendance.entity';
import { Transaction } from '../entities/transaction.entity';
import { HealthMetric } from '../entities/health-metric.entity';
import { ServiceSyncDto } from './dto/service-sync.dto';
import { MemberSyncDto } from './dto/member-sync.dto';
import { AttendanceSyncDto } from './dto/attendance-sync.dto';
import { TransactionSyncDto } from './dto/transaction-sync.dto';
import { HealthMetricSyncDto } from './dto/health-metric-sync.dto';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    @InjectRepository(HealthMetric)
    private healthMetricRepository: Repository<HealthMetric>,
    private dataSource: DataSource,
  ) {}

  async syncData(payload: SyncPayloadDto): Promise<SyncResponseDto> {
    const errors: string[] = [];
    let membersSynced = 0;
    let attendanceSynced = 0;
    let transactionsSynced = 0;
    let servicesSynced = 0;
    let healthMetricsSynced = 0;
    const results: DetailedSyncResultsDto = {};

    // Use a transaction for atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Sync services first (they're referenced by members)
      if (payload.services && payload.services.length > 0) {
        const serviceResult = await this.syncServices(
          payload.services,
          queryRunner,
        );
        servicesSynced = serviceResult.synced;
        if (serviceResult.results) {
          results.services = serviceResult.results;
        }
        if (serviceResult.errors.length > 0) {
          errors.push(...serviceResult.errors);
        }
      }

      // Sync members (they're referenced by attendance and transactions)
      if (payload.members && payload.members.length > 0) {
        const memberResult = await this.syncMembers(payload.members, queryRunner);
        membersSynced = memberResult.synced;
        if (memberResult.results) {
          results.members = memberResult.results;
        }
        if (memberResult.errors.length > 0) {
          errors.push(...memberResult.errors);
        }
      }

      // Sync attendance
      if (payload.attendance && payload.attendance.length > 0) {
        const attendanceResult = await this.syncAttendance(
          payload.attendance,
          queryRunner,
        );
        attendanceSynced = attendanceResult.synced;
        if (attendanceResult.results) {
          results.attendance = attendanceResult.results;
        }
        if (attendanceResult.errors.length > 0) {
          errors.push(...attendanceResult.errors);
        }
      }

      // Sync transactions
      if (payload.transactions && payload.transactions.length > 0) {
        const transactionResult = await this.syncTransactions(
          payload.transactions,
          queryRunner,
        );
        transactionsSynced = transactionResult.synced;
        if (transactionResult.results) {
          results.transactions = transactionResult.results;
        }
        if (transactionResult.errors.length > 0) {
          errors.push(...transactionResult.errors);
        }
      }

      // Sync health metrics (after members, as they reference members)
      if (payload.healthMetrics && payload.healthMetrics.length > 0) {
        const healthMetricResult = await this.syncHealthMetrics(
          payload.healthMetrics,
          queryRunner,
        );
        healthMetricsSynced = healthMetricResult.synced;
        if (healthMetricResult.results) {
          results.healthMetrics = healthMetricResult.results;
        }
        if (healthMetricResult.errors.length > 0) {
          errors.push(...healthMetricResult.errors);
        }
      }

      // Only commit if no critical errors occurred
      const hasCriticalErrors = errors.some(e => 
        e.includes('FOREIGN KEY') || e.includes('missing') || e.includes('not found')
      );

      if (hasCriticalErrors) {
        await queryRunner.rollbackTransaction();
        this.logger.warn(`Sync rolled back due to critical errors: ${errors.join('; ')}`);
        // Don't return results since transaction was rolled back - nothing was actually synced
        return {
          success: false,
          membersSynced: 0,
          attendanceSynced: 0,
          transactionsSynced: 0,
          servicesSynced: 0,
          healthMetricsSynced: 0,
          errors: errors.length > 0 ? errors : undefined,
          timestamp: new Date().toISOString(),
          results: undefined, // Clear results since nothing was committed
        };
      } else {
        await queryRunner.commitTransaction();
        this.logger.log(
          `Sync completed: ${servicesSynced} services, ${membersSynced} members, ${attendanceSynced} attendance, ${transactionsSynced} transactions, ${healthMetricsSynced} health metrics`,
        );
      }

      return {
        success: errors.length === 0,
        membersSynced,
        attendanceSynced,
        transactionsSynced,
        servicesSynced,
        healthMetricsSynced,
        errors: errors.length > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
        results: Object.keys(results).length > 0 ? results : undefined,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      this.logger.error(`Sync failed: ${errorMessage}`, error.stack);

      return {
        success: false,
        membersSynced,
        attendanceSynced,
        transactionsSynced,
        servicesSynced,
        healthMetricsSynced,
        errors,
        timestamp: new Date().toISOString(),
        results: Object.keys(results).length > 0 ? results : undefined,
      };
    } finally {
      await queryRunner.release();
    }
  }

  private async syncServices(
    services: ServiceSyncDto[],
    queryRunner: any,
  ): Promise<{ synced: number; results?: SyncResultDto; errors: string[] }> {
    if (services.length === 0) return { synced: 0, errors: [] };

    const successful: number[] = [];
    const failed: number[] = [];
    const errors: string[] = [];

    // Bulk insert/update all services at once
    const values = services.map(serviceDto => ({
      localId: serviceDto.id,
      name: serviceDto.name,
      period: serviceDto.period,
      price: serviceDto.price,
      category: serviceDto.category,
      description: serviceDto.description,
      maxUsageCount: serviceDto.maxUsageCount,
      usageType: serviceDto.usageType,
      status: serviceDto.status,
      lastSyncedAt: new Date(),
    }));

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Service)
        .values(values)
        .orUpdate(
          [
            'name',
            'period',
            'price',
            'category',
            'description',
            'maxUsageCount',
            'usageType',
            'status',
            'updatedAt',
            'lastSyncedAt',
          ],
          ['localId'],
        )
        .execute();

      // All services synced successfully
      services.forEach(s => successful.push(s.id));

      return {
        synced: services.length,
        results: { successful, failed },
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to bulk sync services: ${errorMessage}`,
      );
      services.forEach(s => failed.push(s.id));
      errors.push(`Failed to sync services: ${errorMessage}`);
      return { synced: 0, results: { successful, failed }, errors };
    }
  }

  private async syncMembers(
    members: MemberSyncDto[],
    queryRunner: any,
  ): Promise<{ synced: number; results?: SyncResultDto; errors: string[] }> {
    if (members.length === 0) return { synced: 0, errors: [] };

    const successful: number[] = [];
    const failed: number[] = [];
    const errors: string[] = [];

    // Bulk load all services into a Map for O(1) lookup
    const serviceLocalIds = [
      ...new Set(members.map(m => m.serviceId).filter(Boolean)),
    ];
    const services =
      serviceLocalIds.length > 0
        ? await queryRunner.manager.find(Service, {
            where: { localId: In(serviceLocalIds) },
          })
        : [];

    const serviceMap = new Map(services.map(s => [s.localId, s.id]));

    // Validate foreign keys before syncing
    const membersWithMissingServices: MemberSyncDto[] = [];
    const validMembers: MemberSyncDto[] = [];

    for (const memberDto of members) {
      if (memberDto.serviceId && !serviceMap.has(memberDto.serviceId)) {
        membersWithMissingServices.push(memberDto);
        failed.push(memberDto.id);
        errors.push(
          `Member with localId ${memberDto.id} references missing service with localId ${memberDto.serviceId}`,
        );
      } else {
        validMembers.push(memberDto);
      }
    }

    if (membersWithMissingServices.length > 0) {
      this.logger.warn(
        `${membersWithMissingServices.length} members skipped due to missing service references`,
      );
    }

    if (validMembers.length === 0) {
      return {
        synced: 0,
        results: { successful, failed },
        errors,
      };
    }

    // Prepare all valid member values
    const values = validMembers.map(memberDto => {
      const serviceId = memberDto.serviceId
        ? serviceMap.get(memberDto.serviceId) || null
        : null;

      return {
        localId: memberDto.id,
        fullName: memberDto.fullName,
        phoneNumber: memberDto.phoneNumber,
        email: memberDto.email,
        firstRegisteredAt: new Date(memberDto.firstRegisteredAt),
        profileImageUrl: memberDto.profileImageUrl,
        subscriptionStartDate: new Date(memberDto.subscriptionStartDate),
        subscriptionEndDate: new Date(memberDto.subscriptionEndDate),
        subscriptionUsedCount: memberDto.subscriptionUsedCount,
        subscriptionStatus: memberDto.subscriptionStatus,
        frozen: memberDto.frozen,
        frozenStartDate: memberDto.frozenStartDate
          ? new Date(memberDto.frozenStartDate)
          : null,
        frozenUntilDate: memberDto.frozenUntilDate
          ? new Date(memberDto.frozenUntilDate)
          : null,
        frozenReason: memberDto.frozenReason,
        freezeDurationRequested: memberDto.freezeDurationRequested,
        status: memberDto.status,
        serviceLocalId: memberDto.serviceId,
        serviceId: serviceId,
        externalMemberId: memberDto.externalMemberId,
        dateOfBirth: memberDto.dateOfBirth
          ? new Date(memberDto.dateOfBirth)
          : null,
        gender: memberDto.gender,
        organizationName: memberDto.organizationName,
        cardNo: memberDto.cardNo,
        membershipTier: memberDto.membershipTier,
        lastSyncedAt: new Date(),
      };
    });

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Member)
        .values(values)
        .orUpdate(
          [
            'fullName',
            'phoneNumber',
            'email',
            'firstRegisteredAt',
            'profileImageUrl',
            'subscriptionStartDate',
            'subscriptionEndDate',
            'subscriptionUsedCount',
            'subscriptionStatus',
            'frozen',
            'frozenStartDate',
            'frozenUntilDate',
            'frozenReason',
            'freezeDurationRequested',
            'status',
            'serviceLocalId',
            'serviceId',
            'externalMemberId',
            'dateOfBirth',
            'gender',
            'organizationName',
            'cardNo',
            'membershipTier',
            'updatedAt',
            'lastSyncedAt',
          ],
          ['localId'],
        )
        .execute();

      // All valid members synced successfully
      validMembers.forEach(m => successful.push(m.id));

      return {
        synced: validMembers.length,
        results: { successful, failed },
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to bulk sync members: ${errorMessage}`,
      );
      validMembers.forEach(m => failed.push(m.id));
      errors.push(`Failed to sync members: ${errorMessage}`);
      return { synced: 0, results: { successful, failed }, errors };
    }
  }

  private async syncAttendance(
    attendance: AttendanceSyncDto[],
    queryRunner: any,
  ): Promise<{ synced: number; results?: SyncResultDto; errors: string[] }> {
    if (attendance.length === 0) return { synced: 0, errors: [] };

    const successful: number[] = [];
    const failed: number[] = [];
    const errors: string[] = [];

    // Bulk load all members into a Map
    const memberLocalIds = [...new Set(attendance.map(a => a.memberId))];
    const members = await queryRunner.manager.find(Member, {
      where: { localId: In(memberLocalIds) },
    });

    const memberMap = new Map(members.map(m => [m.localId, m.id]));

    // Separate valid and invalid attendance records
    const validAttendance: AttendanceSyncDto[] = [];
    const invalidAttendance: AttendanceSyncDto[] = [];

    for (const attendanceDto of attendance) {
      if (memberMap.has(attendanceDto.memberId)) {
        validAttendance.push(attendanceDto);
      } else {
        invalidAttendance.push(attendanceDto);
        failed.push(attendanceDto.id);
        errors.push(
          `Attendance record with localId ${attendanceDto.id} references missing member with localId ${attendanceDto.memberId}`,
        );
      }
    }

    if (invalidAttendance.length > 0) {
      this.logger.warn(
        `${invalidAttendance.length} attendance records skipped due to missing members`,
      );
    }

    if (validAttendance.length === 0) {
      return {
        synced: 0,
        results: { successful, failed },
        errors,
      };
    }

    const values = validAttendance.map(attendanceDto => ({
      localId: attendanceDto.id,
      memberLocalId: attendanceDto.memberId,
      memberId: memberMap.get(attendanceDto.memberId)!,
      date: new Date(attendanceDto.date),
      lastSyncedAt: new Date(),
    }));

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Attendance)
        .values(values)
        .orUpdate(
          ['memberLocalId', 'memberId', 'date', 'updatedAt', 'lastSyncedAt'],
          ['localId'],
        )
        .execute();

      // All valid attendance synced successfully
      validAttendance.forEach(a => successful.push(a.id));

      return {
        synced: validAttendance.length,
        results: { successful, failed },
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to bulk sync attendance: ${errorMessage}`,
      );
      validAttendance.forEach(a => failed.push(a.id));
      errors.push(`Failed to sync attendance: ${errorMessage}`);
      return { synced: 0, results: { successful, failed }, errors };
    }
  }

  private async syncTransactions(
    transactions: TransactionSyncDto[],
    queryRunner: any,
  ): Promise<{ synced: number; results?: SyncResultDto; errors: string[] }> {
    if (transactions.length === 0) return { synced: 0, errors: [] };

    const successful: number[] = [];
    const failed: number[] = [];
    const errors: string[] = [];

    // Bulk load all members and services
    const memberLocalIds = [
      ...new Set(transactions.map(t => t.memberId).filter(Boolean)),
    ];
    const serviceLocalIds = [
      ...new Set(transactions.map(t => t.serviceId).filter(Boolean)),
    ];

    const [members, services] = await Promise.all([
      memberLocalIds.length > 0
        ? queryRunner.manager.find(Member, {
            where: { localId: In(memberLocalIds) },
          })
        : [],
      serviceLocalIds.length > 0
        ? queryRunner.manager.find(Service, {
            where: { localId: In(serviceLocalIds) },
          })
        : [],
    ]);

    const memberMap = new Map(members.map(m => [m.localId, m.id]));
    const serviceMap = new Map(services.map(s => [s.localId, s.id]));

    // Validate foreign keys before syncing
    const validTransactions: TransactionSyncDto[] = [];
    const invalidTransactions: TransactionSyncDto[] = [];

    for (const transactionDto of transactions) {
      let isValid = true;
      
      if (transactionDto.memberId && !memberMap.has(transactionDto.memberId)) {
        isValid = false;
        failed.push(transactionDto.id);
        errors.push(
          `Transaction with localId ${transactionDto.id} references missing member with localId ${transactionDto.memberId}`,
        );
      }
      
      if (transactionDto.serviceId && !serviceMap.has(transactionDto.serviceId)) {
        isValid = false;
        if (!failed.includes(transactionDto.id)) {
          failed.push(transactionDto.id);
        }
        errors.push(
          `Transaction with localId ${transactionDto.id} references missing service with localId ${transactionDto.serviceId}`,
        );
      }

      if (isValid) {
        validTransactions.push(transactionDto);
      } else {
        invalidTransactions.push(transactionDto);
      }
    }

    if (invalidTransactions.length > 0) {
      this.logger.warn(
        `${invalidTransactions.length} transaction records skipped due to missing foreign key references`,
      );
    }

    if (validTransactions.length === 0) {
      return {
        synced: 0,
        results: { successful, failed },
        errors,
      };
    }

    const values = validTransactions.map(transactionDto => ({
      localId: transactionDto.id,
      transactionType: transactionDto.transactionType,
      amount: transactionDto.amount,
      transactionDate: new Date(transactionDto.transactionDate),
      description: transactionDto.description,
      memberLocalId: transactionDto.memberId,
      memberId: transactionDto.memberId
        ? memberMap.get(transactionDto.memberId) || null
        : null,
      serviceLocalId: transactionDto.serviceId,
      serviceId: transactionDto.serviceId
        ? serviceMap.get(transactionDto.serviceId) || null
        : null,
      paymentMethodId: transactionDto.paymentMethodId,
      incomeCategoryId: transactionDto.incomeCategoryId,
      paymentStatus: transactionDto.paymentStatus,
      subscriptionPeriodStart: transactionDto.subscriptionPeriodStart
        ? new Date(transactionDto.subscriptionPeriodStart)
        : null,
      subscriptionPeriodEnd: transactionDto.subscriptionPeriodEnd
        ? new Date(transactionDto.subscriptionPeriodEnd)
        : null,
      expenseCategoryId: transactionDto.expenseCategoryId,
      vendor: transactionDto.vendor,
      receiptUrl: transactionDto.receiptUrl,
      notes: transactionDto.notes,
      referenceTransactionId: transactionDto.referenceTransactionId,
      lastSyncedAt: new Date(),
    }));

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(Transaction)
        .values(values)
        .orUpdate(
          [
            'transactionType',
            'amount',
            'transactionDate',
            'description',
            'memberLocalId',
            'memberId',
            'serviceLocalId',
            'serviceId',
            'paymentMethodId',
            'incomeCategoryId',
            'paymentStatus',
            'subscriptionPeriodStart',
            'subscriptionPeriodEnd',
            'expenseCategoryId',
            'vendor',
            'receiptUrl',
            'notes',
            'referenceTransactionId',
            'updatedAt',
            'lastSyncedAt',
          ],
          ['localId'],
        )
        .execute();

      // All valid transactions synced successfully
      validTransactions.forEach(t => successful.push(t.id));

      return {
        synced: validTransactions.length,
        results: { successful, failed },
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to bulk sync transactions: ${errorMessage}`,
      );
      validTransactions.forEach(t => failed.push(t.id));
      errors.push(`Failed to sync transactions: ${errorMessage}`);
      return { synced: 0, results: { successful, failed }, errors };
    }
  }

  private async syncHealthMetrics(
    healthMetrics: HealthMetricSyncDto[],
    queryRunner: any,
  ): Promise<{ synced: number; results?: SyncResultDto; errors: string[] }> {
    if (healthMetrics.length === 0) return { synced: 0, errors: [] };

    const successful: number[] = [];
    const failed: number[] = [];
    const errors: string[] = [];

    // Bulk load all members into a Map
    const memberLocalIds = [...new Set(healthMetrics.map(hm => hm.memberId))];
    const members = await queryRunner.manager.find(Member, {
      where: { localId: In(memberLocalIds) },
    });

    const memberMap = new Map(members.map(m => [m.localId, m.id]));

    // Separate valid and invalid health metric records
    const validHealthMetrics: HealthMetricSyncDto[] = [];
    const invalidHealthMetrics: HealthMetricSyncDto[] = [];

    for (const healthMetricDto of healthMetrics) {
      if (memberMap.has(healthMetricDto.memberId)) {
        validHealthMetrics.push(healthMetricDto);
      } else {
        invalidHealthMetrics.push(healthMetricDto);
        failed.push(healthMetricDto.id);
        errors.push(
          `Health metric record with localId ${healthMetricDto.id} references missing member with localId ${healthMetricDto.memberId}`,
        );
      }
    }

    if (invalidHealthMetrics.length > 0) {
      this.logger.warn(
        `${invalidHealthMetrics.length} health metric records skipped due to missing members`,
      );
    }

    if (validHealthMetrics.length === 0) {
      return {
        synced: 0,
        results: { successful, failed },
        errors,
      };
    }

    const values = validHealthMetrics.map(healthMetricDto => ({
      localId: healthMetricDto.id,
      memberLocalId: healthMetricDto.memberId,
      memberId: memberMap.get(healthMetricDto.memberId)!,
      measuredAt: new Date(healthMetricDto.measuredAt),
      weight: healthMetricDto.weight,
      bmi: healthMetricDto.bmi,
      bodyFatPercent: healthMetricDto.bodyFatPercent,
      heartRate: healthMetricDto.heartRate,
      muscleMass: healthMetricDto.muscleMass,
      leanBodyMass: healthMetricDto.leanBodyMass,
      boneMass: healthMetricDto.boneMass,
      skeletalMuscleMass: healthMetricDto.skeletalMuscleMass,
      visceralFat: healthMetricDto.visceralFat,
      subcutaneousFatPercent: healthMetricDto.subcutaneousFatPercent,
      proteinPercent: healthMetricDto.proteinPercent,
      bmr: healthMetricDto.bmr,
      bodyAge: healthMetricDto.bodyAge,
      bodyType: healthMetricDto.bodyType,
      lastSyncedAt: new Date(),
    }));

    try {
      await queryRunner.manager
        .createQueryBuilder()
        .insert()
        .into(HealthMetric)
        .values(values)
        .orUpdate(
          [
            'memberLocalId',
            'memberId',
            'measuredAt',
            'weight',
            'bmi',
            'bodyFatPercent',
            'heartRate',
            'muscleMass',
            'leanBodyMass',
            'boneMass',
            'skeletalMuscleMass',
            'visceralFat',
            'subcutaneousFatPercent',
            'proteinPercent',
            'bmr',
            'bodyAge',
            'bodyType',
            'updatedAt',
            'lastSyncedAt',
          ],
          ['localId'],
        )
        .execute();

      // All valid health metrics synced successfully
      validHealthMetrics.forEach(hm => successful.push(hm.id));

      return {
        synced: validHealthMetrics.length,
        results: { successful, failed },
        errors,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to bulk sync health metrics: ${errorMessage}`,
      );
      validHealthMetrics.forEach(hm => failed.push(hm.id));
      errors.push(`Failed to sync health metrics: ${errorMessage}`);
      return { synced: 0, results: { successful, failed }, errors };
    }
  }

  async getLastSyncTime(): Promise<{ lastSyncAt: string | null }> {
    try {
      // Helper function to safely get max lastSyncedAt
      const getMaxLastSynced = async (
        repository: Repository<any>,
        entityName: string,
      ): Promise<{ max: Date | string } | null> => {
        try {
          const result = await repository
            .createQueryBuilder(entityName)
            .select(`MAX(${entityName}.lastSyncedAt)`, 'max')
            .where(`${entityName}.lastSyncedAt IS NOT NULL`)
            .getRawOne();
          return result || null;
        } catch (err) {
          this.logger.warn(`Failed to get ${entityName} lastSyncAt: ${err instanceof Error ? err.message : 'Unknown error'}`);
          return null;
        }
      };

      // Get the most recent lastSyncedAt from all entities
      const [serviceMax, memberMax, attendanceMax, transactionMax, healthMetricMax] = await Promise.allSettled([
        getMaxLastSynced(this.serviceRepository, 'service'),
        getMaxLastSynced(this.memberRepository, 'member'),
        getMaxLastSynced(this.attendanceRepository, 'attendance'),
        getMaxLastSynced(this.transactionRepository, 'transaction'),
        getMaxLastSynced(this.healthMetricRepository, 'healthMetric'),
      ]);

      const dates: Date[] = [];
      
      if (serviceMax.status === 'fulfilled' && serviceMax.value?.max) {
        dates.push(new Date(serviceMax.value.max));
      }
      if (memberMax.status === 'fulfilled' && memberMax.value?.max) {
        dates.push(new Date(memberMax.value.max));
      }
      if (attendanceMax.status === 'fulfilled' && attendanceMax.value?.max) {
        dates.push(new Date(attendanceMax.value.max));
      }
      if (transactionMax.status === 'fulfilled' && transactionMax.value?.max) {
        dates.push(new Date(transactionMax.value.max));
      }
      if (healthMetricMax.status === 'fulfilled' && healthMetricMax.value?.max) {
        dates.push(new Date(healthMetricMax.value.max));
      }

      if (dates.length === 0) {
        return { lastSyncAt: null };
      }

      const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
      return { lastSyncAt: maxDate.toISOString() };
    } catch (error) {
      this.logger.error(`Failed to get last sync time: ${error instanceof Error ? error.message : 'Unknown error'}`, error instanceof Error ? error.stack : undefined);
      return { lastSyncAt: null };
    }
  }
}




