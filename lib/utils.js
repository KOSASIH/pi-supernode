// lib/utils.js

/**
 * @description Utility functions for pi-node
 * @author [KOSASIH]
 * @version 1.0.0
 */

// Async utility functions
// Cryptographic utility functions
import { CRYPTO } from '../constants'

// HTTP utility functions
import axios from 'axios'

// Logging utility functions
import { LOGGING } from '../constants'
import winston from 'winston'

export const asyncRetry = async (func, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await func()
    } catch (error) {
      if (i === retries - 1) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }
}

export const asyncTimeout = async (func, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error('Function execution timed out'))
    }, timeout)

    func()
      .then((result) => {
        clearTimeout(timeoutId)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeoutId)
        reject(error)
      })
  })
}

export const encryptData = (data) => {
  const cipher = crypto.createCipheriv(CRYPTO.ALGORITHM, CRYPTO.KEY, CRYPTO.IV)
  let encryptedData = cipher.update(data, 'utf8', 'hex')
  encryptedData += cipher.final('hex')
  return encryptedData
}

export const decryptData = (data) => {
  const decipher = crypto.createDecipheriv(
    CRYPTO.ALGORITHM,
    CRYPTO.KEY,
    CRYPTO.IV
  )
  let decryptedData = decipher.update(data, 'hex', 'utf8')
  decryptedData += decipher.final('utf8')
  return decryptedData
}

export const fetchData = async (url, options = {}) => {
  try {
    const response = await axios.get(url, options)
    return response.data
  } catch (error) {
    throw error.response || error
  }
}

export const postData = async (url, data, options = {}) => {
  try {
    const response = await axios.post(url, data, options)
    return response.data
  } catch (error) {
    throw error.response || error
  }
}

const logger = winston.createLogger({
  level: LOGGING.LEVEL,
  format: winston.format.combine(
    winston.format.timestamp({ format: LOGGING.TIMESTAMP_FORMAT }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level}] ${message}`
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

export const logInfo = (message) => logger.info(message)
export const logError = (message) => logger.error(message)
export const logDebug = (message) => logger.debug(message)
