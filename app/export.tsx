import { useProFeature } from '@/components/pro/ProEntitlementProvider'
import { ScreenHeader } from '@/components/ui/ScreenHeader'
import { Button } from '@/components/ui/Button'
import { colors, gutter, labelText, radius, spacing } from '@/constants/theme'
import { exportData, type ExportFormat } from '@/services/export/exportFiles'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const FORMATS: {
  id: ExportFormat
  title: string
  description: string
  accessibilityLabel: string
}[] = [
  {
    id: 'csv',
    title: 'CSV package',
    description:
      'Spreadsheet-friendly files for workouts, sessions, exercises and sets, in one ZIP.',
    accessibilityLabel: 'CSV package, spreadsheet-friendly export',
  },
  {
    id: 'json',
    title: 'JSON',
    description: 'Complete structured Setline export.',
    accessibilityLabel: 'JSON, complete structured export',
  },
]

export default function ExportScreen() {
  const router = useRouter()

  const canExport = useProFeature('export')

  const [format, setFormat] = useState<ExportFormat>('csv')
  const [isExporting, setIsExporting] = useState(false)

  const handleExport = async () => {
    if (isExporting) {
      return
    }

    // Re-checked at action time: entitlement can lapse while this screen is
    // open. A file already written is never removed.
    if (!canExport) {
      Alert.alert(
        'Setline Pro required',
        'Export is part of Setline Pro. Start Pro from Settings to export your data.',
      )

      return
    }

    setIsExporting(true)

    try {
      const result = await exportData(format)

      if (result.status === 'failed') {
        // Stays on the screen so the user can simply tap Export again.
        Alert.alert('Export failed', result.message)

        return
      }

      if (result.status === 'unavailable') {
        Alert.alert(
          'Export ready',
          `Sharing is not available on this device. Your export is saved at:\n\n${result.uri}`,
        )
      }
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScreenHeader onBack={() => router.back()} title="Export Data" />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionLabel}>Choose format</Text>

        {FORMATS.map((option) => {
          const isSelected = option.id === format

          return (
            <Pressable
              accessibilityLabel={option.accessibilityLabel}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              disabled={isExporting}
              key={option.id}
              onPress={() => setFormat(option.id)}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>
            </Pressable>
          )
        })}

        <View style={styles.action}>
          <Button
            busy={isExporting}
            label={isExporting ? 'Preparing export…' : 'Export'}
            onPress={handleExport}
          />
        </View>

        <Text style={styles.note}>
          Your export is created locally on this device. It is not uploaded to
          Setline. Where it goes next is up to you — the share sheet can send it
          to Files, a cloud drive, email or anywhere else you choose.
        </Text>
      </ScrollView>
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
    paddingTop: spacing.xs,
  },

  sectionLabel: {
    ...labelText,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  option: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 4,
    marginBottom: spacing.sm,
    padding: spacing.lg,
  },

  // Selection reads as a lifted border, keeping amber for session state.
  optionSelected: {
    backgroundColor: colors.raised,
    borderColor: colors.borderStrong,
  },

  optionTitle: {
    color: colors.textPrimary,
    fontSize: 15.5,
    fontWeight: '600',
  },

  optionDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },

  action: {
    marginTop: spacing.lg,
  },

  pressed: {
    opacity: 0.6,
  },

  note: {
    color: colors.textMuted,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: spacing.lg,
  },
})
