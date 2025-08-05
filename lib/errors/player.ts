import { CustomError } from '.'

export class PlayerError extends CustomError {}

export class UnknownSourceError extends PlayerError {}

export class AudioUrlNotFoundError extends PlayerError {}
