const rows = [
  { id: 1, magnitude: 4.2, depth_km: 10, latitude: -7.5, longitude: 110.3, location: 'Bantul, DIY', event_time: new Date().toISOString(), tsunami_status: 'Tidak berpotensi tsunami' },
  { id: 2, magnitude: 6.1, depth_km: 20, latitude: -3.1, longitude: 128.1, location: 'Ambon, Maluku', event_time: new Date().toISOString(), tsunami_status: 'Berpotensi tsunami' },
];

describe('Riwayat gempa', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/health', { status: 'ok', db: 'up', bmkg: 'up' });
    cy.intercept('GET', '**/api/earthquakes/history*', (req) => {
      const min = parseFloat(String(req.query.minMag ?? '0')) || 0;
      const filtered = rows.filter((r) => r.magnitude >= min);
      req.reply({ data: filtered, meta: { page: 1, limit: 20, total: filtered.length, totalPages: 1 } });
    }).as('history');
    cy.intercept('GET', '**/api/earthquakes?*', (req) => {
      const min = parseFloat(String(req.query.minMag ?? '0')) || 0;
      const filtered = rows.filter((r) => r.magnitude >= min);
      req.reply({ data: filtered, meta: { page: 1, limit: 20, total: filtered.length, totalPages: 1 } });
    });
    cy.visit('/riwayat');
  });

  it('filter magnitudo mempersempit tabel', () => {
    cy.get('[data-testid="quake-row"]').should('have.length', 2);
    cy.contains('button', 'Filter').click();
    cy.get('input[aria-label="Magnitudo minimum"]').clear().type('6');
    cy.contains('button', 'Terapkan').click();
    cy.wait('@history');
    cy.get('[data-testid="quake-row"]').should('have.length', 1);
    cy.contains('Ambon').should('be.visible');
  });
});
