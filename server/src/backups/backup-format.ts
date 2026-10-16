import { BadRequestException } from '@nestjs/common'

export const BACKUP_FORMAT = 'setline-backup'
export const BACKUP_VERSION = 1

export type ParsedBackupHeader = {
    clientBackupId: string
    format: typeof BACKUP_FORMAT
    version: typeof BACKUP_VERSION
    appVersion: string | null
}

type UnknownRecord = Record<string, unknown>

export function parseBackupHeader(payload: string): ParsedBackupHeader {
    let parsed: unknown

    try {
        parsed = JSON.parse(payload)
    } catch {
        throw new BadRequestException('Backup payload is not valid JSON')
    }

    if (!isRecord(parsed)) {
        throw new BadRequestException('Invalid backup payload')
    }

    if (parsed.format !== BACKUP_FORMAT) {
        throw new BadRequestException('Unsupported backup format')
    }

    if (parsed.version !== BACKUP_VERSION) {
        throw new BadRequestException('Unsupported backup version')
    }

    if (
        typeof parsed.clientBackupId !== 'string' ||
        !isUuid(parsed.clientBackupId)
    ) {
        throw new BadRequestException('Invalid backup id')
    }

    if (
        typeof parsed.createdAt !== 'string' ||
        Number.isNaN(Date.parse(parsed.createdAt))
    ) {
        throw new BadRequestException('Invalid backup creation date')
    }

    if (!isRecord(parsed.app)) {
        throw new BadRequestException('Invalid backup app metadata')
    }

    const appVersion =
        typeof parsed.app.version === 'string'
            ? parsed.app.version
            : null

    if (!isRecord(parsed.data)) {
        throw new BadRequestException('Invalid backup data')
    }

    // We don't deeply interpret workout data on the server yet.
    // But a Setline backup must at least contain the expected collections.
    for (const key of ['exercises', 'workouts', 'sessions']) {
        if (!Array.isArray(parsed.data[key])) {
            throw new BadRequestException(`Invalid backup data: ${key}`)
        }
    }

    return {
        clientBackupId: parsed.clientBackupId,
        format: BACKUP_FORMAT,
        version: BACKUP_VERSION,
        appVersion,
    }
}

function isRecord(value: unknown): value is UnknownRecord {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    )
}

function isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
    )
}