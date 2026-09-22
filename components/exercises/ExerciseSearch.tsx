import { colors, fontSize, radius } from '@/constants/theme'
import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

type ExerciseSearchProps = {
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
}

export function ExerciseSearch({
  value,
  onChangeText,
  placeholder = 'Search exercises',
}: ExerciseSearchProps) {
  const [isFocused, setIsFocused] = useState(false)
  const isActive = isFocused || value.length > 0

  return (
    <View style={[styles.field, isActive && styles.fieldActive]}>
      <SearchGlyph isActive={isActive} />

      <TextInput
        accessibilityLabel={placeholder}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardAppearance="dark"
        onBlur={() => setIsFocused(false)}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        selectionColor={colors.textSecondary}
        style={styles.input}
        value={value}
      />

      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear search"
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => onChangeText('')}
          style={styles.clear}
        >
          <Text style={styles.clearLabel}>×</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

/** Magnifier drawn with Views; the project has no icon dependency. */
function SearchGlyph({ isActive }: { isActive: boolean }) {
  const color = isActive ? colors.textSecondary : colors.textMuted

  return (
    <View style={styles.glyph}>
      <View style={[styles.glyphLens, { borderColor: color }]} />
      <View style={[styles.glyphHandle, { backgroundColor: color }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  field: {
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    height: 46,
    paddingHorizontal: 13,
  },

  fieldActive: {
    backgroundColor: colors.activeFocusFill,
    borderColor: colors.borderStrong,
  },

  input: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: fontSize.body,
    height: '100%',
    paddingVertical: 0,
  },

  clear: {
    alignItems: 'center',
    backgroundColor: colors.borderStrong,
    borderRadius: 10,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },

  clearLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 16,
  },

  glyph: {
    height: 16,
    width: 16,
  },

  glyphLens: {
    borderRadius: 6,
    borderWidth: 2,
    height: 12,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 12,
  },

  glyphHandle: {
    borderRadius: 1,
    height: 2,
    left: 9.5,
    position: 'absolute',
    top: 12,
    transform: [{ rotate: '45deg' }],
    width: 6,
  },
})
