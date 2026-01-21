import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Admin } from '../entities/admin.entity';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto, AdminProfileDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const admin = await this.adminRepository.findOne({
      where: { email: email.toLowerCase(), isActive: true },
    });

    if (!admin) {
      this.logger.warn(`Login attempt failed: Admin not found - ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      this.logger.warn(`Login attempt failed: Invalid password - ${email}`);
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update last login time
    admin.lastLoginAt = new Date();
    await this.adminRepository.save(admin);

    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    };

    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`Admin logged in: ${email}`);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: 86400, // 24 hours
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
    };
  }

  async getProfile(userId: number): Promise<AdminProfileDto> {
    const admin = await this.adminRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }

  async createAdmin(email: string, password: string, name: string): Promise<Admin> {
    const existingAdmin = await this.adminRepository.findOne({
      where: { email: email.toLowerCase() },
    });

    if (existingAdmin) {
      throw new Error('Admin with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = this.adminRepository.create({
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'admin',
      isActive: true,
    });

    return this.adminRepository.save(admin);
  }

  async seedDefaultAdmin(): Promise<void> {
    const adminCount = await this.adminRepository.count();
    
    if (adminCount === 0) {
      this.logger.log('No admins found. Creating default admin...');
      await this.createAdmin('admin@gym.com', 'admin123', 'Default Admin');
      this.logger.log('Default admin created: admin@gym.com / admin123');
    }
  }

  async updateProfile(
    userId: number,
    updateDto: { email?: string; password?: string; currentPassword?: string },
  ): Promise<AdminProfileDto> {
    const admin = await this.adminRepository.findOne({
      where: { id: userId, isActive: true },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    // Verify current password if changing password or email
    if (updateDto.password || updateDto.email) {
      if (!updateDto.currentPassword) {
        throw new UnauthorizedException('Current password is required');
      }

      const isPasswordValid = await bcrypt.compare(updateDto.currentPassword, admin.password);
      if (!isPasswordValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    // Update email if provided
    if (updateDto.email) {
      const emailLower = updateDto.email.toLowerCase();
      // Check if email is already taken by another admin
      const existingAdmin = await this.adminRepository.findOne({
        where: { email: emailLower },
      });
      if (existingAdmin && existingAdmin.id !== userId) {
        throw new Error('Email is already in use');
      }
      admin.email = emailLower;
    }

    // Update password if provided
    if (updateDto.password) {
      admin.password = await bcrypt.hash(updateDto.password, 10);
    }

    await this.adminRepository.save(admin);

    this.logger.log(`Admin profile updated: ${admin.email}`);

    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }
}









