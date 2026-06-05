import React, { useState, useEffect, useMemo } from 'react';
import {
  Users, Clock, CheckSquare, Settings, FileText, BarChart2, Plus, Edit, Trash2, Check, X,
  AlertCircle, Upload, AlertTriangle, LogOut, Lock, Camera, Loader2, Printer, Database, Key,
  Eye, EyeOff, MessageSquare, ShieldCheck, Search, Download, SlidersHorizontal, Calendar,
  ChevronLeft, ChevronRight, DownloadCloud, Smartphone
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

const rawAppId = typeof __app_id !== 'undefined' ? __app_id : (getEnv('VITE_APP_ID') || 'default-app-id');
const appId = String(rawAppId).replace(/\//g, '_');

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

  const [selectedNip, setSelectedNip] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [pendingPasswordChangeUser, setPendingPasswordChangeUser] = useState(null);
  const [newPasswordForm, setNewPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [newPasswordError, setNewPasswordError] = useState('');

  const [showLupaPassword, setShowLupaPassword] = useState(false);
  const [lupaNip, setLupaNip] = useState('');
  const [lupaStep, setLupaStep] = useState(1);
  const [otpTargetEmployee, setOtpTargetEmployee] = useState(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [lupaPasswordForm, setLupaPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [lupaPasswordError, setLupaPasswordError] = useState('');

  const [whatsappToast, setWhatsappToast] = useState({ show: false, message: '', otp: '' });
  const [dialog, setDialog] = useState(null);
  const [generating, setGenerating] = useState(false);

  const [reviewComment, setReviewComment] = useState('');
  const [reviewError, setReviewError] = useState('');

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIosPromptVisible, setIsIosPromptVisible] = useState(false);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

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
      setDialog({ type: 'alert', title: 'Sandi Diperbarui', message: 'Kata sandi default Anda berhasil diganti.' });
    } catch (err) {
      setNewPasswordError('Gagal memperbarui sandi ke cloud database.');
    }
  };

  const handleLupaStep1 = (e) => {
    e.preventDefault();
    setLupaPasswordError('');
    const emp = employees.find(e => e.nip === lupaNip);
    if (!emp) return setLupaPasswordError('NIP tidak terdaftar.');
    if (!emp.noHandphone || emp.noHandphone === '-') return setLupaPasswordError('Akun tidak memiliki nomor WhatsApp.');
    setOtpTargetEmployee(emp);
    setLupaStep(2);
  };

  const handleKirimOtpWhatsApp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    let formattedPhone = otpTargetEmployee.noHandphone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.slice(1);
    const templateMsg = `Kode OTP Lupa Password Overtime 244 Mamuju Anda adalah: ${otp}. Jangan bagikan kode ini.`;
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(templateMsg)}`;
    setWhatsappToast({ show: true, message: `Pesan WhatsApp ke ${otpTargetEmployee.noHandphone}`, otp: otp });
    setDialog({ type: 'alert', title: 'WhatsApp OTP Dikirim', message: `Kode OTP telah dikirim ke nomor Anda.` });
    window.open(waUrl, '_blank');
    setLupaStep(3);
  };

  const handleLupaStep3 = (e) => {
    e.preventDefault();
    setOtpError('');
    if (enteredOtp === generatedOtp) setLupaStep(4);
    else setOtpError('Kode OTP salah.');
  };

  const handleLupaStep4 = async (e) => {
    e.preventDefault();
    setLupaPasswordError('');
    const pwd = lupaPasswordForm.password;
    const confirm = lupaPasswordForm.confirmPassword;
    if (pwd.length < 6) return setLupaPasswordError('Kata sandi minimal 6 digit.');
    if (!/^\d+$/.test(pwd)) return setLupaPasswordError('Kata sandi hanya angka.');
    if (pwd !== confirm) return setLupaPasswordError('Konfirmasi tidak cocok.');

    try {
      const empRef = doc(db, 'artifacts', appId, 'public', 'data', 'employees', otpTargetEmployee.nip);
      const updatedUser = { ...otpTargetEmployee, password: pwd, passwordChanged: true };
      await runWithRetry(() => setDoc(empRef, updatedUser));
      localStorage.setItem('last_logged_in_nip', updatedUser.nip);
      setCurrentUser(updatedUser);
      setShowLupaPassword(false);
      setLupaNip('');
      setLupaStep(1);
      setOtpTargetEmployee(null);
      setGeneratedOtp('');
      setEnteredOtp('');
      setLupaPasswordForm({ password: '', confirmPassword: '' });
      setActiveTab('pengajuan');
      setDialog({ type: 'alert', title: 'Berhasil', message: 'Kata sandi berhasil direset.' });
    } catch (err) {
      setLupaPasswordError('Gagal mereset sandi.');
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
        message: 'Ketuk tombol Share, lalu "Tambah ke Layar Utama".'
      });
    }
  };

  const maskPhoneNumber = (phone) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 4) + '*****' + phone.slice(-3);
  };

  const handleReviewAction = async (req, action) => {
    if (action === 'Revisi' && !reviewComment.trim()) {
      setReviewError('Keterangan revisi wajib diisi.');
      return;
    }

    setDialog(null);
    try {
      await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id.toString()), {
        ...req,
        status: action,
        approvalComment: reviewComment.trim()
      }));
      setDialog({ type: 'alert', title: 'Sukses', message: `Pengajuan diproses: ${action}.` });
    } catch (err) {
      setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal memproses persetujuan.' });
    }
  };

  const dialogComponent = dialog ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900 bg-opacity-60 p-4 backdrop-blur-sm no-print">
      <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full ${dialog.type === 'lightbox' || dialog.type === 'review' ? 'max-w-lg' : 'max-w-sm'}`}>
        <div className="p-6">
          {/* ... (dialog rendering sama seperti kode asli, tidak diubah) */}
          {/* Saya sertakan versi ringkasnya di bawah agar tidak terlalu panjang */}
          {/* Untuk kenyamanan, asumsikan dialogComponent tetap sama seperti di kode awal */}
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
            // ... review modal sama persis seperti aslinya, tidak diubah
            <div className="flex flex-col text-left">
              <h3 className="text-lg font-bold text-slate-800 mb-3">{dialog.title}</h3>
              <div className="w-full bg-slate-100 border rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4 max-h-[35vh]">
                <img src={dialog.request.imageUrl} alt="Foto Bukti Lembur" className="max-h-[32vh] object-contain rounded-lg cursor-pointer hover:opacity-90" onClick={() => setDialog({ type: 'lightbox', title: `Pratinjau Bukti Detail`, imageUrl: dialog.request.imageUrl })} title="Klik untuk perbesar" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 text-xs space-y-1.5">
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Pegawai:</span><span className="font-semibold text-slate-800">{getEmployeeName(dialog.request.nip)} ({dialog.request.nip})</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Tanggal:</span><span className="font-semibold text-slate-800">{dialog.request.date}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Waktu:</span><span className="font-semibold text-slate-800">{dialog.request.startTime} - {dialog.request.endTime}</span></div>
                <div className="flex justify-between"><span className="text-slate-500 font-medium">Durasi:</span><span className="font-semibold text-slate-800">{dialog.request.duration.toFixed(1)} Jam</span></div>
                <div className="flex flex-col pt-1.5 border-t border-slate-200 mt-1.5"><span className="text-slate-500 font-medium">Alasan Lembur:</span><span className="font-medium text-slate-800 mt-0.5">{dialog.request.reason}</span></div>
              </div>
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Catatan / Keterangan Atasan</label>
                <textarea value={reviewComment} onChange={(e) => { setReviewComment(e.target.value); setReviewError(''); }} className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 resize-none bg-slate-50" rows="2" placeholder="Ketik keterangan revisi, alasan penolakan, atau pesan persetujuan..."></textarea>
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
                {dialog.type === 'confirm' && (
                  <button onClick={() => setDialog(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">Batal</button>
                )}
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
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Aplikasi mendeteksi kendala hak akses atau kegagalan autentikasi dengan Firebase.</p>
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
        <p className="text-slate-500 font-medium">Menyinkronkan data dengan Cloud Storage...</p>
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
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">Halo <strong>{pendingPasswordChangeUser.name}</strong>, ini login pertama Anda. Buat kata sandi baru.</p>
          </div>
          <form onSubmit={handleSaveForcePassword} className="space-y-4">
            <div><label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Kata Sandi Baru (Hanya Angka)</label><input type="password" required inputMode="numeric" pattern="[0-9]*" placeholder="Minimal 6 digit angka" value={newPasswordForm.password} onChange={e => setNewPasswordForm({ ...newPasswordForm, password: e.target.value.replace(/[^0-9]/g, '') })} className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center" /></div>
            <div><label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Konfirmasi Kata Sandi Baru</label><input type="password" required inputMode="numeric" pattern="[0-9]*" placeholder="Ketik ulang kata sandi baru" value={newPasswordForm.confirmPassword} onChange={e => setNewPasswordForm({ ...newPasswordForm, confirmPassword: e.target.value.replace(/[^0-9]/g, '') })} className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center" /></div>
            {newPasswordError && <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2.5 rounded-lg"><AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {newPasswordError}</p>}
            <div className="flex gap-2 pt-2"><button type="button" onClick={() => setPendingPasswordChangeUser(null)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl font-semibold transition-all text-sm cursor-pointer">Kembali</button><button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold transition-all text-sm shadow-md shadow-blue-200 cursor-pointer">Simpan & Masuk</button></div>
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
            {/* ... form login sama persis */}
          </form>
          {/* Tombol PWA */}
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
        {/* Modal Lupa Password – tidak diubah */}
        {showLupaPassword && ( /* ... sama seperti asli ... */ )}
        {dialogComponent}
      </div>
    );
  }

  // *** PENGATURAN DEFAULT BULAN MENJADI DINAMIS ***
  // (diambil dari komponen masing-masing, berikut hanya perubahan di level state)

  // PengajuanView - ganti default calendarDate
  const PengajuanView = () => {
    const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '', reason: '', imageUrl: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [imageProcessing, setImageProcessing] = useState(false);
    const [myStatusFilter, setMyStatusFilter] = useState('all');
    const [calendarDate, setCalendarDate] = useState(() => new Date()); // 🆕 dinamis

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

    // ... sisa kode PengajuanView sama, hanya perbaikan pada handleImageSelect
    const handleImageSelect = (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) { // 🆕 validasi tipe file
        setError('File yang diunggah harus berupa gambar (JPG, PNG, dsb).');
        e.target.value = null;
        return;
      }

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
        img.onerror = () => { // 🆕 handle error gambar
          setImageProcessing(false);
          setError('File yang dipilih bukan gambar yang valid atau rusak.');
        };
      };
      reader.onerror = () => { // 🆕 handle error reader
        setImageProcessing(false);
        setError('Gagal membaca file gambar.');
      };
    };

    // ... return seperti asli, tidak ada perubahan lain
  };

  // LaporanView - perbaikan cetak
  const LaporanView = () => {
    // 🆕 default bulan dinamis
    const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedAtasan, setSelectedAtasan] = useState('all');
    const [selectedPegawai, setSelectedPegawai] = useState('all');

    // ... sisa logic sama

    const handleTriggerPrint = () => {
      window.print(); // 🆕 langsung panggil print, tanpa render ulang
    };

    // ... return tanpa bagian isPrintMode && (...)
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print-full-width">
        {/* Style print tetap */}
        <style>{`@media print { aside, header, nav, .no-print, button, select, input { display: none !important; } body, .main-content { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; } .print-full-width { width: 100% !important; max-width: 100% !important; border: none !important; box-shadow: none !important; padding: 0 !important; } .print-table { border: 1.5px solid #000 !important; border-collapse: collapse !important; width: 100% !important; } .print-table th, .print-table td { border: 1px solid #000 !important; padding: 8px 10px !important; font-size: 11px !important; color: #000 !important; } .print-header-section { display: block !important; } .print-page-block { page-break-after: always !important; break-after: page !important; } tr, .avoid-break { page-break-inside: avoid !important; break-inside: avoid !important; } } .print-header-section { display: none; }`}</style>
        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 no-print">
          <h2 className="text-lg font-semibold text-slate-800">Laporan Lembur</h2>
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
            <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border border-slate-300 rounded-lg text-sm bg-white" />
            {/* ... filter atasan/pegawai */}
            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-sm justify-center cursor-pointer flex-1 sm:flex-none"><Download size={16} className="mr-2" /> Excel</button>
              <button onClick={handleTriggerPrint} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-sm justify-center cursor-pointer flex-1 sm:flex-none"><Printer size={16} className="mr-2" /> Cetak</button>
            </div>
          </div>
        </div>

        {groupedData.length === 0 ? (
          <div className="text-center py-10 text-slate-400 no-print font-medium">Tidak ada data lembur terfilter.</div>
        ) : (
          <div className="space-y-12">
            {groupedData.map(group => {
              const approvedTotal = group.requests.filter(r => r.status === 'Approved' || r.status === 'Registered').reduce((sum, r) => sum + r.duration, 0);
              const rejectTotal = group.requests.filter(r => r.status === 'Reject' || r.status === 'Rejected').reduce((sum, r) => sum + r.duration, 0);
              return (
                <div key={group.nip} className="border border-slate-100 p-6 rounded-xl bg-white shadow-xs">
                  <div className="mb-5 text-left font-sans text-black border-b pb-4">
                    <div className="font-bold text-xs tracking-wide">PT. BANK TABUNGAN NEGARA (PERSERO) TBK</div>
                    <div className="font-bold text-xs tracking-wide">KANTOR CABANG MAMUJU</div>
                    <div className="my-3"></div>
                    <div className="font-bold text-sm tracking-wide">LAPORAN RINCIAN LEMBUR</div>
                    <div className="font-bold text-xs">BULAN : {getFormattedMonthYear(selectedMonth)}</div>
                    <div className="mt-4 text-xs space-y-1.5">
                      <div className="flex"><span className="w-16 font-bold text-slate-500">NAMA</span><span className="font-bold uppercase text-slate-800">: {group.name}</span></div>
                      <div className="flex"><span className="w-16 font-bold text-slate-500">NIP</span><span className="font-bold uppercase text-slate-800">: {group.nip}</span></div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead><tr className="bg-slate-50 text-slate-600 text-xs border-b"><th className="p-3 font-medium">Tanggal</th><th className="p-3 font-medium">Waktu Kerja</th><th className="p-3 font-medium">Durasi</th><th className="p-3 font-medium">Alasan Lembur</th><th className="p-3 font-medium">Status</th></tr></thead>
                      <tbody>
                        {group.requests.map(req => (
                          <tr key={req.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                            <td className="p-3 whitespace-nowrap">{getFormattedDate(req.date)}</td>
                            <td className="p-3 whitespace-nowrap">{req.startTime} - {req.endTime}</td>
                            <td className="p-3 font-semibold whitespace-nowrap">{req.duration.toFixed(1)} j</td>
                            <td className="p-3 text-slate-600">{req.reason}</td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${req.status === 'Approved' ? 'bg-green-100 text-green-700' : (req.status === 'Reject' || req.status === 'Rejected') ? 'bg-red-100 text-red-700' : req.status === 'Registered' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span>
                                {req.imageUrl && <img src={req.imageUrl} alt="Bukti" onClick={() => setDialog({ type: 'lightbox', title: `Pratinjau Bukti (${group.name})`, imageUrl: req.imageUrl })} className="w-8 h-8 object-cover rounded-lg border border-slate-200 cursor-zoom-in shadow-xs hover:opacity-85" />}
                              </div>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold text-sm">
                          <td colSpan="5" className="p-4 text-left">
                            <div className="space-y-1 text-xs">
                              <div className="text-blue-600 font-bold">Approved: {approvedTotal.toFixed(1)} jam</div>
                              <div className="text-red-500 font-bold">Reject: {rejectTotal.toFixed(1)} jam</div>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* 🆕 HAPUS isPrintMode block sepenuhnya */}
      </div>
    );
  };

  // StatistikView - default bulan dinamis
  const StatistikView = () => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    // ... sisa kode sama
  };

  // PegawaiView - validasi NIP duplikat
  const PegawaiView = () => {
    // ... state

    const handleSave = async (e) => {
      e.preventDefault();
      // 🆕 Cek duplikat NIP hanya saat tambah baru (bukan edit)
      if (!isEditing && employees.some(e => e.nip === editForm.nip)) {
        setDialog({
          type: 'alert',
          title: 'NIP Sudah Terdaftar',
          message: `NIP ${editForm.nip} sudah digunakan oleh ${getEmployeeName(editForm.nip)}. Gunakan NIP lain.`,
        });
        return;
      }
      try {
        await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'employees', editForm.nip), editForm));
        setIsEditing(false);
        setEditForm({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' });
      } catch (err) {
        setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menyimpan data pegawai.' });
      }
    };

    // ... sisa kode
  };

  // ParameterView, SimulatorView, ApprovalView tidak berubah secara signifikan

  // --- RENDER CONTAINER UTAMA ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row pb-16 md:pb-0 relative animate-in fade-in duration-200">
      {whatsappToast.show && (
        <div className="fixed top-4 right-4 z-[999] max-w-sm w-full bg-slate-800 text-white p-4 rounded-xl shadow-2xl border-l-4 border-green-500 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300 no-print">
          {/* ... toast WhatsApp */}
        </div>
      )}

      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 flex-shrink-0 h-screen sticky top-0 shadow-xl z-20 no-print">
        {/* ... sidebar */}
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b border-slate-200 p-4 px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center shadow-sm z-10 sticky top-0 gap-3 no-print">
          {/* ... top bar */}
        </header>

        <div className="p-4 md:p-6 flex-1 overflow-y-auto">
          {activeTab === 'pengajuan' && <PengajuanView />}
          {activeTab === 'approval' && <ApprovalView />}
          {activeTab === 'pegawai' && <PegawaiView />}
          {activeTab === 'parameter' && <ParameterView />}
          {activeTab === 'laporan' && <LaporanView />}
          {activeTab === 'statistik' && <StatistikView />}
          {activeTab === 'simulator' && <SimulatorView />}
        </div>
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between items-center px-1 py-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-print">
        {/* ... bottom nav */}
      </nav>

      {dialogComponent}
    </div>
  );
}
