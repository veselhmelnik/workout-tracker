import {
    BadRequestException,
    ConflictException,
    Injectable,
} from '@nestjs/common'
import { createHash } from 'node:crypto'
import { PrismaService } from '../prisma/prisma.service'
import {
    parseBackupHeader,
} from './backup-format'

const MAX_BACKUP_BYTES = 20 * 1024 * 1024
const BACKUP_RETENTION = 5

export type BackupMetadata = {
  id: string
  createdAt: string
  sizeBytes: number
  version: number
  sha256: string
}

@Injectable()
export class BackupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    payload: string,
    claimedSha256: string,
  ): Promise<BackupMetadata> {
    const sizeBytes = Buffer.byteLength(payload, 'utf8')

    if (sizeBytes > MAX_BACKUP_BYTES) {
      throw new BadRequestException('Backup is too large')
    }

    const actualSha256 = createHash('sha256')
      .update(payload, 'utf8')
      .digest('hex')

    if (
      actualSha256.toLowerCase() !== claimedSha256.toLowerCase()
    ) {
      throw new BadRequestException('Backup checksum mismatch')
    }

    const header = parseBackupHeader(payload)

    const existing = await this.prisma.backup.findUnique({
      where: {
        userId_clientBackupId: {
          userId,
          clientBackupId: header.clientBackupId,
        },
      },
    })

    // Retry after a lost HTTP response:
    // same logical backup → return the already-created row.
    if (existing) {
      if (existing.sha256 !== actualSha256) {
        // Reusing an id for different content is a client bug, not a retry.
        throw new ConflictException(
          'Backup id already exists with different content',
        )
      }

      return toMetadata(existing)
    }

    const created = await this.prisma.$transaction(async (tx) => {
      const backup = await tx.backup.create({
        data: {
          userId,
          clientBackupId: header.clientBackupId,
          format: header.format,
          version: header.version,
          appVersion: header.appVersion,
          sizeBytes,
          sha256: actualSha256,
          payload,
        },
      })

      const obsolete = await tx.backup.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: BACKUP_RETENTION,
        select: { id: true },
      })

      if (obsolete.length > 0) {
        await tx.backup.deleteMany({
          where: {
            userId,
            id: {
              in: obsolete.map((entry) => entry.id),
            },
          },
        })
      }

      return backup
    })

    return toMetadata(created)
  }

  async getLatest(userId: string): Promise<BackupMetadata | null> {
    const backup = await this.prisma.backup.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    return backup ? toMetadata(backup) : null
  }
}

function toMetadata(backup: {
  id: string
  createdAt: Date
  sizeBytes: number
  version: number
  sha256: string
}): BackupMetadata {
  return {
    id: backup.id,
    createdAt: backup.createdAt.toISOString(),
    sizeBytes: backup.sizeBytes,
    version: backup.version,
    sha256: backup.sha256,
  }
}