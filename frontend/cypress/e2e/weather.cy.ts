const locations = [
  { adm4: '34.02.01.2001', provinsi: 'DI Yogyakarta', kotkab: 'Kab. Bantul', kecamatan: 'Bantul', desa: 'Bantul' },
  { adm4: '34.04.01.2005', provinsi: 'DI Yogyakarta', kotkab: 'Kab. Sleman', kecamatan: 'Sleman', desa: 'Sleman' },
];

const forecast = {
  data: {
    location: locations[1],
    analysis_date: '2026-09-14T00:00:00+07:00',
    days: [
      {
        date: '2026-09-14',
        slots: [
          {
            datetime: '2026-09-14T00:00:00Z',
            local_datetime: '2026-09-14 07:00:00',
            t: 27,
            hu: 80,
            weather: 1,
            weather_desc: 'Cerah Berawan',
            weather_desc_en: 'Partly cloudy',
            ws: 3.5,
            wd: 'Timur',
            tcc: 40,
            tp: 0,
            vs_text: 'Baik',
            image: null,
          },
          {
            datetime: '2026-09-14T03:00:00Z',
            local_datetime: '2026-09-14 10:00:00',
            t: 30,
            hu: 65,
            weather: 60,
            weather_desc: 'Hujan Ringan',
            weather_desc_en: 'Light rain',
            ws: 5.2,
            wd: 'Tenggara',
            tcc: 85,
            tp: 0.5,
            vs_text: 'Sedang',
            image: null,
          },
        ],
      },
    ],
  },
};

const alerts = {
  data: [
    {
      id: 'alert-1',
      title: 'Waspada hujan lebat disertai petir',
      province: 'DI Yogyakarta',
      link: 'https://www.bmkg.go.id/peringatan-dini',
      description: 'Berlaku untuk wilayah selatan DIY.',
      pub_date: '2026-09-14T05:00:00+07:00',
      severity: 'high',
    },
  ],
  meta: { total: 1, observed_at: '2026-09-14T05:30:00+07:00' },
};

describe('Cuaca', () => {
  beforeEach(() => {
    cy.intercept('GET', '**/api/health', { status: 'ok', db: 'up', bmkg: 'up' });
    cy.intercept('GET', '**/api/weather/locations*', { data: locations });
    cy.intercept('GET', '**/api/weather/forecast*', forecast);
    cy.intercept('GET', '**/api/weather/alerts*', alerts);
    cy.visit('/cuaca');
  });

  it('menampilkan lokasi, prakiraan, dan peringatan', () => {
    cy.get('#cuaca-q').type('Sleman');
    cy.contains('Sleman').should('be.visible');
    cy.contains('Bantul').should('be.visible');
    cy.contains('button', 'Sleman').first().click();
    cy.contains('Cerah Berawan').should('be.visible');
    cy.contains('Hujan Ringan').should('be.visible');
    cy.contains('Waspada hujan lebat disertai petir').should('be.visible');
  });
});
