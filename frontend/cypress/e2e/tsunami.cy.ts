const warning = {
  event_id: 'tsu-001',
  magnitude: 7.1,
  depth_km: 10,
  area: 'Sumatera Barat',
  latitude: 0.5,
  longitude: 99.8,
  event_time: '2026-09-10T12:00:00+07:00',
  status: 'warning',
  warning_level: '4',
  potential: 'Berpotensi tsunami',
  headline: 'Peringatan tsunami Sumatera Barat',
  description: 'Gempa M 7,1 berpotensi tsunami.',
  source: 'BMKG InaTEWS',
};

const ended = {
  event_id: 'tsu-000',
  magnitude: 6.2,
  depth_km: 20,
  area: 'Selatan Jawa',
  latitude: -8.1,
  longitude: 110.2,
  event_time: '2026-09-01T08:00:00+07:00',
  status: 'ended',
  warning_level: null,
  potential: 'Tidak berpotensi tsunami',
  headline: null,
  description: 'Peringatan telah berakhir.',
  source: 'BMKG InaTEWS',
};

describe('Tsunami', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/health', { status: 'ok', db: 'up', bmkg: 'up' });
    cy.intercept('GET', '**/api/tsunami/warnings*', {
      data: [warning],
      meta: { total: 1, warnings: 1, observed_at: '2026-09-10T12:05:00+07:00', stale: false },
    });
    cy.intercept('GET', '**/api/tsunami*', {
      data: [warning, ended],
      meta: { total: 2, warnings: 1, observed_at: '2026-09-10T12:05:00+07:00', stale: false },
    });
    cy.visit('/tsunami');
  });

  it('menampilkan kartu peringatan aktif dan baris riwayat berakhir', () => {
    cy.get('[data-testid="tsunami-warning-card"]').should('have.length', 1);
    cy.contains('PERINGATAN AKTIF').should('be.visible');
    cy.contains('PD-4').should('be.visible');
    cy.get('[data-testid="tsunami-ended-row"]').should('have.length', 1);
    cy.contains('Telah berakhir').should('be.visible');
  });
});
