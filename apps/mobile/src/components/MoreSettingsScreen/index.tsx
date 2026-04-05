import {useNavigation} from '@react-navigation/native'
import {type SvgString} from '@vexl-next/domain/src/utility/SvgString.brand'
import {useAtom, type PrimitiveAtom} from 'jotai'
import {focusAtom} from 'jotai-optics'
import React, {Fragment, useMemo, useState} from 'react'
import {ScrollView, TouchableWithoutFeedback} from 'react-native'
import {Stack, XStack, YStack, getTokens} from 'tamagui'
import chevronRightSvg from '../../images/chevronRightSvg'
import {screenshotsDisabledAtom} from '../../state/showYouDidNotAllowScreenshotsActionAtom'
import {useTranslation} from '../../utils/localization/I18nProvider'
import {
  allowContactExportAtom,
  allowDeleteVexlOnlyContactAtom,
  notificationPreferencesAtom,
  sendReadReceiptsAtom,
  skipPhoneContactStorageAtom,
} from '../../utils/preferences'
import SvgImage from '../Image'
import ItemText from '../InsideRouter/components/SettingsScreen/components/ButtonSectionItemText'
import contactIconSvg from '../InsideRouter/components/SettingsScreen/images/contactIconSvg'
import cpuIconSvg from '../InsideRouter/components/SettingsScreen/images/cpuIconSvg'
import exportIconSvg from '../InsideRouter/components/SettingsScreen/images/exportIconSvg'
import imageIconSvg from '../InsideRouter/components/SettingsScreen/images/imageIconSvg'
import notificationsIconSvg from '../InsideRouter/components/SettingsScreen/images/notificationsIconSvg'
import Screen from '../Screen'
import ScreenTitle from '../ScreenTitle'
import Switch from '../Switch'

interface NotificationPreferenceConfig {
  title: string
  atom: PrimitiveAtom<boolean>
}

interface ItemProps {
  text: string
  icon: SvgString
  onPress?: () => void
  navigatesFurther?: boolean
  isExpanded?: boolean
  children?: React.ReactNode
  _notificationPreference?: NotificationPreferenceConfig
}

function Item({
  text,
  icon,
  navigatesFurther,
  isExpanded,
  onPress,
  children,
}: ItemProps): React.ReactElement {
  const tokens = getTokens()
  return (
    <TouchableWithoutFeedback onPress={onPress}>
      <XStack ai="center" jc="space-between" h={66} ml="$7" mr="$4">
        <XStack f={1} ai="center">
          <Stack w={24} h={24} mr="$4">
            <SvgImage stroke={tokens.color.greyOnBlack.val} source={icon} />
          </Stack>
          <Stack f={1} pr="$4">
            <ItemText>{text}</ItemText>
          </Stack>
        </XStack>
        <Stack ai="center" jc="flex-end">
          {!!navigatesFurther && (
            <SvgImage
              source={chevronRightSvg}
              stroke={tokens.color.greyOnBlack.val}
              transform={isExpanded ? [{rotate: '90deg'}] : undefined}
            />
          )}
          {children}
        </Stack>
      </XStack>
    </TouchableWithoutFeedback>
  )
}

function NotificationPreferenceItem({
  title,
  atom,
}: {
  title: string
  atom: PrimitiveAtom<boolean>
}): React.ReactElement {
  const [value, setValue] = useAtom(atom)
  return (
    <XStack ai="center" jc="space-between" h={66} ml="$7" mr="$4">
      <YStack f={1}>
        <ItemText>{title}</ItemText>
      </YStack>
      <Switch value={value} onValueChange={setValue} />
    </XStack>
  )
}

function MoreSettingsScreen(): React.ReactElement {
  const {t} = useTranslation()
  const navigation = useNavigation()
  const [sendReadReceipts, setSendReadReceipts] = useAtom(sendReadReceiptsAtom)
  const [allowContactExport, setAllowContactExport] = useAtom(
    allowContactExportAtom
  )
  const [skipPhoneContactStorage, setSkipPhoneContactStorage] = useAtom(
    skipPhoneContactStorageAtom
  )
  const [allowDeleteVexlOnlyContact, setAllowDeleteVexlOnlyContact] = useAtom(
    allowDeleteVexlOnlyContactAtom
  )
  const [screenshotsDisabled, setScreenshotsDisabled] = useAtom(
    screenshotsDisabledAtom
  )
  const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false)

  const notificationPreferenceAtoms = useMemo(
    () => [
      {
        key: 'marketing',
        title: t('notifications.preferences.marketing.title'),
        atom: focusAtom(notificationPreferencesAtom, (o) =>
          o.prop('marketing')
        ),
      },
      {
        key: 'chat',
        title: t('notifications.preferences.chat.title'),
        atom: focusAtom(notificationPreferencesAtom, (o) => o.prop('chat')),
      },
      {
        key: 'inactivityWarnings',
        title: t('notifications.preferences.inactivityWarnings.title'),
        atom: focusAtom(notificationPreferencesAtom, (o) =>
          o.prop('inactivityWarnings')
        ),
      },
      {
        key: 'newOfferInMarketplace',
        title: t('notifications.preferences.newOfferInMarketplace.title'),
        atom: focusAtom(notificationPreferencesAtom, (o) =>
          o.prop('newOfferInMarketplace')
        ),
      },
    ],
    [t]
  )

  // Create the notification items with just the toggle
  const notificationItems: ItemProps[] = [
    {
      text: t('notifications.preferences.screenTitle'),
      icon: notificationsIconSvg,
      navigatesFurther: true,
      isExpanded: isNotificationsExpanded,
      onPress: () => {
        setIsNotificationsExpanded(!isNotificationsExpanded)
      },
    },
  ]

  // Group data for the main settings items (excluding notifications which is handled separately)
  const mainSettingsGroups: ItemProps[][] = [
    [
      {
        text: t('settings.items.sendReadReceipts'),
        icon: notificationsIconSvg,
        children: (
          <Switch
            value={sendReadReceipts}
            onValueChange={setSendReadReceipts}
          />
        ),
      },
    ],
    [
      {
        text: t('settings.items.allowScreenCaputre'),
        icon: imageIconSvg,
        children: (
          <Switch
            value={!screenshotsDisabled}
            onValueChange={() => {
              setScreenshotsDisabled(!screenshotsDisabled)
            }}
          />
        ),
      },
    ],
    [
      {
        text: t('settings.items.storeInContactList'),
        icon: contactIconSvg,
        children: (
          <Switch
            value={!skipPhoneContactStorage}
            onValueChange={() => {
              setSkipPhoneContactStorage(!skipPhoneContactStorage)
            }}
          />
        ),
      },
    ],
    [
      {
        text: t('settings.items.allowDeleteVexlOnlyContact'),
        icon: contactIconSvg,
        children: (
          <Switch
            value={allowDeleteVexlOnlyContact}
            onValueChange={setAllowDeleteVexlOnlyContact}
          />
        ),
      },
    ],
    [
      {
        text: t('settings.items.allowContactExportImport'),
        icon: exportIconSvg,
        children: (
          <Switch
            value={allowContactExport}
            onValueChange={setAllowContactExport}
          />
        ),
      },
    ],
  ]

  // Notification preferences group (with the toggle item and optionally expanded items)
  const notificationPreferencesGroup: ItemProps[] = useMemo(() => {
    const group: ItemProps[] = [
      {
        text: t('notifications.preferences.screenTitle'),
        icon: notificationsIconSvg,
        navigatesFurther: true,
        isExpanded: isNotificationsExpanded,
        onPress: () => {
          setIsNotificationsExpanded(!isNotificationsExpanded)
        },
      },
    ]

    if (isNotificationsExpanded) {
      // Add the expanded preferences as items in the same group
      // We store the atom reference and title, not the value itself
      notificationPreferenceAtoms.forEach((pref) => {
        group.push({
          text: pref.title,
          icon: notificationsIconSvg,
          _notificationPreference: {
            title: pref.title,
            atom: pref.atom,
          },
        })
      })
    }

    return group
  }, [t, isNotificationsExpanded, notificationPreferenceAtoms])

  return (
    <Screen customHorizontalPadding={getTokens().space[2].val}>
      <ScreenTitle text={t('settings.items.moreSettings')} withBackButton />
      <ScrollView>
        <Stack f={1} mt="$7" mx="$2">
          {/* Render main settings groups */}
          {mainSettingsGroups.map((group, groupIndex) => (
            <Fragment key={groupIndex}>
              <Stack br="$4" bg="$blackAccent1">
                {group.map((item, itemIndex) => (
                  <Fragment key={itemIndex}>
                    <Item {...item} />
                    {itemIndex !== group.length - 1 && (
                      <Stack h={2} bg="$grey" als="stretch" ml="$7" />
                    )}
                  </Fragment>
                ))}
              </Stack>
              <Stack h={16} />
            </Fragment>
          ))}

          {/* Render notification preferences group with proper atom handling */}
          <Fragment key="notifications">
            <Stack br="$4" bg="$blackAccent1">
              {notificationPreferencesGroup.map((item, itemIndex) => (
                <Fragment key={itemIndex}>
                  {item._notificationPreference ? (
                    // This is a notification preference item - render it with the atom
                    <NotificationPreferenceItem
                      title={item._notificationPreference.title}
                      atom={item._notificationPreference.atom}
                    />
                  ) : (
                    <Item {...item} />
                  )}
                  {itemIndex !== notificationPreferencesGroup.length - 1 && (
                    <Stack h={2} bg="$grey" als="stretch" ml="$7" />
                  )}
                </Fragment>
              ))}
            </Stack>
            <Stack h={16} />
          </Fragment>

          {/* Render in-app logs group */}
          <Fragment key="inAppLogs">
            <Stack br="$4" bg="$blackAccent1">
              <Item
                text={t('settings.items.inAppLogs')}
                icon={cpuIconSvg}
                navigatesFurther={true}
                onPress={() => {
                  navigation.navigate('AppLogs')
                }}
              />
            </Stack>
          </Fragment>
        </Stack>
      </ScrollView>
    </Screen>
  )
}

export default MoreSettingsScreen
