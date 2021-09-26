import { Test } from '@nestjs/testing'
import { UsersService } from './users.service'
import { getRepositoryToken } from '@nestjs/typeorm'
import { User } from './entities/user.entity'
import { Verification } from './entities/verification.entity'
import { JwtService } from '../jwt/jwt.service'
import { MailService } from '../mail/mail.service'
import { Repository } from 'typeorm'
import { UserProfileOutput } from './dtos/user-profile.dto'
import { EditProfileOutput } from './dtos/edit-profile.dto'
import { LoginOutput } from './dtos/login.dto'
import { VerifyEmailOutput } from './dtos/verify-email.dto'

const token = 'token123123'

const mockRepository = () => ({
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  findOneOrFail: jest.fn(),
  delete: jest.fn(),
})

const mockJwtService = () => ({
  sign: jest.fn(() => token),
  verify: jest.fn(),
})

const mockMailService = () => ({
  sendVerificationEmail: jest.fn(),
})

type MockRepository<T> = Partial<Record<keyof Repository<T>, jest.Mock>>

describe('UserService', () => {
  let service: UsersService
  let usersRepository: MockRepository<User>
  let verificationRepository: MockRepository<Verification>
  let mailService: MailService
  let jwtService: JwtService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockRepository(),
        },
        {
          provide: getRepositoryToken(Verification),
          useValue: mockRepository(),
        },
        {
          provide: JwtService,
          useValue: mockJwtService(),
        },
        {
          provide: MailService,
          useValue: mockMailService(),
        },
      ],
    }).compile()
    service = module.get(UsersService)
    mailService = module.get(MailService)
    jwtService = module.get(JwtService)
    usersRepository = module.get(getRepositoryToken(User))
    verificationRepository = module.get(getRepositoryToken(Verification))
  })

  it('be defined', () => {
    expect(service).toBeDefined()
  })

  describe('createAccount', () => {
    const createAccountArgs = {
      email: 'test@test.com',
      password: 'password',
      role: 0,
    }
    const verificationCode = 'testCode123123'
    it('it should fail if user exists', async () => {
      usersRepository.findOne.mockResolvedValue({
        id: 1,
        email: 'aaaaaaa',
      })
      const result = await service.createAccount(createAccountArgs)
      expect(result).toMatchObject({
        ok: false,
        error: 'The email has taken already',
      })
    })

    it('it should create a new user', async () => {
      usersRepository.findOne.mockResolvedValue(undefined)
      usersRepository.create.mockReturnValue(createAccountArgs)
      usersRepository.save.mockResolvedValue(createAccountArgs)
      verificationRepository.create.mockReturnValue({ user: createAccountArgs })
      verificationRepository.save.mockResolvedValue({ code: verificationCode })
      const result = await service.createAccount(createAccountArgs)
      expect(result).toMatchObject({ ok: true })
      expect(usersRepository.create).toHaveBeenCalledTimes(1)
      expect(usersRepository.create).toHaveBeenCalledWith(createAccountArgs)
      expect(usersRepository.save).toHaveBeenCalledTimes(1)
      expect(usersRepository.save).toHaveBeenCalledWith(createAccountArgs)

      expect(verificationRepository.create).toHaveBeenCalledTimes(1)
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: createAccountArgs,
      })
      expect(verificationRepository.save).toHaveBeenCalledTimes(1)
      expect(verificationRepository.save).toHaveBeenCalledWith({
        user: createAccountArgs,
      })
      expect(mailService.sendVerificationEmail).toHaveBeenCalledTimes(1)
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        createAccountArgs.email,
        verificationCode
      )
    })

    it('it should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error())
      const result = await service.createAccount(createAccountArgs)
      expect(result).toMatchObject({
        ok: false,
        error: "Couldn't create account",
      })
    })
  })

  describe('login', () => {
    const loginArgs = {
      email: 'test@test.com',
      password: 'password',
    }
    it('it should fail if user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(undefined)
      const result = await service.login(loginArgs)
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1)
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        { email: loginArgs.email },
        { select: ['id', 'password'] }
      )
      expect(result).toMatchObject({
        ok: false,
        error: 'User not found',
      })
    })

    it('it should fail if the password is wrong', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(false)),
      }
      usersRepository.findOne.mockResolvedValue(mockedUser)
      const result = await service.login(loginArgs)
      expect(result).toMatchObject({
        ok: false,
        error: 'Wrong password',
      })
    })

    it('it should return token if password correct', async () => {
      const mockedUser = {
        id: 1,
        checkPassword: jest.fn(() => Promise.resolve(true)),
      }
      usersRepository.findOne.mockResolvedValue(mockedUser)
      const result = await service.login(loginArgs)
      expect(result).toMatchObject({
        ok: true,
        token,
      })
      expect(jwtService.sign).toHaveBeenCalledTimes(1)
      expect(jwtService.sign).toHaveBeenCalledWith(mockedUser.id)
    })

    it('it should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error())
      const result = await service.login(loginArgs)
      expect(result).toMatchObject(LoginOutput.error(''))
    })
  })

  describe('getProfile', () => {
    it('should find an existing user', async () => {
      const resultUser = new User()
      resultUser.id = 1
      usersRepository.findOneOrFail.mockResolvedValue(resultUser)
      const result = await service.getProfile(1)
      expect(result).toEqual({ ok: true, user: resultUser })
    })

    it('should fail if no user is found', async () => {
      usersRepository.findOneOrFail.mockRejectedValue(new Error())
      const result = await service.getProfile(1)
      expect(result).toEqual(UserProfileOutput.error('User not found'))
    })
  })

  describe('findById', () => {
    it('it should return user if exist', async () => {
      usersRepository.findOne.mockResolvedValue({ id: 1 })
      const result = await service.findById(1)
      expect(result).toMatchObject({ id: 1 })
    })
  })

  describe('editProfile', () => {
    it('should change email', async () => {
      const oldUser = {
        email: 'test@test.com',
        verified: true,
      }
      const editProfileArgs = {
        userId: 1,
        input: { email: 'test1@test.com' },
      }
      const newVerification = {
        code: '123123',
      }
      const newUser = {
        ...oldUser,
        verified: false,
        email: editProfileArgs.input.email,
      }
      usersRepository.findOne.mockResolvedValue(oldUser)
      verificationRepository.create.mockReturnValue(newVerification)
      verificationRepository.save.mockResolvedValue(newVerification)

      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input
      )
      expect(result).toEqual(EditProfileOutput.succeed())
      expect(usersRepository.findOne).toHaveBeenCalledTimes(1)
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId
      )
      expect(verificationRepository.create).toHaveBeenCalledWith({
        user: newUser,
      })
      expect(verificationRepository.save).toHaveBeenCalledWith(newVerification)
      expect(mailService.sendVerificationEmail).toHaveBeenCalledWith(
        newUser.email,
        newVerification.code
      )
      expect(usersRepository.save).toHaveBeenCalledWith(newUser)
    })

    it('should change password', async () => {
      const oldUser = {
        email: 'test@test.com',
        password: 'password',
        verified: true,
      }
      const editProfileArgs = {
        userId: 1,
        input: { password: 'new.password' },
      }
      const newUser = {
        ...oldUser,
        password: editProfileArgs.input.password,
      }
      usersRepository.findOne.mockResolvedValue(oldUser)
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input
      )
      expect(result).toEqual(EditProfileOutput.succeed())
      expect(usersRepository.findOne).toHaveBeenCalledWith(
        editProfileArgs.userId
      )
      expect(usersRepository.save).toHaveBeenCalledTimes(1)
      expect(usersRepository.save).toHaveBeenCalledWith(newUser)
    })

    it('it should fail on exception', async () => {
      usersRepository.findOne.mockRejectedValue(new Error())
      const editProfileArgs = {
        userId: 1,
        input: { password: 'new.password' },
      }
      const result = await service.editProfile(
        editProfileArgs.userId,
        editProfileArgs.input
      )
      expect(result).toMatchObject(EditProfileOutput.error(''))
    })
  })

  describe('verifyEmail', () => {
    it('should verify email', async () => {
      const mockedVerification = {
        id: 1,
        code: '123123',
        user: {
          verified: false,
        },
      }
      verificationRepository.findOne.mockResolvedValue(mockedVerification)
      const result = await service.verifyEmail(mockedVerification.code)
      expect(result).toEqual(VerifyEmailOutput.succeed())
      expect(verificationRepository.findOne).toHaveBeenCalledTimes(1)
      expect(verificationRepository.findOne).toHaveBeenCalledWith(
        { code: mockedVerification.code },
        { relations: ['user'] }
      )
      expect(usersRepository.save).toHaveBeenCalledWith({
        ...mockedVerification.user,
        verified: true,
      })
      expect(verificationRepository.delete).toHaveBeenCalledWith(
        mockedVerification.id
      )
    })

    it('it should fail on verification not found', async () => {
      verificationRepository.findOne.mockResolvedValue(undefined)
      const result = await service.verifyEmail('mockedVerification.code')
      expect(result).toEqual(
        VerifyEmailOutput.error("Verification doesn't exist")
      )
    })

    it('it should fail on exception', async () => {
      verificationRepository.findOne.mockRejectedValue(new Error('test'))
      const result = await service.verifyEmail('code')
      expect(result).toMatchObject(EditProfileOutput.error('test'))
    })
  })
})
