const NodeCache = require('node-cache');

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const stats = {
  hits: 0,
  misses: 0,
};

function getCache(key) {
  const value = cache.get(key);
  if (value !== undefined) {
    stats.hits++;
    return value;
  }
  stats.misses++;
  return undefined;
}

function setCache(key, val, ttl) {
  if (ttl) {
    return cache.set(key, val, ttl);
  }
  return cache.set(key, val);
}

function delCache(key) {
  return cache.del(key);
}

function flushAll() {
  return cache.flushAll();
}

function getStats() {
  const nodeCacheStats = cache.getStats();
  return {
    hits: stats.hits,
    misses: stats.misses,
    keysCount: cache.keys().length,
    keys: cache.keys(),
    ksize: nodeCacheStats.ksize,
    vsize: nodeCacheStats.vsize
  };
}

function resetStats() {
  stats.hits = 0;
  stats.misses = 0;
}

module.exports = {
  cache,
  getCache,
  setCache,
  delCache,
  flushAll,
  getStats,
  resetStats
};
