import { drizzle } from 'drizzle-orm/expo-sqlite/driver'
import * as SQLite from 'expo-sqlite'

export const expoDb = SQLite.openDatabaseSync('db.db')
const drizzleDb = drizzle(expoDb)

export default drizzleDb
