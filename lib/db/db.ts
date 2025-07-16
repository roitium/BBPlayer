import { drizzle } from 'drizzle-orm/expo-sqlite/driver'
import * as SQLite from 'expo-sqlite'
import * as schema from './schema'

export const expoDb = SQLite.openDatabaseSync('db.db', {
	enableChangeListener: true,
})
const drizzleDb = drizzle<typeof schema>(expoDb, { schema })

export default drizzleDb
