/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-return */
import { jest } from '@jest/globals'

const db = {
  transaction: jest.fn(async (callback) => await callback(db)),
}

export default db as any