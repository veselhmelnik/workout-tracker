import { colors } from '@/constants/theme'
import { StyleSheet, Text } from 'react-native'

/**
 * Neutral tier marker: a bordered "PRO", no gold, no gradient, no lock or
 * crown. It is decorative — every locked control states its own tier in its
 * accessibility label, so a screen reader never depends on this.
 */
export function ProBadge() {
  return (
    <Text accessibilityElementsHidden importantForAccessibility="no" style={styles.badge}>
      PRO
    </Text>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderColor: colors.borderStrong,
    borderRadius: 3,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    overflow: 'hidden',
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
})
