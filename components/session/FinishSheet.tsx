import { Button } from '@/components/ui/Button'
import { colors, fontSize, fonts, radius, spacing } from '@/constants/theme'
import { formatDuration } from '@/utils/sessionFormat'
import { StyleSheet, Text, View } from 'react-native'
import { BottomSheet } from '@/components/ui/BottomSheet'

export type FinishSummary = {
  elapsedMs: number
  totalExercises: number
  workedExercises: number
  recordedSets: number
  emptyExercises: number
}

type FinishSheetProps = {
  visible: boolean
  summary: FinishSummary
  isFinishing: boolean
  onConfirm: () => void
  onClose: () => void
}

export function FinishSheet({
  visible,
  summary,
  isFinishing,
  onConfirm,
  onClose,
}: FinishSheetProps) {
  return (
    <BottomSheet onClose={onClose} visible={visible}>
      <Text style={styles.title}>Finish workout?</Text>

      {summary.emptyExercises > 0 ? (
        <Text style={styles.warning}>
          {summary.emptyExercises === 1
            ? '1 exercise has no recorded sets. It will be saved as skipped.'
            : `${summary.emptyExercises} exercises have no recorded sets. They will be saved as skipped.`}
        </Text>
      ) : null}

      <View style={styles.stats}>
        <Stat label="DURATION" value={formatDuration(summary.elapsedMs)} />
        <Stat
          label="EXERCISES"
          value={`${summary.workedExercises} / ${summary.totalExercises}`}
        />
        <Stat label="SETS" value={String(summary.recordedSets)} />
      </View>

      <Button
        busy={isFinishing}
        label="Finish Workout"
        onPress={onConfirm}
      />

      <View style={styles.secondary}>
        <Button
          disabled={isFinishing}
          label="Keep Going"
          onPress={onClose}
          variant="secondary"
        />
      </View>
    </BottomSheet>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  title: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },

  warning: {
    backgroundColor: colors.strip,
    borderColor: colors.divider,
    borderLeftColor: colors.textMuted,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: spacing.xs,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },

  stats: {
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    marginBottom: spacing.lg,
    paddingVertical: 14,
  },

  stat: {
    flex: 1,
    gap: spacing.xs,
  },

  statLabel: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 1.3,
  },

  statValue: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: fontSize.data,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  secondary: {
    marginTop: spacing.sm,
  },
})
