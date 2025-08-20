import type { Config } from 'drizzle-kit'
export default {
	schema: './lib/db/schema.ts',
	out: './drizzle',
	dialect: 'sqlite',
	driver: 'expo',
} satisfies Config
