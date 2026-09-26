import { getExerciseIllustration } from '@/constants/exerciseIllustrations'
import { colors } from '@/constants/theme'
import { Image, StyleSheet, View } from 'react-native'

/**
 * thumbnail — 72 × 54, list rows and pickers.
 * details   — 136 × 102, beside the Exercise Details title block.
 *
 * Both are 4:3, matching the 480 × 360 masters, so the art never distorts.
 */
export type ExerciseIllustrationVariant = 'thumbnail' | 'details'

const SIZES: Record<
  ExerciseIllustrationVariant,
  { width: number; height: number; radius: number }
> = {
  thumbnail: { width: 72, height: 54, radius: 8 },
  details: { width: 136, height: 102, radius: 10 },
}

type ExerciseIllustrationProps = {
  /** exercises.source_key; null for custom exercises. */
  sourceKey: string | null
  variant?: ExerciseIllustrationVariant
}

/**
 * Renders nothing at all when no artwork is mapped — no tile, no reserved
 * width. Only 8 of 87 built-ins are drawn, so an empty tile read as a broken
 * image on device; an undrawn exercise instead keeps the text-only layout the
 * app had before illustrations, and the parent's flex gap collapses with it.
 *
 * Decorative when present: every surface already announces the exercise name
 * in text, and the art adds nothing a screen reader needs, so it is hidden
 * from accessibility rather than repeating the name.
 */
export function ExerciseIllustration({
  sourceKey,
  variant = 'thumbnail',
}: ExerciseIllustrationProps) {
  const source = getExerciseIllustration(sourceKey)

  if (!source) {
    return null
  }

  const size = SIZES[variant]

  return (
    <View
      accessible={false}
      style={[
        styles.tile,
        {
          width: size.width,
          height: size.height,
          borderRadius: size.radius,
        },
      ]}
    >
      <Image
        accessibilityElementsHidden
        importantForAccessibility="no"
        // The master has transparent padding built in, so contain keeps the
        // figure at its drawn scale instead of cropping it to the tile.
        resizeMode="contain"
        source={source}
        style={styles.image}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    // Never absorbs the row's shrink: the art keeps its 4:3 box and the text
    // column truncates instead.
    flexShrink: 0,
    overflow: 'hidden',
  },

  image: {
    height: '100%',
    width: '100%',
  },
})
