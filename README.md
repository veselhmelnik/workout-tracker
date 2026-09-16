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

| Workouts                   | Active Workout                   | History                   |
| -------------------------- | -------------------------------- | ------------------------- |
| <img width="428" height="917" alt="image" src="https://github.com/user-attachments/assets/ff54185f-4e75-4187-b37a-e99b47ce17d9" /> | <img width="437" height="922" alt="image" src="https://github.com/user-attachments/assets/3b22fc89-dad4-46a4-811f-59d4e64ec8d6" />|<img width="441" height="966" alt="image" src="https://github.com/user-attachments/assets/34677e2b-ba74-45e8-87eb-dd5277b5e8b9" /> |

| Exercises                   | Edit Workout                   | Exercise History                   |
| --------------------------- | ------------------------------ | ---------------------------------- |
| <img width="428" height="914" alt="image" src="https://github.com/user-attachments/assets/6d057f31-2854-4fbf-820a-018435082547" />| <img width="428" height="922" alt="image" src="https://github.com/user-attachments/assets/bef36594-c704-4523-b775-6505704223b9" /> | <img width="420" height="929" alt="image" src="https://github.com/user-attachments/assets/077eb2d3-bc0f-4fcf-bda8-f856d2e5ae63" />
 
 

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
