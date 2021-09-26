import { ArgsType, Field, ObjectType } from '@nestjs/graphql'
import { CoreOutput } from '../../common/dtos/output.dto'
import { User } from '../entities/user.entity'

@ArgsType()
export class UserProfileInput {
  @Field(() => Number)
  userId: number
}

@ObjectType()
export class UserProfileOutput extends CoreOutput {
  static succeed(user?: User): UserProfileOutput {
    if (!user) throw Error('User is undefined')
    const output = new this()
    output.ok = true
    output.user = user
    return output
  }

  @Field(() => User, { nullable: true })
  user?: User
}
