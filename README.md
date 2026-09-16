# Workout Tracker

A local-first mobile workout tracking app built with React Native and Expo.

The app is designed for people who already have a training program and want a fast way to record workout results, review previous performance, and track progression without relying on cloud services.

The core workflow is simple:

- create workout templates
- start a workout session
- see previous exercise results
- record today's weight and reps
- finish the session
- review workout history

The app works fully offline using SQLite.

## Features

### Workout Templates

- Create and edit workouts
- Add exercises to a workout
- Configure sets and rep ranges
- Reorder exercises
- Archive workouts
- Continue an unfinished workout session

### Exercise Library

- Create custom exercises
- Weighted and bodyweight exercise types
- Group exercises by target muscle
- Search exercises
- Archive exercises without breaking existing history

### Active Workout

- One exercise per screen
- Swipe between exercises
- Workout timer
- Pause and resume
- Previous result preview
- Previous weight prefill
- Add and remove sets
- Skip and restore exercises
- Weighted and bodyweight input modes
- Recent exercise results
- Autosaved workout progress
- Finish workout confirmation

### History

- Select a workout and review recent performance
- See up to three recent results per exercise
- Open complete exercise history
- Preserve actual set-by-set results when weights differ

## Screenshots

Add screenshots from the final Android build here.

Recommended layout:

| Workouts                   | Active Workout                   | History                   |
| -------------------------- | -------------------------------- | ------------------------- |
| `screenshots/workouts.png` | `screenshots/active-workout.png` | `screenshots/history.png` |

| Exercises                   | Edit Workout                   | Exercise History                   |
| --------------------------- | ------------------------------ | ---------------------------------- |
| `screenshots/exercises.png` | `screenshots/edit-workout.png` | `screenshots/exercise-history.png` |

## Tech Stack

- React Native
- Expo
- TypeScript
- Expo Router
- Expo SQLite
- Expo Crypto

## Architecture

The project uses a simple layered architecture.

```text
app/
  routes and screens

components/
  reusable UI components

repositories/
  application-facing data access layer

db/
  SQLite database setup and migrations

hooks/
  reusable React hooks

types/
  shared TypeScript entities

utils/
  formatting and helper functions

constants/
  design tokens and shared constants
```
