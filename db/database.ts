import * as SQLite from 'expo-sqlite'

export const dbPromise = SQLite.openDatabaseSync('workout-tracker.db')

