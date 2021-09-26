import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { AppModule } from '../src/app.module'
import * as request from 'supertest'
import { Connection, Repository } from 'typeorm'
import { User } from '../src/users/entities/user.entity'
import { getRepositoryToken } from '@nestjs/typeorm'
import { Verification } from '../src/users/entities/verification.entity'

const GRAPHQL_ENDPOINT = '/graphql'
const TEST_USER = {
  email: '7510543@gmail.com',
  password: '0000',
}

jest.mock('got', () => ({
  post: jest.fn(),
}))

describe('UserModule (e2e)', () => {
  let app: INestApplication
  let jwtToken: string
  let usersRepository: Repository<User>
  let verificationsRepository: Repository<Verification>

  const baseTest = () => request(app.getHttpServer()).post(GRAPHQL_ENDPOINT)
  const publicTest = (query: string) =>
    baseTest().send({
      query,
    })
  const privateTest = (query: string) =>
    baseTest().set('X-JWT', jwtToken).send({
      query,
    })

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = module.createNestApplication()
    usersRepository = module.get(getRepositoryToken(User))
    verificationsRepository = module.get(getRepositoryToken(Verification))
    await app.init()
  })

  afterAll(async () => {
    const connection = app.get(Connection)
    await connection.dropDatabase()
    await app.close()
  })

  describe('createAccount', () => {
    it('should create account', () => {
      return publicTest(`
          mutation {
            createAccount(input: {
              email: "${TEST_USER.email}",
              password: "${TEST_USER.password}",
              role: Client
            }) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { createAccount },
            },
          } = res
          expect(createAccount.ok).toBe(true)
          expect(createAccount.error).toBe(null)
        })
    })

    it('should fail if account already exists', () => {
      return publicTest(`
          mutation {
            createAccount(input: {
              email: "${TEST_USER.email}",
              password: "${TEST_USER.password}",
              role: Client
            }) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { createAccount },
            },
          } = res
          expect(createAccount.ok).toBe(false)
          expect(createAccount.error).toBe('The email has taken already')
        })
    })
  })

  describe('login', () => {
    it('should login with with correct credentials', () => {
      return publicTest(`
          mutation {
            login(input: { email: "${TEST_USER.email}", password: "${TEST_USER.password}" }) {
              ok
              error
              token
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res
          expect(login.ok).toBe(true)
          expect(login.error).toBe(null)
          expect(login.token).toEqual(expect.any(String))
          jwtToken = login.token
        })
    })
    it('should not able to login with wrong credentials', () => {
      return publicTest(`
          mutation {
            login(input: { email: "${TEST_USER.email}", password: "wrong${TEST_USER.password}" }) {
              ok
              error
              token
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: { login },
            },
          } = res
          expect(login.ok).toBe(false)
          expect(login.error).toBe('Wrong password')
          expect(login.token).toBe(null)
        })
    })
  })

  describe('userProfile', () => {
    let userId: number
    beforeAll(async () => {
      const [user] = await usersRepository.find()
      userId = user.id
    })

    it("should see a user's profile", () => {
      return privateTest(`
          {
            userProfile(userId: ${userId}) {
              ok
              error
              user {
                id
              }
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: {
                  ok,
                  error,
                  user: { id },
                },
              },
            },
          } = res
          expect(ok).toBe(true)
          expect(error).toBe(null)
          expect(id).toBe(userId)
        })
    })
    it('should not find a profile', () => {
      return privateTest(`
          {
            userProfile(userId: ${userId + 100}) {
              ok
              error
              user {
                id
              }
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                userProfile: { ok, error, user },
              },
            },
          } = res
          expect(ok).toBe(false)
          expect(error).toBe('User not found')
          expect(user).toBe(null)
        })
    })
  })

  describe('me', () => {
    it('should get me if logged in', () => {
      return privateTest(`
          {
            me {
              email
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res
          expect(email).toBe(TEST_USER.email)
        })
    })
    it('should not get me if not logged in', () => {
      return publicTest(`
          {
            me {
              email
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: { data, errors },
          } = res
          expect(data).toBe(null)
          expect(errors).toEqual(expect.any(Array))
        })
    })
  })
  describe('editProfile', () => {
    const NEW_EMAIL = '7510543@naver.com'
    it('should change email', () => {
      return privateTest(`
          mutation {
            editProfile(input: { email: "${NEW_EMAIL}" }) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                editProfile: { ok, error },
              },
            },
          } = res
          expect(ok).toBe(true)
          expect(error).toBe(null)
        })
    })

    it('should have new email', () => {
      return privateTest(`
          {
            me {
              email
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                me: { email },
              },
            },
          } = res
          expect(email).toBe(NEW_EMAIL)
        })
    })
  })

  describe('verifyEmail', () => {
    let VERIFICATION_CODE: string
    beforeAll(async () => {
      const [verification] = await verificationsRepository.find()
      VERIFICATION_CODE = verification.code
    })
    it('should verify email', () => {
      return publicTest(`
          mutation {
            verifyEmail(input: { code: "${VERIFICATION_CODE}" }) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res
          expect(ok).toBe(true)
          expect(error).toBe(null)
        })
    })

    it('should fail on verification code not found', () => {
      return publicTest(`
          mutation {
            verifyEmail(input: { code: "${VERIFICATION_CODE}123" }) {
              ok
              error
            }
          }
        `)
        .expect(200)
        .expect((res) => {
          const {
            body: {
              data: {
                verifyEmail: { ok, error },
              },
            },
          } = res
          expect(ok).toBe(false)
          expect(error).toBe("Verification doesn't exist")
        })
    })
  })
})
