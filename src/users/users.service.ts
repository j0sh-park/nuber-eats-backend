import { InjectRepository } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { Repository } from 'typeorm'
import { Injectable } from '@nestjs/common'
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto'
import { LoginInput, LoginOutput } from './dtos/login.dto'
import { JwtService } from '../jwt/jwt.service'
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto'
import { Verification } from './entities/verification.entity'
import { UserProfileOutput } from './dtos/user-profile.dto'
import { VerifyEmailOutput } from './dtos/verify-email.dto'
import { MailService } from '../mail/mail.service'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Verification)
    private readonly verificationRepository: Repository<Verification>,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService
  ) {}

  async createAccount({
    email,
    password,
    role,
  }: CreateAccountInput): Promise<CreateAccountOutput> {
    try {
      const exists = await this.userRepository.findOne({ email })
      if (exists) {
        return CreateAccountOutput.error('The email has taken already')
      }
      const user = await this.userRepository.save(
        this.userRepository.create({ email, password, role })
      )
      const verification = await this.verificationRepository.save(
        this.verificationRepository.create({ user })
      )
      this.mailService.sendVerificationEmail(user.email, verification.code)
      return CreateAccountOutput.succeed()
    } catch (e) {
      return CreateAccountOutput.error("Couldn't create account")
    }
  }

  async login({ email, password }: LoginInput): Promise<LoginOutput> {
    try {
      const user = await this.userRepository.findOne(
        { email },
        { select: ['id', 'password'] }
      )
      if (!user) {
        return LoginOutput.error('User not found')
      }
      const passwordCorrect = await user.checkPassword(password)
      if (!passwordCorrect) {
        return LoginOutput.error('Wrong password')
      }
      const token = this.jwtService.sign(user.id)
      return LoginOutput.succeed(token)
    } catch (error) {
      return LoginOutput.error(error.message)
    }
  }

  async findById(id: number): Promise<User> {
    return await this.userRepository.findOne(id)
  }

  async getProfile(id: number): Promise<UserProfileOutput> {
    try {
      const user = await this.userRepository.findOneOrFail(id)
      return UserProfileOutput.succeed(user)
    } catch (error) {
      return UserProfileOutput.error('User not found')
    }
  }

  async editProfile(
    userId: number,
    { email, password }: EditProfileInput
  ): Promise<EditProfileOutput> {
    try {
      const user = await this.userRepository.findOne(userId)
      if (email) {
        user.email = email
        user.verified = false
        await this.verificationRepository.delete({ user: { id: userId } })
        const verification = await this.verificationRepository.save(
          this.verificationRepository.create({ user })
        )
        this.mailService.sendVerificationEmail(user.email, verification.code)
      }
      if (password) {
        user.password = password
      }
      await this.userRepository.save(user)
      return EditProfileOutput.succeed()
    } catch (error) {
      return EditProfileOutput.error(error.message)
    }
  }

  async verifyEmail(code: string): Promise<VerifyEmailOutput> {
    try {
      const verification = await this.verificationRepository.findOne(
        { code },
        { relations: ['user'] }
      )
      if (verification) {
        verification.user.verified = true
        await this.userRepository.save(verification.user)
        await this.verificationRepository.delete(verification.id)
        return VerifyEmailOutput.succeed()
      }
      return VerifyEmailOutput.error("Verification doesn't exist")
    } catch (error) {
      return VerifyEmailOutput.error(error.message)
    }
  }
}
