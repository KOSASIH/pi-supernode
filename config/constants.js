// constants.js

/**
 * @description Constants and utility functions for pi-node
 * @author [Your Name]
 * @version 1.0.0
 */

// Environment variables
export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_URL: process.env.API_URL || 'https://api.pi-node.io'
}

// API endpoints
export const ENDPOINTS = {
  PI_STATUS: `${ENV.API_URL}/pi/status`,
  PI_DATA: `${ENV.API_URL}/pi/data`
}

// Error codes and messages
export const ERROR_CODES = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not Found',
  500: 'Internal Server Error'
}

// Utility functions
export const isDevMode = () => ENV.NODE_ENV === 'development'

export const getErrorMessage = (errorCode) =>
  ERROR_CODES[errorCode] || 'Unknown Error'

export const formatPiData = (data) => ({
  temperature: data.temperature.toFixed(2),
  humidity: data.humidity.toFixed(2),
  pressure: data.pressure.toFixed(2)
})

// Cryptographic constants (for secure data transmission)
export const CRYPTO = {
  ALGORITHM: 'aes-256-cbc',
  KEY: process.env.CRYPTO_KEY || 'ecret-key',
  IV: process.env.CRYPTO_IV || 'initialization-vector'
}

// Advanced math constants (for scientific calculations)
export const MATH = {
  PI: 3.14159265359,
  E: 2.71828182846,
  PHI: 1.61803398875
}

// Logging constants (for advanced logging and analytics)
export const LOGGING = {
  LEVEL: process.env.LOGGING_LEVEL || 'debug',
  TIMESTAMP_FORMAT: 'YYYY-MM-DD HH:mm:ss.SSS'
}
