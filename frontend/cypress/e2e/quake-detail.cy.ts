const quake = {
  id: 7,
  magnitude: 5.8,
  depth_km: 12,
  latitude: -7.8,
  longitude: 110.4,
  location: 'Yogyakarta',
  event_time: new Date().toISOString(),
  tsunami_status: 'Tidak berpotensi tsunami',
  felt: 'III MMI',
  source: 'BMKG',
  received_at: new Date().toISOString(),
};

describe('Detail gempa', () => {
  it('menampilkan panel detail lengkap', () => {
    cy.intercept('GET', '**/api/health', { status: 'ok', db: 'up', bmkg: 'up' });
    cy.intercept('GET', '**/api/earthquakes/7', { data: quake });
    cy.visit('/gempa/7');
    cy.contains('Detail Gempa').should('be.visible');
    cy.contains('Yogyakarta').should('be.visible');
    cy.contains('5.8').should('be.visible');
    cy.contains('Sumber data: BMKG').should('be.visible');
  });
});
