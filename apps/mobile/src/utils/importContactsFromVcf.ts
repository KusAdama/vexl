import {Effect, Option, Schema} from 'effect'
import * as DocumentPicker from 'expo-document-picker'
import {File} from 'expo-file-system'
import {type ContactInfo, type StoredContact} from '../state/contacts/domain'
import {setSkipNextResume} from './useAppState'

const LOG_PREFIX = '[ContactImport]'

export class VcfImportError extends Schema.TaggedError<VcfImportError>(
  'VcfImportError'
)('VcfImportError', {
  message: Schema.String,
  cause: Schema.optional(Schema.Unknown),
}) {}

function unescapeVcfValue(value: string): string {
  return value
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '\\')
}

function extractField(block: string, fieldName: string): string | null {
  const regex = new RegExp(`^${fieldName}[^:]*:(.+)$`, 'm')
  const match = block.match(regex)
  return match?.[1]?.trim() ?? null
}

function extractAllFields(block: string, fieldName: string): string[] {
  const regex = new RegExp(`^${fieldName}[^:]*:(.+)$`, 'gm')
  const matches: string[] = []
  let match
  while ((match = regex.exec(block)) !== null) {
    const value = match[1]?.trim()
    if (value) matches.push(value)
  }
  return matches
}

export function getContactsFromVCF(content: string): ContactInfo[] {
  const contacts: ContactInfo[] = []
  const vcardBlocks = content.split(/BEGIN:VCARD/i)

  for (const block of vcardBlocks) {
    if (!block.trim()) continue
    if (!/END:VCARD/i.test(block)) continue

    const rawName = extractField(block, 'FN')
    const name = rawName ? unescapeVcfValue(rawName) : 'Unknown'
    const phoneNumbers = extractAllFields(block, 'TEL')

    for (const phone of phoneNumbers) {
      if (!phone) continue
      contacts.push({
        nonUniqueContactId: Option.none(),
        name,
        label: Option.none(),
        numberToDisplay: phone,
        rawNumber: phone,
      })
    }
  }

  return contacts
}

export interface VcfImportResult {
  imported: number
  skipped: number
  newContacts: StoredContact[]
}

export function importContactsFromVcf(
  existingContacts: readonly StoredContact[],
  onPickerDismissed?: () => void
): Effect.Effect<VcfImportResult, VcfImportError> {
  return Effect.gen(function* (_) {
    console.log(`${LOG_PREFIX} 📥 Opening document picker for VCF`)

    const result = yield* _(
      Effect.tryPromise({
        try: async () => {
          setSkipNextResume(true)
          return await DocumentPicker.getDocumentAsync({
            type: [
              'text/vcard',
              'text/x-vcard',
              'application/vcf',
              'text/directory',
            ],
            copyToCacheDirectory: true,
            multiple: false,
          })
        },
        catch: (error) => {
          return new VcfImportError({
            message: 'Failed to open document picker',
            cause: error,
          })
        },
      })
    )

    if (result.canceled) {
      console.log(`${LOG_PREFIX} 🚫 Document picker canceled`)
      return {imported: 0, skipped: 0, newContacts: []}
    }

    const asset = result.assets[0]
    if (!asset?.uri) {
      return yield* _(
        Effect.fail(new VcfImportError({message: 'No file selected'}))
      )
    }

    onPickerDismissed?.()
    console.log(`${LOG_PREFIX} 📄 Reading file: ${asset.name}`)

    const file = new File(asset.uri)
    const content = yield* _(
      Effect.tryPromise({
        try: () => file.text(),
        catch: (error) =>
          new VcfImportError({
            message: 'Failed to read VCF file',
            cause: error,
          }),
      })
    )

    const contactsFromVcf = getContactsFromVCF(content)

    if (contactsFromVcf.length === 0) {
      return yield* _(
        Effect.fail(new VcfImportError({message: 'No contacts found in file'}))
      )
    }

    console.log(
      `${LOG_PREFIX} 📋 Parsed ${contactsFromVcf.length} contacts from VCF`
    )

    const existingRawNumbers = new Set(
      existingContacts.map((c) => c.info.rawNumber)
    )

    const newContacts: StoredContact[] = []
    let skipped = 0

    for (const contact of contactsFromVcf) {
      if (existingRawNumbers.has(contact.rawNumber)) {
        skipped++
        continue
      }

      existingRawNumbers.add(contact.rawNumber)
      newContacts.push({
        info: contact,
        computedValues: Option.none(),
        serverHashToClient: Option.none(),
        flags: {
          seen: true,
          imported: false,
          importedManually: true,
          invalidNumber: 'notTriedYet',
        },
      })
    }

    console.log(
      `${LOG_PREFIX} ✅ Import result: ${newContacts.length} new, ${skipped} skipped`
    )

    return {imported: newContacts.length, skipped, newContacts}
  })
}
