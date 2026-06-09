import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Clock, 
  CheckSquare, 
  Settings, 
  FileText, 
  BarChart2, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  AlertCircle,
  Upload,
  AlertTriangle,
  LogOut,
  Lock,
  Camera,
  Loader2,
  Printer,
  Database,
  Key,
  Eye,
  EyeOff,
  MessageSquare,
  ShieldCheck,
  Search,
  Download,
  SlidersHorizontal,
  Calendar,
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  Smartphone,
  Bell
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';

// --- SAFE GLOBAL PROCESS INJECTION ---
if (typeof globalThis !== 'undefined' && typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} };
}

const getEnv = (key) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return "";
};

// --- DATA SIMULASI OFFLINE ---
const INITIAL_DEMO_EMPLOYEES = [
  { nip: "19720906", name: "Hengki Yudijanto", position: "DBM Service & Collection", role: "admin", noHandphone: "081122334455", atasan: "", passwordHash: "", passwordChanged: false },
  { nip: "6628", name: "Andi Saputra", position: "Consumer Loan Staff", role: "maker", noHandphone: "085244556677", atasan: "1234", passwordHash: "", passwordChanged: false },
  { nip: "1234", name: "Siti Aminah", position: "Head of Consumer Loan", role: "approval", noHandphone: "081299887766", atasan: "19720906", passwordHash: "", passwordChanged: false }
];

const INITIAL_DEMO_REQUESTS = [
  { id: "req_1", nip: "6628", date: "2026-06-01", startTime: "17:00", endTime: "19:30", duration: 2.5, reason: "Pemberkasan Kredit FLPP", status: "Approved", atasan: "1234", imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23006cb7'/><text x='50%' y='50%' font-size='10' fill='white' dominant-baseline='middle' text-anchor='middle'>BUKTI DOKUMEN</text></svg>" },
  { id: "req_2", nip: "6628", date: "2026-06-02", startTime: "17:00", endTime: "20:00", duration: 3.0, reason: "Rekonsiliasi Slik OJK", status: "Pending", atasan: "1234", imageUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e21a22'/><text x='50%' y='50%' font-size='10' fill='white' dominant-baseline='middle' text-anchor='middle'>DOKUMEN SLIK</text></svg>" }
];

// Item navigasi aplikasi didefinisikan secara global
const navItems = [
  { id: 'pengajuan', label: 'Pengajuan Lembur', icon: Clock, roles: ['maker', 'approval', 'manager', 'admin'] },
  { id: 'approval', label: 'Approval Lembur', icon: CheckSquare, roles: ['approval', 'manager', 'admin'] },
  { id: 'laporan_statistik', label: 'Laporan & Statistik', icon: FileText, roles: ['maker', 'approval', 'manager', 'admin'] },
  { id: 'pegawai', label: 'Data Pegawai', icon: Users, roles: ['admin'] },
  { id: 'parameter', label: 'Parameter', icon: Settings, roles: ['admin'] },
  { id: 'simulator', label: 'Simulator Data', icon: Database, roles: ['admin'] },
];

const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config
  ? JSON.parse(__firebase_config)
  : {
      apiKey: getEnv('VITE_FIREBASE_API_KEY') || "AIzaSyCMUqxl3MhFp-TneyOBFohDYmi_XBUXRfs",
      authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || "overtime-app-22175.firebaseapp.com",
      projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || "overtime-app-22175",
      storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || "overtime-app-22175.storagebucket.app",
      messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || "661655668561",
      appId: getEnv('VITE_FIREBASE_APP_ID') || "1:661655668561:web:4e9983976b624de10cb570"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : (getEnv('VITE_APP_ID') || 'default-app-id');
const appId = String(rawAppId).replace(/\//g, '_');

// --- EXPONENTIAL BACKOFF RETRY HELPER ---
const runWithRetry = async (fn) => {
  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try { return await fn(); } 
    catch (err) {
      if (i === 4) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

// --- PURE JAVASCRIPT SHA-256 ---
const sha256 = (ascii) => {
  function rightRotate(value, amount) { return (value >>> amount) | (value << (32 - amount)); }
  var mathPow = Math.pow; var maxWord = mathPow(2, 32); var lengthProperty = 'length'; var i, j; var result = '';
  var words = []; var asciiLength = ascii[lengthProperty]; var hash = []; var k = []; var primeCounter = 0;
  var isCandidate = {};
  for (var candidate = 2; primeCounter < 64; candidate++) {
    if (!isCandidate[candidate]) {
      for (i = candidate; i < 313; i += candidate) isCandidate[i] = true;
      hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
    }
  }
  ascii += '\x80'; 
  while (ascii[lengthProperty] % 64 - 56) ascii += '\x00'; 
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return; 
    words[i >> 2] |= j << ((3 - i) % 4 * 8);
  }
  words[words[lengthProperty]] = ((asciiLength * 8) / maxWord) | 0;
  words[words[lengthProperty]] = (asciiLength * 8);
  for (j = 0; j < words[lengthProperty]; j += 16) {
    var w = words.slice(j, j + 16); var oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      var w16 = w[i - 16], w15 = w[i - 15], w7 = w[i - 7], w2 = w[i - 2];
      var a = hash[0], e = hash[4], g = hash[6], h = hash[7];
      var temp1 = h + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e & hash[5]) ^ (~e & g)) + k[i] +
        (w[i] = (i < 16) ? w[i] : (w16 + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3)) + w7 + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0);
      var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2])); 
      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      var b = (hash[i] >> (j * 8)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
};

const hashPassword = (password, salt) => {
  return sha256(password + salt + "BTN-KC-MAMUJU-SECURE-SALT-2026");
};

export default function App() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [user, setUser] = useState(null); 
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authOrFirestoreError, setAuthOrFirestoreError] = useState(null);
  
  const [employees, setEmployees] = useState(INITIAL_DEMO_EMPLOYEES);
  const [requests, setRequests] = useState(INITIAL_DEMO_REQUESTS);
  const [params, setParams] = useState({ maxPerDay: 10, maxPerMonth: 40 });

  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('pengajuan');

  const [isPrintMode, setIsPrintMode] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [selectedNip, setSelectedNip] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [pendingPasswordChangeUser, setPendingPasswordChangeUser] = useState(null);
  const [newPasswordForm, setNewPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [newPasswordError, setNewPasswordError] = useState('');

  const [showLupaPassword, setShowLupaPassword] = useState(false);
  const [lupaNip, setLupaNip] = useState('');
  const [lupaPasswordError, setLupaPasswordError] = useState('');

  const [dialog, setDialog] = useState(null); 
  
  const pendingResets = useMemo(() => employees.filter(e => e.resetRequested), [employees]);
  const [showResetRequestsModal, setShowResetRequestsModal] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const BTN_LOGO_FALLBACK = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 50'%3E%3Ctext x='5' y='42' font-family='system-ui, -apple-system, sans-serif' font-weight='950' font-size='45' fill='%23006cb7' letter-spacing='-3'%3Ebtn%3C/text%3E%3Cpolygon points='68,14 92,6 88,2 64,10' fill='%23e21a22' /%3E%3C/svg%3E";

  // --- MULTI-CDN ROBUST SCRIPT LOADER ---
  useEffect(() => {
    if (!window.XLSX) {
      const loadScript = (src) => {
        return new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = src; script.async = true;
          script.onload = () => resolve(true); script.onerror = () => resolve(false);
          document.body.appendChild(script);
        });
      };
      const initLoad = async () => {
        let success = await loadScript('https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js');
        if (!success) success = await loadScript('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
        if (!success) await loadScript('https://unpkg.com/xlsx@0.18.5/dist/xlsx.full.min.js');
      };
      initLoad();
    }
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
    setIsAppInstalled(isStandalone);
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (/iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase()) && !isStandalone) setIsIosPromptVisible(true);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const getEmployeeName = (nip) => {
    const emp = employees.find(e => e.nip === nip);
    return emp ? emp.name : nip;
  };

  const handleLogout = () => {
    setCurrentUser(null);
    const lastNip = localStorage.getItem('last_logged_in_nip');
    setSelectedNip(lastNip && employees.some(e => e.nip === lastNip) ? lastNip : (employees[0]?.nip || ''));
    setEnteredPassword('');
    setPasswordError(false);
  };

  // 1. KONEKSI & AUTENTIKASI FIREBASE SELALU AKTIF
  useEffect(() => {
    setIsDemoMode(false);
    setLoading(true);
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        setIsAuthed(true);
      } catch (err) {
        try { 
          await signInAnonymously(auth); 
          setIsAuthed(true); 
        } catch (e) { 
          setAuthOrFirestoreError("auth-failed"); 
          setLoading(false); 
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  // 2. LIVE FIRESTORE SUBSCRIPTIONS
  useEffect(() => {
    if (isDemoMode || !user || !isAuthed) return;
    
    const empRef = collection(db, 'artifacts', appId, 'public', 'data', 'employees');
    const unsubEmp = onSnapshot(empRef, (snap) => {
      let emps = snap.docs.map(d => d.data());
      
      // Jika database di Canvas kosong, otomatis isi dengan data Hengki dkk
      if (snap.empty) {
        emps = [...INITIAL_DEMO_EMPLOYEES];
        INITIAL_DEMO_EMPLOYEES.forEach(emp => {
          runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.nip), emp));
        });
      } else if (!emps.some(e => e.role === 'admin' || e.role === 'manager')) {
        // Fallback jika tidak ada admin sama sekali
        emps = [{ nip: 'admin', name: 'Administrator (Darurat)', position: 'System Admin', noHandphone: '-', role: 'admin', atasan: '', passwordHash: '', passwordChanged: false }, ...emps];
      }
      setEmployees(emps);
      setLoading(false); 
    }, (e) => {
      if (e.code === 'permission-denied') setAuthOrFirestoreError("permission-denied");
      setLoading(false);
    });

    const reqRef = collection(db, 'artifacts', appId, 'public', 'data', 'requests');
    const unsubReq = onSnapshot(reqRef, (snap) => {
      let reqs = snap.docs.map(d => d.data());
      
      // Isi data lembur awal jika kosong
      if (snap.empty) {
        reqs = [...INITIAL_DEMO_REQUESTS];
        INITIAL_DEMO_REQUESTS.forEach(req => {
          runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id), req));
        });
      }
      setRequests(reqs);
    });

    const paramRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'params');
    const unsubParam = onSnapshot(paramRef, (snap) => {
      if (snap.exists()) setParams(snap.data());
      else runWithRetry(() => setDoc(paramRef, { maxPerDay: 10, maxPerMonth: 40 }));
    });

    return () => { unsubEmp(); unsubReq(); unsubParam(); };
  }, [user, isAuthed, isDemoMode]);

  useEffect(() => {
    if (employees.length > 0 && !selectedNip) {
      const lastNip = localStorage.getItem('last_logged_in_nip');
      if (lastNip && employees.some(e => e.nip === lastNip)) setSelectedNip(lastNip);
      else setSelectedNip(employees[0].nip);
    }
  }, [employees]);

  // 3. LOGIKA AKSI LOGIN & KREDENSIAL
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    const targetEmp = employees.find(emp => emp.nip === selectedNip);
    if (!targetEmp) return;
    localStorage.setItem('last_logged_in_nip', targetEmp.nip);

    const enteredHash = hashPassword(enteredPassword, targetEmp.nip);
    let isValid = false;
    let mustMigrate = false;

    if (targetEmp.passwordHash) {
      isValid = (enteredHash === targetEmp.passwordHash);
    } else {
      const plainPassword = targetEmp.password || targetEmp.nip;
      isValid = (enteredPassword === plainPassword);
      mustMigrate = true;
    }

    if (isValid) {
      setPasswordError(false);
      setEnteredPassword('');

      const activeUser = { ...targetEmp };
      if (mustMigrate) {
        activeUser.passwordHash = enteredHash;
        delete activeUser.password;
        if (isDemoMode) {
          setEmployees(prev => prev.map(emp => emp.nip === targetEmp.nip ? activeUser : emp));
        } else {
          try { await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', targetEmp.nip), activeUser)); } catch (err) {}
        }
      }

      setCurrentUser(activeUser);

      const isDefaultPassword = enteredPassword === targetEmp.nip || !targetEmp.passwordChanged;
      if (isDefaultPassword) setPendingPasswordChangeUser(activeUser);
      else setActiveTab('pengajuan');
    } else {
      setPasswordError(true);
    }
  };

  const handleSaveForcePassword = async (e) => {
    e.preventDefault();
    setNewPasswordError('');
    const pwd = newPasswordForm.password;
    const confirm = newPasswordForm.confirmPassword;

    if (pwd.length < 6) return setNewPasswordError('Kata sandi minimal berisi 6 digit.');
    if (!/^\d+$/.test(pwd)) return setNewPasswordError('Kata sandi wajib hanya terdiri dari angka (0-9).');
    if (pwd !== confirm) return setNewPasswordError('Konfirmasi kata sandi tidak cocok.');

    try {
      const hashedPassword = hashPassword(pwd, pendingPasswordChangeUser.nip);
      const updatedUser = { ...pendingPasswordChangeUser, passwordHash: hashedPassword, passwordChanged: true };
      delete updatedUser.password;

      if (isDemoMode) setEmployees(prev => prev.map(emp => emp.nip === pendingPasswordChangeUser.nip ? updatedUser : emp));
      else await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', pendingPasswordChangeUser.nip), updatedUser));

      setCurrentUser(updatedUser);
      setPendingPasswordChangeUser(null);
      setNewPasswordForm({ password: '', confirmPassword: '' });
      setActiveTab('pengajuan');
      setDialog({ type: 'alert', title: 'Sandi Diperbarui', message: 'Kata sandi default Anda berhasil diganti dengan enkripsi kriptografi SHA-256. Gunakan kata sandi baru ini untuk login berikutnya.' });
    } catch (err) {
      setNewPasswordError('Gagal memperbarui sandi ke database.');
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLupaPasswordError('');
    const emp = employees.find(e => e.nip === lupaNip);
    if (!emp) return setLupaPasswordError('NIP tidak terdaftar di sistem.');

    try {
      if (isDemoMode) setEmployees(prev => prev.map(e => e.nip === emp.nip ? { ...e, resetRequested: true } : e));
      else await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.nip), { ...emp, resetRequested: true }));
      
      setShowLupaPassword(false);
      setLupaNip('');
      setDialog({ type: 'alert', title: 'Permintaan Terkirim', message: `Permintaan reset kata sandi untuk NIP ${emp.nip} telah berhasil dikirim ke Administrator.` });
    } catch (err) {
      setLupaPasswordError('Gagal mengirim permintaan ke server database.');
    }
  };

  const handleApproveReset = async (emp) => {
    try {
      const defaultHash = hashPassword(emp.nip, emp.nip);
      const updatedUser = { ...emp, passwordHash: defaultHash, passwordChanged: false, resetRequested: false };
      delete updatedUser.password;

      if (isDemoMode) setEmployees(prev => prev.map(e => e.nip === emp.nip ? updatedUser : e));
      else await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.nip), updatedUser));
      
      setDialog({ type: 'alert', title: 'Berhasil', message: `Kata sandi untuk ${emp.name} telah direset kembali menjadi default (NIP) dan dienkripsi.` });
      if (pendingResets.length <= 1) setShowResetRequestsModal(false);
    } catch (err) {
      setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal mereset kata sandi pegawai.' });
    }
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') { setDeferredPrompt(null); setIsAppInstalled(true); }
    } else if (isIosPromptVisible) {
      setDialog({ type: 'alert', title: 'Install di iPhone / iPad', message: 'Untuk memasang aplikasi ini: Ketuk ikon "Bagikan" (Share) di browser Safari, lalu pilih "Tambah ke Layar Utama" (Add to Home Screen).' });
    }
  };

  const handleReviewAction = async (req, action) => {
    if (action === 'Revisi' && !reviewComment.trim()) return setReviewError('Keterangan revisi wajib diisi untuk memberi tahu maker!');
    setDialog(null);
    const updatedReq = { ...req, status: action, approvalComment: reviewComment.trim() };

    try {
      if (isDemoMode) {
        setRequests(prev => prev.map(r => r.id === req.id ? updatedReq : r));
        setDialog({ type: 'alert', title: 'Sukses', message: `Pengajuan lembur diproses: ${action}. (Mode Demo)` });
      } else {
        await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id.toString()), updatedReq));
        setDialog({ type: 'alert', title: 'Sukses', message: `Pengajuan lembur diproses: ${action}.` });
      }
    } catch (err) {
      setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal memproses persetujuan di database.' });
    }
  };

  const dialogComponent = dialog ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900 bg-opacity-60 p-4 backdrop-blur-sm no-print">
      <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full ${dialog.type === 'lightbox' || dialog.type === 'review' ? 'max-w-lg' : 'max-w-sm'}`}>
        <div className="p-6">
          {dialog.type === 'lightbox' ? (
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-bold text-slate-800 mb-3 self-start">{dialog.title}</h3>
              <div className="w-full bg-slate-50 border rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4">
                <img src={dialog.imageUrl} alt="Pratinjau" className="max-h-[60vh] max-w-full object-contain rounded-lg shadow-sm" />
              </div>
              <div className="w-full flex justify-end">
                <button onClick={() => setDialog(null)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all shadow-md cursor-pointer">Tutup</button>
              </div>
            </div>
          ) : dialog.type === 'review' ? (
            <div className="flex flex-col text-left">
              <h3 className="text-lg font-bold text-slate-800 mb-3">{dialog.title}</h3>
              <div className="w-full bg-slate-100 border rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4 max-h-[35vh]">
                <img src={dialog.request.imageUrl} alt="Foto Bukti Lembur" className="max-h-[32vh] object-contain rounded-lg cursor-pointer hover:opacity-90" onClick={() => setDialog({ type: 'lightbox', title: `Pratinjau Bukti Detail`, imageUrl: dialog.request.imageUrl })} />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Pegawai:</span><span className="font-semibold text-slate-800">{getEmployeeName(dialog.request.nip)} ({dialog.request.nip})</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Tanggal:</span><span className="font-semibold text-slate-800">{dialog.request.date}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Waktu:</span><span className="font-semibold text-slate-800">{dialog.request.startTime} - {dialog.request.endTime}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Durasi:</span><span className="font-semibold text-slate-800">{dialog.request.duration.toFixed(1)} Jam</span></div>
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan / Keterangan Atasan <span className="text-red-500 font-normal ml-1">* Wajib diisi jika pilih Revisi</span></label>
                <textarea value={reviewComment} onChange={(e) => { setReviewComment(e.target.value); setReviewError(''); }} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50" rows="2" placeholder="Ketik keterangan revisi, alasan penolakan..."></textarea>
                {reviewError && <p className="text-[11px] text-red-500 mt-1.5 flex items-center font-bold"><AlertCircle size={12} className="mr-1"/> {reviewError}</p>}
              </div>
              <div className="flex justify-end gap-2.5">
                <button onClick={() => setDialog(null)} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">Batal</button>
                <button onClick={() => handleReviewAction(dialog.request, 'Reject')} className="px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1"><X size={14}/> Reject</button>
                <button onClick={() => handleReviewAction(dialog.request, 'Revisi')} className="px-3 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1"><Camera size={14}/> Revisi</button>
                <button onClick={() => handleReviewAction(dialog.request, 'Approved')} className="px-3 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1"><Check size={14}/> Approve</button>
              </div>
            </div>
          ) : (
            <div className="text-left">
              <h3 className="text-lg font-bold text-slate-800 mb-2 flex items-center">
                {dialog.isDanger ? <AlertTriangle className="text-red-500 mr-2" size={20}/> : <AlertCircle className="text-blue-500 mr-2" size={20}/>}
                {dialog.title}
              </h3>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">{dialog.message}</p>
              <div className="flex justify-end gap-3">
                {dialog.type === 'confirm' && <button onClick={() => setDialog(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">Batal</button>}
                <button onClick={() => { if (dialog.onConfirm) dialog.onConfirm(); setDialog(null); }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer ${dialog.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {dialog.type === 'confirm' ? 'Ya, Lanjutkan' : 'Tutup'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : null;

  if (authOrFirestoreError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-slate-100 font-sans" style={{ backgroundColor: '#0b1329' }}>
        <div className="bg-white text-slate-800 rounded-2xl shadow-2xl p-8 max-w-lg w-full border border-slate-200">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-red-50 rounded-full mb-3 text-red-600"><AlertTriangle size={36} className="animate-bounce" /></div>
            <h1 className="text-xl font-bold text-slate-800">Koneksi Database Terhambat</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Aplikasi mendeteksi adanya kendala hak akses atau kegagalan autentikasi Firebase.</p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold text-sm transition-all shadow-md mt-6 flex items-center justify-center gap-2 cursor-pointer"><Database size={16} /> Coba Hubungkan Kembali</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Clock className="animate-spin text-blue-500 mb-4" size={40} />
        <p className="text-slate-500 font-medium animate-pulse">Menyinkronkan data dengan Cloud Storage...</p>
      </div>
    );
  }

  if (!currentUser && pendingPasswordChangeUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#0b1329' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-amber-50 rounded-full mb-3 text-amber-600"><Key size={32} className="animate-bounce" /></div>
            <h1 className="text-xl font-bold text-slate-800">Wajib Ganti Kata Sandi</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Halo <strong>{pendingPasswordChangeUser.name}</strong>, Anda masih menggunakan kata sandi default. Silakan buat kata sandi baru Anda terlebih dahulu.</p>
          </div>
          <form onSubmit={handleSaveForcePassword} className="space-y-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Kata Sandi Baru (Angka)</label><input type="password" required inputMode="numeric" pattern="[0-9]*" placeholder="Minimal 6 digit angka" value={newPasswordForm.password} onChange={e => setNewPasswordForm({ ...newPasswordForm, password: e.target.value.replace(/[^0-9]/g, '') })} className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono text-center" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Konfirmasi Kata Sandi</label><input type="password" required inputMode="numeric" pattern="[0-9]*" placeholder="Ketik ulang kata sandi" value={newPasswordForm.confirmPassword} onChange={e => setNewPasswordForm({ ...newPasswordForm, confirmPassword: e.target.value.replace(/[^0-9]/g, '') })} className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono text-center" /></div>
            {newPasswordError && <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2.5 rounded-lg"><AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {newPasswordError}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setPendingPasswordChangeUser(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl font-semibold transition-all text-sm cursor-pointer">Kembali</button>
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold transition-all text-sm shadow-md cursor-pointer">Simpan & Masuk</button>
            </div>
          </form>
        </div>
        {dialogComponent}
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#0b1329' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100 relative animate-in fade-in">
          <div className="text-center mb-8 mt-4">
            <div className="inline-flex p-3 bg-blue-50 rounded-full mb-4"><img src="Bank_BTN_logo.png" alt="Bank BTN Logo" className="h-12 w-auto object-contain" onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} /></div>
            <h1 className="text-2xl font-bold text-slate-800">Overtime 244</h1>
            <p className="text-sm text-slate-500 mt-1">Kantor Cabang Mamuju</p>
          </div>
          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Pilih Akun Petugas</label>
              <select value={selectedNip} onChange={e => { setSelectedNip(e.target.value); setPasswordError(false); }} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 bg-slate-50 cursor-pointer">
                {employees.map(emp => <option key={emp.nip} value={emp.nip}>{emp.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Kata Sandi</label>
                <button type="button" onClick={() => setShowLupaPassword(true)} className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer">Lupa Kata Sandi?</button>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required placeholder="Password default = NIP" value={enteredPassword} onChange={e => { setEnteredPassword(e.target.value); setPasswordError(false); }} className={`w-full p-3 pl-10 pr-10 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${passwordError ? 'border-red-500 bg-red-50/50' : 'border-slate-300 bg-slate-50 font-mono tracking-wide'}`} />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer">{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>
              </div>
              {passwordError && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center"><AlertCircle size={14} className="mr-1" /> Kata sandi salah! Default: NIP Anda.</p>}
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold transition-all shadow-md mt-2 flex items-center justify-center cursor-pointer">Masuk ke Aplikasi</button>
          </form>
          {!isAppInstalled && (deferredPrompt || isIosPromptVisible) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={handleInstallPwa} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer">{isIosPromptVisible ? <Smartphone size={18} /> : <DownloadCloud size={18} />} Install Aplikasi (PWA)</button>
            </div>
          )}
          <div className="mt-6 text-center border-t border-slate-100 pt-5"><p className="text-[11px] text-slate-400 leading-relaxed">Sistem Otomasi Lembur Internal KC Mamuju.</p></div>
        </div>
        {showLupaPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3"><h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5"><ShieldCheck size={18} className="text-blue-600" /> Permintaan Reset Sandi</h3><button onClick={() => { setShowLupaPassword(false); setLupaNip(''); setLupaPasswordError(''); }} className="text-slate-400 hover:text-slate-600"><X size={18} /></button></div>
                <form onSubmit={handleRequestReset} className="space-y-4 text-left">
                  <p className="text-xs text-slate-500">Kirim permintaan notifikasi ke Admin untuk reset sandi ke default (NIP).</p>
                  <div><label className="block text-xs font-semibold text-slate-600 mb-1">Masukkan NIP Anda</label><input type="text" required placeholder="Contoh: 6628" value={lupaNip} onChange={e => setLupaNip(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-sm" /></div>
                  {lupaPasswordError && <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2 rounded"><AlertCircle size={14} className="mr-1" /> {lupaPasswordError}</p>}
                  <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setShowLupaPassword(false)} className="px-4 py-2.5 text-xs font-semibold bg-slate-100 rounded-xl">Batal</button><button type="submit" className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 rounded-xl">Kirim Permintaan</button></div>
                </form>
              </div>
            </div>
          </div>
        )}
        {dialogComponent}
      </div>
    );
  }

  // --- TAB VIEW: PENGAJUAN ---
  const PengajuanView = () => {
    const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '', reason: '', imageUrl: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [imageProcessing, setImageProcessing] = useState(false);
    const [myStatusFilter, setMyStatusFilter] = useState('all');
    const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 5, 1));

    const myRequests = requests.filter(r => r.nip === currentUser?.nip).sort((a,b) => b.id - a.id);
    const filteredMyRequests = useMemo(() => {
      if (myStatusFilter === 'all') return myRequests;
      return myRequests.filter(r => r.status.toLowerCase() === myStatusFilter.toLowerCase());
    }, [myRequests, myStatusFilter]);

    const calculateDuration = (start, end) => {
      if (!start || !end) return 0;
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      let startTotalMinutes = (startHour * 60) + startMin;
      let endTotalMinutes = (endHour * 60) + endMin;
      let diffMinutes = endTotalMinutes - startTotalMinutes;
      if (diffMinutes < 0) diffMinutes += (24 * 60); 
      return diffMinutes / 60;
    };

    const selectedMonth = formData.date ? formData.date.substring(0, 7) : new Date(2026, 5, 2).toISOString().substring(0, 7);
    const currentMonthRequests = requests.filter(r => r.nip === currentUser?.nip && r.date.startsWith(selectedMonth));
    const processedHours = currentMonthRequests.filter(r => r.status === 'Approved').reduce((sum, r) => sum + r.duration, 0);
    const pendingHours = currentMonthRequests.filter(r => r.status === 'Pending' || r.status === 'Revisi').reduce((sum, r) => sum + r.duration, 0);
    const remainingQuota = params.maxPerMonth - processedHours - pendingHours;

    const handleImageSelect = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setImageProcessing(true);
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          setFormData(prev => ({ ...prev, imageUrl: canvas.toDataURL('image/jpeg', 0.7) }));
          setImageProcessing(false);
        };
      };
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError(''); setSuccess('');
      const duration = calculateDuration(formData.startTime, formData.endTime);
      if (duration <= 0) return setError('Waktu mulai harus berbeda dengan waktu selesai.');
      if (!formData.imageUrl) return setError('Foto bukti lembur wajib diunggah.');
      const isDuplicateDate = requests.some(r => r.nip === currentUser?.nip && r.date === formData.date && r.status !== 'Reject' && r.status !== 'Rejected');
      if (isDuplicateDate) return setError(`Anda sudah memiliki pengajuan aktif pada tanggal tersebut.`);
      if (duration > params.maxPerDay) return setError(`Durasi melebihi limit harian (${params.maxPerDay} jam).`);
      if (processedHours + pendingHours + duration > params.maxPerMonth) return setError(`Akumulasi bulanan akan melebihi kuota (${params.maxPerMonth} jam).`);

      const id = Date.now().toString();
      const newRequest = { id, nip: currentUser.nip, date: formData.date, startTime: formData.startTime, endTime: formData.endTime, duration, reason: formData.reason, status: 'Pending', atasan: currentUser.atasan || '19720906', imageUrl: formData.imageUrl, approvalComment: '' };
      try {
        if (isDemoMode) setRequests(prev => [newRequest, ...prev]);
        else await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', id), newRequest));
        setSuccess('Pengajuan lembur berhasil dikirim.');
        setFormData({ date: '', startTime: '', endTime: '', reason: '', imageUrl: '' });
      } catch (err) { setError('Gagal menyimpan pengajuan.'); }
    };

    const handleCameraReupload = (e, requestId) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas'); canvas.width = 600; canvas.height = img.height * (600 / img.width);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            if (isDemoMode) setRequests(prev => prev.map(r => r.id === requestId ? { ...r, imageUrl: compressedBase64, status: 'Pending', approvalComment: '' } : r));
            else {
              const req = requests.find(r => r.id === requestId);
              if (req) await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', requestId), { ...req, imageUrl: compressedBase64, status: 'Pending', approvalComment: '' }));
            }
            setDialog({ type: 'alert', title: 'Berhasil', message: 'Bukti revisi berhasil diunggah.' });
          } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal memproses gambar.' }); }
        };
      };
    };

    const calendarDays = useMemo(() => {
      const year = calendarDate.getFullYear(); const month = calendarDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1).getDay(); const daysInMonth = new Date(year, month + 1, 0).getDate();
      const dayArray = [];
      for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) dayArray.push(null);
      for (let d = 1; d <= daysInMonth; d++) dayArray.push(new Date(year, month, d));
      return dayArray;
    }, [calendarDate]);

    const changeCalendarMonth = (val) => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + val, 1));
    const getDayOvertimeStatus = (dateObj) => {
      if (!dateObj) return null;
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const found = myRequests.find(r => r.date === formattedDate);
      return found ? found.status : null;
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 text-left">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Form Pengajuan Lembur Baru</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm"><AlertCircle size={18} className="mr-2 flex-shrink-0" /> {error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center text-sm"><Check size={18} className="mr-2 flex-shrink-0" /> {success}</div>}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label><input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg bg-white text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Alasan Lembur</label><input type="text" required placeholder="Contoh: Rekonsiliasi bulanan" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Kerja Mulai</label>
                <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" />
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-600 font-medium">
                  <div className="flex justify-between items-center font-sans"><span>Lembur Selesai (Approved):</span><span className="font-semibold text-green-600">{processedHours.toFixed(1)} Jam</span></div>
                  <div className="flex justify-between items-center font-sans"><span>Menunggu Review:</span><span className="font-semibold text-amber-600">{pendingHours.toFixed(1)} Jam</span></div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-200 font-sans"><span>Sisa Kuota Lembur:</span><span className={`font-bold ${remainingQuota <= 0 ? 'text-red-600' : 'text-blue-600'}`}>{Math.max(0, remainingQuota).toFixed(1)} Jam</span></div>
                </div>
              </div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Waktu Selesai</label><input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg text-sm" /></div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Unggah Foto Bukti Lembur (Wajib)</label>
                <input type="file" accept="image/*" required={!formData.imageUrl} onChange={handleImageSelect} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 cursor-pointer" />
                {imageProcessing && <p className="text-xs text-blue-500 mt-2 flex items-center"><Loader2 size={12} className="animate-spin mr-1.5"/> Memproses gambar...</p>}
                {formData.imageUrl && (
                  <div className="mt-3 relative inline-block"><img src={formData.imageUrl} className="h-28 rounded-lg border object-cover shadow-sm" alt="Preview Bukti" /><button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X size={12} /></button></div>
                )}
              </div>
              <div className="md:col-span-2 flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm flex items-center gap-1.5 cursor-pointer"><Plus size={16} /> Kirim Pengajuan</button></div>
            </form>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 text-left">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5"><Calendar size={16} className="text-blue-600" /> Kalender Aktivitas</h3>
              <div className="flex items-center gap-1">
                <button onClick={() => changeCalendarMonth(-1)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"><ChevronLeft size={16} /></button>
                <span className="text-xs font-semibold text-slate-700 min-w-[70px] text-center uppercase">{calendarDate.toLocaleString('id-ID', { month: 'short', year: 'numeric' })}</span>
                <button onClick={() => changeCalendarMonth(1)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer"><ChevronRight size={16} /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 border-b pb-1.5 mb-2"><span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span></div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="aspect-square"></div>;
                const status = getDayOvertimeStatus(day);
                let bgStyle = "hover:bg-slate-50 text-slate-800";
                if (status === 'Approved') bgStyle = "bg-green-500 text-white font-bold";
                else if (status === 'Pending') bgStyle = "bg-yellow-400 text-slate-900 font-bold animate-pulse";
                else if (status === 'Revisi') bgStyle = "bg-orange-500 text-white font-bold";
                else if (status === 'Reject' || status === 'Rejected') bgStyle = "bg-red-500 text-white font-bold";
                return <div key={`day-${idx}`} title={status ? `Status: ${status}` : ''} className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${bgStyle}`}>{day.getDate()}</div>;
              })}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg font-semibold text-slate-800 font-sans">Riwayat & Status Lembur</h2>
            <select value={myStatusFilter} onChange={e => setMyStatusFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 cursor-pointer">
              <option value="all">Status: Semua</option><option value="pending">Pending</option><option value="revisi">Revisi</option><option value="approved">Approved</option><option value="reject">Rejected</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs border-b">
                  <th className="p-3 font-medium font-sans">Tanggal</th><th className="p-3 font-medium font-sans">Waktu</th><th className="p-3 font-medium font-sans">Durasi</th><th className="p-3 font-medium font-sans">Alasan Lembur</th><th className="p-3 font-medium font-sans min-w-[200px]">Status & Bukti Foto</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyRequests.length === 0 ? <tr><td colSpan="5" className="p-4 text-center text-slate-500 text-sm">Tidak ada riwayat lembur.</td></tr> : (
                  filteredMyRequests.map(req => (
                    <tr key={req.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap">{req.date}</td><td className="p-3 whitespace-nowrap">{req.startTime} - {req.endTime}</td><td className="p-3 font-semibold text-blue-600">{req.duration.toFixed(1)} j</td><td className="p-3 truncate max-w-[200px]" title={req.reason}>{req.reason}</td>
                      <td className="p-3">
                        <div className="flex flex-col gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium self-start ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : (req.status === 'Reject' || req.status === 'Rejected') ? 'bg-red-100 text-red-700' : req.status === 'Revisi' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                          {req.approvalComment && <div className="text-[10px] p-1.5 rounded bg-slate-50 border text-slate-700 max-w-[220px]"><strong className="font-bold">Komentar:</strong> {req.approvalComment}</div>}
                          <div className="flex items-center gap-2 mt-1">
                            {req.imageUrl && <img src={req.imageUrl} alt="Bukti" onClick={() => setDialog({ type: 'lightbox', title: 'Bukti Foto', imageUrl: req.imageUrl })} className="w-8 h-8 object-cover rounded shadow-xs border cursor-zoom-in hover:opacity-80" />}
                            {req.status === 'Revisi' && (
                              <><label htmlFor={`reupload-${req.id}`} className="flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-[10px] font-bold cursor-pointer border border-blue-200"><Camera size={12} /> Re-upload</label><input type="file" accept="image/*" id={`reupload-${req.id}`} onChange={(e) => handleCameraReupload(e, req.id)} className="hidden" /></>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- TAB VIEW: APPROVAL ATASAN ---
  const ApprovalView = () => {
    const activeRequests = requests.filter(r => {
      const isBawahan = r.atasan === currentUser?.nip || currentUser?.role === 'admin' || currentUser?.role === 'manager';
      return isBawahan && r.status === 'Pending';
    });

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-left animate-in fade-in duration-200">
        <h2 className="text-lg font-semibold text-slate-800 mb-4 font-sans">Menunggu Review Anda</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b">
                <th className="p-3 font-medium font-sans">Nama Pegawai</th><th className="p-3 font-medium font-sans">Tanggal</th><th className="p-3 font-medium font-sans">Waktu (Durasi)</th><th className="p-3 font-medium font-sans">Alasan</th><th className="p-3 text-center font-sans">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {activeRequests.length === 0 ? <tr><td colSpan="5" className="p-6 text-center text-slate-500 text-sm">🎉 Semua pengajuan telah selesai di-review.</td></tr> : (
                activeRequests.map(req => (
                  <tr key={req.id} className="border-b text-sm hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800">{getEmployeeName(req.nip)} <span className="block text-[10px] text-slate-400 font-normal">{req.nip}</span></td><td className="p-3">{req.date}</td><td className="p-3">{req.startTime} - {req.endTime} <span className="font-bold text-blue-600">({req.duration.toFixed(1)} j)</span></td><td className="p-3 truncate max-w-xs">{req.reason}</td>
                    <td className="p-3 text-center"><button onClick={() => setDialog({ type: 'review', request: req, title: 'Review Bukti Lembur' })} className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer">Review Bukti</button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // --- TAB VIEW: LAPORAN (RESTORED FULL FEATURES & HIDDEN IFRAME PRINT) ---
  const LaporanView = () => {
    const [selectedMonth, setSelectedMonth] = useState('2026-06');
    const [selectedAtasan, setSelectedAtasan] = useState('all');
    const [selectedPegawai, setSelectedPegawai] = useState('all');

    const accessibleAtasan = useMemo(() => {
      const allAtasan = employees.filter(e => e.role === 'approval' || e.role === 'manager' || e.role === 'admin');
      if (currentUser?.role === 'admin') return allAtasan;
      if (currentUser?.role === 'manager') return allAtasan.filter(e => e.atasan === currentUser?.nip);
      return [];
    }, [employees, currentUser]);

    const accessiblePegawai = useMemo(() => {
      if (currentUser?.role === 'admin') return selectedAtasan === 'all' ? employees : employees.filter(e => e.atasan === selectedAtasan);
      if (currentUser?.role === 'manager') {
        if (selectedAtasan === 'all') {
          const downlinerAtasanNips = accessibleAtasan.map(a => a.nip);
          return employees.filter(e => e.atasan === currentUser?.nip || downlinerAtasanNips.includes(e.atasan));
        } else return employees.filter(e => e.atasan === selectedAtasan);
      }
      if (currentUser?.role === 'approval') return employees.filter(e => e.nip === currentUser?.nip || e.atasan === currentUser?.nip);
      return currentUser ? [currentUser] : [];
    }, [employees, currentUser, selectedAtasan, accessibleAtasan]);

    useEffect(() => {
      if (selectedPegawai !== 'all' && !accessiblePegawai.some(e => e.nip === selectedPegawai)) setSelectedPegawai('all');
    }, [accessiblePegawai, selectedPegawai]);

    const filteredRequests = useMemo(() => {
      const allowedNips = accessiblePegawai.map(p => p.nip);
      let list = requests.filter(r => allowedNips.includes(r.nip));
      if (selectedMonth) list = list.filter(r => r.date.startsWith(selectedMonth));
      if (selectedPegawai !== 'all') list = list.filter(r => r.nip === selectedPegawai);
      if (selectedAtasan !== 'all' && selectedPegawai === 'all') list = list.filter(r => r.atasan === selectedAtasan);
      return list;
    }, [requests, accessiblePegawai, selectedPegawai, selectedAtasan, selectedMonth]);

    const groupedData = useMemo(() => {
      const groups = {};
      filteredRequests.forEach(req => {
        if (!groups[req.nip]) groups[req.nip] = { nip: req.nip, name: getEmployeeName(req.nip), requests: [] };
        groups[req.nip].requests.push(req);
      });
      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredRequests, employees]);

    const getFormattedMonthYear = (monthStr) => {
      if (!monthStr) return 'MMM YYYY';
      const [year, month] = monthStr.split('-');
      const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
      return `${months[parseInt(month, 10) - 1] || 'MMM'} ${year}`;
    };

    const getFormattedDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    };

    const handlePrintNative = () => {
      if (filteredRequests.length === 0) return setDialog({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data lembur pada filter saat ini.' });
      setDialog({ type: 'alert', title: 'Menyiapkan Laporan', message: 'Sedang merakit dokumen untuk dicetak...' });

      let html = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Laporan Lembur - KC Mamuju</title>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #000; padding: 0; margin: 0; }
              .page { padding: 20px; page-break-after: always; box-sizing: border-box; }
              .page:last-child { page-break-after: auto; }
              .header { margin-bottom: 20px; font-weight: bold; }
              .title { font-size: 14px; margin-top: 15px; margin-bottom: 5px; }
              table.info { margin-bottom: 15px; border-collapse: collapse; }
              table.info td { padding: 3px 15px 3px 0; border: none; font-size: 12px; }
              table.data { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              table.data th, table.data td { border: 1px solid #000; padding: 8px; font-size: 11px; }
              table.data th { background-color: #f1f5f9; text-align: center; font-weight: bold; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              @media print { @page { margin: 10mm; size: A4 portrait; } }
            </style>
          </head>
          <body>
      `;

      groupedData.forEach(group => {
        const approvedTotal = group.requests.filter(r => r.status === 'Approved' || r.status === 'Registered').reduce((sum, r) => sum + r.duration, 0);
        const rejectTotal = group.requests.filter(r => r.status === 'Reject' || r.status === 'Rejected').reduce((sum, r) => sum + r.duration, 0);

        html += `
          <div class="page">
            <div class="header"><div>PT. BANK TABUNGAN NEGARA (PERSERO) TBK</div><div>KANTOR CABANG MAMUJU</div><div class="title">LAPORAN RINCIAN LEMBUR</div><div style="font-weight: normal; font-size: 11px;">BULAN : ${getFormattedMonthYear(selectedMonth)}</div></div>
            <table class="info"><tr><td class="font-bold">NAMA</td><td>: ${group.name.toUpperCase()}</td></tr><tr><td class="font-bold">NIP</td><td>: ${group.nip}</td></tr></table>
            <table class="data">
              <thead><tr><th style="width: 15%;">Tanggal</th><th style="width: 25%;">Waktu Kerja</th><th style="width: 15%;">Durasi</th><th style="width: 30%;">Alasan Lembur</th><th style="width: 15%;">Status</th></tr></thead>
              <tbody>
        `;
        group.requests.forEach(req => {
          html += `<tr><td class="text-center">${getFormattedDate(req.date)}</td><td class="text-center">${req.startTime} - ${req.endTime}</td><td class="text-center font-bold">${req.duration.toFixed(1)} j</td><td>${req.reason}</td><td class="text-center">${req.status}</td></tr>`;
        });
        html += `<tr><td colspan="5" class="font-bold" style="background-color: #f8fafc;"><div style="color: #0284c7;">Approved: ${approvedTotal.toFixed(1)} jam</div><div style="color: #ef4444;">Reject: ${rejectTotal.toFixed(1)} jam</div></td></tr></tbody></table></div>`;
      });
      html += `</body></html>`;

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute'; printFrame.style.top = '-10000px'; printFrame.style.width = '100%'; printFrame.style.height = '100%';
      document.body.appendChild(printFrame);
      printFrame.contentWindow.document.open(); printFrame.contentWindow.document.write(html); printFrame.contentWindow.document.close();

      setTimeout(() => {
        setDialog(null);
        printFrame.contentWindow.focus(); printFrame.contentWindow.print();
        setTimeout(() => document.body.removeChild(printFrame), 3000);
      }, 500);
    };

    const handleExportExcel = () => {
      if (!window.XLSX) return setDialog({ type: 'alert', title: 'Sistem Belum Siap', message: 'Library XLSX belum termuat sepenuhnya.' });
      if (filteredRequests.length === 0) return setDialog({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data lembur pada filter saat ini untuk diekspor.' });

      const rawExportData = filteredRequests.map(r => ({
        NIP: r.nip, Nama: getEmployeeName(r.nip), Tanggal: r.date, 'Waktu Kerja': `${r.startTime} - ${r.endTime}`,
        'Durasi (Jam)': r.duration, 'Alasan Lembur': r.reason, Status: r.status, Atasan: getEmployeeName(r.atasan) || '-'
      }));
      const worksheet = window.XLSX.utils.json_to_sheet(rawExportData);
      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian Lembur");
      window.XLSX.writeFile(workbook, `Laporan_Lembur_BTN_Mamuju_${selectedMonth}.xlsx`);
    };

    return (
      <div id="laporan-view-container" className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print-full-width">
        <style>{`.a4-sheet { width: 210mm; min-height: 297mm; padding: 15mm 20mm; margin: 0 auto 20px auto; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.15); box-sizing: border-box; color: black; }`}</style>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 no-print">
          <h2 className="text-lg font-semibold text-slate-800">Laporan Lembur</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm bg-white" />
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (
              <select value={selectedAtasan} onChange={e => { setSelectedAtasan(e.target.value); setSelectedPegawai('all'); }} className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[180px] cursor-pointer"><option value="all">-- Semua Atasan --</option>{accessibleAtasan.map(emp => (<option key={emp.nip} value={emp.nip}>{emp.name}</option>))}</select>
            )}
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'approval') && (
              <select value={selectedPegawai} onChange={e => setSelectedPegawai(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[180px] cursor-pointer"><option value="all">-- Semua Pegawai --</option>{accessiblePegawai.map(emp => (<option key={emp.nip} value={emp.nip}>{emp.name}</option>))}</select>
            )}
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-sm justify-center cursor-pointer flex-1 sm:flex-none"><Download size={16} className="mr-2" /> Excel</button>
              <button onClick={() => setIsPrintMode(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-sm justify-center cursor-pointer flex-1 sm:flex-none"><Printer size={16} className="mr-2" /> Pratinjau & Cetak</button>
            </div>
          </div>
        </div>

        {groupedData.length === 0 ? <div className="text-center py-10 text-slate-400 no-print font-medium">Tidak ada data lembur terfilter.</div> : (
          <div className="space-y-12 no-print">
            {groupedData.map(group => {
              const approvedTotal = group.requests.filter(r => r.status === 'Approved' || r.status === 'Registered').reduce((sum, r) => sum + r.duration, 0);
              const rejectTotal = group.requests.filter(r => r.status === 'Reject' || r.status === 'Rejected').reduce((sum, r) => sum + r.duration, 0);
              return (
                <div key={group.nip} className="border border-slate-100 p-6 rounded-xl bg-white shadow-xs">
                  <div className="mb-5 text-left font-sans text-black border-b pb-4">
                    <div className="font-bold text-xs tracking-wide">PT. BANK TABUNGAN NEGARA (PERSERO) TBK</div><div className="font-bold text-xs tracking-wide">KANTOR CABANG MAMUJU</div><div className="my-3"></div><div className="font-bold text-sm tracking-wide">LAPORAN RINCIAN LEMBUR</div><div className="font-bold text-xs">BULAN : {getFormattedMonthYear(selectedMonth)}</div>
                    <div className="mt-4 text-xs space-y-1.5"><div className="flex"><span className="w-16 font-bold text-slate-500">NAMA</span><span className="font-bold uppercase text-slate-800">: {group.name}</span></div><div className="flex"><span className="w-16 font-bold text-slate-500">NIP</span><span className="font-bold uppercase text-slate-800">: {group.nip}</span></div></div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-slate-50 text-slate-600 text-xs border-b"><th className="p-3 font-medium">Tanggal</th><th className="p-3 font-medium">Waktu Kerja</th><th className="p-3 font-medium">Durasi</th><th className="p-3 font-medium">Alasan Lembur</th><th className="p-3 font-medium">Status</th></tr></thead>
                      <tbody>
                        {group.requests.map(req => (
                          <tr key={req.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                            <td className="p-3 whitespace-nowrap">{getFormattedDate(req.date)}</td><td className="p-3 whitespace-nowrap">{req.startTime} - {req.endTime}</td><td className="p-3 font-semibold whitespace-nowrap">{req.duration.toFixed(1)} j</td><td className="p-3 text-slate-600">{req.reason}</td>
                            <td className="p-3 whitespace-nowrap"><div className="flex items-center gap-2"><span className={`px-2 py-1 rounded-full text-[10px] font-medium ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : (req.status === 'Reject' || req.status === 'Rejected') ? 'bg-red-100 text-red-700' : req.status === 'Registered' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>{req.imageUrl && <img src={req.imageUrl} alt="Bukti" onClick={() => setDialog({ type: 'lightbox', title: `Pratinjau Bukti (${group.name})`, imageUrl: req.imageUrl })} className="w-8 h-8 object-cover rounded-lg border border-slate-200 cursor-zoom-in shadow-xs hover:opacity-85" />}</div></td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold text-sm"><td colSpan="5" className="p-4 text-left"><div className="space-y-1 text-xs"><div className="text-blue-600 font-bold">Approved: {approvedTotal.toFixed(1)} jam</div><div className="text-red-500 font-bold">Reject: {rejectTotal.toFixed(1)} jam</div></div></td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* --- MODAL PRATINJAU DOKUMEN --- */}
        {isPrintMode && (
          <div className="fixed inset-0 bg-slate-800 bg-opacity-95 z-[999] p-4 sm:p-8 overflow-y-auto flex flex-col items-center">
            <div className="flex justify-between items-center bg-slate-900 border border-slate-700 text-white p-4 rounded-xl mb-6 shadow-lg w-full max-w-[210mm] sticky top-4 z-50">
              <div className="text-left"><p className="font-semibold text-sm">Pratinjau Kertas A4 (Native Layout)</p><p className="text-xs text-slate-400">Data lembur terbagi rapi 1 halaman untuk setiap petugas.</p></div>
              <div className="flex gap-2"><button onClick={handlePrintNative} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm"><Printer size={14}/> Cetak Native</button><button onClick={() => setIsPrintMode(false)} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"><X size={14}/> Tutup</button></div>
            </div>
            
            <div className="w-full flex flex-col items-center gap-6">
              {groupedData.map((group) => {
                const approvedTotal = group.requests.filter(r => r.status === 'Approved' || r.status === 'Registered').reduce((sum, r) => sum + r.duration, 0);
                const rejectTotal = group.requests.filter(r => r.status === 'Reject' || r.status === 'Rejected').reduce((sum, r) => sum + r.duration, 0);
                return (
                  <div key={group.nip} className="a4-sheet bg-white p-[20mm] rounded shadow-2xl border border-slate-300 text-black text-left flex flex-col justify-between font-sans">
                    <div>
                      <div className="border-b pb-4 mb-4"><p className="font-bold text-[11px] tracking-wider text-slate-900 leading-tight">PT. BANK TABUNGAN NEGARA (PERSERO) TBK</p><p className="font-bold text-[11px] tracking-wider text-slate-900 leading-tight">KANTOR CABANG MAMUJU</p><p className="font-bold text-sm tracking-widest text-slate-800 mt-4 underline decoration-solid">LAPORAN RINCIAN LEMBUR</p><p className="text-xs font-semibold text-slate-600 mt-1 uppercase">BULAN: {getFormattedMonthYear(selectedMonth)}</p></div>
                      <table className="mb-4"><tbody><tr className="text-xs font-bold text-slate-800"><td className="w-16">NAMA</td><td>: {group.name.toUpperCase()}</td></tr><tr className="text-xs font-bold text-slate-800"><td>NIP</td><td>: {group.nip}</td></tr></tbody></table>
                      <table className="w-full border-collapse border border-slate-400 text-xs text-slate-800">
                        <thead><tr className="bg-slate-100 border-b border-slate-400 font-bold"><th className="p-2 border border-slate-400 text-center">Tanggal</th><th className="p-2 border border-slate-400 text-center">Waktu Kerja</th><th className="p-2 border border-slate-400 text-center">Durasi</th><th className="p-2 border border-slate-400">Alasan Lembur</th><th className="p-2 border border-slate-400 text-center">Status</th></tr></thead>
                        <tbody>
                          {group.requests.map(req => (
                            <tr key={req.id} className="border-b border-slate-400"><td className="p-2 border border-slate-400 text-center">{getFormattedDate(req.date)}</td><td className="p-2 border border-slate-400 text-center">{req.startTime} - {req.endTime}</td><td className="p-2 border border-slate-400 text-center font-bold text-slate-900">{req.duration.toFixed(1)} j</td><td className="p-2 border border-slate-400">{req.reason}</td><td className="p-2 border border-slate-400 text-center">{req.status}</td></tr>
                          ))}
                          <tr className="font-bold bg-slate-50"><td colSpan="5" className="p-2.5 border border-slate-400 text-slate-900"><div className="flex justify-between"><span>Approved: {approvedTotal.toFixed(1)} Jam</span><span className="text-red-600">Reject: {rejectTotal.toFixed(1)} Jam</span></div></td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- TAB VIEW: STATISTIK (RESTORED PROGRESS BARS) ---
  const StatistikView = () => {
    const [selectedMonth, setSelectedMonth] = useState('2026-06');
    const metrics = useMemo(() => {
      let filtered = requests.filter(r => (r.status === 'Approved' || r.status === 'Registered') && r.date.startsWith(selectedMonth));
      const totalJam = filtered.reduce((sum, r) => sum + r.duration, 0);
      const uniqueEmps = new Set(filtered.map(r => r.nip)).size;
      return { totalJam, totalPegawai: uniqueEmps, averageJam: uniqueEmps > 0 ? totalJam / uniqueEmps : 0, frekuensi: filtered.length };
    }, [requests, selectedMonth]);

    const statsData = useMemo(() => {
      let filtered = requests.filter(r => (r.status === 'Approved' || r.status === 'Registered') && r.date.startsWith(selectedMonth));
      const aggregate = {};
      filtered.forEach(req => {
        if (!aggregate[req.nip]) aggregate[req.nip] = { nip: req.nip, name: getEmployeeName(req.nip), totalJam: 0, count: 0 };
        aggregate[req.nip].totalJam += req.duration;
        aggregate[req.nip].count += 1;
      });
      return Object.values(aggregate).sort((a,b) => b.totalJam - a.totalJam);
    }, [requests, selectedMonth, employees]);

    const maxHoursChart = Math.max(params.maxPerMonth, ...statsData.map(d => d.totalJam));

    return (
      <div className="space-y-6 text-left animate-in fade-in duration-200">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Statistik Lembur (Approved)</h2>
          <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm bg-white" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Total Jam Lembur</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.totalJam.toFixed(1)} <span className="text-sm font-normal">Jam</span></p></div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Pegawai Terlibat</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.totalPegawai} <span className="text-sm font-normal">Karyawan</span></p></div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Rerata Jam Kerja</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.averageJam.toFixed(1)} <span className="text-sm font-normal">Jam/Peg</span></p></div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Total Frekuensi</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.frekuensi} <span className="text-sm font-normal">Sesi</span></p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-4 font-sans">Beban Jam Lembur per Karyawan</h3>
          {statsData.length === 0 ? <div className="text-center text-slate-500 py-8 text-sm">Tidak ada data lembur yang terekam pada periode ini.</div> : (
            <div className="space-y-6">
              {statsData.map(stat => (
                <div key={stat.nip}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-slate-800">{stat.name} <span className="text-slate-400 font-normal text-xs">({stat.nip})</span></span><span className="font-semibold text-blue-600">{stat.totalJam.toFixed(1)} Jam <span className="text-slate-400 font-normal text-xs ml-1">/ {params.maxPerMonth} jam limit</span></span></div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden shadow-inner"><div className={`h-full rounded-full transition-all duration-500 ${stat.totalJam > params.maxPerMonth ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`} style={{ width: `${Math.min((stat.totalJam / maxHoursChart) * 100, 100)}%` }}></div></div>
                  <p className="text-xs text-slate-500 mt-1">Total frekuensi lembur: {stat.count} kali</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- TAB VIEW WRAPPER: LAPORAN & STATISTIK ---
  const LaporanStatistikView = () => {
    const [activeSubTab, setActiveSubTab] = useState('laporan');
    const canSeeStatistik = ['admin', 'manager', 'approval'].includes(currentUser?.role);

    return (
      <div className="space-y-4 animate-in fade-in duration-200 text-left">
        <div className="flex bg-white rounded-xl p-1 shadow-xs border border-slate-200 gap-1 w-full max-w-md no-print">
          <button type="button" onClick={() => setActiveSubTab('laporan')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'laporan' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
            Data Laporan
          </button>
          {canSeeStatistik && (
            <button type="button" onClick={() => setActiveSubTab('statistik')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'statistik' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
              Statistik Kinerja
            </button>
          )}
        </div>

        <div>
          {activeSubTab === 'laporan' && <LaporanView />}
          {activeSubTab === 'statistik' && canSeeStatistik && <StatistikView />}
        </div>
      </div>
    );
  };

  // --- TAB VIEW: PEGAWAI ---
  const PegawaiView = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' });
    const [importSuccess, setImportSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const handleSave = async (e) => {
      e.preventDefault();
      try {
        const defaultHash = hashPassword(editForm.nip, editForm.nip);
        const newEmp = { ...editForm, passwordHash: defaultHash, passwordChanged: false };
        delete newEmp.password;

        if (isDemoMode) {
          if (isEditing) setEmployees(prev => prev.map(emp => emp.nip === editForm.nip ? newEmp : emp));
          else setEmployees(prev => [...prev, newEmp]);
          setDialog({ type: 'alert', title: 'Berhasil', message: 'Pegawai berhasil disimpan!' });
        } else {
          await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', editForm.nip), newEmp));
        }
        setIsEditing(false); setEditForm({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' });
      } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menyimpan data pegawai.' }); }
    };

    const handleEdit = (emp) => { setEditForm({ ...emp, noHandphone: emp.noHandphone || '' }); setIsEditing(true); };

    const handleDelete = (nip) => {
      setDialog({
        type: 'confirm', title: 'Hapus Pegawai', message: 'Yakin ingin menghapus data pegawai ini secara permanen?', isDanger: true,
        onConfirm: async () => {
          try {
            if (isDemoMode) setEmployees(prev => prev.filter(emp => emp.nip !== nip));
            else await runWithRetry(() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', nip)));
          } catch(err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menghapus data.' }); }
        }
      });
    };

    const handleDeleteAll = () => {
      setDialog({
        type: 'confirm', title: 'Hapus Semua Data', message: 'PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data pegawai saat ini? (Kecuali Administrator).', isDanger: true,
        onConfirm: async () => {
          try {
            if (isDemoMode) setEmployees(prev => prev.filter(emp => emp.role === 'admin'));
            else {
              const batch = writeBatch(db);
              employees.forEach(emp => { if (emp.nip !== 'admin' && emp.nip !== '19720906') batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.nip)); });
              await runWithRetry(() => batch.commit());
            }
            setImportSuccess('Semua data pegawai berhasil dibersihkan.');
            setTimeout(() => setImportSuccess(''), 5000);
          } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menghapus data.' }); }
        }
      });
    };

    // --- IMMERSIVE FAIL-SAFE CSV PARSER ---
    const parseCSVData = async (text) => {
      try {
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return setDialog({ type: 'alert', title: 'Berkas Kosong', message: 'File CSV Anda tidak memiliki baris data atau baris header.' });

        const headerLine = lines[0];
        const delimiter = headerLine.includes(';') ? ';' : ',';
        const parseCSVLine = (line) => {
          const result = []; let current = ''; let inQuotes = false;
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') inQuotes = !inQuotes;
            else if (char === delimiter && !inQuotes) { result.push(current.trim()); current = ''; } 
            else current += char;
          }
          result.push(current.trim()); return result;
        };

        const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/"/g, ''));
        const nipIdx = headers.findIndex(h => h.includes('nip') || h.includes('nik') || h === 'nip/nik');
        const nameIdx = headers.findIndex(h => h.includes('name') || h.includes('nama') || h === 'full name');
        const posIdx = headers.findIndex(h => h.includes('position') || h.includes('jabatan') || h === 'posisi');
        const phoneIdx = headers.findIndex(h => h.includes('handphone') || h.includes('no hp') || h.includes('phone') || h.includes('hp'));
        const atasanIdx = headers.findIndex(h => h.includes('atasan') || h.includes('approval'));
        const roleIdx = headers.findIndex(h => h.includes('role') || h.includes('status') || h.includes('hak akses'));

        if (nipIdx === -1 || nameIdx === -1) return setDialog({ type: 'alert', title: 'Kolom Penting Hilang', message: "Sistem pengurai CSV membutuhkan baris pertama yang berisi kolom bernama 'NIP' dan 'Nama' (atau 'Full Name') secara eksplisit." });

        let count = 0;
        const newEmps = [...employees];
        const batch = !isDemoMode ? writeBatch(db) : null;
        const employeeMap = {};

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const columns = parseCSVLine(lines[i]);
          const nipVal = columns[nipIdx]?.replace(/"/g, ''); const nameVal = columns[nameIdx]?.replace(/"/g, '');
          if (nipVal && nameVal) employeeMap[nameVal.toLowerCase()] = nipVal;
        }

        for (let i = 1; i < lines.length; i++) {
          if (!lines[i].trim()) continue;
          const columns = parseCSVLine(lines[i]);
          
          const nip = columns[nipIdx]?.replace(/"/g, ''); const name = columns[nameIdx]?.replace(/"/g, '');
          if (!nip || !name || nip === 'undefined' || nip === 'admin') continue;
          if (newEmps.some(emp => emp.nip === nip)) continue;

          const position = posIdx !== -1 ? columns[posIdx]?.replace(/"/g, '') : '';
          const noHandphone = phoneIdx !== -1 ? columns[phoneIdx]?.replace(/"/g, '') : '';
          let atasanRaw = atasanIdx !== -1 ? columns[atasanIdx]?.replace(/"/g, '') : '';
          const roleRaw = roleIdx !== -1 ? columns[roleIdx]?.replace(/"/g, '').toLowerCase() : 'maker';

          if (atasanRaw && isNaN(atasanRaw)) {
            const mappedNip = employeeMap[atasanRaw.toLowerCase()];
            if (mappedNip) atasanRaw = mappedNip;
          }

          let role = 'maker';
          if (roleRaw.includes('admin')) role = 'admin';
          else if (roleRaw.includes('manager')) role = 'manager';
          else if (roleRaw.includes('approval') || roleRaw.includes('atasan')) role = 'approval';

          const defaultHash = hashPassword(nip, nip);
          const newEmp = { nip, name, position, noHandphone, role, atasan: atasanRaw, passwordHash: defaultHash, passwordChanged: false };

          if (isDemoMode) newEmps.push(newEmp);
          else batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'employees', nip), newEmp);
          count++;
        }

        if (count > 0) {
          if (isDemoMode) { setEmployees(newEmps); setImportSuccess(`Berhasil mengimpor ${count} data pegawai (Lokal)!`); } 
          else { await runWithRetry(() => batch.commit()); setImportSuccess(`Berhasil mengimpor ${count} data pegawai ke Cloud!`); }
        } else setImportSuccess("Semua data pegawai di dalam CSV sudah terdaftar.");
        setTimeout(() => setImportSuccess(''), 5000);

      } catch (err) { setDialog({ type: 'alert', title: 'Gagal Penguraian', message: 'Gagal memproses file CSV: ' + err.message }); }
    };

    const handleImportFile = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (event) => parseCSVData(event.target.result);
        reader.readAsText(file);
        e.target.value = null; return;
      }

      if (!window.XLSX) {
        setDialog({ type: 'alert', title: 'Sistem Sandbox Terkunci', message: 'Gagal memuat pustaka XLSX dinamis. Solusi: Harap simpan / Save As file data pegawai Anda ke format CSV Comma Separated (.csv) lalu unggah kembali berkas tersebut.' });
        e.target.value = null; return;
      }

      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        let count = 0; let dataFound = false;
        const newEmps = [...employees]; const batch = !isDemoMode ? writeBatch(db) : null;

        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const rows = window.XLSX.utils.sheet_to_json(worksheet);
          const employeeMap = {};
          for (const r of rows) {
            const keys = Object.keys(r);
            const nK = keys.find(k => k.trim().toLowerCase() === 'full name' || k.trim().toLowerCase() === 'nama');
            const niK = keys.find(k => k.trim().toLowerCase() === 'nip' || k.trim().toLowerCase() === 'nik');
            if (nK && niK) employeeMap[String(r[nK]).trim().toLowerCase()] = String(r[niK]).trim();
          }
          for (const row of rows) {
            const keys = Object.keys(row);
            const nipKey = keys.find(k => k.trim().toLowerCase() === 'nip' || k.trim().toLowerCase() === 'nik');
            const nameKey = keys.find(k => k.trim().toLowerCase() === 'full name' || k.trim().toLowerCase() === 'nama');
            const posKey = keys.find(k => k.trim().toLowerCase() === 'position' || k.trim().toLowerCase() === 'jabatan');
            const phoneKey = keys.find(k => k.trim().toLowerCase() === 'no handphone' || k.trim().toLowerCase().includes('handphone'));
            const atasanKey = keys.find(k => k.trim().toLowerCase().includes('atasan'));
            const roleKey = keys.find(k => k.trim().toLowerCase() === 'role' || k.trim().toLowerCase() === 'status');

            if (nipKey && nameKey) {
              dataFound = true; 
              const nip = String(row[nipKey] || '').trim(); const name = String(row[nameKey] || '').trim();
              if (!nip || !name || newEmps.some(emp => emp.nip === nip)) continue;

              const position = posKey ? String(row[posKey] || '').trim() : '';
              const noHandphone = phoneKey ? String(row[phoneKey] || '').trim() : '';
              let atasanRaw = atasanKey ? String(row[atasanKey] || '').trim() : '';
              const roleRaw = roleKey ? String(row[roleKey] || '').trim().toLowerCase() : '';

              if (atasanRaw && isNaN(atasanRaw)) {
                const mappedNip = employeeMap[atasanRaw.toLowerCase()];
                if (mappedNip) atasanRaw = mappedNip;
              }
              
              let role = 'maker';
              if (roleRaw.includes('admin')) role = 'admin'; else if (roleRaw.includes('manager')) role = 'manager'; else if (roleRaw.includes('approval') || roleRaw.includes('atasan')) role = 'approval';

              const defaultHash = hashPassword(nip, nip);
              const newEmp = { nip, name, position, noHandphone, role, atasan: atasanRaw, passwordHash: defaultHash, passwordChanged: false };
              
              if (isDemoMode) newEmps.push(newEmp); else batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'employees', nip), newEmp);
              count++;
            }
          }
          if (dataFound) break;
        }

        if (count > 0) {
          if (isDemoMode) { setEmployees(newEmps); setImportSuccess(`Berhasil mengimpor ${count} data pegawai (Lokal)!`); } 
          else { try { await runWithRetry(() => batch.commit()); setImportSuccess(`Berhasil mengimpor ${count} data pegawai ke Cloud!`); } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Terjadi kesalahan saat menyimpan data.' }); } }
        } else setImportSuccess("Data di file sudah terdaftar semua atau format kolom salah.");
        setTimeout(() => setImportSuccess(''), 5000);
      };
      reader.readAsArrayBuffer(file); e.target.value = null; 
    };

    const filteredEmployees = useMemo(() => {
      return employees.filter(emp => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = emp.name.toLowerCase().includes(query) || emp.nip.toLowerCase().includes(query) || (emp.position && emp.position.toLowerCase().includes(query));
        const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
        return matchesSearch && matchesRole;
      });
    }, [employees, searchTerm, roleFilter]);

    return (
      <div className="space-y-6 text-left animate-in fade-in duration-200">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-lg font-semibold text-slate-800">{isEditing ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" onClick={handleDeleteAll} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center cursor-pointer"><Trash2 size={16} className="mr-2"/> Bersihkan Data</button>
              <input type="file" id="fileUpload" accept=".csv, .xls, .xlsx" onChange={handleImportFile} className="hidden" />
              <label htmlFor="fileUpload" className="cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-center shadow-sm"><Upload size={16} className="mr-2"/> Import CSV/Excel</label>
            </div>
          </div>
          {importSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center"><Check size={18} className="mr-2" /> {importSuccess}</div>}
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">NIP</label><input type="text" required value={editForm.nip} disabled={isEditing} onChange={e => setEditForm({...editForm, nip: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label><input type="text" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Jabatan (Position)</label><input type="text" required value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">No Handphone</label><input type="text" placeholder="Contoh: 0852xxxx" value={editForm.noHandphone} onChange={e => setEditForm({...editForm, noHandphone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status (Role)</label>
              <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="maker">Maker (Hanya Pengaju)</option>
                <option value="approval">Approval (Atasan Langsung)</option>
                <option value="manager">Manager (DBM/Atasan Penuh)</option>
                <option value="admin">Admin (Pengelola Penuh)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Atasan (Approval)</label>
              <select value={editForm.atasan} onChange={e => setEditForm({...editForm, atasan: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="">- Tidak Ada -</option>
                {employees.filter(e => e.nip !== editForm.nip && (e.role === 'approval' || e.role === 'manager' || e.role === 'admin')).map(e => (
                  <option key={e.nip} value={e.nip}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition w-full flex items-center justify-center shadow-xs cursor-pointer">{isEditing ? <><Check size={16} className="mr-2"/> Update</> : <><Plus size={16} className="mr-2"/> Tambah Pegawai</>}</button>
              {isEditing && <button type="button" onClick={() => {setIsEditing(false); setEditForm({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' })}} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2 rounded-lg text-sm font-medium transition cursor-pointer">Batal</button>}
            </div>
          </form>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-3 text-slate-400" />
            <input type="text" placeholder="Cari Pegawai berdasarkan nama, NIP atau Jabatan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-700 cursor-pointer">
            <option value="all">Saring Role: Semua</option>
            <option value="admin">ADMIN</option>
            <option value="manager">MANAGER</option>
            <option value="approval">APPROVAL</option>
            <option value="maker">MAKER</option>
          </select>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs border-b">
                  <th className="p-3 text-center">Aksi</th>
                  <th className="p-3">NIP</th>
                  <th className="p-3">Nama</th>
                  <th className="p-3">Jabatan</th>
                  <th className="p-3">Role</th>
                  <th className="p-3">Atasan</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.map(emp => (
                  <tr key={emp.nip} className="border-b text-sm hover:bg-slate-50">
                    <td className="p-3 flex justify-center gap-2">
                      <button onClick={() => handleEdit(emp)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title="Edit"><Edit size={16} /></button>
                      {emp.nip !== 'admin' && emp.nip !== '19720906' && <button onClick={() => handleDelete(emp.nip)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Hapus"><Trash2 size={16} /></button>}
                    </td>
                    <td className="p-3 font-mono">{emp.nip}</td>
                    <td className="p-3 font-semibold text-slate-800">{emp.name}</td>
                    <td className="p-3 text-slate-500">{emp.position}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : emp.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : emp.role === 'approval' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{emp.role.toUpperCase()}</span></td>
                    <td className="p-3 text-slate-500">{emp.atasan ? getEmployeeName(emp.atasan) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // --- TAB VIEW: PARAMETER ---
  const ParameterView = () => {
    const [activeSubTab, setActiveSubTab] = useState('limit'); 
    const [localParams, setLocalParams] = useState(params);
    const [saved, setSaved] = useState(false);
    const [resetOtp, setResetOtp] = useState('');
    const [enteredResetOtp, setEnteredResetOtp] = useState('');
    const [resetOtpError, setResetOtpError] = useState('');
    const [showResetModal, setShowResetModal] = useState(false);

    const handleSaveLimit = async (e) => {
      e.preventDefault();
      try {
        if (isDemoMode) {
          setParams(localParams); setSaved(true); setTimeout(() => setSaved(false), 3000);
        } else {
          await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'params'), localParams));
          setSaved(true); setTimeout(() => setSaved(false), 3000);
        }
      } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menyimpan pengaturan.' }); }
    };

    const handleInitResetFlow = () => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setResetOtp(otp); setShowResetModal(true); setEnteredResetOtp(''); setResetOtpError('');
    };

    const handleVerifyResetOtp = async (e) => {
      e.preventDefault();
      if (enteredResetOtp === resetOtp) {
        if (isDemoMode) {
          setRequests([]); setShowResetModal(false); setDialog({ type: 'alert', title: 'Data Berhasil Direset', message: 'Semua data pengajuan lembur lokal telah dibersihkan.' });
        } else {
          try {
            const batch = writeBatch(db); let count = 0;
            for (let i = 0; i < requests.length; i++) {
              batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'requests', requests[i].id)); count++;
              if (count === 400) { await runWithRetry(() => batch.commit()); count = 0; }
            }
            if (count > 0) await runWithRetry(() => batch.commit());
            setShowResetModal(false); setDialog({ type: 'alert', title: 'Data Berhasil Direset', message: 'Semua data pengajuan lembur (approval) telah dibersihkan secara permanen.' });
          } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Sistem gagal membersihkan database awan.' }); }
        }
      } else setResetOtpError('Kode konfirmasi salah. Periksa kembali angka yang tertera.');
    };

    return (
      <div className="max-w-lg mx-auto space-y-6 text-left animate-in fade-in duration-200">
        <div className="flex bg-white rounded-xl p-1 shadow-xs border border-slate-200 gap-1">
          <button type="button" onClick={() => setActiveSubTab('limit')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'limit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>Limit Lembur</button>
          <button type="button" onClick={() => setActiveSubTab('reset')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${activeSubTab === 'reset' ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}>Reset Data Approval</button>
        </div>

        {activeSubTab === 'limit' ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 font-sans">Pengaturan Parameter Lembur</h2>
            {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center"><Check size={16} className="mr-2" /> Parameter berhasil disimpan.</div>}
            <form onSubmit={handleSaveLimit} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Lembur per Hari (Jam)</label><input type="number" step="0.5" required value={localParams.maxPerDay} onChange={e => setLocalParams({...localParams, maxPerDay: parseFloat(e.target.value) || 0})} className="w-full p-2 border rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Lembur per Bulan (Jam)</label><input type="number" required value={localParams.maxPerMonth} onChange={e => setLocalParams({...localParams, maxPerMonth: parseInt(e.target.value, 10) || 0})} className="w-full p-2 border rounded-lg text-sm" /></div>
              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-2.5 rounded-lg text-xs font-bold transition shadow-xs cursor-pointer">Simpan Parameter</button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-t-4 border-t-red-500">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 font-sans">Reset Data Approval</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">Hapus seluruh input data lembur yang dikirimkan oleh Maker. Tindakan ini membutuhkan verifikasi keamanan tingkat tinggi.</p>
            <button type="button" onClick={handleInitResetFlow} className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer">Mulai Reset Data Approval</button>
          </div>
        )}

        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-base font-bold text-slate-800">Verifikasi Keamanan Reset</h3>
                  <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                </div>
                <form onSubmit={handleVerifyResetOtp} className="space-y-4 text-left">
                  <div className="p-3 bg-red-50 text-red-800 rounded-xl text-xs"><strong>PERINGATAN!</strong> Anda akan menghapus seluruh data pengajuan lembur secara permanen.</div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-800 font-medium mb-1">Ketik kode berikut untuk konfirmasi:</p>
                    <div className="text-2xl font-mono font-bold text-amber-900 tracking-widest">{resetOtp}</div>
                  </div>
                  <input type="text" maxLength={6} required placeholder="______" value={enteredResetOtp} onChange={e => setEnteredResetOtp(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-3 border rounded-xl text-center font-mono text-xl tracking-widest font-bold focus:ring-2 focus:ring-blue-500" />
                  {resetOtpError && <p className="text-xs text-red-500 font-medium text-center">{resetOtpError}</p>}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 py-2.5 text-xs font-semibold bg-gray-100 rounded-xl">Batal</button>
                    <button type="submit" className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 rounded-xl">Jalankan Reset</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // --- TAB VIEW: SIMULATOR (RESTORED MASS DUMMY GENERATION) ---
  const SimulatorView = () => {
    const handleGenerate = async () => {
      setGenerating(true);
      const activeEmployees = employees.filter(e => e.role !== 'admin');
      if (activeEmployees.length === 0) {
        setDialog({ type: 'alert', title: 'Pegawai Kosong', message: 'Silakan tambah atau impor pegawai terlebih dahulu sebelum membuat simulasi.' });
        setGenerating(false); return;
      }

      try {
        const dummyRequests = []; const targetApprovedHours = 40;
        activeEmployees.forEach(emp => {
          const availableDays = Array.from({ length: 30 }, (_, i) => i + 1);
          for (let i = availableDays.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableDays[i], availableDays[j]] = [availableDays[j], availableDays[i]];
          }

          let dayIndex = 0; let approvedTotal = 0;
          while (approvedTotal < targetApprovedHours && dayIndex < 20) {
            const remaining = targetApprovedHours - approvedTotal;
            let duration = Math.floor(Math.random() * 4) + 2; 
            if (duration > remaining) duration = remaining;

            const dayNum = availableDays[dayIndex++];
            const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
            const dateStr = `2026-06-${dayStr}`;
            const endHour = 17 + Math.floor(duration);
            const endTimeStr = `${endHour < 10 ? '0' + endHour : endHour}:00`;

            const id = `dummy-approved-${emp.nip}-${dayStr}-${Date.now()}`;
            dummyRequests.push({ id, nip: emp.nip, date: dateStr, startTime: "17:00", endTime: endTimeStr, duration, reason: "Penyelesaian laporan kerja (Simulasi)", status: "Approved", atasan: emp.atasan || "19720906", isDummy: true });
            approvedTotal += duration;
          }
        });

        if (isDemoMode) {
          setRequests(prev => [...dummyRequests, ...prev]);
          setDialog({ type: 'alert', title: 'Simulasi Sukses', message: `Berhasil membuat data lembur lokal baru untuk ${activeEmployees.length} pegawai.` });
        } else {
          const batch = writeBatch(db);
          dummyRequests.forEach(req => batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id), req));
          await runWithRetry(() => batch.commit());
          setDialog({ type: 'alert', title: 'Simulasi Sukses', message: `Berhasil menyinkronkan data lembur tiruan ke Firebase.` });
        }
      } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Sistem gagal menyimpan data simulasi.' }); } 
      finally { setGenerating(false); }
    };

    const handleClearDummies = async () => {
      setGenerating(true);
      const dummies = requests.filter(r => r.isDummy === true);
      if (dummies.length === 0) {
        setDialog({ type: 'alert', title: 'Tidak Ada Data', message: 'Tidak ada data lembur simulator yang tersimpan.' });
        setGenerating(false); return;
      }

      try {
        if (isDemoMode) {
          setRequests(prev => prev.filter(r => !r.isDummy));
          setDialog({ type: 'alert', title: 'Pembersihan Sukses', message: 'Semua data tiruan lokal berhasil dihapus.' });
        } else {
          const batch = writeBatch(db);
          dummies.forEach(req => batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id)));
          await runWithRetry(() => batch.commit());
          setDialog({ type: 'alert', title: 'Pembersihan Sukses', message: 'Semua data tiruan di database awan berhasil dihapus.' });
        }
      } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Sistem gagal membersihkan data simulator.' }); } 
      finally { setGenerating(false); }
    };

    return (
      <div className="max-w-2xl mx-auto text-left animate-in fade-in duration-200">
        <div className="bg-white p-6 rounded-xl border">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Database size={24} /></div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 font-sans">Pusat Simulasi Data</h2>
              <p className="text-xs text-slate-500">Suntikkan atau hapus data tiruan pegawai secara massal.</p>
            </div>
          </div>
          <div className="space-y-4 border-t pt-5">
            <div className="bg-slate-50 p-4 rounded-xl border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-left">
                <h3 className="text-sm font-bold text-slate-800">Generate Data Lembur Tiruan</h3>
                <p className="text-xs text-slate-500 max-w-md">Menyuntikkan total 40 jam kerja lembur status "Approved" untuk semua pegawai aktif pada periode bulan Juni 2026.</p>
              </div>
              <button onClick={handleGenerate} disabled={generating} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer">{generating ? <Loader2 className="animate-spin" size={14} /> : <Plus size={14} />} Jalankan Simulator</button>
            </div>
            <div className="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="text-left">
                <h3 className="text-sm font-bold text-red-800">Hapus Seluruh Data Simulasi</h3>
                <p className="text-xs text-red-700 max-w-md">Menghapus bersih hanya data-data lembur yang dibuat oleh sistem simulator di atas.</p>
              </div>
              <button onClick={handleClearDummies} disabled={generating} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer">{generating ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Bersihkan Simulasi</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div id="app-container" className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row pb-16 md:pb-0 relative animate-in fade-in duration-200 print:block print:h-auto print:min-h-0 print:overflow-visible print:bg-white">
      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 flex-shrink-0 h-screen sticky top-0 shadow-xl z-20 no-print animate-in slide-in-from-left">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <img src="Bank_BTN_logo.png" alt="BTN Logo" className="h-8 w-auto object-contain bg-white p-1 rounded" onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} />
          <div className="text-left"><h1 className="text-xl font-bold text-white flex items-center leading-none">Overtime 244</h1><p className="text-[10px] text-slate-400 mt-1">KC Mamuju</p></div>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(currentUser?.role)).map(item => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${activeTab === item.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-slate-800 hover:text-white'}`}>
                <Icon size={18} className="mr-3" /> {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button onClick={handleLogout} className="w-full flex items-center p-3 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors cursor-pointer">
            <LogOut size={18} className="mr-3" /> Keluar Akun
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 print:block print:overflow-visible print:h-auto print:min-h-0">
        <header className="bg-white border-b border-slate-200 p-4 px-6 flex justify-between items-center shadow-sm z-10 sticky top-0 no-print">
          <div className="flex items-center gap-3">
            <h2 className="hidden md:block text-lg font-semibold text-slate-800 capitalize font-sans">{navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}</h2>
            {isDemoMode && <span className="bg-amber-100 text-amber-800 px-3 py-1 rounded-full text-xs font-bold animate-pulse flex items-center gap-1"><AlertTriangle size={12} /> MODE DEMO OFFLINE</span>}
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser?.role === 'admin' && pendingResets.length > 0 && (
              <button onClick={() => setShowResetRequestsModal(true)} className="relative p-2 text-slate-600 hover:bg-slate-100 bg-slate-50 border rounded-full transition-colors cursor-pointer" title="Permintaan Reset Sandi">
                <Bell size={18} className="text-red-500 animate-bounce" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            )}
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex flex-row items-center gap-1.5">
              <span className="font-bold text-slate-800 truncate max-w-[100px] sm:max-w-none">{currentUser?.name}</span>
              {currentUser?.position && <span className="text-slate-500 text-xs font-normal hidden sm:inline">— {currentUser.position}</span>}
            </div>
            {/* Tombol Keluar khusus tampilan HP di sebelah kanan nama */}
            <button onClick={handleLogout} className="md:hidden p-1.5 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg transition-colors cursor-pointer shadow-sm flex items-center justify-center" title="Keluar Akun">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div id="app-content-area" className="p-4 md:p-6 flex-1 overflow-y-auto print:block print:overflow-visible print:h-auto print:min-h-0 print:p-0">
          {activeTab === 'pengajuan' && <PengajuanView />}
          {activeTab === 'approval' && <ApprovalView />}
          {activeTab === 'pegawai' && <PegawaiView />}
          {activeTab === 'parameter' && <ParameterView />}
          {activeTab === 'laporan_statistik' && <LaporanStatistikView />}
          {activeTab === 'simulator' && <SimulatorView />}
        </div>
      </main>

      {/* MOBILE NAVIGATION */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between items-center px-1 py-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] no-print overflow-x-auto">
        {navItems.filter(item => item.roles.includes(currentUser?.role)).map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${activeTab === item.id ? 'text-blue-600' : 'text-slate-500'}`}>
              <Icon size={22} className={`mb-1 ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`} />
              <span className="truncate w-full text-center leading-tight">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
      </nav>

      {/* NOTIFIKASI RESET MODAL */}
      {showResetRequestsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-70 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
             <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Bell size={20} className="text-red-500"/> Permintaan Reset Sandi</h3>
                  <button onClick={() => setShowResetRequestsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                   {pendingResets.length === 0 ? (
                     <p className="text-sm text-slate-500 text-center py-4">Tidak ada permintaan reset saat ini.</p>
                   ) : (
                     pendingResets.map(emp => (
                        <div key={emp.nip} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border">
                           <div className="text-left">
                             <p className="font-bold text-sm text-slate-800">{emp.name}</p>
                             <p className="text-xs text-slate-500 font-mono">NIP: {emp.nip}</p>
                           </div>
                           <button onClick={() => handleApproveReset(emp)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold border border-red-200 shadow-xs cursor-pointer">
                             Setujui (Reset ke NIP)
                           </button>
                        </div>
                     ))
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {dialogComponent}
    </div>
  );
}
