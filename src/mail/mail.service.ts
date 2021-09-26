import { Inject, Injectable } from '@nestjs/common'
import { CONFIG_OPTIONS } from '../common/common.constants'
import { EmailVariables, MailModlueOptions } from './mail.interfaces'
import got from 'got'
import * as FormData from 'form-data'

@Injectable()
export class MailService {
  constructor(
    @Inject(CONFIG_OPTIONS) private readonly options: MailModlueOptions
  ) {}

  async sendEmail(
    subject: string,
    to: string,
    template: string,
    variables: EmailVariables[]
  ): Promise<boolean> {
    const form = new FormData()
    form.append('from', `Nuber Eats<${this.options.fromEmail}>`)
    form.append('to', to)
    form.append('subject', subject)
    form.append('template', template)
    variables.forEach((variable) =>
      form.append(`v:${variable.key}`, variable.value)
    )
    try {
      await got.post(
        `https://api.mailgun.net/v3/${this.options.domain}/messages`,
        {
          headers: {
            Authorization: `Basic ${Buffer.from(
              `api:${this.options.apiKey}`
            ).toString('base64')}`,
          },
          body: form,
        }
      )
      return true
    } catch (e) {
      return false
    }
  }

  sendVerificationEmail(email: string, code: string) {
    this.sendEmail('Verify Your Email', email, 'verify-email', [
      { key: 'code', value: code },
      { key: 'username', value: email },
    ]).then()
  }
}
