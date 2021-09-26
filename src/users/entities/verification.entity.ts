import { Field, InputType, ObjectType } from '@nestjs/graphql'
import { BeforeInsert, Column, Entity, JoinColumn, OneToOne } from 'typeorm'
import { CoreEntity } from '../../common/entities/core.entity'
import { User } from './user.entity'
import { v4 as uuidv4 } from 'uuid'

@InputType({ isAbstract: true })
@ObjectType()
@Entity()
export class Verification extends CoreEntity {
  @Field(() => String)
  @Column()
  code: string

  @Field(() => User)
  @OneToOne(() => User)
  @JoinColumn()
  user: User

  @BeforeInsert()
  createCode(): void {
    this.code = uuidv4()
  }
}
