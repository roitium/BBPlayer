// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from './0000_productive_joystick.sql'
import m0001 from './0001_fast_trauma.sql'
import m0002 from './0002_groovy_maximus.sql'
import m0003 from './0003_glamorous_psylocke.sql'
import m0004 from './0004_smiling_beast.sql'
import journal from './meta/_journal.json'

export default {
	journal,
	migrations: {
		m0000,
		m0001,
		m0002,
		m0003,
		m0004,
	},
}
