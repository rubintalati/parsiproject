/**
 * Performance Monitoring Middleware for Express
 * Tracks response times and logs slow requests to help identify performance bottlenecks
 */

const fs = require('fs');
const path = require('path');
const util = require('util');
const appendFile = util.promisify(fs.appendFile);

// Configuration
const config = {
  // Threshold in milliseconds for slow responses
  slowThreshold: 500,
  // Path to log file relative to project root
  logFile: path.join(__dirname, 'logs', 'performance.log'),
  // Whether to log all requests or just slow ones
  logAllRequests: false,
  // Whether to include request headers in logs
  includeHeaders: false,
  // Enable detailed memory usage tracking
  trackMemory: true
};

// Ensure log directory exists
const logDir = path.dirname(config.logFile);
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Main middleware function
function performanceMonitor(req, res, next) {
  // Skip tracking for static resources to avoid log spam
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }

  // Record start time
  const start = process.hrtime();
  
  // Initial memory usage if tracking enabled
  const memoryBefore = config.trackMemory ? process.memoryUsage() : null;

  // Once response is finished
  res.on('finish', () => {
    // Calculate duration
    const hrTime = process.hrtime(start);
    const duration = hrTime[0] * 1000 + hrTime[1] / 1000000;
    
    // Get current memory usage if tracking enabled
    const memoryAfter = config.trackMemory ? process.memoryUsage() : null;
    
    // Only log if it's a slow request or if we're logging all requests
    const isSlow = duration > config.slowThreshold;
    if (isSlow || config.logAllRequests) {
      // Format log entry
      const timestamp = new Date().toISOString();
      const method = req.method;
      const url = req.originalUrl || req.url;
      const status = res.statusCode;
      const userAgent = req.get('user-agent') || 'Unknown';
      const referer = req.get('referer') || 'Direct';
      
      // Basic log data
      let logData = {
        timestamp,
        method,
        url,
        status,
        duration: `${duration.toFixed(2)}ms`,
        userAgent,
        referer
      };
      
      // Add memory data if tracking enabled
      if (config.trackMemory && memoryBefore && memoryAfter) {
        logData.memory = {
          rss: {
            before: `${(memoryBefore.rss / 1024 / 1024).toFixed(2)}MB`,
            after: `${(memoryAfter.rss / 1024 / 1024).toFixed(2)}MB`,
            diff: `${((memoryAfter.rss - memoryBefore.rss) / 1024 / 1024).toFixed(2)}MB`
          },
          heapTotal: {
            before: `${(memoryBefore.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            after: `${(memoryAfter.heapTotal / 1024 / 1024).toFixed(2)}MB`,
            diff: `${((memoryAfter.heapTotal - memoryBefore.heapTotal) / 1024 / 1024).toFixed(2)}MB`
          },
          heapUsed: {
            before: `${(memoryBefore.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            after: `${(memoryAfter.heapUsed / 1024 / 1024).toFixed(2)}MB`,
            diff: `${((memoryAfter.heapUsed - memoryBefore.heapUsed) / 1024 / 1024).toFixed(2)}MB`
          }
        };
      }
      
      // Add headers if configured
      if (config.includeHeaders) {
        logData.headers = req.headers;
      }
      
      // Add slow tag if applicable
      if (isSlow) {
        logData.slow = true;
        
        // Log to console immediately for slow requests
        console.warn(`SLOW REQUEST: ${method} ${url} - ${duration.toFixed(2)}ms`);
      }
      
      // Write to log file
      const logEntry = JSON.stringify(logData) + '\n';
      appendFile(config.logFile, logEntry).catch(err => {
        console.error('Error writing to performance log:', err);
      });
    }
  });
  
  next();
}

// Helper to analyze logs and identify patterns
function analyzePerformanceLogs() {
  try {
    // Read the log file
    const logContent = fs.readFileSync(config.logFile, 'utf8');
    const logLines = logContent.trim().split('\n');
    
    // Parse each line as JSON
    const logEntries = logLines.map(line => JSON.parse(line));
    
    // Group by URL to find slow endpoints
    const urlStats = {};
    logEntries.forEach(entry => {
      if (!urlStats[entry.url]) {
        urlStats[entry.url] = {
          count: 0,
          totalDuration: 0,
          slowCount: 0,
          maxDuration: 0
        };
      }
      
      const stats = urlStats[entry.url];
      const duration = parseFloat(entry.duration);
      
      stats.count++;
      stats.totalDuration += duration;
      if (entry.slow) stats.slowCount++;
      if (duration > stats.maxDuration) stats.maxDuration = duration;
    });
    
    // Calculate averages and sort by slowest
    const urlAnalysis = Object.entries(urlStats).map(([url, stats]) => ({
      url,
      requestCount: stats.count,
      avgDuration: stats.totalDuration / stats.count,
      slowPercentage: (stats.slowCount / stats.count) * 100,
      maxDuration: stats.maxDuration
    })).sort((a, b) => b.avgDuration - a.avgDuration);
    
    return {
      totalRequests: logEntries.length,
      slowRequests: logEntries.filter(e => e.slow).length,
      urlAnalysis: urlAnalysis.slice(0, 10) // Top 10 slowest URLs
    };
  } catch (err) {
    console.error('Error analyzing performance logs:', err);
    return { error: err.message };
  }
}

// Create log directories on module load
try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  console.error('Error creating log directory:', err);
}

module.exports = {
  performanceMonitor,
  analyzePerformanceLogs
};
