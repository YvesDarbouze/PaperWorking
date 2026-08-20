export interface SparklineMetric {
  sparkline: number[];
  delta: number;
  changePercent: number;
  insufficientData: boolean;
}

/**
 * Builds a sparkline metric from monthly snapshot documents.
 * Source: PaperWorking src/app/api/dashboard/route.ts
 */
export function buildSparklineMetric(
  rawSnapshots: Array<{ period: string; [key: string]: unknown }>,
  currentValue: number,
  sumFn: (snap: Record<string, unknown>) => number,
): SparklineMetric {
  const byPeriod: Record<string, Array<Record<string, unknown>>> = {};
  for (const snapshot of rawSnapshots) {
    if (!byPeriod[snapshot.period]) {
      byPeriod[snapshot.period] = [];
    }
    byPeriod[snapshot.period].push(snapshot);
  }

  const sortedPeriods = Object.keys(byPeriod).sort();
  const sparkline = sortedPeriods.map((period) =>
    Math.round(byPeriod[period].reduce((acc, s) => acc + sumFn(s), 0)),
  );

  const insufficientData = sparkline.length < 2;
  const prevValue = insufficientData ? 0 : sparkline[sparkline.length - 2];
  const delta = insufficientData ? 0 : currentValue - prevValue;
  const changePercent = prevValue > 0 ? (delta / prevValue) * 100 : 0;

  return {
    sparkline,
    delta: Math.round(delta),
    changePercent: Math.round(changePercent * 100) / 100,
    insufficientData,
  };
}

export const PHASE_LABELS = ['Acquisition', 'Fund', 'Hold', 'Exit'] as const;

export function countProjectsByPhase(
  projects: Array<{ currentPhase?: number }>,
): Record<(typeof PHASE_LABELS)[number], number> {
  const counts = {
    Acquisition: 0,
    Fund: 0,
    Hold: 0,
    Exit: 0,
  };

  for (const project of projects) {
    const phaseNum = project.currentPhase ?? 1;
    if (phaseNum === 1) counts.Acquisition++;
    else if (phaseNum === 2) counts.Fund++;
    else if (phaseNum === 3) counts.Hold++;
    else if (phaseNum === 4) counts.Exit++;
  }

  return counts;
}
