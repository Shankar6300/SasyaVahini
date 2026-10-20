/**
 * SasyaVahini — Structured Logger
 * Uses Winston. All modules import this logger instead of console.log.
 */
const { createLogger, format, transports } = require('winston');

const { combine, timestamp, errors, json, colorize, printf } = format;

const isProduction = process.env.NODE_ENV === 'production';

const devFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  let line = `${ts} [${level}] ${message}`;
  if (stack) line += `\n${stack}`;
  if (Object.keys(meta).length) line += `\n${JSON.stringify(meta, null, 2)}`;
  return line;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    isProduction ? json() : combine(colorize(), devFormat),
  ),
  transports: [
    new transports.Console(),
    ...(isProduction
      ? [
          new transports.File({ filename: 'logs/error.log', level: 'error' }),
          new transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
});

module.exports = logger;
