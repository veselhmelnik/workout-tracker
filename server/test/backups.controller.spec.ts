import { INestApplication, ValidationPipe } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { JwtModule, JwtService } from '@nestjs/jwt'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { AccessTokenGuard } from '../src/auth/access-token-guard'
import { BackupsController } from '../src/backups/backups.controller'
import { BackupsService } from '../src/backups/backups.service'

describe('BackupsController', () => {
  const jwtSecret = 'backup-test-secret'
  const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

  let app: INestApplication
  let jwt: JwtService

  const backupsService = {
    create: jest.fn(),
    getLatest: jest.fn(),
  }

  beforeAll(async () => {
    process.env.JWT_SECRET = jwtSecret

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        JwtModule.register({}),
      ],
      controllers: [BackupsController],
      providers: [
        AccessTokenGuard,
        {
          provide: BackupsService,
          useValue: backupsService,
        },
      ],
    }).compile()

    app = moduleRef.createNestApplication()

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )

    await app.init()

    jwt = moduleRef.get(JwtService)
  })

  afterAll(async () => {
    await app.close()
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('rejects requests without an access token', async () => {
    await request(app.getHttpServer())
      .get('/backups/latest')
      .expect(401)

    expect(backupsService.getLatest).not.toHaveBeenCalled()
  })

  it('rejects an invalid access token', async () => {
    await request(app.getHttpServer())
      .get('/backups/latest')
      .set('Authorization', 'Bearer definitely-not-a-jwt')
      .expect(401)

    expect(backupsService.getLatest).not.toHaveBeenCalled()
  })

  it('gets latest backup for the authenticated user', async () => {
    const token = await jwt.signAsync(
      { sub: userId },
      {
        secret: jwtSecret,
        expiresIn: 900,
      },
    )

    backupsService.getLatest.mockResolvedValue({
      id: 'backup-id',
      createdAt: '2026-10-16T08:00:00.000Z',
      sizeBytes: 1234,
      version: 1,
      sha256: 'a'.repeat(64),
    })

    const response = await request(app.getHttpServer())
      .get('/backups/latest')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(backupsService.getLatest).toHaveBeenCalledTimes(1)
    expect(backupsService.getLatest).toHaveBeenCalledWith(userId)

    expect(response.body.backup.id).toBe('backup-id')
    expect(response.body.backup).not.toHaveProperty('payload')
  })

  it('creates a backup for the authenticated user', async () => {
    const token = await jwt.signAsync(
      { sub: userId },
      {
        secret: jwtSecret,
        expiresIn: 900,
      },
    )

    const payload = JSON.stringify({
      format: 'setline-backup',
      version: 1,
      clientBackupId:
        '11111111-1111-4111-8111-111111111111',
      createdAt: '2026-10-16T08:00:00.000Z',
      app: { version: '1.0.0' },
      data: {
        exercises: [],
        workouts: [],
        sessions: [],
      },
    })

    const sha256 = 'a'.repeat(64)

    backupsService.create.mockResolvedValue({
      id: 'backup-id',
      createdAt: '2026-10-16T08:00:01.000Z',
      sizeBytes: Buffer.byteLength(payload),
      version: 1,
      sha256,
    })

    await request(app.getHttpServer())
      .post('/backups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        payload,
        sha256,
      })
      .expect(201)

    expect(backupsService.create).toHaveBeenCalledWith(
      userId,
      payload,
      sha256,
    )
  })

  it('rejects unexpected identity fields in the body', async () => {
    const token = await jwt.signAsync(
      { sub: userId },
      {
        secret: jwtSecret,
        expiresIn: 900,
      },
    )

    await request(app.getHttpServer())
      .post('/backups')
      .set('Authorization', `Bearer ${token}`)
      .send({
        payload: '{}',
        sha256: 'a'.repeat(64),

        // A client must never be allowed to choose backup ownership.
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      })
      .expect(400)

    expect(backupsService.create).not.toHaveBeenCalled()
  })
})