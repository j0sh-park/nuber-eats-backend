import { InjectRepository } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { Repository } from 'typeorm'
import { Injectable } from '@nestjs/common'
import { CreateAccountInput } from './dtos/create-account.dto'
import { LoginInput } from './dtos/login.dto'
import { JwtService } from '../jwt/jwt.service'
import { EditProfileInput } from './dtos/edit-profile.dto'
import { Verification } from './entities/verification.entity'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly jwtService: JwtService
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<{ ok: boolean; error?: string }> {
    try {
      const exists = await this.userRepository.findOne({ email })
      if (exists) {
        return { ok: false, error: 'The email has taken already' }
      }
      const user = await this.userRepository.save(
        this.userRepository.create({ email, password, role })
      )
      await this.verificationRepository.save(
        this.verificationRepository.create({ user })
      )
      return { ok: true }
    } catch (e) {
      return { ok: false, error: "Couldn't create account" }
    }
  }

  async login({
    email,
    password,
  }: LoginInput): Promise<{ ok: boolean; error?: string; token?: string }> {
    try {
      const user = await this.userRepository.findOne({ email })
      if (!user) {
        return {
          ok: false,
          error: 'User not found',
        }
      }
      const passwordCorrect = await user.checkPassword(password)
      if (!passwordCorrect) {
        return {
          ok: false,
          error: 'Wrong password',
        }
      }
      const token = this.jwtService.sign(user.id)
      return {
        ok: true,
        token,
      }
    } catch (error) {
      return {
        ok: false,
        error,
      }
    }
  }

  async findById(id: number): Promise<User> {
    return this.userRepository.findOne(id)
  }

  async editProfile(userId: number, { email, password }: EditProfileInput) {
    const user = await this.userRepository.findOne(userId)
    if (email) {
      user.email = email
      user.verified = false
      await this.verificationRepository.save(
        this.verificationRepository.create({ user })
      )
    }
    if (password) {
      user.password = password
    }
    return this.userRepository.save(user)
  }

  async verifyEmail(code: string): Promise<boolean> {
    const verification = await this.verificationRepository.findOne(
      { code },
      { relations: ['user'] }
    )
    if (verification) {
      verification.user.verified = true
      await this.userRepository.save(verification.user)
    }
    return false
  }
}
