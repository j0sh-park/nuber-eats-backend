import { MailService } from './mail.service'
import { Test } from '@nestjs/testing'
import { CONFIG_OPTIONS } from '../common/common.constants'
import * as FormData from 'form-data'
import got from 'got'

jest.mock('got')
jest.mock('form-data')

const EMAIL = '7510543@gmail.com'
const CODE = 'code'
const TEST_DOMAIN = 'test-domain'

describe('MailService', () => {
  let service: MailService

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            apiKey: 'test-key',
            domain: TEST_DOMAIN,
            fromEmail: 'test-email',
          },
        },
      ],
    }).compile()
    service = module.get(MailService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('sendVerificationEmail', () => {
    it('should call send email', () => {
      jest.spyOn(service, 'sendEmail')

      service.sendVerificationEmail(EMAIL, CODE)
      expect(service.sendEmail).toHaveBeenCalledTimes(1)
      expect(service.sendEmail).toHaveBeenCalledWith(
        'Verify Your Email',
        EMAIL,
        'verify-email',
        [
          { key: 'code', value: CODE },
          { key: 'username', value: EMAIL },
        ]
      )
    })
  })

  describe('sendEmail', () => {
    it('send email', async () => {
      jest.resetAllMocks()
      const result = await service.sendEmail('test', EMAIL, 'verify-email', [
        { key: 'code', value: CODE },
        { key: 'username', value: EMAIL },
      ])
      expect(result).toBeTruthy()
      expect(FormData.prototype.append).toHaveBeenCalledTimes(6)
      expect(got.post).toHaveBeenCalledTimes(1)
      expect(got.post).toHaveBeenCalledWith(
        `https://api.mailgun.net/v3/${TEST_DOMAIN}/messages`,
        expect.any(Object)
      )
    })

    it('fails on error', async () => {
      jest.spyOn(got, 'post').mockImplementation(() => {
        throw new Error()
      })
      const result = await service.sendEmail('test', EMAIL, 'verify-email', [
        { key: 'code', value: CODE },
        { key: 'username', value: EMAIL },
      ])
      expect(result).toBeFalsy()
    })
  })
})
