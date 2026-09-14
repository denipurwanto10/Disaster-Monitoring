const quake = {
  id: 1,
  magnitude: 5.4,
  depth_km: 10,
  latitude: -7.5,
  longitude: 110.3,
  location: 'Pusat gempa berada di darat 10 km barat daya Bantul',
  event_time: new Date().toISOString(),
  tsunami_status: 'Tidak berpotensi tsunami',
  source: 'BMKG',
};

describe('Dasbor pantauan', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/health', { status: 'ok', db: 'up', bmkg: 'up', lastSuccessAt: new Date().toISOString() });
    cy.intercept('GET', '**/api/earthquakes*', { data: [quake], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } });
    cy.intercept('GET', '**/api/statistics', {
      today: 1, last7d: 5, last30d: 20, total: 100,
      magDistribution: { minor_lt5: 10, moderate_5_59: 8, strong_gte6: 2 },
      depthDistribution: { shallow_lt70: 15, intermediate_70_300: 4, deep_gt300: 1 },
      topRegions: [{ region: 'Bantul', count: 3 }], timeline: [{ date: '2026-09-14', count: 1, maxMag: 5.4 }],
    });
    cy.visit('/');
  });

  it('menampilkan peta dan daftar gempa terbaru', () => {
    cy.get('[data-testid="map-container"]').should('exist');
    cy.contains('Gempa terbaru', { matchCase: false }).should('be.visible');
    cy.contains('Bantul').should('be.visible');
  });
});
