export const toastAndLogError = jest.fn();

const mockLogError = jest.fn();

const logger = {
  extend: jest.fn(() => ({
    error: mockLogError,
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  })),
  error: mockLogError,
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  MOCK_LOG_ERROR: mockLogError,
};

export default logger;