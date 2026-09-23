import { BottomSheet } from '@/components/ui/BottomSheet'
import { Button } from '@/components/ui/Button'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { colors, gutter, labelText, spacing } from '@/constants/theme'
import Constants from 'expo-constants'
import { useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type ProFeature = {
  title: string
  description: string
}

const PRO_FEATURES: ProFeature[] = [
  {
    title: 'Backup & Sync',
    description: 'Keep your workout data backed up across devices.',
  },
  {
    title: 'Export Data',
    description: 'Export your training history.',
  },
]

export default function SettingsScreen() {
  const [sheetFeature, setSheetFeature] = useState<ProFeature | null>(null)

  const version = Constants.expoConfig?.version ?? null

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader title="Settings" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Data</Text>

        {PRO_FEATURES.map((feature) => (
          <Pressable
            accessibilityHint="Explains when this becomes available"
            accessibilityRole="button"
            key={feature.title}
            onPress={() => setSheetFeature(feature)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <View style={styles.rowTitleLine}>
                <Text style={styles.rowTitle}>{feature.title}</Text>
                <Text style={styles.proPill}>PRO</Text>
              </View>

              <Text style={styles.rowDescription}>{feature.description}</Text>
              <Text style={styles.rowStatus}>Coming with Pro</Text>
            </View>

            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}

        <Text style={styles.sectionLabel}>App</Text>

        <View style={styles.aboutRow}>
          <Text style={styles.rowTitle}>About</Text>
          <Text style={styles.rowDescription}>
            Workout logging without the noise.
          </Text>
          <Text style={styles.rowStatus}>
            Your training data is stored on this device.
          </Text>
        </View>

        {version ? (
          <View style={styles.versionRow}>
            <Text style={styles.rowDescription}>Version</Text>
            <Text style={styles.version}>{version}</Text>
          </View>
        ) : null}
      </ScrollView>

      <BottomSheet
        onClose={() => setSheetFeature(null)}
        visible={sheetFeature !== null}
      >
        <Text style={styles.sheetTitle}>{sheetFeature?.title}</Text>
        <Text style={styles.sheetBody}>
          Available with Pro in a future release. Nothing leaves this device
          today.
        </Text>

        <View style={styles.sheetAction}>
          <Button
            label="Close"
            onPress={() => setSheetFeature(null)}
            variant="secondary"
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  content: {
    paddingBottom: spacing.xxl,
    paddingHorizontal: gutter,
  },

  sectionLabel: {
    ...labelText,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginTop: spacing.xl,
  },

  row: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 14,
  },

  rowText: {
    flex: 1,
    gap: 3,
  },

  rowTitleLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  rowTitle: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '500',
  },

  // Neutral tier marker: no dedicated Pro colour, no lock icons.
  proPill: {
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

  rowDescription: {
    color: colors.textMuted,
    fontSize: 12.5,
  },

  rowStatus: {
    color: colors.textSecondary,
    fontSize: 11.5,
  },

  chevron: {
    color: colors.textMuted,
    fontSize: 17,
  },

  aboutRow: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    gap: 3,
    paddingVertical: 14,
  },

  versionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },

  version: {
    color: colors.textMuted,
    fontSize: 12.5,
  },

  sheetTitle: {
    color: colors.textPrimary,
    fontSize: 16.5,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },

  sheetBody: {
    color: colors.textSecondary,
    fontSize: 13.5,
    lineHeight: 21,
  },

  sheetAction: {
    marginTop: spacing.lg,
  },

  pressed: {
    opacity: 0.6,
  },
})
