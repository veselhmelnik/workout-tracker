import { readExportSnapshot } from '@/repositories/exportRepository'
import { buildCsvFiles } from './csv'
import { buildJsonExport } from './json'
import Constants from 'expo-constants'
import { Directory, File, Paths } from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import { strToU8, zipSync } from 'fflate'

export type ExportFormat = 'csv' | 'json'

export type ExportResult =
  | { status: 'shared' }
  /** The file was written but the OS has no share target for it. */
  | { status: 'unavailable'; uri: string }
  | { status: 'failed'; message: string }

/**
 * Exports live in the cache directory: once the share sheet has handed the
 * file to Files, Drive, mail or anywhere else, the copy here is disposable,
 * and the OS may reclaim it. A file the user saved elsewhere is their own and
 * is never touched.
 */
const EXPORT_DIRECTORY = 'exports'

/** Everything written here is ours, so the prefix makes cleanup unambiguous. */
const FILE_PREFIX = 'setline-export-'

/**
 * `setline-export-2026-09-28-1430.json`. Local time, since that is what the
 * user means by "today", and deliberately free of workout, exercise or user
 * names — a filename is visible in share sheets, notifications and file
 * listings, so it carries nothing private. The time makes repeated exports on
 * one day distinct instead of silently overwriting.
 */
function buildFileName(format: ExportFormat): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  const stamp = [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
  ].join('-')

  const time = `${pad(now.getHours())}${pad(now.getMinutes())}`

  return `${FILE_PREFIX}${stamp}-${time}.${format === 'csv' ? 'zip' : 'json'}`
}

function exportDirectory(): Directory {
  const directory = new Directory(Paths.cache, EXPORT_DIRECTORY)

  if (!directory.exists) {
    directory.create({ intermediates: true })
  }

  return directory
}

/**
 * Drops earlier exports so repeated use cannot grow without bound. Only files
 * this module wrote, in its own cache folder, are considered; a failure here
 * is never allowed to fail the export itself.
 */
function removePreviousExports(directory: Directory): void {
  try {
    for (const entry of directory.list()) {
      if (entry instanceof File && entry.name.startsWith(FILE_PREFIX)) {
        entry.delete()
      }
    }
  } catch (error) {
    if (__DEV__) {
      console.warn('[export] could not clean previous exports', error)
    }
  }
}

/**
 * Reads a consistent snapshot, serializes it, writes one file and offers it to
 * the OS share sheet. Entirely local: no upload, no backend, no network of any
 * kind, so it works offline.
 */
export async function exportData(format: ExportFormat): Promise<ExportResult> {
  try {
    const snapshot = await readExportSnapshot()

    const directory = exportDirectory()

    // Before writing, so a failure part-way leaves at most the new file.
    removePreviousExports(directory)

    const file = new File(directory, buildFileName(format))

    if (format === 'json') {
      const payload = buildJsonExport(
        snapshot,
        Constants.expoConfig?.version ?? null,
      )

      // Two-space indent: an export is something the user may open and read.
      file.create()
      file.write(JSON.stringify(payload, null, 2))
    } else {
      const entries: Record<string, Uint8Array> = {}

      for (const csv of buildCsvFiles(snapshot)) {
        entries[csv.name] = strToU8(csv.contents)
      }

      // Deflate, synchronous: a text-only archive of this size compresses in
      // well under a frame, and the async variant would add a worker for no
      // benefit.
      file.create()
      file.write(zipSync(entries, { level: 6 }))
    }

    if (!(await Sharing.isAvailableAsync())) {
      // The file exists and is valid; only the hand-off is unavailable.
      return { status: 'unavailable', uri: file.uri }
    }

    await Sharing.shareAsync(file.uri, {
      mimeType: format === 'csv' ? 'application/zip' : 'application/json',
      dialogTitle: 'Export Setline data',
      UTI: format === 'csv' ? 'public.zip-archive' : 'public.json',
    })

    // Dismissing the share sheet resolves normally and is not a failure: the
    // file is written either way.
    return { status: 'shared' }
  } catch (error) {
    if (__DEV__) {
      console.warn('[export] failed', error)
    }

    // Deliberately generic: SQLite and file-system messages are not something
    // to put in front of a user.
    return {
      status: 'failed',
      message: 'Could not create your export. Please try again.',
    }
  }
}
