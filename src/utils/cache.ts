/**
 * A simple cache implementation for memoizing function results
 */

import type { Config } from "../types";

type CacheKey = string;
type CacheValue = any;

interface Cache {
  [key: CacheKey]: {
    value: CacheValue;
    timestamp: number;
  };
}

// Global cache object
const cache: Cache = {};

/**
 * Generates a cache key based on function name and configuration
 */
export function getCacheKey(
  functionName: string,
  config: Config,
  args?: any[]
): CacheKey {
  // Use config.id as a stable identifier
  const configId = config.id || "";

  // For Date objects in args, convert to timestamps for more efficient serialization
  let serializedArgs = "";
  if (args && args.length > 0) {
    serializedArgs = args
      .map((arg) => {
        if (arg instanceof Date) {
          return arg.getTime();
        } else if (Array.isArray(arg) && arg.length > 0) {
          // For arrays of data, use length and first/last item as a fingerprint
          // instead of serializing the entire array
          if (arg[0] && typeof arg[0] === "object" && "timestamp" in arg[0]) {
            return `array:${arg.length}:${arg[0].timestamp}:${
              arg[arg.length - 1].timestamp
            }`;
          }
        }
        return arg;
      })
      .join(":");
  }

  return `${configId}:${functionName}:${serializedArgs}`;
}

/**
 * Memoizes a function result, supports async functions
 * @param key - The cache key
 * @param fn - The function to execute if cache miss
 * @param ttl - Time to live in milliseconds (optional)
 * @returns The cached or computed result
 */
export function memoize<T>(key: CacheKey, fn: () => T, ttl?: number): T {
  const now = Date.now();

  // Check if we have a valid cached value
  if (cache[key] && (!ttl || now - cache[key].timestamp < ttl)) {
    return cache[key].value;
  }

  // Compute the value
  const value = fn();

  // Cache the result
  cache[key] = {
    value,
    timestamp: now,
  };

  return value;
}

/**
 * Clears the entire cache or a specific key
 */
export function clearCache(key?: CacheKey): void {
  if (key) {
    delete cache[key];
  } else {
    Object.keys(cache).forEach((k) => delete cache[k]);
  }
}

/**
 * Invalidates cache entries that match a prefix
 */
export function invalidateCachePrefix(prefix: string): void {
  Object.keys(cache).forEach((key) => {
    if (key.startsWith(prefix)) {
      delete cache[key];
    }
  });
}

/**
 * Clears expired cache entries
 * @param ttl - Time to live in milliseconds
 */
export function clearExpiredCache(ttl: number): void {
  const now = Date.now();
  Object.keys(cache).forEach((key) => {
    if (now - cache[key].timestamp >= ttl) {
      delete cache[key];
    }
  });
}
