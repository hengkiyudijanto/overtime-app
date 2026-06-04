// ... existing code ...
        {/* TOP BAR */}
        <header className="bg-white border-b border-slate-200 p-4 px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center shadow-sm z-10 sticky top-0 gap-3 no-print">
          <div className="flex justify-between w-full md:w-auto items-center">
            <h1 className="md:hidden text-lg font-bold text-slate-800 flex items-center gap-2">
              <img 
                src="Bank_BTN_logo.png" 
                alt="Bank BTN Logo" 
                className="h-6 w-auto object-contain" 
                onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} 
              />
              <span>Overtime 244</span>
            </h1>
            <h2 className="hidden md:block text-lg font-semibold text-slate-800 capitalize">
              {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex flex-row items-center">
              <span className="font-semibold text-slate-800 truncate max-w-[150px] mr-2">{currentUser?.name}</span>
              <span className="text-slate-500 border-l border-slate-300 pl-2 text-xs font-normal">
                {currentUser?.position || 'Staff'}
              </span>
            </div>
          </div>
        </header>

        {/* CONTENT VIEW AREA */}
// ... existing code ...
```

### Apa yang telah diubah:
1. **Pembersihan Label**: Menghapus teks `<span class="text-slate-400 font-normal mr-2 hidden sm:inline">User Hack Aktif:</span>` agar tampilan menjadi lebih bersih.
2. **Fokus Identitas**: Menampilkan `currentUser.name` sebagai penanda utama dengan ketebalan font `font-semibold`.
3. **Penambahan Jabatan**: Menambahkan `currentUser.position` dengan pembatas garis vertikal (`|` atau border) agar tampak lebih profesional sebagai informasi profil pengguna yang sedang aktif.

Silakan salin perubahan ini ke dalam `src/App.jsx` Anda di GitHub. Vercel akan otomatis melakukan pembaruan tampilan header tersebut secara *live* setelah proses *deployment* selesai.
