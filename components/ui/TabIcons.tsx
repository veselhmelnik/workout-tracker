import { StyleSheet, View, type ColorValue } from 'react-native'

// Simple stroke icons for the tab bar, drawn with Views because the project
// has no SVG or icon-font dependency.

type IconProps = { color: ColorValue }

export function WorkoutIcon({ color }: IconProps) {
  return (
    <View style={styles.box}>
      <View style={styles.dumbbell}>
        <View style={[styles.stroke, styles.plateSmall, { backgroundColor: color }]} />
        <View style={[styles.stroke, styles.plateLarge, { backgroundColor: color }]} />
        <View style={[styles.handle, { backgroundColor: color }]} />
        <View style={[styles.stroke, styles.plateLarge, { backgroundColor: color }]} />
        <View style={[styles.stroke, styles.plateSmall, { backgroundColor: color }]} />
      </View>
    </View>
  )
}

export function ExercisesIcon({ color }: IconProps) {
  return (
    <View style={styles.box}>
      <View style={styles.lines}>
        <View style={[styles.line, { backgroundColor: color, width: 16 }]} />
        <View style={[styles.line, { backgroundColor: color, width: 16 }]} />
        <View style={[styles.line, { backgroundColor: color, width: 10 }]} />
      </View>
    </View>
  )
}

export function HistoryIcon({ color }: IconProps) {
  return (
    <View style={styles.box}>
      <View style={[styles.clock, { borderColor: color }]}>
        <View style={[styles.hourHand, { backgroundColor: color }]} />
        <View style={[styles.minuteHand, { backgroundColor: color }]} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 22,
  },

  dumbbell: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 1,
  },

  stroke: {
    borderRadius: 1,
    width: 2,
  },

  plateSmall: {
    height: 6,
  },

  plateLarge: {
    height: 10,
  },

  handle: {
    height: 2,
    width: 7,
  },

  lines: {
    alignItems: 'flex-start',
    gap: 3,
  },

  line: {
    borderRadius: 1,
    height: 2,
  },

  clock: {
    borderRadius: 8,
    borderWidth: 1.9,
    height: 16,
    width: 16,
  },

  hourHand: {
    borderRadius: 1,
    height: 5,
    left: 5.1,
    position: 'absolute',
    top: 2,
    width: 1.9,
  },

  minuteHand: {
    borderRadius: 1,
    height: 1.9,
    left: 5.1,
    position: 'absolute',
    top: 6.1,
    width: 4,
  },
})
