import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Service } from './service.entity';

@Entity('member')
export class Member {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', unique: true, nullable: false })
  @Index('idx_member_local_id', { unique: true })
  localId: number;

  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_member_phone')
  phoneNumber: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'timestamptz' })
  firstRegisteredAt: Date;

  @Column({ type: 'text', nullable: true })
  profileImageUrl: string | null;

  @Column({ type: 'timestamptz' })
  subscriptionStartDate: Date;

  @Column({ type: 'timestamptz' })
  subscriptionEndDate: Date;

  @Column({ type: 'int', default: 0 })
  subscriptionUsedCount: number;

  @Column({ type: 'varchar', length: 50 })
  subscriptionStatus: string;

  @Column({ type: 'int', default: 0 })
  frozen: number;

  @Column({ type: 'timestamptz', nullable: true })
  frozenStartDate: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  frozenUntilDate: Date | null;

  @Column({ type: 'text', nullable: true })
  frozenReason: string | null;

  @Column({ type: 'int', nullable: true })
  freezeDurationRequested: number | null;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_member_status')
  status: string;

  @Column({ type: 'int', nullable: true })
  serviceLocalId: number | null;

  @ManyToOne(() => Service, { nullable: true })
  @JoinColumn({ name: 'serviceId' })
  service: Service | null;

  @Column({ type: 'int', nullable: true })
  serviceId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  externalMemberId: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  dateOfBirth: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  gender: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  organizationName: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  cardNo: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;
}




