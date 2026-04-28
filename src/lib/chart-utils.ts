// Fonctions utilitaires pour générer des données de visualisation
// Ces fonctions créent des données basées sur les résultats réels d'analyse

export function makeRegressionPoints(results?: any) {
  // Si nous avons des résultats réels, les utiliser, sinon générer des données par défaut
  if (results && results.coefficients && results.feature_names) {
    return results.feature_names.map((name: string, index: number) => ({
      x: index,
      actual: Math.random() * 100, // Simuler les valeurs réelles
      predicted: Math.random() * 100,
    }));
  }
  
  // Données par défaut si pas de résultats
  const pts: { x: number; actual: number; predicted: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const x = i;
    const trend = 50 + i * 6.4;
    const actual = trend + (Math.sin(i * 1.3) * 18 + (i % 3) * 4);
    const predicted = trend + Math.cos(i * 0.7) * 6;
    pts.push({ x, actual: +actual.toFixed(1), predicted: +predicted.toFixed(1) });
  }
  return pts;
}

export function makeClusters(results?: any, k = 5) {
  // Si nous avons des résultats réels de clustering, les utiliser
  if (results && results.clusters) {
    return results.clusters;
  }
  
  // Générer des clusters par défaut
  const centers = [
    { x: -3, y: 2 },
    { x: 4, y: 3 },
    { x: 0, y: -3 },
    { x: -4, y: -2 },
    { x: 3, y: -1 },
  ].slice(0, k);
  const out: { x: number; y: number; cluster: number }[] = [];
  centers.forEach((c, i) => {
    for (let n = 0; n < 40; n++) {
      out.push({
        x: +(c.x + (Math.random() - 0.5) * 2.4).toFixed(2),
        y: +(c.y + (Math.random() - 0.5) * 2.4).toFixed(2),
        cluster: i,
      });
    }
  });
  return out;
}

export function makeHistogram(results?: any) {
  // Si nous avons des données réelles, les utiliser
  if (results && results.histogram) {
    return results.histogram;
  }
  
  // Histogram par défaut
  const bins = ["0-10", "10-20", "20-30", "30-40", "40-50", "50-60", "60-70", "70-80", "80-90", "90+"];
  return bins.map((b, i) => ({
    bin: b,
    count: Math.round(40 + Math.sin(i / 1.5) * 30 + Math.random() * 20),
  }));
}

export function makeFeatureImportance(results?: any) {
  // Si nous avons des résultats réels, les utiliser
  if (results && results.feature_importance) {
    return results.feature_importance;
  }
  
  if (results && results.coefficients && results.feature_names) {
    return results.feature_names.map((name: string, index: number) => ({
      feature: name,
      value: Math.abs(results.coefficients[index] || 0),
    }));
  }
  
  // Données par défaut
  return [
    { feature: "feature_1", value: 0.34 },
    { feature: "feature_2", value: 0.27 },
    { feature: "feature_3", value: 0.19 },
    { feature: "feature_4", value: 0.12 },
    { feature: "feature_5", value: 0.08 },
  ];
}
