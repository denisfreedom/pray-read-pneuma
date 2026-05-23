/**
 * Performance Monitoring Utility
 * Tracks and logs key performance metrics for the Bible Reader
 */

interface PerformanceMetrics {
  versesLoadTime?: number;
  versesCount?: number;
  prayersLoadTime?: number;
  prayersCount?: number;
  totalInitialLoadTime?: number;
  renderTime?: number;
  componentRenderCount?: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private startTime: number = Date.now();
  private renderCounts: Map<string, number> = new Map();

  reset() {
    this.metrics = {};
    this.startTime = Date.now();
    this.renderCounts.clear();
  }

  recordVersesLoad(count: number) {
    const elapsed = Date.now() - this.startTime;
    this.metrics.versesLoadTime = elapsed;
    this.metrics.versesCount = count;
    console.log(
      `📖 Verses loaded: ${count} verses in ${elapsed}ms`,
      { totalSoFar: elapsed }
    );
  }

  recordPrayersLoad(count: number) {
    const elapsed = Date.now() - this.startTime;
    this.metrics.prayersLoadTime = elapsed;
    this.metrics.prayersCount = count;
    console.log(
      `🙏 Prayers loaded: ${count} prayers in ${elapsed}ms (background load)`,
      { totalSoFar: elapsed }
    );
  }

  recordComponentRender(componentName: string) {
    const current = this.renderCounts.get(componentName) || 0;
    this.renderCounts.set(componentName, current + 1);
  }

  recordPrayerExpand(verseNumber: number, cached: boolean) {
    const timeMs = Date.now() - this.startTime;
    console.log(
      `🙏 Prayer ${verseNumber} expanded: ${cached ? 'cached' : 'loading'} in ${timeMs}ms`
    );
  }

  getMetrics(): PerformanceMetrics & { renderCounts: Record<string, number> } {
    const renderCountsObj: Record<string, number> = {};
    this.renderCounts.forEach((count, name) => {
      renderCountsObj[name] = count;
    });

    return {
      ...this.metrics,
      renderCounts: renderCountsObj,
    };
  }

  logSummary() {
    const metrics = this.getMetrics();
    console.group('📊 Performance Summary');
    console.log('⏱️ Verses load time:', metrics.versesLoadTime, 'ms');
    console.log('📦 Verses count:', metrics.versesCount);
    console.log('⏱️ Prayers load time:', metrics.prayersLoadTime, 'ms (background)');
    console.log('📦 Prayers count:', metrics.prayersCount);
    console.log('🎨 Component renders:', metrics.renderCounts);
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();
