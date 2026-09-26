import type { ImageSourcePropType } from 'react-native'

/**
 * Built-in exercise artwork, keyed by `exercises.source_key`.
 *
 * The only place illustrations are required. Metro resolves `require` at build
 * time, so every path must be a literal — a template string would silently
 * bundle nothing. Keys come from data/builtInExercises.ts and match the
 * exported filenames one to one; never match on display name, which the user
 * can change and which custom exercises can duplicate.
 *
 * All 87 built-ins are covered. scripts/verify-exercise-illustrations.mjs
 * fails the build if this map and the seed ever drift apart, so a new built-in
 * exercise cannot ship without its asset.
 */
const ILLUSTRATIONS: Record<string, ImageSourcePropType> = {
  ab_wheel_rollout: require('@/assets/illustrations/exercises/ab_wheel_rollout.webp'),
  arnold_press: require('@/assets/illustrations/exercises/arnold_press.webp'),
  back_extension: require('@/assets/illustrations/exercises/back_extension.webp'),
  back_squat: require('@/assets/illustrations/exercises/back_squat.webp'),
  barbell_bench_press: require('@/assets/illustrations/exercises/barbell_bench_press.webp'),
  barbell_curl: require('@/assets/illustrations/exercises/barbell_curl.webp'),
  barbell_hip_thrust: require('@/assets/illustrations/exercises/barbell_hip_thrust.webp'),
  barbell_overhead_press: require('@/assets/illustrations/exercises/barbell_overhead_press.webp'),
  barbell_row: require('@/assets/illustrations/exercises/barbell_row.webp'),
  barbell_shrug: require('@/assets/illustrations/exercises/barbell_shrug.webp'),
  bodyweight_squat: require('@/assets/illustrations/exercises/bodyweight_squat.webp'),
  bulgarian_split_squat: require('@/assets/illustrations/exercises/bulgarian_split_squat.webp'),
  cable_crunch: require('@/assets/illustrations/exercises/cable_crunch.webp'),
  cable_curl: require('@/assets/illustrations/exercises/cable_curl.webp'),
  cable_fly: require('@/assets/illustrations/exercises/cable_fly.webp'),
  cable_kickback: require('@/assets/illustrations/exercises/cable_kickback.webp'),
  cable_lateral_raise: require('@/assets/illustrations/exercises/cable_lateral_raise.webp'),
  chest_dip: require('@/assets/illustrations/exercises/chest_dip.webp'),
  chest_supported_row: require('@/assets/illustrations/exercises/chest_supported_row.webp'),
  chin_up: require('@/assets/illustrations/exercises/chin_up.webp'),
  close_grip_bench_press: require('@/assets/illustrations/exercises/close_grip_bench_press.webp'),
  close_grip_lat_pulldown: require('@/assets/illustrations/exercises/close_grip_lat_pulldown.webp'),
  crunch: require('@/assets/illustrations/exercises/crunch.webp'),
  decline_bench_press: require('@/assets/illustrations/exercises/decline_bench_press.webp'),
  dumbbell_bench_press: require('@/assets/illustrations/exercises/dumbbell_bench_press.webp'),
  dumbbell_curl: require('@/assets/illustrations/exercises/dumbbell_curl.webp'),
  dumbbell_fly: require('@/assets/illustrations/exercises/dumbbell_fly.webp'),
  dumbbell_front_raise: require('@/assets/illustrations/exercises/dumbbell_front_raise.webp'),
  dumbbell_lateral_raise: require('@/assets/illustrations/exercises/dumbbell_lateral_raise.webp'),
  dumbbell_row: require('@/assets/illustrations/exercises/dumbbell_row.webp'),
  dumbbell_shoulder_press: require('@/assets/illustrations/exercises/dumbbell_shoulder_press.webp'),
  dumbbell_shrug: require('@/assets/illustrations/exercises/dumbbell_shrug.webp'),
  ez_bar_curl: require('@/assets/illustrations/exercises/ez_bar_curl.webp'),
  face_pull: require('@/assets/illustrations/exercises/face_pull.webp'),
  farmers_walk: require('@/assets/illustrations/exercises/farmers_walk.webp'),
  front_squat: require('@/assets/illustrations/exercises/front_squat.webp'),
  glute_bridge: require('@/assets/illustrations/exercises/glute_bridge.webp'),
  hack_squat: require('@/assets/illustrations/exercises/hack_squat.webp'),
  hammer_curl: require('@/assets/illustrations/exercises/hammer_curl.webp'),
  hanging_leg_raise: require('@/assets/illustrations/exercises/hanging_leg_raise.webp'),
  hip_adduction_machine: require('@/assets/illustrations/exercises/hip_adduction_machine.webp'),
  incline_barbell_bench_press: require('@/assets/illustrations/exercises/incline_barbell_bench_press.webp'),
  incline_dumbbell_curl: require('@/assets/illustrations/exercises/incline_dumbbell_curl.webp'),
  incline_dumbbell_press: require('@/assets/illustrations/exercises/incline_dumbbell_press.webp'),
  inverted_row: require('@/assets/illustrations/exercises/inverted_row.webp'),
  lat_pulldown: require('@/assets/illustrations/exercises/lat_pulldown.webp'),
  leg_extension: require('@/assets/illustrations/exercises/leg_extension.webp'),
  leg_press: require('@/assets/illustrations/exercises/leg_press.webp'),
  leg_press_calf_raise: require('@/assets/illustrations/exercises/leg_press_calf_raise.webp'),
  lying_leg_curl: require('@/assets/illustrations/exercises/lying_leg_curl.webp'),
  lying_leg_raise: require('@/assets/illustrations/exercises/lying_leg_raise.webp'),
  machine_chest_press: require('@/assets/illustrations/exercises/machine_chest_press.webp'),
  machine_lateral_raise: require('@/assets/illustrations/exercises/machine_lateral_raise.webp'),
  machine_shoulder_press: require('@/assets/illustrations/exercises/machine_shoulder_press.webp'),
  nordic_hamstring_curl: require('@/assets/illustrations/exercises/nordic_hamstring_curl.webp'),
  overhead_triceps_extension: require('@/assets/illustrations/exercises/overhead_triceps_extension.webp'),
  pec_deck: require('@/assets/illustrations/exercises/pec_deck.webp'),
  plank: require('@/assets/illustrations/exercises/plank.webp'),
  preacher_curl: require('@/assets/illustrations/exercises/preacher_curl.webp'),
  pull_up: require('@/assets/illustrations/exercises/pull_up.webp'),
  push_up: require('@/assets/illustrations/exercises/push_up.webp'),
  rear_delt_dumbbell_fly: require('@/assets/illustrations/exercises/rear_delt_dumbbell_fly.webp'),
  reverse_curl: require('@/assets/illustrations/exercises/reverse_curl.webp'),
  reverse_lunge: require('@/assets/illustrations/exercises/reverse_lunge.webp'),
  reverse_pec_deck: require('@/assets/illustrations/exercises/reverse_pec_deck.webp'),
  reverse_wrist_curl: require('@/assets/illustrations/exercises/reverse_wrist_curl.webp'),
  romanian_deadlift: require('@/assets/illustrations/exercises/romanian_deadlift.webp'),
  rope_triceps_pushdown: require('@/assets/illustrations/exercises/rope_triceps_pushdown.webp'),
  russian_twist: require('@/assets/illustrations/exercises/russian_twist.webp'),
  seated_cable_row: require('@/assets/illustrations/exercises/seated_cable_row.webp'),
  seated_calf_raise: require('@/assets/illustrations/exercises/seated_calf_raise.webp'),
  seated_leg_curl: require('@/assets/illustrations/exercises/seated_leg_curl.webp'),
  side_plank: require('@/assets/illustrations/exercises/side_plank.webp'),
  single_leg_calf_raise: require('@/assets/illustrations/exercises/single_leg_calf_raise.webp'),
  skull_crusher: require('@/assets/illustrations/exercises/skull_crusher.webp'),
  standing_calf_raise: require('@/assets/illustrations/exercises/standing_calf_raise.webp'),
  step_up: require('@/assets/illustrations/exercises/step_up.webp'),
  stiff_leg_deadlift: require('@/assets/illustrations/exercises/stiff_leg_deadlift.webp'),
  straight_arm_pulldown: require('@/assets/illustrations/exercises/straight_arm_pulldown.webp'),
  sumo_deadlift: require('@/assets/illustrations/exercises/sumo_deadlift.webp'),
  sumo_squat: require('@/assets/illustrations/exercises/sumo_squat.webp'),
  t_bar_row: require('@/assets/illustrations/exercises/t_bar_row.webp'),
  triceps_dip: require('@/assets/illustrations/exercises/triceps_dip.webp'),
  triceps_pushdown: require('@/assets/illustrations/exercises/triceps_pushdown.webp'),
  walking_lunge: require('@/assets/illustrations/exercises/walking_lunge.webp'),
  weighted_back_extension: require('@/assets/illustrations/exercises/weighted_back_extension.webp'),
  wrist_curl: require('@/assets/illustrations/exercises/wrist_curl.webp'),
}

/**
 * The illustration for an exercise, or null when none is mapped.
 *
 * Custom exercises have a null source_key and so never have artwork, which is
 * the correct outcome rather than a special case. Callers render nothing at
 * all for null — no tile and no reserved width — so an unmapped built-in
 * degrades to the text-only row rather than a broken image.
 */
export function getExerciseIllustration(
  sourceKey: string | null,
): ImageSourcePropType | null {
  if (!sourceKey) {
    return null
  }

  return ILLUSTRATIONS[sourceKey] ?? null
}
