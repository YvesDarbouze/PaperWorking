import { createFirestorePortfolioMetricsReadRepository } from '../firestore/create-firestore-portfolio-metrics-read-repository.js';
import { createFirestorePortfolioInsightsReadRepository } from '../firestore/create-firestore-portfolio-insights-read-repository.js';

export function createPortfolioMetricsReadRepository() {
  return createFirestorePortfolioMetricsReadRepository();
}

export function createPortfolioInsightsReadRepository() {
  return createFirestorePortfolioInsightsReadRepository();
}
