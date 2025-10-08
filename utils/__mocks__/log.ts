/* eslint-disable @typescript-eslint/no-empty-function */
const mockLog = {
  info: () => {},
  warning: () => {},
  error: () => {},
  debug: () => {},
  extend: () => mockLog,
  setSeverity: () => {},
}

export default mockLog