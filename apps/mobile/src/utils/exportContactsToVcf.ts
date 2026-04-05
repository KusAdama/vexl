import {Effect, Schema} from 'effect'
import {File, Paths} from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import {type StoredContactWithComputedValues} from '../state/contacts/domain'
import {setSkipNextResume} from './useAppState'

const LOG_PREFIX = '[ContactExport]'

export class VcfExportError extends Schema.TaggedError<VcfExportError>(
  'VcfExportError'
)('VcfExportError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

function generateVcfContent(
  contacts: StoredContactWithComputedValues[]
): string {
  const vcfCards = contacts.map((contact) => {
    const name = contact.info.name
    const phoneNumber = contact.computedValues.normalizedNumber
    return `BEGIN:VCARD\nVERSION:3.0\nFN:${escapeVcfValue(name)}\nTEL:${phoneNumber}\nEND:VCARD`
  })
  return vcfCards.join('\n')
}

function escapeVcfValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
}

function generateFilename(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `vexl-contacts-${timestamp}.vcf`
}

export function exportContactsToVcf(
  contacts: StoredContactWithComputedValues[]
): Effect.Effect<void, VcfExportError> {
  return Effect.gen(function* (_) {
    if (contacts.length === 0) {
      return yield* _(
        Effect.fail(new VcfExportError({message: 'No contacts selected'}))
      )
    }

    console.log(
      `${LOG_PREFIX} 📤 Starting share of ${contacts.length} contacts`
    )

    const vcfContent = generateVcfContent(contacts)
    const filename = generateFilename()
    const cacheDirectory = Paths.cache

    if (!cacheDirectory) {
      return yield* _(
        Effect.fail(
          new VcfExportError({message: 'Cache directory not available'})
        )
      )
    }

    const file = new File(cacheDirectory, filename)

    yield* _(
      Effect.try({
        try: () => {
          file.write(vcfContent, {encoding: 'utf8'})
        },
        catch: (error) =>
          new VcfExportError({
            message: 'Failed to write VCF file',
            cause: error,
          }),
      })
    )

    yield* _(
      Effect.tryPromise({
        try: async () => {
          setSkipNextResume(true)
          await Sharing.shareAsync(file.uri)
          console.log(
            `${LOG_PREFIX} ✅ Share successful - ${contacts.length} contacts`
          )
        },
        catch: (error) => {
          console.log(`${LOG_PREFIX} ❌ Share failed`)
          return new VcfExportError({
            message: 'Failed to share VCF file',
            cause: error,
          })
        },
      })
    )
  })
}
