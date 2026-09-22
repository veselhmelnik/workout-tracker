import { BuiltInExerciseDefinition } from "@/types/entities";

export const BUILT_IN_EXERCISES: BuiltInExerciseDefinition[] = [
    // ============================================================
    // CHEST
    // ============================================================

    {
        sourceKey: 'barbell_bench_press',
        name: 'Barbell Bench Press',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'],
    },
    {
        sourceKey: 'dumbbell_bench_press',
        name: 'Dumbbell Bench Press',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'],
    },
    {
        sourceKey: 'incline_barbell_bench_press',
        name: 'Incline Barbell Bench Press',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['FRONT_DELTS', 'TRICEPS'],
    },
    {
        sourceKey: 'incline_dumbbell_press',
        name: 'Incline Dumbbell Press',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['FRONT_DELTS', 'TRICEPS'],
    },
    {
        sourceKey: 'decline_bench_press',
        name: 'Decline Bench Press',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'],
    },
    {
        sourceKey: 'machine_chest_press',
        name: 'Machine Chest Press',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'],
    },
    {
        sourceKey: 'dumbbell_fly',
        name: 'Dumbbell Fly',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'cable_fly',
        name: 'Cable Fly',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'pec_deck',
        name: 'Pec Deck',
        type: 'WEIGHTED',
        primaryMuscle: 'CHEST',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'push_up',
        name: 'Push Up',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['TRICEPS', 'FRONT_DELTS', 'CORE'],
    },
    {
        sourceKey: 'chest_dip',
        name: 'Chest Dip',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CHEST',
        secondaryMuscles: ['TRICEPS', 'FRONT_DELTS'],
    },

    // ============================================================
    // SHOULDERS
    // ============================================================

    {
        sourceKey: 'barbell_overhead_press',
        name: 'Barbell Overhead Press',
        type: 'WEIGHTED',
        primaryMuscle: 'FRONT_DELTS',
        secondaryMuscles: ['TRICEPS', 'SIDE_DELTS'],
    },
    {
        sourceKey: 'dumbbell_shoulder_press',
        name: 'Dumbbell Shoulder Press',
        type: 'WEIGHTED',
        primaryMuscle: 'FRONT_DELTS',
        secondaryMuscles: ['TRICEPS', 'SIDE_DELTS'],
    },
    {
        sourceKey: 'machine_shoulder_press',
        name: 'Machine Shoulder Press',
        type: 'WEIGHTED',
        primaryMuscle: 'FRONT_DELTS',
        secondaryMuscles: ['TRICEPS', 'SIDE_DELTS'],
    },
    {
        sourceKey: 'arnold_press',
        name: 'Arnold Press',
        type: 'WEIGHTED',
        primaryMuscle: 'FRONT_DELTS',
        secondaryMuscles: ['SIDE_DELTS', 'TRICEPS'],
    },
    {
        sourceKey: 'dumbbell_front_raise',
        name: 'Dumbbell Front Raise',
        type: 'WEIGHTED',
        primaryMuscle: 'FRONT_DELTS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'dumbbell_lateral_raise',
        name: 'Dumbbell Lateral Raise',
        type: 'WEIGHTED',
        primaryMuscle: 'SIDE_DELTS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'cable_lateral_raise',
        name: 'Cable Lateral Raise',
        type: 'WEIGHTED',
        primaryMuscle: 'SIDE_DELTS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'machine_lateral_raise',
        name: 'Machine Lateral Raise',
        type: 'WEIGHTED',
        primaryMuscle: 'SIDE_DELTS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'reverse_pec_deck',
        name: 'Reverse Pec Deck',
        type: 'WEIGHTED',
        primaryMuscle: 'REAR_DELTS',
        secondaryMuscles: ['TRAPS'],
    },
    {
        sourceKey: 'rear_delt_dumbbell_fly',
        name: 'Rear Delt Dumbbell Fly',
        type: 'WEIGHTED',
        primaryMuscle: 'REAR_DELTS',
        secondaryMuscles: ['TRAPS'],
    },
    {
        sourceKey: 'face_pull',
        name: 'Face Pull',
        type: 'WEIGHTED',
        primaryMuscle: 'REAR_DELTS',
        secondaryMuscles: ['TRAPS'],
    },

    // ============================================================
    // BACK
    // ============================================================

    {
        sourceKey: 'pull_up',
        name: 'Pull Up',
        type: 'BODYWEIGHT',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['BICEPS', 'TRAPS', 'FOREARMS'],
    },
    {
        sourceKey: 'chin_up',
        name: 'Chin Up',
        type: 'BODYWEIGHT',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['BICEPS', 'FOREARMS'],
    },
    {
        sourceKey: 'lat_pulldown',
        name: 'Lat Pulldown',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['BICEPS', 'FOREARMS'],
    },
    {
        sourceKey: 'close_grip_lat_pulldown',
        name: 'Close Grip Lat Pulldown',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['BICEPS'],
    },
    {
        sourceKey: 'straight_arm_pulldown',
        name: 'Straight Arm Pulldown',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'barbell_row',
        name: 'Barbell Row',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['TRAPS', 'BICEPS', 'REAR_DELTS'],
    },
    {
        sourceKey: 'dumbbell_row',
        name: 'One Arm Dumbbell Row',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['TRAPS', 'BICEPS'],
    },
    {
        sourceKey: 'seated_cable_row',
        name: 'Seated Cable Row',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['TRAPS', 'BICEPS', 'REAR_DELTS'],
    },
    {
        sourceKey: 'chest_supported_row',
        name: 'Chest Supported Row',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['TRAPS', 'BICEPS', 'REAR_DELTS'],
    },
    {
        sourceKey: 't_bar_row',
        name: 'T-Bar Row',
        type: 'WEIGHTED',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['TRAPS', 'BICEPS'],
    },
    {
        sourceKey: 'inverted_row',
        name: 'Inverted Row',
        type: 'BODYWEIGHT',
        primaryMuscle: 'LATS',
        secondaryMuscles: ['TRAPS', 'BICEPS', 'CORE'],
    },
    {
        sourceKey: 'barbell_shrug',
        name: 'Barbell Shrug',
        type: 'WEIGHTED',
        primaryMuscle: 'TRAPS',
        secondaryMuscles: ['FOREARMS'],
    },
    {
        sourceKey: 'dumbbell_shrug',
        name: 'Dumbbell Shrug',
        type: 'WEIGHTED',
        primaryMuscle: 'TRAPS',
        secondaryMuscles: ['FOREARMS'],
    },
    {
        sourceKey: 'back_extension',
        name: 'Back Extension',
        type: 'BODYWEIGHT',
        primaryMuscle: 'LOWER_BACK',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },
    {
        sourceKey: 'weighted_back_extension',
        name: 'Weighted Back Extension',
        type: 'WEIGHTED',
        primaryMuscle: 'LOWER_BACK',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },

    // ============================================================
    // BICEPS
    // ============================================================

    {
        sourceKey: 'barbell_curl',
        name: 'Barbell Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'BICEPS',
        secondaryMuscles: ['FOREARMS'],
    },
    {
        sourceKey: 'ez_bar_curl',
        name: 'EZ Bar Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'BICEPS',
        secondaryMuscles: ['FOREARMS'],
    },
    {
        sourceKey: 'dumbbell_curl',
        name: 'Dumbbell Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'BICEPS',
        secondaryMuscles: ['FOREARMS'],
    },
    {
        sourceKey: 'hammer_curl',
        name: 'Hammer Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'BICEPS',
        secondaryMuscles: ['FOREARMS'],
    },
    {
        sourceKey: 'incline_dumbbell_curl',
        name: 'Incline Dumbbell Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'BICEPS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'preacher_curl',
        name: 'Preacher Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'BICEPS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'cable_curl',
        name: 'Cable Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'BICEPS',
        secondaryMuscles: ['FOREARMS'],
    },

    // ============================================================
    // TRICEPS
    // ============================================================

    {
        sourceKey: 'triceps_pushdown',
        name: 'Triceps Pushdown',
        type: 'WEIGHTED',
        primaryMuscle: 'TRICEPS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'rope_triceps_pushdown',
        name: 'Rope Triceps Pushdown',
        type: 'WEIGHTED',
        primaryMuscle: 'TRICEPS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'overhead_triceps_extension',
        name: 'Overhead Triceps Extension',
        type: 'WEIGHTED',
        primaryMuscle: 'TRICEPS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'skull_crusher',
        name: 'Skull Crusher',
        type: 'WEIGHTED',
        primaryMuscle: 'TRICEPS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'close_grip_bench_press',
        name: 'Close Grip Bench Press',
        type: 'WEIGHTED',
        primaryMuscle: 'TRICEPS',
        secondaryMuscles: ['CHEST', 'FRONT_DELTS'],
    },
    {
        sourceKey: 'triceps_dip',
        name: 'Triceps Dip',
        type: 'BODYWEIGHT',
        primaryMuscle: 'TRICEPS',
        secondaryMuscles: ['CHEST', 'FRONT_DELTS'],
    },

    // ============================================================
    // FOREARMS
    // ============================================================

    {
        sourceKey: 'wrist_curl',
        name: 'Wrist Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'FOREARMS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'reverse_wrist_curl',
        name: 'Reverse Wrist Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'FOREARMS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'reverse_curl',
        name: 'Reverse Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'FOREARMS',
        secondaryMuscles: ['BICEPS'],
    },
    {
        sourceKey: 'farmers_walk',
        name: "Farmer's Walk",
        type: 'WEIGHTED',
        primaryMuscle: 'FOREARMS',
        secondaryMuscles: ['TRAPS', 'CORE'],
    },

    // ============================================================
    // QUADS
    // ============================================================

    {
        sourceKey: 'back_squat',
        name: 'Back Squat',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS', 'CORE'],
    },
    {
        sourceKey: 'front_squat',
        name: 'Front Squat',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'CORE'],
    },
    {
        sourceKey: 'leg_press',
        name: 'Leg Press',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },
    {
        sourceKey: 'hack_squat',
        name: 'Hack Squat',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES'],
    },
    {
        sourceKey: 'bulgarian_split_squat',
        name: 'Bulgarian Split Squat',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },
    {
        sourceKey: 'walking_lunge',
        name: 'Walking Lunge',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },
    {
        sourceKey: 'reverse_lunge',
        name: 'Reverse Lunge',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },
    {
        sourceKey: 'step_up',
        name: 'Step Up',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },
    {
        sourceKey: 'leg_extension',
        name: 'Leg Extension',
        type: 'WEIGHTED',
        primaryMuscle: 'QUADS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'bodyweight_squat',
        name: 'Bodyweight Squat',
        type: 'BODYWEIGHT',
        primaryMuscle: 'QUADS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS'],
    },

    // ============================================================
    // HAMSTRINGS
    // ============================================================

    {
        sourceKey: 'romanian_deadlift',
        name: 'Romanian Deadlift',
        type: 'WEIGHTED',
        primaryMuscle: 'HAMSTRINGS',
        secondaryMuscles: ['GLUTES', 'LOWER_BACK'],
    },
    {
        sourceKey: 'stiff_leg_deadlift',
        name: 'Stiff Leg Deadlift',
        type: 'WEIGHTED',
        primaryMuscle: 'HAMSTRINGS',
        secondaryMuscles: ['GLUTES', 'LOWER_BACK'],
    },
    {
        sourceKey: 'lying_leg_curl',
        name: 'Lying Leg Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'HAMSTRINGS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'seated_leg_curl',
        name: 'Seated Leg Curl',
        type: 'WEIGHTED',
        primaryMuscle: 'HAMSTRINGS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'nordic_hamstring_curl',
        name: 'Nordic Hamstring Curl',
        type: 'BODYWEIGHT',
        primaryMuscle: 'HAMSTRINGS',
        secondaryMuscles: ['GLUTES'],
    },

    // ============================================================
    // GLUTES
    // ============================================================

    {
        sourceKey: 'barbell_hip_thrust',
        name: 'Barbell Hip Thrust',
        type: 'WEIGHTED',
        primaryMuscle: 'GLUTES',
        secondaryMuscles: ['HAMSTRINGS'],
    },
    {
        sourceKey: 'glute_bridge',
        name: 'Glute Bridge',
        type: 'BODYWEIGHT',
        primaryMuscle: 'GLUTES',
        secondaryMuscles: ['HAMSTRINGS'],
    },
    {
        sourceKey: 'cable_kickback',
        name: 'Cable Kickback',
        type: 'WEIGHTED',
        primaryMuscle: 'GLUTES',
        secondaryMuscles: [],
    },

    // ============================================================
    // ADDUCTORS
    // ============================================================

    {
        sourceKey: 'hip_adduction_machine',
        name: 'Hip Adduction Machine',
        type: 'WEIGHTED',
        primaryMuscle: 'ADDUCTORS',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'sumo_squat',
        name: 'Sumo Squat',
        type: 'WEIGHTED',
        primaryMuscle: 'ADDUCTORS',
        secondaryMuscles: ['GLUTES', 'QUADS'],
    },
    {
        sourceKey: 'sumo_deadlift',
        name: 'Sumo Deadlift',
        type: 'WEIGHTED',
        primaryMuscle: 'ADDUCTORS',
        secondaryMuscles: ['GLUTES', 'HAMSTRINGS', 'LOWER_BACK'],
    },

    // ============================================================
    // CALVES
    // ============================================================

    {
        sourceKey: 'standing_calf_raise',
        name: 'Standing Calf Raise',
        type: 'WEIGHTED',
        primaryMuscle: 'CALVES',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'seated_calf_raise',
        name: 'Seated Calf Raise',
        type: 'WEIGHTED',
        primaryMuscle: 'CALVES',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'leg_press_calf_raise',
        name: 'Leg Press Calf Raise',
        type: 'WEIGHTED',
        primaryMuscle: 'CALVES',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'single_leg_calf_raise',
        name: 'Single Leg Calf Raise',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CALVES',
        secondaryMuscles: [],
    },

    // ============================================================
    // CORE
    // ============================================================

    {
        sourceKey: 'crunch',
        name: 'Crunch',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CORE',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'cable_crunch',
        name: 'Cable Crunch',
        type: 'WEIGHTED',
        primaryMuscle: 'CORE',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'hanging_leg_raise',
        name: 'Hanging Leg Raise',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CORE',
        secondaryMuscles: ['FOREARMS'],
    },
    {
        sourceKey: 'lying_leg_raise',
        name: 'Lying Leg Raise',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CORE',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'plank',
        name: 'Plank',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CORE',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'side_plank',
        name: 'Side Plank',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CORE',
        secondaryMuscles: [],
    },
    {
        sourceKey: 'ab_wheel_rollout',
        name: 'Ab Wheel Rollout',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CORE',
        secondaryMuscles: ['LATS'],
    },
    {
        sourceKey: 'russian_twist',
        name: 'Russian Twist',
        type: 'BODYWEIGHT',
        primaryMuscle: 'CORE',
        secondaryMuscles: [],
    },
]