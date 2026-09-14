const volcanoes = [
  { slug: 'merapi', name: 'Merapi', province: 'DIY dan Jawa Tengah', level: 3, level_name: 'Siaga', latitude: -7.542, longitude: 110.442, elevation_m: 2968, source: 'MAGMA' },
  { slug: 'bromo', name: 'Bromo', province: 'Jawa Timur', level: 2, level_name: 'Waspada', latitude: -7.942, longitude: 112.95, elevation_m: 2329, source: 'MAGMA' },
];

describe('Gunung api', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/health', { status: 'ok', db: 'up', bmkg: 'up' });
    cy.intercept('GET', '**/api/volcanoes/levels*', {
      counts: { awas: 0, siaga: 1, waspada: 1, normal: 0 },
      levels: [
        { level: 3, level_name: 'Siaga', count: 1, volcanoes: [{ name: 'Merapi', province: 'DIY dan Jawa Tengah' }] },
        { level: 2, level_name: 'Waspada', count: 1, volcanoes: [{ name: 'Bromo', province: 'Jawa Timur' }] },
      ],
    });
    cy.intercept('GET', '**/api/volcanoes*', {
      data: volcanoes,
      meta: { total: 2, counts: { awas: 0, siaga: 1, waspada: 1, normal: 0 } },
    });
    cy.visit('/gunung-api');
  });

  it('menampilkan tabel gunung api dan filter level', () => {
    cy.get('[data-testid="volcano-row"]').should('have.length', 2);
    cy.contains('Merapi').should('be.visible');
    cy.contains('button', 'Siaga').click();
    cy.get('[data-testid="volcano-row"]').should('have.length', 1);
    cy.contains('Bromo').should('not.exist');
  });
});
