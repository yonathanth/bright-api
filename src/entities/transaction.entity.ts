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
import { Member } from './member.entity';
import { Service } from './service.entity';

@Entity('transaction')
export class Transaction {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'int', unique: true, nullable: false })
  @Index('idx_transaction_local_id', { unique: true })
  localId: number;

  @Column({ type: 'varchar', length: 50 })
  @Index('idx_transaction_type')
  transactionType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'timestamptz' })
  @Index('idx_transaction_date')
  transactionDate: Date;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'int', nullable: true })
  memberLocalId: number | null;

  @ManyToOne(() => Member, { nullable: true })
  @JoinColumn({ name: 'memberId' })
  member: Member | null;

  @Column({ type: 'int', nullable: true })
  @Index('idx_transaction_member_id')
  memberId: number | null;

  @Column({ type: 'int', nullable: true })
  serviceLocalId: number | null;

  @ManyToOne(() => Service, { nullable: true })
  @JoinColumn({ name: 'serviceId' })
  service: Service | null;

  @Column({ type: 'int', nullable: true })
  @Index('idx_transaction_service_id')
  serviceId: number | null;

  @Column({ type: 'int', nullable: true })
  paymentMethodId: number | null;

  @Column({ type: 'int', nullable: true })
  incomeCategoryId: number | null;

  @Column({ type: 'varchar', length: 50, default: 'paid' })
  @Index('idx_transaction_payment_status')
  paymentStatus: string;

  @Column({ type: 'timestamptz', nullable: true })
  subscriptionPeriodStart: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  subscriptionPeriodEnd: Date | null;

  @Column({ type: 'int', nullable: true })
  expenseCategoryId: number | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  vendor: string | null;

  @Column({ type: 'text', nullable: true })
  receiptUrl: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'int', nullable: true })
  referenceTransactionId: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastSyncedAt: Date | null;
}




