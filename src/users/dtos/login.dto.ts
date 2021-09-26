import { Field, InputType, ObjectType, PickType } from '@nestjs/graphql'
import { CoreOutput } from '../../common/dtos/output.dto'
import { User } from '../entities/user.entity'

@InputType()
export class LoginInput extends PickType(User, ['email', 'password']) {}

@ObjectType()
export class LoginOutput extends CoreOutput {
  static succeed(token?: string): LoginOutput {
    if (!token) throw Error('Token is undefined')
    const output = new this()
    output.ok = true
    output.token = token
    return output
  }

  @Field(() => String, { nullable: true })
  token?: string
}
