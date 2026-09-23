import {
  colors,
  fontSize,
  fonts,
  labelText,
  radius,
  spacing,
} from '@/constants/theme'
import { useState } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native'

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.sectionLabel}>{children}</Text>
}

/** Text input. Focus lifts the border; amber focus is kept for numeric set fields. */
export function TextField(props: TextInputProps) {
  const [isFocused, setIsFocused] = useState(false)

  return (
    <TextInput
      keyboardAppearance="dark"
      placeholderTextColor={colors.textPlaceholder}
      selectionColor={colors.textSecondary}
      {...props}
      onBlur={(event) => {
        setIsFocused(false)
        props.onBlur?.(event)
      }}
      onFocus={(event) => {
        setIsFocused(true)
        props.onFocus?.(event)
      }}
      style={[styles.input, isFocused && styles.inputFocused, props.style]}
    />
  )
}

type StepperProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  label: string
}

export function Stepper({
  value,
  onChange,
  min = 1,
  max = 20,
  label,
}: StepperProps) {
  return (
    <View style={styles.stepper}>
      <Pressable
        accessibilityLabel={`Decrease ${label}`}
        accessibilityRole="button"
        disabled={value <= min}
        onPress={() => onChange(value - 1)}
        style={({ pressed }) => [
          styles.stepperButton,
          pressed && styles.pressed,
          value <= min && styles.inactive,
        ]}
      >
        <Text style={styles.stepperButtonText}>−</Text>
      </Pressable>

      <View style={styles.stepperValue}>
        <Text style={styles.stepperValueText}>{value}</Text>
      </View>

      <Pressable
        accessibilityLabel={`Increase ${label}`}
        accessibilityRole="button"
        disabled={value >= max}
        onPress={() => onChange(value + 1)}
        style={({ pressed }) => [
          styles.stepperButton,
          pressed && styles.pressed,
          value >= max && styles.inactive,
        ]}
      >
        <Text style={styles.stepperButtonText}>+</Text>
      </Pressable>
    </View>
  )
}

type SegmentedProps<T extends string> = {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: SegmentedProps<T>) {
  return (
    <View style={styles.segmented}>
      {options.map((option) => {
        const isSelected = option.value === value

        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              isSelected && styles.segmentSelected,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.segmentText,
                isSelected && styles.segmentTextSelected,
              ]}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Note({ children }: { children: string }) {
  return (
    <View style={styles.note}>
      <Text style={styles.noteText}>{children}</Text>
    </View>
  )
}

export function Divider() {
  return <View style={styles.divider} />
}

const styles = StyleSheet.create({
  sectionLabel: {
    ...labelText,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  input: {
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: fontSize.input,
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: spacing.sm,
  },

  inputFocused: {
    borderColor: colors.borderStrong,
  },

  stepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },

  stepperButton: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },

  stepperButtonText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '600',
  },

  stepperValue: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    height: 48,
    justifyContent: 'center',
  },

  stepperValueText: {
    color: colors.textPrimary,
    fontFamily: fonts.mono,
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },

  segmented: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 3,
    padding: 3,
  },

  segment: {
    alignItems: 'center',
    borderRadius: 6,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
  },

  segmentSelected: {
    backgroundColor: colors.selected,
  },

  segmentText: {
    color: colors.textSecondary,
    fontSize: 14,
  },

  segmentTextSelected: {
    color: colors.textPrimary,
    fontWeight: '600',
  },


  note: {
    backgroundColor: colors.strip,
    borderColor: colors.divider,
    borderLeftColor: colors.referenceRule,
    borderLeftWidth: 3,
    borderRadius: radius.md,
    borderWidth: 1,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },

  noteText: {
    color: colors.textMuted,
    fontSize: fontSize.meta,
    lineHeight: 19,
  },

  divider: {
    backgroundColor: colors.divider,
    height: 1,
    marginVertical: spacing.lg,
  },

  pressed: {
    opacity: 0.7,
  },

  inactive: {
    opacity: 0.4,
  },
})
