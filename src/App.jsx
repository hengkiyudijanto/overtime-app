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

// --- SAFE GLOBAL PROCESS INJECTION (Prevents ReferenceError & Target Warnings) ---
if (typeof globalThis !== 'undefined' && typeof globalThis.process === 'undefined') {
  globalThis.process = { env: {} };
}

// Safely access Vercel Environment Variables
const getEnv = (key) => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
      return process.env[key];
    }
  } catch (e) {}
  return "";
};

const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config
  ? JSON.parse(__firebase_config)
  : {
      apiKey: getEnv('VITE_FIREBASE_API_KEY') || "AIzaSyCMUqxl3MhFp-TneyOBFohDYmi_XBUXRfs",
      authDomain: getEnv('VITE_FIREBASE_AUTH_DOMAIN') || "overtime-app-22175.firebaseapp.com",
      projectId: getEnv('VITE_FIREBASE_PROJECT_ID') || "overtime-app-22175",
      storageBucket: getEnv('VITE_FIREBASE_STORAGE_BUCKET') || "overtime-app-22175.firebasestorage.app",
      messagingSenderId: getEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || "661655668561",
      appId: getEnv('VITE_FIREBASE_APP_ID') || "1:661655668561:web:4e9983976b624de10cb570"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Sanitize App ID for Firestore
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : (getEnv('VITE_APP_ID') || 'default-app-id');
const appId = String(rawAppId).replace(/\//g, '_');

// --- EXPONENTIAL BACKOFF RETRY HELPER FOR FIRESTORE ---
const runWithRetry = async (fn) => {
  let delay = 1000;
  for (let i = 0; i < 5; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === 4) throw err;
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
};

export default function App() {
  const [user, setUser] = useState(null); 
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authOrFirestoreError, setAuthOrFirestoreError] = useState(null);
  
  const [employees, setEmployees] = useState([]);
  const [currentUser, setCurrentUser] = useState(null); 
  const [activeTab, setActiveTab] = useState('pengajuan');
  const [requests, setRequests] = useState([]);
  const [params, setParams] = useState({ maxPerDay: 10, maxPerMonth: 40 });

  // Missing States added for compilation & visual safety
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [generating, setGenerating] = useState(false);

  // State Login & Ganti Password
  const [selectedNip, setSelectedNip] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [pendingPasswordChangeUser, setPendingPasswordChangeUser] = useState(null);
  const [newPasswordForm, setNewPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [newPasswordError, setNewPasswordError] = useState('');

  // Lupa Password
  const [showLupaPassword, setShowLupaPassword] = useState(false);
  const [lupaNip, setLupaNip] = useState('');
  const [lupaPasswordError, setLupaPasswordError] = useState('');

  const [dialog, setDialog] = useState(null); 
  
  // Admin Notifikasi Reset
  const pendingResets = useMemo(() => employees.filter(e => e.resetRequested), [employees]);
  const [showResetRequestsModal, setShowResetRequestsModal] = useState(false);

  // State PWA
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // State Dialog Form Review Atasan
  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const BTN_LOGO_FALLBACK = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 50'%3E%3Ctext x='5' y='42' font-family='system-ui, -apple-system, sans-serif' font-weight='950' font-size='45' fill='%23006cb7' letter-spacing='-3'%3Ebtn%3C/text%3E%3Cpolygon points='68,14 92,6 88,2 64,10' fill='%23e21a22' /%3E%3C/svg%3E";

  const getEmployeeName = (nip) => {
    const emp = employees.find(e => e.nip === nip);
    return emp ? emp.name : nip;
  };

  useEffect(() => {
    if (!window.XLSX) {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone || document.referrer.includes('android-app://');
    setIsAppInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    if (isIos() && !isStandalone) {
      setIsIosPromptVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        if (isMounted) setIsAuthed(true);
      } catch (err) {
        console.error("Gagal Autentikasi Firebase:", err);
        try {
          await signInAnonymously(auth);
          if (isMounted) setIsAuthed(true);
        } catch (e) {
          if (isMounted) setAuthOrFirestoreError("auth-failed");
        }
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) setUser(u);
    });
    return () => { isMounted = false; unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!user || !isAuthed) return;
    
    const empRef = collection(db, 'artifacts', appId, 'public', 'data', 'employees');
    const unsubEmp = onSnapshot(empRef, (snap) => {
      let emps = snap.docs.map(d => d.data());
      const isDbEmpty = emps.length === 0 || !emps.some(e => e.role === 'admin');
      if (isDbEmpty) {
        emps = [{ nip: 'admin', name: 'Administrator (Darurat)', position: 'System Admin', noHandphone: '-', role: 'admin', atasan: '' }, ...emps];
      }
      setEmployees(emps);
      if (isDbEmpty) {
        setCurrentUser(emps.find(e => e.nip === 'admin'));
        setActiveTab('pengajuan');
      }
      setLoading(false);
    }, (e) => {
      if (e.code === 'permission-denied') setAuthOrFirestoreError("permission-denied");
      setLoading(false);
    });

    const reqRef = collection(db, 'artifacts', appId, 'public', 'data', 'requests');
    const unsubReq = onSnapshot(reqRef, (snap) => {
      setRequests(snap.docs.map(d => d.data()));
    }, (e) => {
      if (e.code === 'permission-denied') setAuthOrFirestoreError("permission-denied");
      setLoading(false);
    });

    const paramRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'params');
    const unsubParam = onSnapshot(paramRef, (snap) => {
      if (snap.exists()) setParams(snap.data());
      else runWithRetry(() => setDoc(paramRef, { maxPerDay: 10, maxPerMonth: 40 }));
    }, (e) => {
      if (e.code === 'permission-denied') setAuthOrFirestoreError("permission-denied");
      setLoading(false);
    });

    return () => { unsubEmp(); unsubReq(); unsubParam(); };
  }, [user, isAuthed]);

  useEffect(() => {
    if (employees.length > 0 && !selectedNip) {
      const lastNip = localStorage.getItem('last_logged_in_nip');
      if (lastNip && employees.some(e => e.nip === lastNip)) setSelectedNip(lastNip);
      else setSelectedNip(employees[0].nip);
    }
  }, [employees]);

  const navItems = [
    { id: 'pengajuan', label: 'Pengajuan Lembur', icon: Clock, roles: ['maker', 'approval', 'manager', 'admin'] },
    { id: 'approval', label: 'Approval Lembur', icon: CheckSquare, roles: ['approval', 'manager', 'admin'] },
    { id: 'laporan', label: 'Laporan', icon: FileText, roles: ['maker', 'approval', 'manager', 'admin'] },
    { id: 'statistik', label: 'Statistik', icon: BarChart2, roles: ['approval', 'manager', 'admin'] },
    { id: 'pegawai', label: 'Data Pegawai', icon: Users, roles: ['admin'] },
    { id: 'parameter', label: 'Parameter', icon: Settings, roles: ['admin'] },
    { id: 'simulator', label: 'Simulator Data', icon: Database, roles: ['admin'] },
  ];

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const targetEmp = employees.find(emp => emp.nip === selectedNip);
    if (!targetEmp) return;
    localStorage.setItem('last_logged_in_nip', targetEmp.nip);
    const correctPassword = targetEmp.password || targetEmp.nip;

    if (enteredPassword === correctPassword) {
      const isDefault = !targetEmp.password || targetEmp.password === targetEmp.nip || !targetEmp.passwordChanged;
      if (isDefault) {
        setPendingPasswordChangeUser(targetEmp);
        setPasswordError(false);
      } else {
        setCurrentUser(targetEmp);
        setActiveTab('pengajuan');
        setPasswordError(false);
        setEnteredPassword('');
      }
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
      const empRef = doc(db, 'artifacts', appId, 'public', 'data', 'employees', pendingPasswordChangeUser.nip);
      const updatedUser = { ...pendingPasswordChangeUser, password: pwd, passwordChanged: true };
      await runWithRetry(() => setDoc(empRef, updatedUser));
      setCurrentUser(updatedUser);
      setPendingPasswordChangeUser(null);
      setNewPasswordForm({ password: '', confirmPassword: '' });
      setActiveTab('pengajuan');
      setDialog({ type: 'alert', title: 'Sandi Diperbarui', message: 'Kata sandi default Anda berhasil diganti. Silakan gunakan kata sandi baru ini untuk login berikutnya.' });
    } catch (err) {
      setNewPasswordError('Gagal memperbarui sandi ke cloud database.');
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setLupaPasswordError('');
    const emp = employees.find(e => e.nip === lupaNip);
    if (!emp) return setLupaPasswordError('NIP tidak terdaftar di sistem.');

    try {
      const empRef = doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.nip);
      await runWithRetry(() => setDoc(empRef, { ...emp, resetRequested: true }));
      setShowLupaPassword(false);
      setLupaNip('');
      setDialog({
        type: 'alert',
        title: 'Permintaan Terkirim',
        message: `Permintaan reset kata sandi untuk NIP ${emp.nip} telah berhasil dikirim ke Administrator. Silakan tunggu Admin menyetujui permintaan Anda.`
      });
    } catch (err) {
      setLupaPasswordError('Gagal mengirim permintaan ke server database.');
    }
  };

  const handleApproveReset = async (emp) => {
    try {
      const empRef = doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.nip);
      await runWithRetry(() => setDoc(empRef, { 
        ...emp, 
        password: emp.nip, 
        passwordChanged: false, 
        resetRequested: false 
      }));
      setDialog({ type: 'alert', title: 'Berhasil', message: `Kata sandi untuk ${emp.name} telah direset kembali menjadi default (NIP).` });
      if (pendingResets.length <= 1) setShowResetRequestsModal(false);
    } catch (err) {
      setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal mereset kata sandi pegawai.' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    const lastNip = localStorage.getItem('last_logged_in_nip');
    setSelectedNip(lastNip && employees.some(e => e.nip === lastNip) ? lastNip : (employees[0]?.nip || ''));
    setEnteredPassword('');
    setPasswordError(false);
  };

  const handleInstallPwa = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsAppInstalled(true);
      }
    } else if (isIosPromptVisible) {
      setDialog({
        type: 'alert',
        title: 'Install di iPhone / iPad',
        message: 'Untuk memasang aplikasi ini: Ketuk ikon "Bagikan" (Share) di bagian bawah browser Safari Anda, lalu gulir ke bawah dan ketuk "Tambah ke Layar Utama" (Add to Home Screen).'
      });
    }
  };

  const maskPhoneNumber = (phone) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 4) + '*****' + phone.slice(-3);
  };

  const handleReviewAction = async (req, action) => {
    if (action === 'Revisi' && !reviewComment.trim()) {
      setReviewError('Keterangan revisi wajib diisi untuk memberi tahu maker!');
      return;
    }
    
    setDialog(null);
    try {
      await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id.toString()), { 
        ...req, 
        status: action,
        approvalComment: reviewComment.trim()
      }));
      setDialog({ type: 'alert', title: 'Sukses', message: `Pengajuan lembur berhasil diproses dengan status: ${action}.` });
    } catch (err) {
      setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal memproses persetujuan di database cloud.' });
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
                <button onClick={() => setDialog(null)} className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-all shadow-md cursor-pointer">
                  Tutup
                </button>
              </div>
            </div>
          ) : dialog.type === 'review' ? (
            <div className="flex flex-col text-left">
              <h3 className="text-lg font-bold text-slate-800 mb-3">{dialog.title}</h3>
              <div className="w-full bg-slate-100 border rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4 max-h-[35vh]">
                <img src={dialog.request.imageUrl} alt="Foto Bukti Lembur" className="max-h-[32vh] object-contain rounded-lg cursor-pointer hover:opacity-90" onClick={() => setDialog({ type: 'lightbox', title: `Pratinjau Bukti Detail`, imageUrl: dialog.request.imageUrl })} title="Klik untuk perbesar" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Pegawai:</span>
                  <span className="font-semibold text-slate-800">{getEmployeeName(dialog.request.nip)} ({dialog.request.nip})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Tanggal:</span>
                  <span className="font-semibold text-slate-800">{dialog.request.date}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Waktu:</span>
                  <span className="font-semibold text-slate-800">{dialog.request.startTime} - {dialog.request.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Durasi:</span>
                  <span className="font-semibold text-slate-800">{dialog.request.duration.toFixed(1)} Jam</span>
                </div>
                <div className="flex flex-col pt-1.5 border-t border-slate-200 mt-1.5">
                  <span className="text-slate-500 font-medium">Alasan Lembur:</span>
                  <span className="font-medium text-slate-800 mt-0.5">{dialog.request.reason}</span>
                </div>
              </div>
              
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan / Keterangan Atasan <span className="text-red-500 font-normal ml-1">* Wajib diisi jika pilih Revisi</span>
                </label>
                <textarea 
                  value={reviewComment}
                  onChange={(e) => { setReviewComment(e.target.value); setReviewError(''); }}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50"
                  rows="2"
                  placeholder="Ketik keterangan revisi, alasan penolakan, atau pesan persetujuan..."
                ></textarea>
                {reviewError && (
                  <p className="text-[11px] text-red-500 mt-1.5 flex items-center font-bold">
                    <AlertCircle size={12} className="mr-1"/> {reviewError}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2.5">
                <button onClick={() => setDialog(null)} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                  Batal
                </button>
                <button 
                  onClick={() => handleReviewAction(dialog.request, 'Reject')} 
                  className="px-3 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <X size={14}/> Reject
                </button>
                <button 
                  onClick={() => handleReviewAction(dialog.request, 'Revisi')} 
                  className="px-3 py-2 text-xs font-bold text-white bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Camera size={14}/> Revisi
                </button>
                <button 
                  onClick={() => handleReviewAction(dialog.request, 'Approved')} 
                  className="px-3 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors shadow-sm cursor-pointer flex items-center gap-1"
                >
                  <Check size={14}/> Approve
                </button>
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
                {dialog.type === 'confirm' && (
                  <button onClick={() => setDialog(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                    Batal
                  </button>
                )}
                <button onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  setDialog(null);
                }} className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors cursor-pointer ${dialog.isDanger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
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
            <div className="inline-flex p-3 bg-red-50 rounded-full mb-3 text-red-600">
              <AlertTriangle size={36} className="animate-bounce" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Koneksi Database Terhambat</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Aplikasi mendeteksi adanya kendala hak akses (*Permission Denied*) atau kegagalan autentikasi dengan Firebase.
            </p>
          </div>
          <button onClick={() => window.location.reload()} className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold text-sm transition-all shadow-md mt-6 flex items-center justify-center gap-2 cursor-pointer">
            <Database size={16} /> Coba Hubungkan Kembali
          </button>
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
            <div className="inline-flex p-3 bg-amber-50 rounded-full mb-3 text-amber-600">
              <Key size={32} className="animate-bounce" />
            </div>
            <h1 className="text-xl font-bold text-slate-800">Wajib Ganti Kata Sandi</h1>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Halo <strong>{pendingPasswordChangeUser.name}</strong>, ini adalah login pertama Anda atau Anda masih menggunakan kata sandi default NIP. Silakan buat kata sandi baru Anda terlebih dahulu.
            </p>
          </div>
          <form onSubmit={handleSaveForcePassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Kata Sandi Baru (Hanya Angka)</label>
              <input type="password" required inputMode="numeric" pattern="[0-9]*" placeholder="Buat minimal 6 digit angka" value={newPasswordForm.password} onChange={e => setNewPasswordForm({ ...newPasswordForm, password: e.target.value.replace(/[^0-9]/g, '') })} className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Konfirmasi Kata Sandi Baru</label>
              <input type="password" required inputMode="numeric" pattern="[0-9]*" placeholder="Ketik ulang kata sandi baru" value={newPasswordForm.confirmPassword} onChange={e => setNewPasswordForm({ ...newPasswordForm, confirmPassword: e.target.value.replace(/[^0-9]/g, '') })} className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center" />
            </div>
            {newPasswordError && <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2.5 rounded-lg"><AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {newPasswordError}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setPendingPasswordChangeUser(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl font-semibold transition-all text-sm cursor-pointer">Kembali</button>
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold transition-all text-sm shadow-md shadow-blue-200 cursor-pointer">Simpan & Masuk</button>
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
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100 relative">
          
          <div className="text-center mb-8 mt-4">
            <div className="inline-flex p-3 bg-blue-50 rounded-full mb-4">
              <img src="Bank_BTN_logo.png" alt="Bank BTN Logo" className="h-12 w-auto object-contain" onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">Overtime 244</h1>
            <p className="text-sm text-slate-500 mt-1">Kantor Cabang Mamuju</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Pilih Akun Petugas</label>
              <select value={selectedNip} onChange={e => { setSelectedNip(e.target.value); setPasswordError(false); }} className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 cursor-pointer">
                {employees.map(emp => (
                  <option key={emp.nip} value={emp.nip}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Kata Sandi</label>
                <button type="button" onClick={() => setShowLupaPassword(true)} className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer">Lupa Kata Sandi?</button>
              </div>
              <div className="relative">
                <input type={showPassword ? "text" : "password"} required placeholder="Password default = NIP" value={enteredPassword} onChange={e => { setEnteredPassword(e.target.value); setPasswordError(false); }} className={`w-full p-3 pl-10 pr-10 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${passwordError ? 'border-red-500 bg-red-50/50 font-sans' : 'border-slate-300 bg-slate-50 font-mono tracking-wide'}`} />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center"><AlertCircle size={14} className="mr-1" /> Kata sandi salah! Default: NIP Anda.</p>}
            </div>
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold transition-all shadow-md shadow-blue-200 mt-2 flex items-center justify-center cursor-pointer">Masuk ke Aplikasi</button>
          </form>

          {/* TOMBOL INSTALASI PWA EKSKLUSIF */}
          {!isAppInstalled && (deferredPrompt || isIosPromptVisible) && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <button onClick={handleInstallPwa} className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white p-3 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer animate-in fade-in">
                {isIosPromptVisible ? <Smartphone size={18} /> : <DownloadCloud size={18} />}
                {isIosPromptVisible ? "Cara Install di Layar Utama" : "Install Aplikasi (PWA)"}
              </button>
            </div>
          )}

          <div className="mt-6 text-center border-t border-slate-100 pt-5">
            <p className="text-[11px] text-slate-400 leading-relaxed">Sistem Otomasi Lembur Internal KC Mamuju. Bagi pengguna pertama, masukkan NIP sebagai kata sandi pembuka.</p>
          </div>
        </div>

        {/* MODAL RESET PASSWORD (REQUEST TO ADMIN) */}
        {showLupaPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5"><ShieldCheck size={18} className="text-blue-600" /> Permintaan Reset Sandi</h3>
                  <button onClick={() => { setShowLupaPassword(false); setLupaNip(''); setLupaPasswordError(''); }} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X size={18} /></button>
                </div>
                <form onSubmit={handleRequestReset} className="space-y-4 text-left">
                  <p className="text-xs text-slate-500 leading-relaxed">Masukkan NIP Anda. Sistem akan mengirimkan notifikasi permintaan reset kata sandi ke Administrator. Jika disetujui, sandi Anda akan dikembalikan ke default (NIP).</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Masukkan NIP Anda</label>
                    <input type="text" required placeholder="Contoh: 6628" value={lupaNip} onChange={e => setLupaNip(e.target.value)} className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium" />
                  </div>
                  {lupaPasswordError && <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2 rounded"><AlertCircle size={14} className="mr-1 flex-shrink-0" /> {lupaPasswordError}</p>}
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => { setShowLupaPassword(false); setLupaNip(''); setLupaPasswordError(''); }} className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                    <button type="submit" className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer">Kirim Permintaan</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {dialogComponent}
      </div>
    );
  }

  const PengajuanView = () => {
    const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '', reason: '', imageUrl: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [imageProcessing, setImageProcessing] = useState(false);
    const [myStatusFilter, setMyStatusFilter] = useState('all');

    const [calendarDate, setCalendarDate] = useState(() => new Date(2026, 5, 1));

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
      setError('');
      setSuccess('');
      const duration = calculateDuration(formData.startTime, formData.endTime);
      
      if (duration <= 0) return setError('Waktu mulai harus berbeda dengan waktu selesai.');
      if (!formData.imageUrl) return setError('Foto bukti lembur wajib diunggah pada saat pengajuan.');

      const isDuplicateDate = requests.some(r => r.nip === currentUser?.nip && r.date === formData.date && r.status !== 'Reject' && r.status !== 'Rejected');
      if (isDuplicateDate) return setError(`Gagal mengajukan! Anda sudah memiliki pengajuan aktif pada tanggal tersebut.`);
      
      if (duration > params.maxPerDay) return setError(`Durasi lembur melebihi batas maksimal harian (${params.maxPerDay} jam).`);
      
      const projectedTotal = processedHours + pendingHours + duration;
      if (projectedTotal > params.maxPerMonth) return setError(`Total akumulasi lembur Anda bulan ini akan melebihi kuota bulanan (${params.maxPerMonth} jam).`);

      const id = Date.now().toString();
      const newRequest = { 
        id, 
        nip: currentUser?.nip || '', 
        date: formData.date, 
        startTime: formData.startTime, 
        endTime: formData.endTime, 
        duration: duration, 
        reason: formData.reason, 
        status: 'Pending', 
        atasan: currentUser?.atasan || '',
        imageUrl: formData.imageUrl,
        approvalComment: '' 
      };

      try {
        await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', id), newRequest));
        setSuccess('Pengajuan lembur beserta foto bukti berhasil dikirim ke Atasan.');
        setFormData({ date: '', startTime: '', endTime: '', reason: '', imageUrl: '' });
      } catch (err) {
        setError('Gagal menyimpan pengajuan ke cloud database.');
      }
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
            const canvas = document.createElement('canvas');
            canvas.width = 600;
            canvas.height = img.height * (600 / img.width);
            canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            const reqRef = doc(db, 'artifacts', appId, 'public', 'data', 'requests', requestId);
            const req = requests.find(r => r.id === requestId);
            if (req) {
              await runWithRetry(() => setDoc(reqRef, { ...req, imageUrl: compressedBase64, status: 'Pending', approvalComment: '' }));
              setDialog({ type: 'alert', title: 'Berhasil', message: 'Bukti revisi berhasil diunggah. Menunggu direview ulang oleh atasan.' });
            }
          } catch (err) {
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal memproses gambar bukti.' });
          }
        };
      };
    };

    const myRequests = requests.filter(r => r.nip === currentUser?.nip).sort((a,b) => b.id - a.id);
    const filteredMyRequests = useMemo(() => {
      if (myStatusFilter === 'all') return myRequests;
      return myRequests.filter(r => r.status.toLowerCase() === myStatusFilter.toLowerCase());
    }, [myRequests, myStatusFilter]);

    const calendarDays = useMemo(() => {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2 text-left">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Form Pengajuan Lembur Baru</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm"><AlertCircle size={18} className="mr-2 flex-shrink-0" /> {error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center text-sm"><Check size={18} className="mr-2 flex-shrink-0" /> {success}</div>}
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alasan Lembur</label>
                <input type="text" required placeholder="Contoh: Rekonsiliasi bulanan" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Mulai (24 Jam)</label>
                <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-600 font-medium">
                  <div className="flex justify-between items-center"><span>Lembur Selesai (Approved):</span><span className="font-semibold text-green-600">{processedHours.toFixed(1)} Jam</span></div>
                  <div className="flex justify-between items-center"><span>Menunggu Review Atasan:</span><span className="font-semibold text-amber-600">{pendingHours.toFixed(1)} Jam</span></div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-200"><span>Sisa Kuota Lembur Bulan Ini:</span><span className={`font-bold ${remainingQuota <= 0 ? 'text-red-600' : 'text-blue-600'}`}>{Math.max(0, remainingQuota).toFixed(1)} Jam</span></div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Selesai (24 Jam)</label>
                <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full p-2.5 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>

              <div className="md:col-span-2 mt-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">Unggah Foto Bukti Lembur (Wajib)</label>
                <input type="file" accept="image/*" required={!formData.imageUrl} onChange={handleImageSelect} className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer" />
                {imageProcessing && <p className="text-xs text-blue-500 mt-2 flex items-center"><Loader2 size={12} className="animate-spin mr-1.5"/> Memproses ukuran gambar...</p>}
                {formData.imageUrl && (
                  <div className="mt-3 relative inline-block">
                    <img src={formData.imageUrl} className="h-28 rounded-lg border border-slate-200 shadow-sm object-cover" alt="Preview Bukti" />
                    <button type="button" onClick={() => setFormData({...formData, imageUrl: ''})} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600"><X size={12} /></button>
                  </div>
                )}
              </div>

              <div className="md:col-span-2 flex justify-end mt-3 pt-3 border-t border-slate-100">
                <button type="submit" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer">
                  <Plus size={16} /> Kirim Pengajuan & Bukti
                </button>
              </div>
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
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-2 border-b pb-1.5"><span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span></div>
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="aspect-square"></div>;
                const status = getDayOvertimeStatus(day);
                let bgStyle = "hover:bg-slate-50 text-slate-800";
                if (status === 'Approved') bgStyle = "bg-green-500 text-white font-bold";
                else if (status === 'Pending') bgStyle = "bg-yellow-400 text-slate-900 font-bold animate-pulse";
                else if (status === 'Revisi') bgStyle = "bg-orange-500 text-white font-bold";
                else if (status === 'Reject' || status === 'Rejected') bgStyle = "bg-red-500 text-white font-bold";
                return <div key={`day-${idx}`} title={status ? `${day.getDate()} - Status: ${status}` : `${day.getDate()}`} className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${bgStyle}`}>{day.getDate()}</div>;
              })}
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-yellow-400 rounded-full inline-block"></span><span>Pending Review</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-orange-500 rounded-full inline-block"></span><span>Butuh Revisi</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block"></span><span>Approved</span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span><span>Reject</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 text-left">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Riwayat & Status Lembur</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SlidersHorizontal size={14} className="text-slate-400 flex-shrink-0" />
              <select value={myStatusFilter} onChange={e => setMyStatusFilter(e.target.value)} className="p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 cursor-pointer w-full sm:w-auto">
                <option value="all">Status: Semua</option>
                <option value="pending">Pending</option>
                <option value="revisi">Revisi</option>
                <option value="approved">Approved</option>
                <option value="reject">Rejected</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs border-b">
                  <th className="p-3 font-medium">Tanggal</th>
                  <th className="p-3 font-medium">Waktu</th>
                  <th className="p-3 font-medium">Durasi</th>
                  <th className="p-3 font-medium">Alasan Lembur</th>
                  <th className="p-3 font-medium min-w-[200px]">Status & Bukti Foto</th>
                </tr>
              </thead>
              <tbody>
                {filteredMyRequests.length === 0 ? (
                  <tr><td colSpan="5" className="p-4 text-center text-slate-500 text-sm">Tidak ada riwayat lembur yang sesuai filter.</td></tr>
                ) : (
                  filteredMyRequests.map(req => (
                    <tr key={req.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="p-3 whitespace-nowrap">{req.date}</td>
                      <td className="p-3 whitespace-nowrap">{req.startTime} - {req.endTime}</td>
                      <td className="p-3 font-semibold text-blue-600">{req.duration.toFixed(1)} j</td>
                      <td className="p-3 max-w-[200px] truncate" title={req.reason}>{req.reason}</td>
                      <td className="p-3">
                        <div className="flex flex-col sm:items-start gap-1.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium self-start ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : (req.status === 'Reject' || req.status === 'Rejected') ? 'bg-red-100 text-red-700' : req.status === 'Revisi' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {req.status}
                          </span>
                          
                          {(req.status === 'Revisi' || req.status === 'Reject' || req.status === 'Rejected') && req.approvalComment && (
                            <div className={`text-[10px] p-1.5 rounded mt-0.5 max-w-[220px] whitespace-normal leading-tight border ${req.status === 'Revisi' ? 'bg-orange-50 text-orange-800 border-orange-200' : 'bg-red-50 text-red-800 border-red-100'}`}>
                              <strong className="font-bold block mb-0.5">Catatan Atasan:</strong> {req.approvalComment}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-1">
                            {req.imageUrl && (
                              <img src={req.imageUrl} alt="Bukti" onClick={() => setDialog({ type: 'lightbox', title: `Bukti Foto Lembur (${req.date})`, imageUrl: req.imageUrl })} className="w-9 h-9 object-cover rounded shadow-sm border border-slate-200 cursor-zoom-in hover:opacity-85 transition-all" />
                            )}
                            
                            {req.status === 'Revisi' && (
                              <>
                                <label htmlFor={`reupload-${req.id}`} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-[10px] font-bold cursor-pointer border border-blue-200 transition-all shadow-sm">
                                  <Camera size={12} /> Upload Ulang
                                </label>
                                <input type="file" accept="image/*" capture="environment" id={`reupload-${req.id}`} onChange={(e) => handleCameraReupload(e, req.id)} className="hidden" />
                              </>
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

  const ApprovalView = () => {
    const activeRequests = requests.filter(r => {
      const isMyBawahan = r.atasan === currentUser?.nip || currentUser?.role === 'admin' || currentUser?.role === 'manager';
      if (!isMyBawahan) return false;
      return r.status === 'Pending';
    });

    const triggerReviewModal = (req) => {
      setReviewComment('');
      setReviewError('');
      setDialog({ type: 'review', request: req, title: 'Review Pengajuan Lembur' });
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in duration-150 text-left">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Menunggu Review Anda</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b">
                <th className="p-3 font-medium">Nama Pegawai</th>
                <th className="p-3 font-medium">Tanggal</th>
                <th className="p-3 font-medium">Waktu (Durasi)</th>
                <th className="p-3 font-medium">Alasan Lembur</th>
                <th className="p-3 font-medium text-center">Aksi Keputusan</th>
              </tr>
            </thead>
            <tbody>
              {activeRequests.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-slate-500 text-sm bg-slate-50/50">🎉 Semua pengajuan telah selesai di-review.</td></tr>
              ) : (
                activeRequests.map(req => (
                  <tr key={req.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{getEmployeeName(req.nip)} <span className="block text-[10px] text-slate-400 font-normal">{req.nip}</span></td>
                    <td className="p-3 whitespace-nowrap">{req.date}</td>
                    <td className="p-3 whitespace-nowrap">{req.startTime} - {req.endTime} <span className="font-bold text-blue-600 block text-xs">({req.duration.toFixed(1)} Jam)</span></td>
                    <td className="p-3 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <button onClick={() => triggerReviewModal(req)} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 mx-auto">
                        <Edit size={14} /> Review Bukti
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const PegawaiView = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' });
    const [importSuccess, setImportSuccess] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    const handleSave = async (e) => {
      e.preventDefault();
      try {
        await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', editForm.nip), editForm));
        setIsEditing(false);
        setEditForm({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' });
      } catch (err) {
        setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menyimpan data pegawai.' });
      }
    };

    const handleEdit = (emp) => {
      setEditForm({ ...emp, noHandphone: emp.noHandphone || '' });
      setIsEditing(true);
    };

    const handleDelete = (nip) => {
      setDialog({
        type: 'confirm', title: 'Hapus Pegawai', message: 'Yakin ingin menghapus data pegawai ini secara permanen?', isDanger: true,
        onConfirm: async () => {
          try {
            await runWithRetry(() => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', nip)));
          } catch(err) {
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menghapus data.' });
          }
        }
      });
    };

    const handleDeleteAll = () => {
      setDialog({
        type: 'confirm', title: 'Hapus Semua Data', message: 'PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data pegawai saat ini? (Kecuali Administrator).', isDanger: true,
        onConfirm: async () => {
          try {
            const batch = writeBatch(db);
            employees.forEach(emp => {
              if (emp.nip !== 'admin') {
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'employees', emp.nip);
                batch.delete(ref);
              }
            });
            await runWithRetry(() => batch.commit());
            setImportSuccess('Semua data pegawai berhasil dibersihkan.');
            setTimeout(() => setImportSuccess(''), 5000);
          } catch (err) {
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menghapus data: ' + err.message });
          }
        }
      });
    };

    const handleImportFile = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!window.XLSX) {
        setDialog({ type: 'alert', title: 'Sistem Sibuk', message: 'Sedang memuat library Excel. Silakan coba klik tombol kembali.' });
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const data = new Uint8Array(event.target.result);
        const workbook = window.XLSX.read(data, { type: 'array' });
        let count = 0;
        let dataFound = false;
        const batch = writeBatch(db);
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
            const nameKey = keys.find(k => { const kClean = k.trim().toLowerCase(); return kClean === 'full name' || kClean === 'nama' || kClean.includes('name'); });
            const posKey = keys.find(k => k.trim().toLowerCase() === 'position' || k.trim().toLowerCase() === 'jabatan' || k.trim().toLowerCase().includes('position'));
            const phoneKey = keys.find(k => k.trim().toLowerCase() === 'no handphone' || k.trim().toLowerCase().includes('handphone') || k.trim().toLowerCase().includes('hp'));
            const atasanKey = keys.find(k => k.trim().toLowerCase().includes('atasan'));
            const roleKey = keys.find(k => { const kClean = k.trim().toLowerCase(); return kClean === 'role' || kClean === 'status' || kClean === 'hak akses' || kClean.includes('status') || kClean.includes('role'); });

            if (nipKey && nameKey) {
              dataFound = true; 
              const nip = String(row[nipKey] || '').trim();
              const name = String(row[nameKey] || '').trim();
              const position = posKey ? String(row[posKey] || '').trim() : '';
              const noHandphone = phoneKey ? String(row[phoneKey] || '').trim() : '';
              let atasanRaw = atasanKey ? String(row[atasanKey] || '').trim() : '';
              if (atasanRaw && isNaN(atasanRaw)) {
                const mappedNip = employeeMap[atasanRaw.toLowerCase()];
                if (mappedNip) atasanRaw = mappedNip;
              }
              if (nip && name && nip !== 'undefined' && nip !== 'admin' && !employees.some(emp => emp.nip === nip)) {
                let role = 'maker';
                const importedRole = roleKey ? String(row[roleKey] || '').trim().toLowerCase() : '';
                if (importedRole) {
                  if (importedRole.includes('admin')) role = 'admin';
                  else if (importedRole.includes('manager')) role = 'manager';
                  else if (importedRole.includes('approval') || importedRole.includes('approver') || importedRole.includes('atasan')) role = 'approval';
                  else if (importedRole.includes('maker') || importedRole.includes('staff') || importedRole.includes('karyawan') || importedRole.includes('biasa')) role = 'maker';
                  else {
                    const lowerPos = position.toLowerCase();
                    if (lowerPos.includes('branch manager')) role = 'admin'; 
                    else if (lowerPos.includes('manager') || lowerPos.includes('dbm')) role = 'approval';
                  }
                } else {
                  const lowerPos = position.toLowerCase();
                  if (lowerPos.includes('branch manager')) role = 'admin'; 
                  else if (lowerPos.includes('manager') || lowerPos.includes('dbm')) role = 'approval';
                }
                const newEmp = { ...row, nip, name, position, noHandphone, role, atasan: atasanRaw };
                const ref = doc(db, 'artifacts', appId, 'public', 'data', 'employees', nip);
                batch.set(ref, newEmp);
                count++;
              }
            }
          }
          if (dataFound) break;
        }
        if (count > 0) {
          try {
            await runWithRetry(() => batch.commit());
            setImportSuccess(`Berhasil mengimpor ${count} data pegawai baru dari Excel!`);
          } catch (err) {
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Terjadi kesalahan saat menyimpan data ke cloud.' });
          }
        } else if (!dataFound) {
          setDialog({ type: 'alert', title: 'Peringatan', message: "Struktur kolom tidak sesuai. Pastikan ada kolom bernama 'NIP', 'Full Name'/'Nama', 'Position', 'No Handphone', dan 'Atasan'." });
        } else {
          setImportSuccess("Data di file sudah terdaftar semua.");
        }
        setTimeout(() => setImportSuccess(''), 5000);
      };
      reader.readAsArrayBuffer(file);
      e.target.value = null; 
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
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
            <h2 className="text-lg font-semibold text-slate-800">{isEditing ? 'Edit Pegawai' : 'Tambah Pegawai Baru'}</h2>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" onClick={handleDeleteAll} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center cursor-pointer"><Trash2 size={16} className="mr-2"/> Hapus Semua</button>
              <input type="file" id="fileUpload" accept=".csv, .xls, .xlsx" onChange={handleImportFile} className="hidden" />
              <label htmlFor="fileUpload" className="flex-1 sm:flex-none cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center cursor-pointer"><Upload size={16} className="mr-2"/> Import CSV/Excel</label>
            </div>
          </div>
          {importSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center"><Check size={18} className="mr-2" /> {importSuccess}</div>}
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div><label className="block text-xs font-medium text-slate-700 mb-1">NIP</label><input type="text" required value={editForm.nip} disabled={isEditing && employees.some(e=>e.nip === editForm.nip)} onChange={e => setEditForm({...editForm, nip: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label><input type="text" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">Jabatan (Position)</label><input type="text" required value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div><label className="block text-xs font-medium text-slate-700 mb-1">No Handphone</label><input type="text" placeholder="Contoh: 0852xxxx" value={editForm.noHandphone} onChange={e => setEditForm({...editForm, noHandphone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" /></div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status (Role)</label>
              <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="maker">Maker (Hanya Pengaju)</option>
                <option value="approval">Approval (Atasan Langsung)</option>
                <option value="manager">Manager (Selevel Admin Tanpa Pegawai/Parameter)</option>
                <option value="admin">Admin (Pengelola Penuh)</option>
              </select>
            </div>
            <div className="sm:col-span-2 md:col-span-1">
              <label className="block text-xs font-medium text-slate-700 mb-1">Atasan (Approval)</label>
              <select value={editForm.atasan} onChange={e => setEditForm({...editForm, atasan: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white">
                <option value="">- Tidak Ada -</option>
                {employees.filter(e => e.nip !== editForm.nip && (e.role === 'approval' || e.role === 'manager' || e.role === 'admin')).map(e => (
                  <option key={e.nip} value={e.nip}>{e.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2 md:col-span-2 lg:col-span-1">
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full flex items-center justify-center cursor-pointer">{isEditing ? <><Check size={16} className="mr-2"/> Simpan</> : <><Plus size={16} className="mr-2"/> Tambah</>}</button>
              {isEditing && <button type="button" onClick={() => {setIsEditing(false); setEditForm({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' })}} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">Batal</button>}
            </div>
          </form>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input type="text" placeholder="Cari Pegawai berdasarkan Nama, NIP atau Jabatan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-2">
            <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="p-2.5 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white cursor-pointer">
              <option value="all">Saring Role: Semua</option>
              <option value="admin">ADMIN</option>
              <option value="manager">MANAGER</option>
              <option value="approval">APPROVAL</option>
              <option value="maker">MAKER</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-auto max-h-[55vh]">
            <table className="w-full text-left border-collapse relative whitespace-nowrap">
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className="bg-slate-50 text-slate-600 text-sm">
                  <th className="p-3 font-medium bg-slate-50 text-center">Aksi</th>
                  <th className="p-3 font-medium bg-slate-50">NIP</th>
                  <th className="p-3 font-medium bg-slate-50">Nama</th>
                  <th className="p-3 font-medium bg-slate-50">Jabatan</th>
                  <th className="p-3 font-medium bg-slate-50">No HP</th>
                  <th className="p-3 font-medium bg-slate-50">Role</th>
                  <th className="p-3 font-medium bg-slate-50">Atasan</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr><td colSpan="7" className="p-4 text-center text-slate-500 text-sm">Tidak ada data pegawai terfilter.</td></tr>
                ) : (
                  filteredEmployees.map(emp => (
                    <tr key={emp.nip} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                      <td className="p-3 flex justify-center gap-2">
                        <button onClick={() => handleEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer" title="Edit"><Edit size={16} /></button>
                        {emp.nip !== 'admin' && <button onClick={() => handleDelete(emp.nip)} className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer" title="Hapus"><Trash2 size={16} /></button>}
                      </td>
                      <td className="p-3">{emp.nip}</td>
                      <td className="p-3 font-medium text-slate-800">{emp.name}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[200px]" title={emp.position}>{emp.position}</td>
                      <td className="p-3 text-slate-500">{emp.noHandphone || '-'}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : emp.role === 'manager' ? 'bg-indigo-100 text-indigo-700' : emp.role === 'approval' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'}`}>{emp.role.toUpperCase()}</span></td>
                      <td className="p-3 text-slate-500 truncate max-w-[150px]">{emp.atasan ? getEmployeeName(emp.atasan) : '-'}</td>
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

  const ParameterView = () => {
    const [activeSubTab, setActiveSubTab] = useState('limit'); 
    const [localParams, setLocalParams] = useState(params);
    const [saved, setSaved] = useState(false);

    const [showResetModal, setShowResetModal] = useState(false);
    const [resetOtp, setResetOtp] = useState('');
    const [enteredResetOtp, setEnteredResetOtp] = useState('');
    const [resetOtpError, setResetOtpError] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    const handleSave = async (e) => {
      e.preventDefault();
      const finalParams = {
        maxPerDay: localParams.maxPerDay === '' ? 0 : localParams.maxPerDay,
        maxPerMonth: localParams.maxPerMonth === '' ? 0 : localParams.maxPerMonth
      };
      
      try {
        await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'params'), finalParams));
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) {
        setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menyimpan pengaturan.' });
      }
    };

    const handleInitResetFlow = () => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setResetOtp(otp);
      setShowResetModal(true);
      setEnteredResetOtp('');
      setResetOtpError('');
    };

    const handleVerifyResetOtp = async (e) => {
      e.preventDefault();
      setResetOtpError('');
      if (enteredResetOtp === resetOtp) {
        setResetLoading(true);
        try {
          const batch = writeBatch(db);
          let count = 0;
          for (let i = 0; i < requests.length; i++) {
            const req = requests[i];
            const ref = doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id);
            batch.delete(ref);
            count++;
            if (count === 400) { await runWithRetry(() => batch.commit()); count = 0; }
          }
          if (count > 0) await runWithRetry(() => batch.commit());
          setShowResetModal(false);
          setDialog({ type: 'alert', title: 'Data Berhasil Direset', message: 'Semua data pengajuan lembur (approval) telah dibersihkan secara permanen.' });
        } catch (err) {
          setDialog({ type: 'alert', title: 'Kesalahan', message: 'Sistem gagal membersihkan data approval.' });
        } finally {
          setResetLoading(false);
        }
      } else {
        setResetOtpError('Kode konfirmasi salah. Silakan periksa kembali angka yang tertera.');
      }
    };

    return (
      <div className="max-w-lg mx-auto space-y-6 text-left">
        <div className="flex bg-white rounded-xl p-1 shadow-xs border border-slate-200 gap-1 no-print">
          <button type="button" onClick={() => setActiveSubTab('limit')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeSubTab === 'limit' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><Settings size={15} /><span>Limit Lembur</span></button>
          <button type="button" onClick={() => setActiveSubTab('reset')} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeSubTab === 'reset' ? 'bg-red-50 text-red-600 border border-red-100 shadow-xs' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}><AlertTriangle size={15} /><span>Reset Data Approval</span></button>
        </div>

        {activeSubTab === 'limit' ? (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in duration-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center"><Settings size={20} className="mr-2 text-blue-600" /> Pengaturan Parameter Lembur</h2>
            {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center"><Check size={16} className="mr-2" /> Parameter berhasil disimpan permanen.</div>}
            <form onSubmit={handleSave} className="space-y-4">
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Lembur per Hari (Jam)</label><input type="number" step="0.5" required value={localParams.maxPerDay === '' || Number.isNaN(localParams.maxPerDay) ? '' : localParams.maxPerDay} onChange={e => setLocalParams({...localParams, maxPerDay: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-sm" /></div>
              <div><label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Lembur per Bulan (Jam)</label><input type="number" step="1" required value={localParams.maxPerMonth === '' || Number.isNaN(localParams.maxPerMonth) ? '' : localParams.maxPerMonth} onChange={e => setLocalParams({...localParams, maxPerMonth: e.target.value === '' ? '' : parseFloat(e.target.value)})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-sm" /></div>
              <div className="pt-4"><button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-sm shadow-sm">Simpan Parameter</button></div>
            </form>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 border-t-4 border-t-red-500 animate-in fade-in duration-200">
            <h2 className="text-lg font-semibold text-slate-800 mb-3 flex items-center"><AlertTriangle size={20} className="mr-2 text-red-500" /> Reset Data Approval</h2>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed">Gunakan submenu ini untuk menghapus seluruh input data lembur yang dikirimkan oleh Maker (baik berstatus Pending, Registered, Approved, maupun Reject). Tindakan ini membutuhkan verifikasi keamanan tingkat tinggi.</p>
            <button type="button" onClick={handleInitResetFlow} disabled={resetLoading} className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 p-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">{resetLoading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Mulai Reset Data Approval</button>
          </div>
        )}

        {showResetModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5"><ShieldCheck size={18} className="text-red-500" /> Verifikasi Keamanan Reset</h3>
                  <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"><X size={18} /></button>
                </div>
                <form onSubmit={handleVerifyResetOtp} className="space-y-4 text-left">
                  <div className="p-3 bg-red-50 border border-red-100 text-red-800 rounded-xl text-xs flex gap-2.5">
                    <AlertTriangle size={24} className="flex-shrink-0 mt-0.5 text-red-500" />
                    <div className="leading-relaxed">
                      <strong className="font-bold">PERINGATAN KERAS!</strong> Anda akan menghapus seluruh data pengajuan lembur yang tersimpan di dalam database cloud. Tindakan ini tidak dapat dibatalkan.
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-amber-800 font-medium mb-1">Ketik kode berikut untuk konfirmasi:</p>
                    <div className="text-2xl font-mono font-bold text-amber-900 tracking-widest bg-white border border-amber-200 rounded py-2 select-all">
                      {resetOtp}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider text-center">Masukkan Kode Konfirmasi</label>
                    <input type="text" maxLength={6} required inputMode="numeric" pattern="[0-9]*" placeholder="______" value={enteredResetOtp} onChange={e => setEnteredResetOtp(e.target.value.replace(/[^0-9]/g, ''))} className="w-full p-3 border border-slate-300 rounded-xl text-center font-mono text-xl tracking-widest font-bold focus:ring-2 focus:ring-red-500 bg-slate-50" />
                  </div>
                  {resetOtpError && <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2 rounded"><AlertCircle size={14} className="mr-1 flex-shrink-0" /> {resetOtpError}</p>}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setShowResetModal(false)} className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer">Batal</button>
                    <button type="submit" disabled={resetLoading} className="flex-1 py-2.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-sm cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2">
                      {resetLoading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />} Jalankan Reset
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const LaporanView = () => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date(2026, 5, 2);
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
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
      if (filteredRequests.length === 0) {
        setDialog({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data lembur pada filter saat ini.' });
        return;
      }

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
              table.data th { background-color: #f1f5f9; text-align: center; font-weight: bold; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .text-center { text-align: center; }
              .font-bold { font-weight: bold; }
              @media print {
                @page { margin: 10mm; size: A4 portrait; }
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              }
            </style>
          </head>
          <body>
      `;

      groupedData.forEach(group => {
        const approvedTotal = group.requests.filter(r => r.status === 'Approved' || r.status === 'Registered').reduce((sum, r) => sum + r.duration, 0);
        const rejectTotal = group.requests.filter(r => r.status === 'Reject' || r.status === 'Rejected').reduce((sum, r) => sum + r.duration, 0);

        html += `
          <div class="page">
            <div class="header">
              <div>PT. BANK TABUNGAN NEGARA (PERSERO) TBK</div>
              <div>KANTOR CABANG MAMUJU</div>
              <div class="title">LAPORAN RINCIAN LEMBUR</div>
              <div style="font-weight: normal; font-size: 11px;">BULAN : ${getFormattedMonthYear(selectedMonth)}</div>
            </div>
            
            <table class="info">
              <tr><td class="font-bold">NAMA</td><td>: ${group.name.toUpperCase()}</td></tr>
              <tr><td class="font-bold">NIP</td><td>: ${group.nip}</td></tr>
            </table>

            <table class="data">
              <thead>
                <tr>
                  <th style="width: 15%;">Tanggal</th>
                  <th style="width: 25%;">Waktu Kerja</th>
                  <th style="width: 15%;">Durasi</th>
                  <th style="width: 30%;">Alasan Lembur</th>
                  <th style="width: 15%;">Status</th>
                </tr>
              </thead>
              <tbody>
        `;

        group.requests.forEach(req => {
          html += `
            <tr>
              <td class="text-center">${getFormattedDate(req.date)}</td>
              <td class="text-center">${req.startTime} - ${req.endTime}</td>
              <td class="text-center font-bold">${req.duration.toFixed(1)} j</td>
              <td>${req.reason}</td>
              <td class="text-center">${req.status}</td>
            </tr>
          `;
        });

        html += `
                <tr>
                  <td colspan="5" class="font-bold" style="background-color: #f8fafc; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
                    <div style="color: #0284c7;">Approved: ${approvedTotal.toFixed(1)} jam</div>
                    <div style="color: #ef4444;">Reject: ${rejectTotal.toFixed(1)} jam</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        `;
      });

      html += `</body></html>`;

      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.top = '-10000px';
      printFrame.style.width = '100%';
      printFrame.style.height = '100%';
      document.body.appendChild(printFrame);

      printFrame.contentWindow.document.open();
      printFrame.contentWindow.document.write(html);
      printFrame.contentWindow.document.close();

      setTimeout(() => {
        setDialog(null);
        printFrame.contentWindow.focus();
        printFrame.contentWindow.print();
        
        setTimeout(() => document.body.removeChild(printFrame), 3000);
      }, 500);
    };

    const handleExportExcel = () => {
      if (!window.XLSX) return setDialog({ type: 'alert', title: 'Sistem Belum Siap', message: 'Library XLSX belum termuat sepenuhnya. Mohon coba sesaat lagi.' });
      if (filteredRequests.length === 0) return setDialog({ type: 'alert', title: 'Data Kosong', message: 'Tidak ada data lembur pada filter saat ini untuk diekspor.' });

      const rawExportData = filteredRequests.map(r => ({
        NIP: r.nip, Nama: getEmployeeName(r.nip), Tanggal: r.date, 'Waktu Kerja': `${r.startTime} - ${r.endTime}`,
        'Durasi (Jam)': r.duration, 'Alasan Lembur': r.reason, Status: r.status, Atasan: getEmployeeName(r.atasan) || '-'
      }));

      const worksheet = window.XLSX.utils.json_to_sheet(rawExportData);
      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian Lembur");
      
      const maxLens = {};
      rawExportData.forEach(row => {
        Object.keys(row).forEach(key => maxLens[key] = Math.max(maxLens[key] || 10, String(row[key] || '').length));
      });
      worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));
      window.XLSX.writeFile(workbook, `Laporan_Lembur_BTN_Mamuju_${selectedMonth}.xlsx`);
    };

    return (
      <div id="laporan-view-container" className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print-full-width">
        <style>{`
          .a4-sheet {
            width: 210mm;
            min-height: 297mm;
            padding: 15mm 20mm;
            margin: 0 auto 20px auto;
            background: white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
            box-sizing: border-box;
            color: black;
          }
        `}</style>
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

        {/* --- MODAL PDF VIEWER TERINTEGRASI --- */}
        {isPrintMode && (
          <div className="fixed inset-0 bg-slate-800 z-[999] p-4 sm:p-8 flex flex-col animate-in fade-in duration-200 overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 border border-slate-700 text-white p-4 rounded-xl mb-6 shadow-lg w-full max-w-[210mm] mx-auto flex-shrink-0 sticky top-4 z-50">
              <div className="flex items-center gap-3">
                <FileText className="text-blue-400" size={24} />
                <div className="text-left">
                  <p className="font-semibold text-sm">Pratinjau Layout Kertas A4</p>
                  <p className="text-xs text-slate-400">Pastikan data sesuai, lalu klik tombol Cetak Dokumen di sebelah kanan.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-3 sm:mt-0">
                <button onClick={handlePrintNative} className="bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-2">
                   <Printer size={16}/> Cetak Dokumen (Native)
                </button>
                <button onClick={() => setIsPrintMode(false)} className="bg-slate-700 hover:bg-slate-600 px-5 py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center gap-2">
                   <X size={16}/> Tutup
                </button>
              </div>
            </div>
            
            <div className="w-full flex flex-col items-center pb-20">
              {groupedData.map((group) => {
                const approvedTotal = group.requests.filter(r => r.status === 'Approved' || r.status === 'Registered').reduce((sum, r) => sum + r.duration, 0);
                const rejectTotal = group.requests.filter(r => r.status === 'Reject' || r.status === 'Rejected').reduce((sum, r) => sum + r.duration, 0);
                return (
                  <div key={group.nip} className="a4-sheet font-sans">
                    <div className="font-sans text-black mb-6 avoid-break"><div className="font-bold text-xs tracking-wide">PT. BANK TABUNGAN NEGARA (PERSERO) TBK</div><div className="font-bold text-xs tracking-wide">KANTOR CABANG MAMUJU</div><div className="my-5"></div><div className="font-bold text-sm tracking-wide">LAPORAN RINCIAN LEMBUR</div><div className="font-bold text-xs">BULAN : {getFormattedMonthYear(selectedMonth)}</div><div className="mt-4 text-xs space-y-1.5 font-sans"><div className="flex"><span className="w-16 font-bold">NAMA</span><span className="font-semibold uppercase">: {group.name}</span></div><div className="flex"><span className="w-16 font-bold">NIP</span><span className="font-semibold uppercase">: {group.nip}</span></div></div></div>
                    <table className="w-full text-left border-collapse border border-black text-xs mb-8">
                      <thead className="avoid-break"><tr className="bg-slate-100 border-b border-black font-semibold text-black"><th className="p-2 border border-black text-center">Tanggal</th><th className="p-2 border border-black text-center">Waktu Kerja</th><th className="p-2 border border-black text-center">Durasi</th><th className="p-2 border border-black text-center">Alasan Lembur</th><th className="p-2 border border-black text-center">Status</th></tr></thead>
                      <tbody>
                        {group.requests.map(req => (
                          <tr key={req.id} className="border-b border-black avoid-break"><td className="p-2 border border-black text-center">{getFormattedDate(req.date)}</td><td className="p-2 border border-black text-center">{req.startTime} - {req.endTime}</td><td className="p-2 border border-black text-center font-semibold">{req.duration.toFixed(1)} j</td><td className="p-2 border border-black">{req.reason}</td><td className="p-2 border border-black text-center font-medium">{req.status}</td></tr>
                        ))}
                        <tr className="bg-slate-50 font-bold border border-black avoid-break"><td colSpan="5" className="p-3 text-left border border-black"><div className="space-y-1"><div>Approved: {approvedTotal.toFixed(1)} jam</div><div>Reject: {rejectTotal.toFixed(1)} jam</div></div></td></tr>
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  const StatistikView = () => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date(2026, 5, 2);
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
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

    const metrics = useMemo(() => {
      let filtered = requests.filter(r => (r.status === 'Approved' || r.status === 'Registered') && r.date.startsWith(selectedMonth));
      const allowedNips = accessiblePegawai.map(p => p.nip);
      filtered = filtered.filter(r => allowedNips.includes(r.nip));
      if (selectedPegawai !== 'all') filtered = filtered.filter(r => r.nip === selectedPegawai);
      if (selectedAtasan !== 'all' && selectedPegawai === 'all') filtered = filtered.filter(r => r.atasan === selectedAtasan);
      const totalJam = filtered.reduce((sum, r) => sum + r.duration, 0);
      const uniqueEmps = new Set(filtered.map(r => r.nip)).size;
      return { totalJam, totalPegawai: uniqueEmps, averageJam: uniqueEmps > 0 ? totalJam / uniqueEmps : 0, frekuensi: filtered.length };
    }, [requests, selectedMonth, selectedPegawai, selectedAtasan, accessiblePegawai]);

    const statsData = useMemo(() => {
      let filtered = requests.filter(r => (r.status === 'Approved' || r.status === 'Registered') && r.date.startsWith(selectedMonth));
      const allowedNips = accessiblePegawai.map(p => p.nip);
      filtered = filtered.filter(r => allowedNips.includes(r.nip));
      if (selectedPegawai !== 'all') filtered = filtered.filter(r => r.nip === selectedPegawai);
      if (selectedAtasan !== 'all' && selectedPegawai === 'all') filtered = filtered.filter(r => r.atasan === selectedAtasan);
      const aggregate = {};
      filtered.forEach(req => {
        if (!aggregate[req.nip]) aggregate[req.nip] = { nip: req.nip, name: getEmployeeName(req.nip), totalJam: 0, count: 0 };
        aggregate[req.nip].totalJam += req.duration;
        aggregate[req.nip].count += 1;
      });
      return Object.values(aggregate).sort((a,b) => b.totalJam - a.totalJam);
    }, [requests, selectedMonth, selectedPegawai, selectedAtasan, accessiblePegawai]);

    const maxHoursChart = Math.max(params.maxPerMonth, ...statsData.map(d => d.totalJam));

    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-wrap gap-4 items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Statistik Lembur (Registered & Approved)</h2>
          <div className="flex flex-wrap gap-3">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm bg-white" />
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager') && (<select value={selectedAtasan} onChange={e => { setSelectedAtasan(e.target.value); setSelectedPegawai('all'); }} className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[160px] cursor-pointer"><option value="all">-- Semua Atasan --</option>{accessibleAtasan.map(emp => (<option key={emp.nip} value={emp.nip}>{emp.name}</option>))}</select>)}
            {(currentUser?.role === 'admin' || currentUser?.role === 'manager' || currentUser?.role === 'approval') && (<select value={selectedPegawai} onChange={e => setSelectedPegawai(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[160px] cursor-pointer"><option value="all">-- Semua Pegawai --</option>{accessiblePegawai.map(emp => (<option key={emp.nip} value={emp.nip}>{emp.name}</option>))}</select>)}
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Total Jam Lembur</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.totalJam.toFixed(1)} <span className="text-sm font-normal">Jam</span></p></div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Pegawai Terlibat</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.totalPegawai} <span className="text-sm font-normal">Karyawan</span></p></div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Rerata Jam Kerja</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.averageJam.toFixed(1)} <span className="text-sm font-normal">Jam/Peg</span></p></div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-5 rounded-2xl text-white shadow-md"><p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Total Frekuensi</p><p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.frekuensi} <span className="text-sm font-normal">Sesi</span></p></div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          {statsData.length === 0 ? <div className="text-center text-slate-500 py-8 text-sm">Tidak ada data lembur yang terekam pada periode ini.</div> : (
            <div className="space-y-6">
              {statsData.map(stat => (
                <div key={stat.nip}>
                  <div className="flex justify-between text-sm mb-1"><span className="font-semibold text-slate-800">{stat.name} <span className="text-slate-400 font-normal text-xs">({stat.nip})</span></span><span className="font-semibold text-blue-600">{stat.totalJam.toFixed(1)} Jam <span className="text-slate-400 font-normal text-xs ml-1">/ {params.maxPerMonth} jam</span></span></div>
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

  const SimulatorView = () => {
    const activeEmployees = employees.filter(e => e.nip !== 'admin');
    const handleGenerateDummy = async () => {
      if (activeEmployees.length === 0) return setDialog({ type: 'alert', title: 'Pegawai Kosong', message: 'Silakan impor data pegawai terlebih dahulu sebelum membuat data simulasi lembur.' });
      setGenerating(true);
      try {
        const dummyRequests = [];
        const targetApprovedHours = 40;
        activeEmployees.forEach(emp => {
          const availableDays = Array.from({ length: 30 }, (_, i) => i + 1);
          for (let i = availableDays.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [availableDays[i], availableDays[j]] = [availableDays[j], availableDays[i]]; }
          let dayIndex = 0; let approvedTotal = 0;
          while (approvedTotal < targetApprovedHours && dayIndex < 20) {
            const remaining = targetApprovedHours - approvedTotal;
            let duration = Math.floor(Math.random() * 4) + 2; if (duration > remaining) duration = remaining;
            const dayNum = availableDays[dayIndex++]; const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`; const dateStr = `2026-06-${dayStr}`;
            const startHour = 17; const endHourVal = startHour + Math.floor(duration); const endMinVal = (duration % 1) * 60; const endHourStr = `${endHourVal < 10 ? '0' + endHourVal : endHourVal}:${endMinVal === 0 ? '00' : '30'}`;
            const id = `dummy-approved-${emp.nip}-${dayStr}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            dummyRequests.push({ id, nip: emp.nip, date: dateStr, startTime: "17:00", endTime: endHourStr, duration: duration, reason: "Penyelesaian laporan (Simulasi)", status: 'Approved', atasan: emp.atasan || '', isDummy: true });
            approvedTotal += duration;
          }
          const numReject = Math.floor(Math.random() * 2) + 2; 
          for (let r = 0; r < numReject; r++) {
            if (dayIndex >= 30) break;
            const duration = Math.floor(Math.random() * 4) + 2; const dayNum = availableDays[dayIndex++]; const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`; const dateStr = `2026-06-${dayStr}`;
            const startHour = 17; const endHourVal = startHour + Math.floor(duration); const endMinVal = (duration % 1) * 60; const endHourStr = `${endHourVal < 10 ? '0' + endHourVal : endHourVal}:${endMinVal === 0 ? '00' : '30'}`;
            const id = `dummy-reject-${emp.nip}-${dayStr}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            dummyRequests.push({ id, nip: emp.nip, date: dateStr, startTime: "17:00", endTime: endHourStr, duration: duration, reason: "Lampiran bukti tidak valid (Simulasi)", status: 'Reject', atasan: emp.atasan || '', isDummy: true });
          }
        });
        let batch = writeBatch(db); let count = 0;
        for (let i = 0; i < dummyRequests.length; i++) {
          batch.set(doc(db, 'artifacts', appId, 'public', 'data', 'requests', dummyRequests[i].id), dummyRequests[i]); count++;
          if (count === 400) { await runWithRetry(() => batch.commit()); batch = writeBatch(db); count = 0; }
        }
        if (count > 0) await runWithRetry(() => batch.commit());
        setDialog({ type: 'alert', title: 'Simulasi Sukses', message: `Berhasil membuat data acak untuk ${activeEmployees.length} pegawai: Masing-masing 40 jam status 'Approved' dan data 'Reject' di bulan Juni 2026.` });
      } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Terjadi kesalahan sistem saat menyimpan data simulasi.' });
      } finally { setGenerating(false); }
    };

    const handleClearDummy = () => {
      const dummies = requests.filter(r => r.isDummy === true);
      if (dummies.length === 0) return setDialog({ type: 'alert', title: 'Tidak Ada Data', message: 'Tidak ada data simulator yang tersimpan.' });
      setDialog({
        type: 'confirm', title: 'Hapus Data Simulator', message: `Yakin menghapus ${dummies.length} data lembur simulator permanen?`, isDanger: true,
        onConfirm: async () => {
          setGenerating(true);
          try {
            let batch = writeBatch(db); let count = 0;
            for (let i = 0; i < dummies.length; i++) {
              batch.delete(doc(db, 'artifacts', appId, 'public', 'data', 'requests', dummies[i].id)); count++;
              if (count === 400) { await runWithRetry(() => batch.commit()); batch = writeBatch(db); count = 0; }
            }
            if (count > 0) await runWithRetry(() => batch.commit());
            setDialog({ type: 'alert', title: 'Berhasil', message: `Sebanyak ${dummies.length} data simulator dibersihkan.` });
          } catch (err) { setDialog({ type: 'alert', title: 'Kesalahan', message: 'Sistem gagal membersihkan data simulator.' });
          } finally { setGenerating(false); }
        }
      });
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3 mb-6"><div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg"><Database size={24} /></div><div className="text-left"><h2 className="text-lg font-semibold text-slate-800">Pusat Kendali Simulator Data</h2><p className="text-xs text-slate-500">Gunakan menu ini untuk mempermudah pengujian alur kerja.</p></div></div>
          <div className="space-y-6 border-t pt-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1 text-left"><h3 className="text-sm font-bold text-slate-800">Generate Data Lembur</h3><p className="text-xs text-slate-500 max-w-md">Membuat data lembur acak untuk <strong>{activeEmployees.length} pegawai aktif</strong> pada bulan <strong>Juni 2026</strong>. </p></div>
              <button onClick={handleGenerateDummy} disabled={generating} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap">{generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Generate Data</button>
            </div>
            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1 text-left"><h3 className="text-sm font-bold text-red-800">Bersihkan Data Simulator</h3><p className="text-xs text-red-700 max-w-md">Menghapus seluruh catatan lembur dummy simulator yang berada dalam database.</p></div>
              <button onClick={handleClearDummy} disabled={generating} className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap">{generating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Hapus Simulator</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER CONTAINER UTAMA ---
  return (
    <div id="app-container" className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row pb-16 md:pb-0 relative animate-in fade-in duration-200 print:block print:h-auto print:min-h-0 print:overflow-visible print:bg-white">
      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 flex-shrink-0 h-screen sticky top-0 shadow-xl z-20 no-print">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <img src="Bank_BTN_logo.png" alt="BTN Logo" className="h-8 w-auto object-contain bg-white p-1 rounded" onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} />
          <div className="text-left"><h1 className="text-xl font-bold text-white flex items-center">Overtime 244</h1><p className="text-xs text-slate-400">KC Mamuju</p></div>
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
        {/* TOP BAR */}
        <header className="bg-white border-b border-slate-200 p-4 px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center shadow-sm z-10 sticky top-0 gap-3 no-print">
          <div className="flex justify-between w-full md:w-auto items-center">
            <h1 className="md:hidden text-lg font-bold text-slate-800 flex items-center gap-2">
              <img src="Bank_BTN_logo.png" alt="BTN Logo" className="h-6 w-auto object-contain" onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} />
              <div className="flex flex-col text-left leading-none"><span className="text-base font-bold">Overtime 244</span><span className="text-[10px] text-slate-500 uppercase">KC Mamuju</span></div>
            </h1>
            <h2 className="hidden md:block text-lg font-semibold text-slate-800 capitalize">{navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}</h2>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {!isAppInstalled && (deferredPrompt || isIosPromptVisible) && (
              <button onClick={handleInstallPwa} className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer mr-2" title="Install Aplikasi ini di Perangkat Anda">
                {isIosPromptVisible ? <Smartphone size={14} /> : <DownloadCloud size={14} />} Install PWA
              </button>
            )}
            
            {currentUser?.role === 'admin' && pendingResets.length > 0 && (
              <button onClick={() => setShowResetRequestsModal(true)} className="relative p-2 text-slate-600 hover:bg-slate-200 bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-200 shadow-sm" title="Permintaan Reset Sandi">
                <Bell size={18} />
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
              </button>
            )}

            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex flex-row items-center gap-1.5">
              <span className="font-bold text-slate-800">{currentUser?.name}</span>
              {currentUser?.position && <span className="text-slate-500 text-xs font-normal hidden sm:inline">— {currentUser.position}</span>}
            </div>
          </div>
        </header>

        {/* CONTENT VIEW AREA */}
        <div id="app-content-area" className="p-4 md:p-6 flex-1 overflow-y-auto print:block print:overflow-visible print:h-auto print:min-h-0 print:p-0">
          {activeTab === 'pengajuan' && <PengajuanView />}
          {activeTab === 'approval' && <ApprovalView />}
          {activeTab === 'pegawai' && <PegawaiView />}
          {activeTab === 'parameter' && <ParameterView />}
          {activeTab === 'laporan' && <LaporanView />}
          {activeTab === 'statistik' && <StatistikView />}
          {activeTab === 'simulator' && <SimulatorView />}
        </div>
      </main>

      {/* BOTTOM NAVIGATION (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between items-center px-1 py-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-print">
        {navItems.filter(item => item.roles.includes(currentUser?.role)).map(item => {
          const Icon = item.icon;
          return (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${activeTab === item.id ? 'text-blue-600' : 'text-slate-500'}`}>
              <Icon size={22} className={`mb-1 ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`} />
              <span className="truncate w-full text-center leading-tight">{item.label.split(' ')[0]}</span>
            </button>
          );
        })}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg text-[10px] font-medium text-red-500 cursor-pointer">
          <LogOut size={22} className="mb-1 opacity-75" />
          <span className="truncate w-full text-center leading-tight">Keluar</span>
        </button>
      </nav>

      {/* MODAL NOTIFIKASI RESET UNTUK ADMIN */}
      {showResetRequestsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-70 p-4 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
             <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Bell size={20} className="text-red-500"/> Permintaan Reset Sandi</h3>
                  <button onClick={() => setShowResetRequestsModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                   {pendingResets.length === 0 ? (
                     <p className="text-sm text-slate-500 text-center py-4">Tidak ada permintaan reset saat ini.</p>
                   ) : (
                     pendingResets.map(emp => (
                        <div key={emp.nip} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200">
                           <div className="text-left">
                             <p className="font-bold text-sm text-slate-800">{emp.name}</p>
                             <p className="text-xs text-slate-500 font-mono mt-0.5">NIP: {emp.nip}</p>
                           </div>
                           <button onClick={() => handleApproveReset(emp)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-sm border border-red-200">
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

      {/* POPUP DIALOG CONTEXT (No window.alert/confirm) */}
      {dialogComponent}
    </div>
  );
}
