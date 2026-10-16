import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from './auth/auth.module'
import { BackupsModule } from './backups/backups.module'
import { validateEnvironment } from './config/environment'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    // Fails fast at boot on missing configuration rather than at the first
    // sign-in attempt in production.
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    PrismaModule,
    AuthModule,
    BackupsModule
  ],
})
export class AppModule { }
