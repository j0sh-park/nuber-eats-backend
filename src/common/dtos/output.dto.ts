import { Field, ObjectType } from '@nestjs/graphql'

@ObjectType()
export class CoreOutput {
  static succeed(): CoreOutput {
    const output = new this()
    output.ok = true
    return output
  }

  static error(error: string): CoreOutput {
    const output = new this()
    output.ok = false
    output.error = error
    return output
  }

  @Field(() => String, { nullable: true })
  error?: string

  @Field(() => Boolean)
  ok: boolean
}
