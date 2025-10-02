// This file is required for Expo/React Native SQLite migrations - https://orm.drizzle.team/quick-sqlite/expo

import m0000 from './0000_productive_joystick.sql'
import m0001 from './0001_fast_trauma.sql'
import m0002 from './0002_groovy_maximus.sql'
import m0003 from './0003_glamorous_psylocke.sql'
import m0004 from './0004_smiling_beast.sql'
import m0005 from './0005_spotty_exiles.sql'
import m0006 from './0006_breezy_jigsaw.sql'
import m0007 from './0007_legal_thor.sql'
import m0008 from './0008_overrated_jimmy_woo.sql'
import m0009 from './0009_lethal_marten_broadcloak.sql'
import m0010 from './0010_brainy_anita_blake.sql'
import m0011 from './0011_grey_echo.sql'
import journal from './meta/_journal.json'

export default {
	journal,
	migrations: {
		m0000,
		m0001,
		m0002,
		m0003,
		m0004,
		m0005,
		m0006,
		m0007,
		m0008,
		m0009,
		m0010,
		m0011,
	},
}
