export interface OutlierResult {
  isOutlier: boolean;
  value: number;
  mean: number;
  stdDev: number;
  stdDeviations: number;
  threshold: number;
}

export class StatisticalAnalyzer {
  calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }

    return sorted[mid];
  }

  calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = this.calculateMean(values);
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const avgSquaredDiff = this.calculateMean(squaredDiffs);

    return Math.sqrt(avgSquaredDiff);
  }

  detectOutlier(
    value: number,
    dataset: number[],
    stdDevThreshold: number = 2
  ): OutlierResult {
    if (dataset.length === 0) {
      return {
        isOutlier: false,
        value,
        mean: 0,
        stdDev: 0,
        stdDeviations: 0,
        threshold: stdDevThreshold,
      };
    }

    const mean = this.calculateMean(dataset);
    const stdDev = this.calculateStdDev(dataset);

    if (stdDev === 0) {
      return {
        isOutlier: value !== mean,
        value,
        mean,
        stdDev,
        stdDeviations: value !== mean ? Infinity : 0,
        threshold: stdDevThreshold,
      };
    }

    const stdDeviations = Math.abs(value - mean) / stdDev;
    const isOutlier = stdDeviations > stdDevThreshold;

    return {
      isOutlier,
      value,
      mean,
      stdDev,
      stdDeviations,
      threshold: stdDevThreshold,
    };
  }

  findOutliers(
    dataset: number[],
    stdDevThreshold: number = 2
  ): { value: number; index: number; stdDeviations: number }[] {
    const mean = this.calculateMean(dataset);
    const stdDev = this.calculateStdDev(dataset);

    if (stdDev === 0) return [];

    const outliers: { value: number; index: number; stdDeviations: number }[] = [];

    dataset.forEach((value, index) => {
      const stdDeviations = Math.abs(value - mean) / stdDev;
      if (stdDeviations > stdDevThreshold) {
        outliers.push({ value, index, stdDeviations });
      }
    });

    return outliers;
  }

  calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    if (percentile < 0 || percentile > 100) {
      throw new Error('Percentile must be between 0 and 100');
    }

    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
}
