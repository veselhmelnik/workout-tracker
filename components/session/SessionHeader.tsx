import { colors, fontSize, fonts, spacing } from '@/constants/theme'
import { formatDuration } from '@/utils/sessionFormat'
import { Pressable, StyleSheet, Text, View } from 'react-native'

type SessionHeaderProps = {
  index: number
  total: number
  elapsedMs: number
  isPaused: boolean
  onPrevious: () => void
  onNext: () => void
  onTogglePause: () => void
  onFinish: () => void
}

export function SessionHeader({
  index,
  total,
  elapsedMs,
  isPaused,
  onPrevious,
  onNext,
  onTogglePause,
  onFinish,
}: SessionHeaderProps) {
  const canGoBack = index > 0
  const canGoForward = index < total - 1

  return (
    <View style={styles.container}>
      <View style={styles.pager}>
        <Pressable
          accessibilityLabel="Previous exercise"
          accessibilityRole="button"
          disabled={!canGoBack}
          onPress={onPrevious}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Text style={[styles.arrow, !canGoBack && styles.arrowDisabled]}>
            ‹
          </Text>
        </Pressable>

        <Text style={styles.position}>
          {total === 0 ? '0 / 0' : `${index + 1} / ${total}`}
        </Text>

        <Pressable
          accessibilityLabel="Next exercise"
          accessibilityRole="button"
          disabled={!canGoForward}
          onPress={onNext}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <Text style={[styles.arrow, !canGoForward && styles.arrowDisabled]}>
            ›
          </Text>
        </Pressable>
      </View>

      <View
        accessibilityLabel={`${isPaused ? 'Paused, ' : ''}elapsed ${formatDuration(elapsedMs)}`}
        style={styles.timerGroup}
      >
        {isPaused ? (
          <Text style={styles.pausedLabel}>PAUSED</Text>
        ) : (
          <View style={styles.runningDot} />
        )}

        <Text style={[styles.timer, isPaused && styles.timerPaused]}>
          {formatDuration(elapsedMs)}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={isPaused ? 'Resume workout' : 'Pause workout'}
          accessibilityRole="button"
          onPress={onTogglePause}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          {isPaused ? <ResumeGlyph /> : <PauseGlyph />}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={onFinish}
          style={({ pressed }) => [styles.finishButton, pressed && styles.pressed]}
        >
          <Text style={styles.finishLabel}>Finish</Text>
        </Pressable>
      </View>
    </View>
  )
}

function PauseGlyph() {
  return (
    <View style={styles.glyph}>
      <View style={styles.pauseBar} />
      <View style={styles.pauseBar} />
    </View>
  )
}

function ResumeGlyph() {
  return (
    <View style={styles.glyph}>
      <View style={styles.playTriangle} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.sessionBar,
    borderBottomColor: colors.divider,
    borderBottomWidth: 1,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },

  pager: {
    alignItems: 'center',
    flexDirection: 'row',
  },

  iconButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 36,
  },

  arrow: {
    color: colors.textSecondary,
    fontSize: 22,
    lineHeight: 26,
  },

  arrowDisabled: {
    color: colors.textEmpty,
  },

  position: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    minWidth: 44,
    textAlign: 'center',
  },

  timerGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
  },

  runningDot: {
    backgroundColor: colors.active,
    borderRadius: 3,
    height: 6,
    width: 6,
  },

  pausedLabel: {
    color: colors.activeText,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.4,
  },

  timer: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: fontSize.dataInput,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  timerPaused: {
    color: colors.textSecondary,
  },

  actions: {
    alignItems: 'center',
    flexDirection: 'row',
  },

  finishButton: {
    height: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },

  finishLabel: {
    color: colors.textPrimary,
    fontSize: 14.5,
    fontWeight: '600',
  },

  glyph: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 3,
    height: 14,
    justifyContent: 'center',
    width: 14,
  },

  pauseBar: {
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
    height: 10,
    width: 3.5,
  },

  playTriangle: {
    borderBottomColor: 'transparent',
    borderBottomWidth: 6,
    borderLeftColor: colors.activeText,
    borderLeftWidth: 10,
    borderTopColor: 'transparent',
    borderTopWidth: 6,
    height: 0,
    marginLeft: 2,
    width: 0,
  },

  pressed: {
    opacity: 0.6,
  },
})
