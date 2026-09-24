import { StyleSheet, View } from 'react-native'
import { Path, Svg } from 'react-native-svg'

/** Restrained brand red; the only place a brand colour appears. */
const YOUTUBE_RED = '#FF0033'

type YouTubeIconProps = {
  size?: number
}

/**
 * The YouTube play mark, drawn with the SVG library already used by the
 * progress chart. Kept small so it signals the destination without
 * dominating the row.
 */
export function YouTubeIcon({ size = 22 }: YouTubeIconProps) {
  return (
    <View style={styles.icon}>
      <Svg height={size * 0.7} viewBox="0 0 24 17" width={size}>
        <Path
          d="M23.5 2.65a3 3 0 0 0-2.11-2.12C19.5 0 12 0 12 0S4.5 0 2.61.53A3 3 0 0 0 .5 2.65 31.3 31.3 0 0 0 0 8.5a31.3 31.3 0 0 0 .5 5.85 3 3 0 0 0 2.11 2.12C4.5 17 12 17 12 17s7.5 0 9.39-.53a3 3 0 0 0 2.11-2.12A31.3 31.3 0 0 0 24 8.5a31.3 31.3 0 0 0-.5-5.85Z"
          fill={YOUTUBE_RED}
        />
        <Path d="M9.55 12.12 15.82 8.5 9.55 4.88v7.24Z" fill="#FFFFFF" />
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
})
