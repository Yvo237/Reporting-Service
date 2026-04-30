export function makeRegressionPoints(results?: any, maxPoints = 500) {
  if (results && results.predictions && results.actual_values) {
    const total = results.predictions.length;
    const step = Math.max(1, Math.floor(total / maxPoints));
    
    return results.predictions
      .filter((_: any, i: number) => i % step === 0)
      .slice(0, maxPoints)
      .map((pred: number, index: number) => {
        const originalIndex = index * step;
        return {
          x: originalIndex,
          actual: results.actual_values[originalIndex],
          predicted: pred,
        };
      });
  }
  return [];
}

export function makeClusters(results?: any, k = 5, maxPoints = 500) {
  if (results && results.reduced_data) {
    const total = results.reduced_data.length;
    const step = Math.max(1, Math.floor(total / maxPoints));

    return results.reduced_data
      .filter((_: any, i: number) => i % step === 0)
      .slice(0, maxPoints)
      .map((point: number[], index: number) => {
        const originalIndex = index * step;
        return {
          x: point[0],
          y: point[1],
          cluster: results.predictions ? results.predictions[originalIndex] : 0,
        };
      });
  }
  return [];
}

export function makeHistogram(results?: any) {
  if (results && results.actual_values) {
    // Note: On utilise toutes les valeurs pour calculer les bins corrects,
    // car le calcul d'histogramme n'est pas si lourd, c'est l'affichage SVG qui l'est (et l'histogramme n'affiche que 10 bins).
    const values = results.actual_values;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const binCount = 10;
    
    // Éviter la division par zéro si min == max
    const step = range === 0 ? 1 : range / binCount;

    const bins = Array.from({ length: binCount }, (_, i) => {
      const start = min + i * step;
      const end = start + step;
      return {
        bin: `${start.toFixed(0)}-${end.toFixed(0)}`,
        count: values.filter((v: number) => v >= start && (i === binCount - 1 ? v <= end : v < end)).length
      };
    });
    return bins;
  }
  return [];
}

export function makeFeatureImportance(results?: any) {
  if (results && results.coefficients && results.feature_names) {
    return results.feature_names.map((name: string, index: number) => ({
      feature: name,
      value: Math.abs(results.coefficients[index] || 0),
    })).sort((a: any, b: any) => b.value - a.value);
  }
  return [];
}

// Pour classification/supervised : distribution des classes prédites
export function makeClassDistribution(results?: any) {
  if (results && results.predictions && Array.isArray(results.predictions)) {
    const counts: Record<string, number> = {};
    for (const pred of results.predictions) {
      const key = String(pred);
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);
  }
  return [];
}
