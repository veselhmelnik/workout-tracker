import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule)

  app.useGlobalPipes(
    new ValidationPipe({
      // Strips anything not on the DTO, so a client cannot smuggle extra
      // identity fields into a request body.
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )

  // HTTPS is terminated by the deployment platform in production; the app
  // itself speaks plain HTTP behind it.
  await app.listen(process.env.PORT ?? 3000)
}

void bootstrap()
