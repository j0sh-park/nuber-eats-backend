import { Injectable, NestMiddleware } from '@nestjs/common'
import { NextFunction, Request, Response } from 'express'
import { JwtService } from './jwt.service'
import { UsersService } from '../users/users.service'

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    if ('x-jwt' in req.headers) {
      const token = req.headers['x-jwt']
      try {
        const userId = Number(this.jwtService.verify(token.toString()))
        req['user'] = await this.usersService.findById(userId)
      } catch (e) {}
    }
    next()
  }
}
