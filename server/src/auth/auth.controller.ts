import { Body, Controller, HttpCode, Post } from '@nestjs/common'
import { IsString, MaxLength, MinLength } from 'class-validator'
import { AuthService, type SessionResponse } from './auth.service'

/**
 * Only the credential is accepted on each endpoint. No user id, no email, no
 * display name: anything the client could assert about identity is ignored,
 * because identity comes from the verified Google token or from the session
 * row the refresh token resolves to.
 */
class GoogleSignInDto {
  // Bounded so an oversized body cannot be pushed through verification.
  @IsString()
  @MinLength(10)
  @MaxLength(4096)
  idToken!: string
}

class RefreshTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(512)
  refreshToken!: string
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('google')
  @HttpCode(200)
  signInWithGoogle(@Body() dto: GoogleSignInDto): Promise<SessionResponse> {
    return this.auth.signInWithGoogle(dto.idToken)
  }

  @Post('refresh')
  @HttpCode(200)
  refresh(@Body() dto: RefreshTokenDto): Promise<SessionResponse> {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(200)
  logout(@Body() dto: RefreshTokenDto): Promise<{ revoked: boolean }> {
    return this.auth.logout(dto.refreshToken)
  }
}
