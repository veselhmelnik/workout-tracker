import { Button } from '@/components/ui/Button'
import { colors, fonts, gutter, radius, spacing } from '@/constants/theme'
import { useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

type OnboardingFlowProps = {
  /** Called for both Skip and Get Started; persistence happens upstream. */
  onFinish: () => void
}

type Step = {
  title: string
  body: string
  visual: ReactNode
}

const STEPS: Step[] = [
  {
    title: 'Workout logging without the noise',
    body: 'Track your workouts, sets, reps and weight without turning training into a complicated system.',
    visual: <SetTableVisual />,
  },
  {
    title: 'Know what you did last time',
    body: 'Previous results and exercise history stay close to the workout, so progression is easy to follow.',
    visual: <HistoryVisual />,
  },
  {
    title: 'Your training stays with you',
    body: 'Your workout data is stored locally on this device. Advanced backup, export and progress tools can be added through Pro later.',
    visual: <StorageVisual />,
  },
]

export function OnboardingFlow({ onFinish }: OnboardingFlowProps) {
  const [index, setIndex] = useState(0)

  const step = STEPS[index]
  const isFirst = index === 0
  const isLast = index === STEPS.length - 1

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.container}>
      <View style={styles.topBar}>
        {isFirst ? (
          <View style={styles.topSpacer} />
        ) : (
          <Pressable
            accessibilityLabel="Back to the previous step"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setIndex(index - 1)}
            style={({ pressed }) => [styles.topAction, pressed && styles.pressed]}
          >
            <Text style={styles.topActionLabel}>Back</Text>
          </Pressable>
        )}

        <Pressable
          accessibilityHint="Skips the introduction and opens the app"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onFinish}
          style={({ pressed }) => [
            styles.topAction,
            styles.topActionRight,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.topActionLabel}>Skip</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.visual}>{step.visual}</View>

        <Text
          accessibilityRole="header"
          // Announces position for screen readers, which cannot see the dots.
          accessibilityLabel={`Step ${index + 1} of ${STEPS.length}. ${step.title}`}
          style={styles.title}
        >
          {step.title}
        </Text>

        <Text style={styles.body}>{step.body}</Text>
      </View>

      <View style={styles.footer}>
        <View style={styles.progress}>
          {STEPS.map((entry, dotIndex) => (
            <View
              key={entry.title}
              style={[styles.dot, dotIndex === index && styles.dotActive]}
            />
          ))}

          <Text style={styles.progressLabel}>
            {index + 1} / {STEPS.length}
          </Text>
        </View>

        <Button
          label={isLast ? 'Get Started' : 'Next'}
          onPress={() => (isLast ? onFinish() : setIndex(index + 1))}
        />
      </View>
    </SafeAreaView>
  )
}

// Small blocks built from the app's own surfaces, not illustrations.

function SetTableVisual() {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Bench Press</Text>
      <Text style={styles.cardMeta}>3 sets · 5–8 reps</Text>

      <View style={styles.tableHead}>
        <Text style={[styles.tableLabel, styles.setColumn]} />
        <Text style={[styles.tableLabel, styles.cell]}>WEIGHT</Text>
        <Text style={[styles.tableLabel, styles.cell]}>REPS</Text>
      </View>

      {[
        { set: '1', weight: '55', reps: '5' },
        { set: '2', weight: '55', reps: '5' },
      ].map((row) => (
        <View key={row.set} style={styles.tableRow}>
          <Text style={[styles.setNumber, styles.setColumn]}>{row.set}</Text>
          <View style={[styles.input, styles.cell]}>
            <Text style={styles.inputValue}>{row.weight}</Text>
          </View>
          <View style={[styles.input, styles.cell]}>
            <Text style={styles.inputValue}>{row.reps}</Text>
          </View>
        </View>
      ))}
    </View>
  )
}

function HistoryVisual() {
  return (
    <View style={styles.card}>
      <View style={styles.strip}>
        <Text style={styles.stripLabel}>PREVIOUS</Text>
        <Text style={styles.stripValue}>52.5 kg · 5/5/4</Text>
      </View>

      {[
        { date: '18 SEP', value: '55 kg · 5/5/5' },
        { date: '14 SEP', value: '52.5 kg · 5/5/4' },
      ].map((row) => (
        <View key={row.date} style={styles.historyRow}>
          <Text style={styles.historyDate}>{row.date}</Text>
          <Text style={styles.historyValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

function StorageVisual() {
  return (
    <View style={styles.card}>
      {[
        { label: 'Workouts and sessions', value: 'On this device' },
        { label: 'Exercise history', value: 'On this device' },
      ].map((row) => (
        <View key={row.label} style={styles.storageRow}>
          <Text style={styles.storageLabel}>{row.label}</Text>
          <Text style={styles.storageValue}>{row.value}</Text>
        </View>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },

  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: gutter - 4,
    paddingTop: spacing.sm,
  },

  topSpacer: {
    height: 44,
    width: 56,
  },

  topAction: {
    height: 44,
    justifyContent: 'center',
    minWidth: 56,
  },

  topActionRight: {
    alignItems: 'flex-end',
  },

  topActionLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: gutter,
  },

  visual: {
    marginBottom: spacing.xxl,
  },

  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 32,
  },

  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 23,
    marginTop: spacing.md,
  },

  footer: {
    gap: spacing.lg,
    paddingBottom: spacing.lg,
    paddingHorizontal: gutter,
    paddingTop: spacing.lg,
  },

  progress: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },

  dot: {
    backgroundColor: colors.border,
    borderRadius: 2,
    height: 3,
    width: 18,
  },

  dotActive: {
    backgroundColor: colors.textPrimary,
  },

  progressLabel: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    marginLeft: 'auto',
  },

  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },

  cardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },

  cardMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },

  tableHead: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingBottom: 6,
  },

  tableLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.2,
    textAlign: 'center',
  },

  tableRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 6,
  },

  setColumn: {
    width: 24,
  },

  cell: {
    flex: 1,
  },

  setNumber: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },

  input: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    paddingVertical: 9,
  },

  inputValue: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 15,
    fontWeight: '600',
  },

  strip: {
    backgroundColor: colors.strip,
    borderColor: colors.divider,
    borderLeftColor: colors.referenceRule,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    gap: 3,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },

  stripLabel: {
    color: colors.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.3,
  },

  stripValue: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: '600',
  },

  historyRow: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: 9,
  },

  historyDate: {
    color: colors.textMuted,
    fontFamily: fonts.mono,
    fontSize: 11,
    width: 52,
  },

  historyValue: {
    color: colors.textSecondary,
    fontFamily: fonts.mono,
    fontSize: 14,
    fontWeight: '600',
  },

  storageRow: {
    alignItems: 'center',
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
    paddingVertical: 11,
  },

  storageLabel: {
    color: colors.textPrimary,
    fontSize: 13.5,
  },

  storageValue: {
    color: colors.textMuted,
    fontSize: 12,
  },

  pressed: {
    opacity: 0.6,
  },
})
