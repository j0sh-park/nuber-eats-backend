import { Args, Mutation, Query, Resolver } from '@nestjs/graphql'
import { User } from './entities/user.entity'
import { UsersService } from './users.service'
import {
  CreateAccountInput,
  CreateAccountOutput,
} from './dtos/create-account.dto'
import { LoginInput, LoginOutput } from './dtos/login.dto'
import { UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { AuthUser } from '../auth/auth-user.decorator'
import { UserProfileInput, UserProfileOutput } from './dtos/user-profile.dto'
import { EditProfileInput, EditProfileOutput } from './dtos/edit-profile.dto'
import { VerifyEmailInput, VerifyEmailOutput } from './dtos/verify-email.dto'

@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Mutation(() => CreateAccountOutput)
  createAccount(
    @Args('input') createAccountInput: CreateAccountInput
  ): Promise<CreateAccountOutput> {
    return this.usersService.createAccount(createAccountInput)
  }

  @Mutation(() => LoginOutput)
  login(@Args('input') loginInput: LoginInput): Promise<LoginOutput> {
    return this.usersService.login(loginInput)
  }

  @Query(() => User)
  @UseGuards(AuthGuard)
  me(@AuthUser() authUser: User) {
    return authUser
  }

  @Query(() => UserProfileOutput)
  @UseGuards(AuthGuard)
  userProfile(
    @Args() userProfileInput: UserProfileInput
  ): Promise<UserProfileOutput> {
    return this.usersService.getProfile(userProfileInput.userId)
  }

  @Mutation(() => EditProfileOutput)
  @UseGuards(AuthGuard)
  editProfile(
    @AuthUser() authUser: User,
    @Args('input') editProfileInput: EditProfileInput
  ): Promise<EditProfileOutput> {
    return this.usersService.editProfile(authUser.id, editProfileInput)
  }

  @Mutation(() => VerifyEmailOutput)
  verifyEmail(
    @Args('input') { code }: VerifyEmailInput
  ): Promise<VerifyEmailOutput> {
    return this.usersService.verifyEmail(code)
  }
}
