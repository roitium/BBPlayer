export const toastAndLogError = jest.fn()

const mockLogError = jest.fn()

const logger = {
	extend: jest.fn(() => ({
		error: mockLogError,
		debug: jest.fn(),
		info: jest.fn(),
		warning: jest.fn(),
	})),
	error: mockLogError,
	debug: jest.fn(),
	info: jest.fn(),
	warning: jest.fn(),
}

export default logger
