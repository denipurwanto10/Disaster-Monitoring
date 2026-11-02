# Redesign komponen — cara pasang

1. Timpa semua file di folder `components/` dengan isi zip ini (props & `data-testid` tidak berubah).
2. Tambahkan `import '@/components/design.css';` di `app/layout.tsx`, SETELAH `globals.css`.
   Jika `globals.css` sudah mendefinisikan `.shadow-card`, `.shadow-pop`, `.skeleton`, `.thin-scroll`, `.pb-safe`, hapus yang lama — versi baru ada di design.css.
3. Perlu Tailwind >= 3.2 (memakai varian `data-[...]`). Tidak ada perubahan `tailwind.config`.
4. Peta: `MAP_STYLE` di MapView.tsx. Default 'google' memakai URL tile tidak resmi Google (tanpa key, tetapi melanggar ketentuan Google; jangan untuk produksi). Alternatif: 'esri' (mirip Google) atau 'osm' (diizinkan penuh).
5. Sidebar desktop dapat diciutkan; pilihannya tersimpan di localStorage (`dm-sidebar`).
