import { BadRequestException, ConflictException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { BackupsService } from '../src/backups/backups.service'

type BackupRow = {
    id: string
    userId: string
    clientBackupId: string
    format: string
    version: number
    appVersion: string | null
    sizeBytes: number
    sha256: string
    payload: string
    createdAt: Date
}

function makePayload(
    overrides: Record<string, unknown> = {},
): string {
    return JSON.stringify({
        format: 'setline-backup',
        version: 1,
        clientBackupId: '11111111-1111-4111-8111-111111111111',
        createdAt: '2026-10-16T08:00:00.000Z',
        app: {
            version: '1.0.0',
        },
        data: {
            exercises: [],
            workouts: [],
            sessions: [],
        },
        ...overrides,
    })
}

function hash(payload: string): string {
    return createHash('sha256').update(payload, 'utf8').digest('hex')
}

describe('BackupsService', () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'

    let rows: BackupRow[]
    let prisma: any
    let service: BackupsService

    beforeEach(() => {
        rows = []

        const backup = {
            findUnique: jest.fn(async ({ where }: any) => {
                const key = where.userId_clientBackupId

                return (
                    rows.find(
                        (row) =>
                            row.userId === key.userId &&
                            row.clientBackupId === key.clientBackupId,
                    ) ?? null
                )
            }),

            create: jest.fn(async ({ data }: any) => {
                const row: BackupRow = {
                    id: `backup-${rows.length + 1}`,
                    createdAt: new Date(Date.now() + rows.length),
                    ...data,
                }

                rows.push(row)

                return row
            }),

            findMany: jest.fn(async ({ where, orderBy, skip }: any) => {
                return rows
                    .filter((row) => row.userId === where.userId)
                    .sort(
                        (a, b) =>
                            b.createdAt.getTime() - a.createdAt.getTime(),
                    )
                    .slice(skip)
                    .map((row) => ({ id: row.id }))
            }),

            deleteMany: jest.fn(async ({ where }: any) => {
                const ids = new Set(where.id.in)
                const before = rows.length

                rows = rows.filter((row) => !ids.has(row.id))

                return {
                    count: before - rows.length,
                }
            }),

            findFirst: jest.fn(async ({ where }: any) => {
                return (
                    rows
                        .filter((row) => row.userId === where.userId)
                        .sort(
                            (a, b) =>
                                b.createdAt.getTime() - a.createdAt.getTime(),
                        )[0] ?? null
                )
            }),
        }

        prisma = {
            backup,

            $transaction: jest.fn(async (callback: any) =>
                callback({
                    backup,
                }),
            ),
        }

        service = new BackupsService(prisma)
    })

    it('creates a valid backup', async () => {
        const payload = makePayload()

        const result = await service.create(
            userId,
            payload,
            hash(payload),
        )

        expect(result.version).toBe(1)
        expect(result.sha256).toBe(hash(payload))
        expect(result.sizeBytes).toBe(
            Buffer.byteLength(payload, 'utf8'),
        )

        expect(rows).toHaveLength(1)
        expect(rows[0].userId).toBe(userId)
        expect(rows[0].format).toBe('setline-backup')
    })

    it('rejects a bad checksum', async () => {
        const payload = makePayload()

        await expect(
            service.create(userId, payload, '0'.repeat(64)),
        ).rejects.toBeInstanceOf(BadRequestException)

        expect(rows).toHaveLength(0)
    })

    it('rejects malformed JSON', async () => {
        const payload = '{bad json'

        await expect(
            service.create(userId, payload, hash(payload)),
        ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejects an unsupported format', async () => {
        const payload = makePayload({
            format: 'something-else',
        })

        await expect(
            service.create(userId, payload, hash(payload)),
        ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('rejects an unsupported version', async () => {
        const payload = makePayload({
            version: 999,
        })

        await expect(
            service.create(userId, payload, hash(payload)),
        ).rejects.toBeInstanceOf(BadRequestException)
    })

    it('returns the same backup for an idempotent retry', async () => {
        const payload = makePayload()

        const first = await service.create(
            userId,
            payload,
            hash(payload),
        )

        const second = await service.create(
            userId,
            payload,
            hash(payload),
        )

        expect(second.id).toBe(first.id)
        expect(rows).toHaveLength(1)
    })

    it('rejects reuse of a backup id with different content', async () => {
        const firstPayload = makePayload()

        await service.create(
            userId,
            firstPayload,
            hash(firstPayload),
        )

        const secondPayload = makePayload({
            data: {
                exercises: [],
                workouts: [{ id: 'different' }],
                sessions: [],
            },
        })

        await expect(
            service.create(
                userId,
                secondPayload,
                hash(secondPayload),
            ),
        ).rejects.toBeInstanceOf(ConflictException)

        expect(rows).toHaveLength(1)
    })

    it('returns null when there is no backup', async () => {
        await expect(service.getLatest(userId)).resolves.toBeNull()
    })

    it('returns only the latest backup metadata', async () => {
        const firstPayload = makePayload({
            clientBackupId: '11111111-1111-4111-8111-111111111111',
        })

        await service.create(
            userId,
            firstPayload,
            hash(firstPayload),
        )

        const secondPayload = makePayload({
            clientBackupId: '22222222-2222-4222-8222-222222222222',
        })

        const second = await service.create(
            userId,
            secondPayload,
            hash(secondPayload),
        )

        const latest = await service.getLatest(userId)

        expect(latest?.id).toBe(second.id)

        // Public metadata must not expose the stored JSON.
        expect(latest).not.toHaveProperty('payload')
    })

    it('keeps only the latest five backups', async () => {
        for (let index = 0; index < 6; index += 1) {
            const digit = String(index + 1)

            const payload = makePayload({
                clientBackupId:
                    `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`,
            })

            await service.create(
                userId,
                payload,
                hash(payload),
            )
        }

        expect(rows).toHaveLength(5)
    })

    it('does not mix backups from different users', async () => {
        const firstPayload = makePayload()

        await service.create(
            userId,
            firstPayload,
            hash(firstPayload),
        )

        const otherUserId =
            'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

        await expect(
            service.getLatest(otherUserId),
        ).resolves.toBeNull()
    })
})