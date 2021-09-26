import { JwtService } from './jwt.service'
import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import * as jwt from 'jsonwebtoken'

const TEST_KEY = 'testkey'

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'token'),
  verify: jest.fn(() => 1),
}))

describe('JwtService', () => {
  let service: JwtService
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        JwtService,
        {
          provide: ConfigService,
          useValue: TEST_KEY,
        },
      ],
    }).compile()
    service = module.get(JwtService)
  })

  it('be defined', () => {
    expect(service).toBeDefined()
  })

  describe('sign', () => {
    it('it should return a signed token', () => {
      const token = service.sign(1)
      expect(jwt.sign).toBeCalledTimes(1)
      expect(jwt.sign).toHaveBeenCalledWith('1', TEST_KEY)
      expect(token).toEqual('token')
    })
  })
  it('verify', () => {
    const token = service.verify('token')
    expect(jwt.verify).toBeCalledTimes(1)
    expect(jwt.verify).toHaveBeenCalledWith('token', TEST_KEY)
    expect(token).toEqual(1)
  })
})
