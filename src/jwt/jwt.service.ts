import { Injectable } from '@nestjs/common'
import * as jwt from 'jsonwebtoken'
import { ConfigService } from '@nestjs/config'

@Injectable()
export class JwtService {
  private readonly privateKey

  constructor(private readonly configService: ConfigService) {
    this.privateKey = configService.get('PRIVATE_KEY')
    console.log(this.privateKey)
  }

  sign(userId: number): string {
    return jwt.sign(userId.toString(), this.privateKey)
  }

  verify(token: string) {
    return jwt.verify(token, this.privateKey)
  }
}
