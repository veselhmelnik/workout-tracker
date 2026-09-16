import { colors, fontSize, gutter } from '@/constants/theme'
import { useRouter } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type ScreenHeaderProps = {
  title: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
  onBack?: () => void
}

export function ScreenHeader({
  title,
  actionLabel,
  onAction,
  actionDisabled = false,
  onBack,
}: ScreenHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }

    if (router.canGoBack()) {
      router.back()
    }
  }

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Go back"
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleBack}
        style={({ pressed }) => [styles.side, pressed && styles.pressed]}
      >
        <BackChevron />
      </Pressable>

      <Text numberOfLines={1} style={styles.title}>
        {title}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: actionDisabled }}
        disabled={!actionLabel || actionDisabled}
        hitSlop={8}
        onPress={onAction}
        style={({ pressed }) => [
          styles.side,
          styles.sideRight,
          pressed && styles.pressed,
        ]}
      >
        <Text
          style={[styles.action, actionDisabled && styles.actionDisabled]}
        >
          {actionLabel ?? ''}
        </Text>
      </Pressable>
    </View>
  )
}

/** Stroke chevron built from two borders, so no icon library is needed. */
function BackChevron() {
  return (
    <View style={styles.chevronBox}>
      <View style={styles.chevron} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 52,
    paddingHorizontal: gutter - 4,
  },

  side: {
    height: 44,
    justifyContent: 'center',
    minWidth: 56,
  },

  sideRight: {
    alignItems: 'flex-end',
  },

  chevronBox: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },

  chevron: {
    borderBottomWidth: 2,
    borderColor: colors.textPrimary,
    borderLeftWidth: 2,
    height: 11,
    marginLeft: 4,
    transform: [{ rotate: '45deg' }],
    width: 11,
  },

  action: {
    color: colors.textPrimary,
    fontSize: fontSize.body,
    fontWeight: '600',
  },

  actionDisabled: {
    color: colors.disabledText,
  },

  title: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: fontSize.headerTitle,
    fontWeight: '600',
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.6,
  },
})
