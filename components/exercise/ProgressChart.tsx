import { colors, fonts } from '@/constants/theme'
import {
  buildChartLabels,
  getChartDomain,
  getChartGridValues,
  getChartLabelIndexes,
  mapPointsToCoordinates,
  type ExerciseProgressPoint,
} from '@/utils/exerciseProgress'
import { useMemo } from 'react'
import { View } from 'react-native'
import {
  Circle,
  Line,
  Polyline,
  Svg,
  Text as SvgText,
} from 'react-native-svg'

const CHART_HEIGHT = 128
/** Keeps the first and last markers inside the card. */
const HORIZONTAL_INSET = 8
/** Invisible, finger-sized target around each small marker. */
const TOUCH_RADIUS = 16
/** Room under the plot for one row of x-axis labels. */
const LABEL_BAND_HEIGHT = 18

type ProgressChartProps = {
  points: ExerciseProgressPoint[]
  /** Width of the plot area, measured by the parent. */
  width: number
  selectedId: string | null
  onSelectPoint: (point: ExerciseProgressPoint) => void
}

export function ProgressChart({
  points,
  width,
  selectedId,
  onSelectPoint,
}: ProgressChartProps) {
  const geometry = useMemo(() => {
    const values = points.map((point) => point.value)
    const domain = getChartDomain(values)

    return {
      domain,
      positions: mapPointsToCoordinates(
        values,
        domain,
        Math.max(0, width - HORIZONTAL_INSET * 2),
        CHART_HEIGHT,
      ),
      gridValues: getChartGridValues(domain),
      labels: buildChartLabels(points, getChartLabelIndexes(points.length)),
    }
  }, [points, width])

  if (width <= 0) {
    return <View style={{ height: CHART_HEIGHT + LABEL_BAND_HEIGHT }} />
  }

  return (
    <View>
      <Svg height={CHART_HEIGHT + LABEL_BAND_HEIGHT} width={width}>
        {/* Restrained reference levels, no axis furniture. */}
        {geometry.gridValues.map((value) => {
          const y =
            CHART_HEIGHT -
            ((value - geometry.domain.min) /
              (geometry.domain.max - geometry.domain.min || 1)) *
              CHART_HEIGHT

          return (
            <Line
              key={value}
              stroke={colors.divider}
              strokeWidth={1}
              x1={0}
              x2={width}
              y1={y}
              y2={y}
            />
          )
        })}

        {points.length > 1 ? (
          <Polyline
            fill="none"
            points={geometry.positions
              .map((position) => `${position.x + HORIZONTAL_INSET},${position.y}`)
              .join(' ')}
            stroke={colors.textSecondary}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        ) : null}

        {points.map((point, index) => {
          const position = geometry.positions[index]
          const x = position.x + HORIZONTAL_INSET
          const isSelected = point.sessionExerciseId === selectedId

          return (
            <Circle
              cx={x}
              cy={position.y}
              fill={point.isPr ? colors.success : colors.textSecondary}
              key={point.sessionExerciseId}
              r={isSelected ? 5 : 3.5}
              stroke={colors.background}
              strokeWidth={isSelected ? 2 : 0}
            />
          )
        })}

        {/* Transparent hit targets on top, so small markers stay tappable. */}
        {points.map((point, index) => (
          <Circle
            cx={geometry.positions[index].x + HORIZONTAL_INSET}
            cy={geometry.positions[index].y}
            fill="transparent"
            key={`touch-${point.sessionExerciseId}`}
            onPress={() => onSelectPoint(point)}
            r={TOUCH_RADIUS}
          />
        ))}
        {/* Anchoring keeps the first and last labels inside the plot without
            per-screen padding guesses. */}
        {geometry.labels.map((label) => (
          <SvgText
            fill={colors.textMuted}
            fontFamily={fonts.mono}
            fontSize={10.5}
            key={points[label.index].sessionExerciseId}
            textAnchor={label.anchor}
            x={
              label.anchor === 'start'
                ? 0
                : label.anchor === 'end'
                  ? width
                  : geometry.positions[label.index].x + HORIZONTAL_INSET
            }
            y={CHART_HEIGHT + LABEL_BAND_HEIGHT - 4}
          >
            {label.text}
          </SvgText>
        ))}
      </Svg>
    </View>
  )
}

