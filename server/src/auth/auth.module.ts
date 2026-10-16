import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AccessTokenGuard } from './access-token-guard'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { GoogleVerifier } from './google.verifier'

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, GoogleVerifier, AccessTokenGuard],
  exports: [JwtModule, AccessTokenGuard]
})
export class AuthModule {}
