import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SyncModule } from './sync/sync.module';
import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { ServicesModule } from './services/services.module';
import { AttendanceModule } from './attendance/attendance.module';
import { TransactionsModule } from './transactions/transactions.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SmsModule } from './sms/sms.module';
import { HealthMetricsModule } from './health-metrics/health-metrics.module';
import { PotentialCustomersModule } from './potential-customers/potential-customers.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),
    SyncModule,
    AuthModule,
    MembersModule,
    ServicesModule,
    AttendanceModule,
    TransactionsModule,
    DashboardModule,
    SmsModule,
    HealthMetricsModule,
    PotentialCustomersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
