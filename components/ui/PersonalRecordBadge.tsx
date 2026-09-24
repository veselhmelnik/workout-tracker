import { colors } from '@/constants/theme'
import { StyleSheet, Text } from 'react-native'

/**
 * Marks a result that beat every earlier occurrence of that exercise. Success
 * green is reserved for this; the marker belongs to the exercise result, never
 * to a whole session or row.
 */
export function PersonalRecordBadge() {
  return (
    <Text accessibilityLabel="Personal record" style={styles.badge}>
      PR
    </Text>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderColor: colors.successBorder,
    borderRadius: 3,
    borderWidth: 1,
    color: colors.success,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    overflow: 'hidden',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
})
