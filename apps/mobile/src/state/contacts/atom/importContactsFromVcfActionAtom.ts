import {Effect} from 'effect'
import {atom} from 'jotai'
import {showErrorAlert} from '../../../components/ErrorAlert'
import {loadingOverlayDisplayedAtom} from '../../../components/LoadingOverlayProvider'
import {toastNotificationAtom} from '../../../components/ToastNotification/atom'
import checkIconSvg from '../../../components/images/checkIconSvg'
import {importContactsFromVcf} from '../../../utils/importContactsFromVcf'
import {translationAtom} from '../../../utils/localization/I18nProvider'
import {storedContactsAtom} from './contactsStore'
import normalizeStoredContactsActionAtom from './normalizeStoredContactsActionAtom'

const LOG_PREFIX = '[importContactsFromVcfActionAtom]'

const importContactsFromVcfActionAtom = atom(
  null,
  (get, set, {onComplete}: {onComplete?: () => void} = {}) => {
    const {t} = get(translationAtom)

    return Effect.gen(function* (_) {
      const existingContacts = get(storedContactsAtom)

      const result = yield* _(
        importContactsFromVcf(existingContacts, () => {
          set(loadingOverlayDisplayedAtom, true)
        }).pipe(
          Effect.tap((importResult) =>
            Effect.gen(function* (_) {
              if (importResult.imported === 0 && importResult.skipped === 0) {
                return
              }

              if (importResult.newContacts.length > 0) {
                set(storedContactsAtom, (prev) => [
                  ...prev,
                  ...importResult.newContacts,
                ])

                yield* _(
                  set(normalizeStoredContactsActionAtom, {
                    onProgress: () => {},
                  })
                )
              }

              onComplete?.()

              if (importResult.imported > 0 && importResult.skipped > 0) {
                set(toastNotificationAtom, {
                  visible: true,
                  text: t('contacts.importSuccessWithSkipped', {
                    imported: importResult.imported,
                    skipped: importResult.skipped,
                  }),
                  icon: checkIconSvg,
                  hideAfterMillis: 8000,
                })
              } else if (importResult.imported > 0) {
                set(toastNotificationAtom, {
                  visible: true,
                  text: t('contacts.importSuccess', {
                    imported: importResult.imported,
                  }),
                  icon: checkIconSvg,
                  hideAfterMillis: 8000,
                })
              } else if (importResult.skipped > 0) {
                set(toastNotificationAtom, {
                  visible: true,
                  text: t('contacts.importSkippedAll', {
                    skipped: importResult.skipped,
                  }),
                  icon: checkIconSvg,
                  hideAfterMillis: 8000,
                })
              }
            })
          ),
          Effect.catchAll((error) =>
            Effect.sync(() => {
              console.error(`${LOG_PREFIX} ❌ Import failed`, error)
              showErrorAlert({
                title: t('contacts.importError'),
                error,
              })
              return {imported: 0, skipped: 0, newContacts: []}
            })
          )
        )
      )

      set(loadingOverlayDisplayedAtom, false)

      return result
    }).pipe(
      Effect.ensuring(
        Effect.sync(() => {
          set(loadingOverlayDisplayedAtom, false)
        })
      )
    )
  }
)

export default importContactsFromVcfActionAtom
