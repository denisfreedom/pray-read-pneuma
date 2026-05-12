/**
 * Hydration Debugger
 * 
 * Helps diagnose hydration mismatch errors by:
 * 1. Monitoring console for hydration warnings
 * 2. Logging server vs client render differences
 * 3. Tracking component state consistency
 */

type HydrationLog = {
  timestamp: number;
  type: 'info' | 'warning' | 'error';
  component: string;
  message: string;
  data?: any;
};

class HydrationDebugger {
  private logs: HydrationLog[] = [];
  private isClient = false;
  private startTime = Date.now();
  private originalConsoleWarn = console.warn;
  private originalConsoleError = console.error;

  constructor() {
    // Only initialize on client side
    if (typeof window !== 'undefined') {
      this.isClient = true;
      this.attachConsoleMonitoring();
      this.logInit();
    }
  }

  private attachConsoleMonitoring() {
    // Monitor console.warn for hydration warnings
    console.warn = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      
      if (message.includes('Hydration mismatch') || 
          message.includes('Text content does not match') ||
          message.includes('Hydration failed')) {
        this.logError('console.warn', message, { fullArgs: args });
      }
      
      // Call original console.warn
      return this.originalConsoleWarn.apply(console, args);
    };

    // Monitor console.error for hydration errors
    console.error = (...args: any[]) => {
      const message = args[0]?.toString() || '';
      
      if (message.includes('Hydration') || message.includes('mismatch')) {
        this.logError('console.error', message, { fullArgs: args });
      }
      
      // Call original console.error
      return this.originalConsoleError.apply(console, args);
    };
  }

  private logInit() {
    this.log('HydrationDebugger', 'Initialized on client - monitoring for hydration issues');
  }

  log(component: string, message: string, data?: any) {
    const logEntry: HydrationLog = {
      timestamp: Date.now() - this.startTime,
      type: 'info',
      component,
      message,
      data,
    };
    
    this.logs.push(logEntry);
    
    if (this.isClient) {
      console.log(`[${logEntry.timestamp}ms] [${component}] ${message}`, data || '');
    }
  }

  logWarning(component: string, message: string, data?: any) {
    const logEntry: HydrationLog = {
      timestamp: Date.now() - this.startTime,
      type: 'warning',
      component,
      message,
      data,
    };
    
    this.logs.push(logEntry);
    
    if (this.isClient) {
      console.warn(`[${logEntry.timestamp}ms] [${component}] ⚠️ ${message}`, data || '');
    }
  }

  logError(component: string, message: string, data?: any) {
    const logEntry: HydrationLog = {
      timestamp: Date.now() - this.startTime,
      type: 'error',
      component,
      message,
      data,
    };
    
    this.logs.push(logEntry);
    
    if (this.isClient) {
      console.error(`[${logEntry.timestamp}ms] [${component}] ❌ ${message}`, data || '');
    }
  }

  /**
   * Verify that a component's state is consistent between renders
   */
  verifyStateConsistency(component: string, expectedState: Record<string, any>, actualState: Record<string, any>) {
    const mismatches: string[] = [];
    
    for (const [key, expectedValue] of Object.entries(expectedState)) {
      const actualValue = actualState[key];
      
      // Deep comparison for objects
      if (typeof expectedValue === 'object' && typeof actualValue === 'object') {
        if (JSON.stringify(expectedValue) !== JSON.stringify(actualValue)) {
          mismatches.push(`${key}: expected ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
        }
      } else if (expectedValue !== actualValue) {
        mismatches.push(`${key}: expected ${expectedValue}, got ${actualValue}`);
      }
    }
    
    if (mismatches.length > 0) {
      this.logWarning(component, 'State mismatch detected', { mismatches });
      return false;
    } else {
      this.log(component, 'State consistency verified', { keys: Object.keys(expectedState) });
      return true;
    }
  }

  /**
   * Check for common hydration issues
   */
  performHealthCheck(): { passed: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check 1: No hydration errors in logs
    const hydrationErrors = this.logs.filter(
      log => log.type === 'error' && log.message.includes('Hydration')
    );
    if (hydrationErrors.length > 0) {
      issues.push(`Found ${hydrationErrors.length} hydration error(s) in logs`);
    }
    
    // Check 2: No state mismatches
    const stateMismatches = this.logs.filter(
      log => log.type === 'warning' && log.message.includes('State mismatch')
    );
    if (stateMismatches.length > 0) {
      issues.push(`Found ${stateMismatches.length} state mismatch warning(s)`);
    }
    
    // Check 3: Hydration completed
    const hydrationLogs = this.logs.filter(
      log => log.message.includes('Hydration complete')
    );
    if (hydrationLogs.length === 0) {
      issues.push('Hydration did not complete - possible stuck component');
    }
    
    return {
      passed: issues.length === 0,
      issues,
    };
  }

  /**
   * Get a summary of all logs
   */
  getSummary() {
    const errorCount = this.logs.filter(log => log.type === 'error').length;
    const warningCount = this.logs.filter(log => log.type === 'warning').length;
    const infoCount = this.logs.filter(log => log.type === 'info').length;
    
    return {
      totalLogs: this.logs.length,
      errors: errorCount,
      warnings: warningCount,
      info: infoCount,
      uptime: `${Date.now() - this.startTime}ms`,
      allLogs: this.logs,
    };
  }

  /**
   * Export logs for debugging
   */
  exportLogs() {
    const summary = this.getSummary();
    const timestamp = new Date().toISOString();
    
    return {
      exportTime: timestamp,
      ...summary,
      formattedLogs: this.logs.map(log => 
        `[${log.timestamp}ms] [${log.type.toUpperCase()}] ${log.component}: ${log.message}`
      ),
    };
  }

  /**
   * Clear logs (useful for testing)
   */
  clear() {
    this.logs = [];
    this.log('HydrationDebugger', 'Logs cleared');
  }
}

// Export singleton instance
export const hydrationDebugger = new HydrationDebugger();

// Also make it available globally in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__hydrationDebugger = hydrationDebugger;
  console.log('%c🔍 HydrationDebugger available at window.__hydrationDebugger', 'color: cyan; font-weight: bold');
  console.log('%c  Usage: window.__hydrationDebugger.getSummary()', 'color: gray');
}
