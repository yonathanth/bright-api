import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between, MoreThanOrEqual, LessThanOrEqual, In } from 'typeorm';
import { Member } from '../entities/member.entity';
import { MemberQueryDto } from './dto/member-query.dto';
import { MemberStatsDto, MemberWebDto } from './dto/member-response.dto';
import { PaginatedResponseDto, createPaginatedResponse } from '../common/dto/pagination.dto';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
  ) {}

  /**
   * Transform Member entity to web app format. Status is passed through from DB with no overrides.
   */
  transformToWebFormat(member: Member): MemberWebDto {
    return {
      id: member.id,
      memberId: member.localId.toString(), // Convert localId to string
      fullName: member.fullName,
      phone: member.phoneNumber,
      email: member.email || undefined,
      gender: member.gender || undefined,
      status: member.status,
      serviceType: member.service?.name || undefined,
      startDate: member.subscriptionStartDate.toISOString(),
      endDate: member.subscriptionEndDate.toISOString(),
      registrationDate: member.firstRegisteredAt.toISOString(),
      emergencyContact: undefined, // Not in database
      notes: undefined, // Not in database
      membershipTier: member.membershipTier || undefined,
      goals: member.goals || undefined,
      bloodType: member.bloodType || undefined,
      age: member.age || undefined,
      height: member.height || undefined,
      telegramUsername: member.telegramUsername || undefined,
      remark: member.remark || undefined,
      objective: member.objective || undefined,
      createdAt: member.createdAt.toISOString(),
      updatedAt: member.updatedAt.toISOString(),
    };
  }

  async findAll(query: MemberQueryDto): Promise<PaginatedResponseDto<MemberWebDto>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC', search, status, subscriptionStatus, serviceId } = query;

    this.logger.log(`findAll called with query: ${JSON.stringify(query)}`);

    const queryBuilder = this.memberRepository.createQueryBuilder('member')
      .leftJoinAndSelect('member.service', 'service');

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(member.fullName ILIKE :search OR member.phoneNumber ILIKE :search OR member.email ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('member.status = :status', { status });
    }

    // Subscription status filter
    if (subscriptionStatus) {
      queryBuilder.andWhere('member.subscriptionStatus = :subscriptionStatus', { subscriptionStatus });
    }

    // Service filter
    if (serviceId) {
      queryBuilder.andWhere('member.serviceId = :serviceId', { serviceId });
    }

    // Sorting
    const validSortFields = ['createdAt', 'fullName', 'subscriptionEndDate', 'firstRegisteredAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    queryBuilder.orderBy(`member.${sortField}`, sortOrder);

    // Get total count
    const total = await queryBuilder.getCount();

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const members = await queryBuilder.getMany();

    this.logger.log(`Found ${total} total members, returning ${members.length} on page ${page}`);

    // Transform members to web format
    const transformedMembers = members.map(member => this.transformToWebFormat(member));

    return createPaginatedResponse(transformedMembers, total, page, limit);
  }

  async findOne(id: number): Promise<Member | null> {
    return this.memberRepository.findOne({
      where: { id },
      relations: ['service'],
    });
  }

  async findByLocalId(localId: number): Promise<Member | null> {
    return this.memberRepository.findOne({
      where: { localId },
      relations: ['service'],
    });
  }

  async search(searchTerm: string, limit: number = 10): Promise<MemberWebDto[]> {
    const members = await this.memberRepository.createQueryBuilder('member')
      .leftJoinAndSelect('member.service', 'service')
      .where(
        '(member.fullName ILIKE :search OR member.phoneNumber ILIKE :search OR member.email ILIKE :search)',
        { search: `%${searchTerm}%` }
      )
      .orderBy('member.fullName', 'ASC')
      .take(limit)
      .getMany();
    
    return members.map(member => this.transformToWebFormat(member));
  }

  async getStats(): Promise<MemberStatsDto> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + 7);

    const [
      total,
      active,
      inactive,
      expiredSubscriptions,
      newThisMonth,
    ] = await Promise.all([
      this.memberRepository.count(),
      this.memberRepository.count({ where: { status: 'active' } }),
      // Count inactive + legacy expired status as inactive
      this.memberRepository.count({ where: { status: In(['inactive', 'expired']) } }),
      this.memberRepository.count({ where: { subscriptionStatus: 'expired' } }),
      this.memberRepository.count({
        where: {
          firstRegisteredAt: MoreThanOrEqual(startOfMonth),
        },
      }),
    ]);

    // Count expired members (subscription end date has passed)
    const expiredMembers = await this.memberRepository.count({
      where: {
        subscriptionEndDate: LessThanOrEqual(now),
      },
    });

    // Count frozen members
    const frozenMembers = await this.memberRepository.count({
      where: {
        status: 'frozen',
      },
    });

    // Count pending members
    const pendingMembers = await this.memberRepository.count({
      where: {
        status: 'pending',
      },
    });

    return {
      totalMembers: total,
      activeMembers: active,
      inactiveMembers: inactive,
      expiredMembers: expiredMembers,
      newThisMonth,
      frozenMembers,
      pendingMembers,
    };
  }
}

