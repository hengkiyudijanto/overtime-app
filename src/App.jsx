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
  UserCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, writeBatch } from 'firebase/firestore';


// --- INITIALIZE FIREBASE SYSTEM (Dual Compatibility: Canvas Sandbox & Local/Production Vite Environment) ---
const getFirebaseConfig = () => {
  // 1. Prioritaskan konfigurasi otomatis dari sandbox Canvas
  if (typeof __firebase_config !== 'undefined' && __firebase_config) {
    try {
      return JSON.parse(__firebase_config);
    } catch (e) {
      console.error("Gagal memuat __firebase_config:", e);
    }
  }
  
  // 2. Gunakan Environment Variables standar Vite untuk Vercel / Komputer Lokal
  // Ditulis literal agar Vite dapat menggantinya secara statis saat 'npm run build'
  return {
    apiKey: import.meta.env ? import.meta.env.VITE_FIREBASE_API_KEY : "",
    authDomain: import.meta.env ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : "",
    projectId: import.meta.env ? import.meta.env.VITE_FIREBASE_PROJECT_ID : "",
    storageBucket: import.meta.env ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : "",
    messagingSenderId: import.meta.env ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : "",
    appId: import.meta.env ? import.meta.env.VITE_FIREBASE_APP_ID : ""
  };
};

const firebaseConfig = getFirebaseConfig();
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Menghindari karakter '/' yang dapat merusak segmen path Firestore di Canvas
const getAppId = () => {
  if (typeof __app_id !== 'undefined' && __app_id) {
    return String(__app_id).replace(/\//g, '_');
  }
  const localAppId = import.meta.env ? import.meta.env.VITE_APP_ID : "";
  return String(localAppId || 'default-app-id').replace(/\//g, '_');
};
const appId = getAppId();

// Helper pertahanan koneksi database cloud
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

  // State Login & Ganti Password Baru
  const [selectedNip, setSelectedNip] = useState('');
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // State Force Change Password (Login Pertama)
  const [pendingPasswordChangeUser, setPendingPasswordChangeUser] = useState(null);
  const [newPasswordForm, setNewPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [newPasswordError, setNewPasswordError] = useState('');

  // State Wizard Lupa Password
  const [showLupaPassword, setShowLupaPassword] = useState(false);
  const [lupaNip, setLupaNip] = useState('');
  const [lupaStep, setLupaStep] = useState(1); // 1: Input NIP, 2: Kirim OTP, 3: Verifikasi OTP, 4: Ganti Password Baru
  const [otpTargetEmployee, setOtpTargetEmployee] = useState(null);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [lupaPasswordForm, setLupaPasswordForm] = useState({ password: '', confirmPassword: '' });
  const [lupaPasswordError, setLupaPasswordError] = useState('');

  // Notifikasi Simulasi WhatsApp In-App
  const [whatsappToast, setWhatsappToast] = useState({ show: false, message: '', otp: '' });

  // State dialog konfirmasi custom (No window.alert/confirm)
  const [dialog, setDialog] = useState(null); 

  // State In-App Print Preview Mode
  const [isPrintMode, setIsPrintMode] = useState(false);

  // State Loading Generator Data Simulator
  const [generating, setGenerating] = useState(false);

  // --- LOGO FALLBACK CERDAS (SVG Akurat Menyerupai Logo Baru Bank BTN 2024) ---
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
    let isMounted = true;
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        if (isMounted) {
          setIsAuthed(true);
        }
      } catch (err) {
        console.error("Gagal Autentikasi Firebase:", err);
        // Fallback ke login anonim jika custom token gagal
        try {
          await signInAnonymously(auth);
          if (isMounted) {
            setIsAuthed(true);
          }
        } catch (e) {
          console.error("Fallback anonymous auth gagal:", e);
          if (isMounted) {
            setAuthOrFirestoreError("auth-failed");
          }
        }
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (isMounted) {
        setUser(u);
      }
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);


  useEffect(() => {
    if (!user || !isAuthed) return;
    
    // Listener Data Pegawai
    const empRef = collection(db, 'artifacts', appId, 'public', 'data', 'employees');
    const unsubEmp = onSnapshot(empRef, (snap) => {
      let emps = snap.docs.map(d => d.data());
      
      const isDbEmpty = emps.length === 0 || !emps.some(e => e.role === 'admin');
      if (isDbEmpty) {
        const tempAdmin = { 
          nip: 'admin', 
          name: 'Administrator (Darurat)', 
          position: 'System Admin', 
          noHandphone: '-', 
          role: 'admin', 
          atasan: '' 
        };
        emps = [tempAdmin, ...emps];
      }
      
      setEmployees(emps);

      if (isDbEmpty) {
        const tempAdmin = emps.find(e => e.nip === 'admin');
        setCurrentUser(tempAdmin);
        setActiveTab('pengajuan');
      }

      setLoading(false);
    }, (e) => {
      console.error("Error memuat Pegawai:", e);
      setAuthOrFirestoreError("permission-denied");
      setLoading(false);
    });

    // Listener Data Lembur
    const reqRef = collection(db, 'artifacts', appId, 'public', 'data', 'requests');
    const unsubReq = onSnapshot(reqRef, (snap) => {
      setRequests(snap.docs.map(d => d.data()));
    }, (e) => {
      console.error("Error memuat Lembur:", e);
      setAuthOrFirestoreError("permission-denied");
      setLoading(false);
    });

    // Listener Parameter
    const paramRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'params');
    const unsubParam = onSnapshot(paramRef, (snap) => {
      if (snap.exists()) {
        setParams(snap.data());
      } else {
        runWithRetry(() => setDoc(paramRef, { maxPerDay: 10, maxPerMonth: 40 }));
      }
    }, (e) => {
      console.error("Error memuat Parameter:", e);
      setAuthOrFirestoreError("permission-denied");
      setLoading(false);
    });

    return () => { unsubEmp(); unsubReq(); unsubParam(); };
  }, [user, isAuthed]);

  useEffect(() => {
    if (employees.length > 0 && !selectedNip) {
      const lastNip = localStorage.getItem('last_logged_in_nip');
      if (lastNip && employees.some(e => e.nip === lastNip)) {
        setSelectedNip(lastNip);
      } else {
        setSelectedNip(employees[0].nip);
      }
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

    if (pwd.length < 6) {
      setNewPasswordError('Kata sandi minimal berisi 6 digit.');
      return;
    }

    if (!/^\d+$/.test(pwd)) {
      setNewPasswordError('Kata sandi wajib hanya terdiri dari angka (0-9).');
      return;
    }

    if (pwd !== confirm) {
      setNewPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      const empRef = doc(db, 'artifacts', appId, 'public', 'data', 'employees', pendingPasswordChangeUser.nip);
      const updatedUser = { 
        ...pendingPasswordChangeUser, 
        password: pwd, 
        passwordChanged: true 
      };

      await runWithRetry(() => setDoc(empRef, updatedUser));
      
      setCurrentUser(updatedUser);
      setPendingPasswordChangeUser(null);
      setNewPasswordForm({ password: '', confirmPassword: '' });
      setActiveTab('pengajuan');
      
      setDialog({
        type: 'alert',
        title: 'Sandi Diperbarui',
        message: 'Kata sandi default Anda berhasil diganti. Silakan gunakan kata sandi baru ini untuk login berikutnya.'
      });
    } catch (err) {
      setNewPasswordError('Gagal memperbarui sandi ke cloud database.');
    }
  };

  const handleLupaStep1 = (e) => {
    e.preventDefault();
    setLupaPasswordError('');
    const emp = employees.find(e => e.nip === lupaNip);
    
    if (!emp) {
      setLupaPasswordError('NIP tidak terdaftar di sistem.');
      return;
    }

    if (!emp.noHandphone || emp.noHandphone === '-') {
      setLupaPasswordError('Gagal: Akun tidak memiliki nomor WhatsApp terdaftar. Silakan hubungi Administrator.');
      return;
    }

    setOtpTargetEmployee(emp);
    setLupaStep(2);
  };

  const handleKirimOtpWhatsApp = () => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);

    let formattedPhone = otpTargetEmployee.noHandphone.replace(/[^0-9]/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '62' + formattedPhone.slice(1);
    }

    const templateMsg = `Kode OTP Lupa Password O-Time Mamuju Anda adalah: ${otp}. Harap jangan bagikan kode ini kepada siapa pun.`;
    const waUrl = `https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodeURIComponent(templateMsg)}`;

    setWhatsappToast({
      show: true,
      message: `Pesan WhatsApp Terkirim ke ${otpTargetEmployee.noHandphone}: "${templateMsg}"`,
      otp: otp
    });

    setDialog({
      type: 'alert',
      title: 'WhatsApp OTP Dikirim',
      message: `Sistem telah mengirimkan kode OTP ke nomor WhatsApp ${otpTargetEmployee.noHandphone}. Jika tab WhatsApp Web tidak terbuka otomatis, silakan salin kode simulasi yang muncul di notifikasi layar Anda.`
    });

    window.open(waUrl, '_blank');
    setLupaStep(3);
  };

  const handleLupaStep3 = (e) => {
    e.preventDefault();
    setOtpError('');
    if (enteredOtp === generatedOtp) {
      setLupaStep(4);
    } else {
      setOtpError('Kode OTP salah atau tidak cocok. Silakan periksa notifikasi simulasi Anda.');
    }
  };

  const handleLupaStep4 = async (e) => {
    e.preventDefault();
    setLupaPasswordError('');

    const pwd = lupaPasswordForm.password;
    const confirm = lupaPasswordForm.confirmPassword;

    if (pwd.length < 6) {
      setLupaPasswordError('Kata sandi minimal berisi 6 digit.');
      return;
    }

    if (!/^\d+$/.test(pwd)) {
      setLupaPasswordError('Kata sandi wajib hanya terdiri dari angka (0-9).');
      return;
    }

    if (pwd !== confirm) {
      setLupaPasswordError('Konfirmasi kata sandi tidak cocok.');
      return;
    }

    try {
      const empRef = doc(db, 'artifacts', appId, 'public', 'data', 'employees', otpTargetEmployee.nip);
      const updatedUser = { 
        ...otpTargetEmployee, 
        password: pwd, 
        passwordChanged: true 
      };

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

      setDialog({
        type: 'alert',
        title: 'Verifikasi Berhasil',
        message: 'Kata sandi akun Anda berhasil direset menggunakan verifikasi WhatsApp.'
      });
    } catch (err) {
      setLupaPasswordError('Gagal mereset sandi di database.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    const lastNip = localStorage.getItem('last_logged_in_nip');
    setSelectedNip(lastNip && employees.some(e => e.nip === lastNip) ? lastNip : (employees[0]?.nip || ''));
    setEnteredPassword('');
    setPasswordError(false);
  };

  const maskPhoneNumber = (phone) => {
    if (!phone || phone.length < 7) return phone;
    return phone.slice(0, 4) + '*****' + phone.slice(-3);
  };


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

          <div className="space-y-4 text-left">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px]">1</span>
                Aktifkan Anonymous Sign-In
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pl-6">
                Buka <strong>Firebase Console</strong> &gt; <strong>Authentication</strong> &gt; tab <strong>Sign-in method</strong> &gt; klik <strong>Add new provider</strong> &gt; pilih <strong>Anonymous</strong> &gt; aktifkan/enable &gt; klik <strong>Save</strong>.
              </p>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px]">2</span>
                Perbarui Aturan Firestore (Rules)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pl-6 mb-2">
                Buka <strong>Firestore Database</strong> &gt; tab <strong>Rules</strong> &gt; ubah aturan menjadi seperti di bawah ini agar aman dan dapat diakses:
              </p>
              <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-lg text-[10px] font-mono overflow-x-auto pl-6">
{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /artifacts/{appId}/{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
              </pre>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px]">3</span>
                Periksa Environment Variables Vercel
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pl-6">
                Pastikan <strong>API Key</strong>, <strong>Project ID</strong>, dan variabel lainnya yang dimasukkan pada pengaturan Vercel Anda sudah sesuai secara presisi dengan kredensial aplikasi Firebase Anda.
              </p>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold text-sm transition-all shadow-md mt-6 flex items-center justify-center gap-2 cursor-pointer"
          >
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
        <p className="text-slate-500 font-medium">Menyinkronkan data dengan Cloud Storage...</p>
      </div>
    );
  }

  // FORCE CHANGE PASSWORD SCREEN
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
              <input 
                type="password" 
                required
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Buat minimal 6 digit angka"
                value={newPasswordForm.password}
                onChange={e => setNewPasswordForm({ ...newPasswordForm, password: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Konfirmasi Kata Sandi Baru</label>
              <input 
                type="password" 
                required
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="Ketik ulang kata sandi baru"
                value={newPasswordForm.confirmPassword}
                onChange={e => setNewPasswordForm({ ...newPasswordForm, confirmPassword: e.target.value.replace(/[^0-9]/g, '') })}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center"
              />
            </div>

            {newPasswordError && (
              <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2.5 rounded-lg">
                <AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {newPasswordError}
              </p>
            )}

            <div className="bg-slate-50 p-3 rounded-lg text-[11px] text-slate-500 space-y-1">
              <span className="font-bold text-slate-600">Ketentuan Keamanan:</span>
              <ul className="list-disc pl-4 space-y-0.5">
                <li>Harus memiliki panjang minimal <span className="font-semibold text-slate-700">6 digit</span></li>
                <li>Hanya diperbolehkan berisi karakter <span className="font-semibold text-slate-700">angka (0-9)</span></li>
              </ul>
            </div>

            <div className="flex gap-2 pt-2">
              <button 
                type="button" 
                onClick={() => setPendingPasswordChangeUser(null)} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 p-3 rounded-xl font-semibold transition-all text-sm cursor-pointer"
              >
                Kembali
              </button>
              <button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold transition-all text-sm shadow-md shadow-blue-200 cursor-pointer"
              >
                Simpan & Masuk
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SCREEN LOGIN UTAMA
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4" style={{ backgroundColor: '#0b1329' }}>
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 bg-blue-50 rounded-full mb-4">
              <img 
                src="Bank_BTN_logo.png" 
                alt="Bank BTN Logo" 
                className="h-12 w-auto object-contain" 
                onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} 
              />
            </div>
            <h1 className="text-2xl font-bold text-slate-800">O-Time</h1>
            <p className="text-sm text-slate-500 mt-1">Kantor Cabang Mamuju</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">Pilih Akun Petugas</label>
              <select 
                value={selectedNip}
                onChange={e => {
                  setSelectedNip(e.target.value);
                  setPasswordError(false);
                }}
                className="w-full p-3 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-slate-50 cursor-pointer"
              >
                {employees.map(emp => (
                  <option key={emp.nip} value={emp.nip}>
                    {emp.nip} - {emp.name} ({((emp.role) || '').toUpperCase()})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">Kata Sandi</label>
                <button 
                  type="button" 
                  onClick={() => setShowLupaPassword(true)}
                  className="text-[10px] text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Lupa Kata Sandi?
                </button>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  placeholder="Password default = NIP"
                  value={enteredPassword}
                  onChange={e => {
                    setEnteredPassword(e.target.value);
                    setPasswordError(false);
                  }}
                  className={`w-full p-3 pl-10 pr-10 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 ${
                    passwordError ? 'border-red-500 bg-red-50/50 font-sans' : 'border-slate-300 bg-slate-50 font-mono tracking-wide'
                  }`}
                />
                <Lock size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => { setShowPassword(!showPassword); }}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordError && (
                <p className="text-xs text-red-500 font-medium mt-1.5 flex items-center">
                  <AlertCircle size={14} className="mr-1" /> Kata sandi salah! Default: NIP Anda.
                </p>
              )}
            </div>

            <button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold transition-all shadow-md shadow-blue-200 mt-2 flex items-center justify-center cursor-pointer"
            >
              Masuk ke Aplikasi
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-5">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sistem Otomasi Lembur Internal KC Mamuju. Bagi pengguna pertama, masukkan NIP sebagai kata sandi pembuka. (Admin Darurat NIP: "admin")
            </p>
          </div>
        </div>

        {/* MODAL RESET PASSWORD (WHATSAPP VERIFICATION) */}
        {showLupaPassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-70 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-md w-full">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck size={18} className="text-blue-600" /> Lupa Kata Sandi Akun
                  </h3>
                  <button 
                    onClick={() => {
                      setShowLupaPassword(false);
                      setLupaStep(1);
                      setLupaNip('');
                    }} 
                    className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                {lupaStep === 1 && (
                  <form onSubmit={handleLupaStep1} className="space-y-4 text-left">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Masukkan NIP pegawai Anda yang valid. Sistem akan mencocokkan NIP serta mengecek ketersediaan nomor WhatsApp untuk proses reset.
                    </p>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Masukkan NIP Anda</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Contoh: 6628"
                        value={lupaNip}
                        onChange={e => setLupaNip(e.target.value)}
                        className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-medium"
                      />
                    </div>

                    {lupaPasswordError && (
                      <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2 rounded">
                        <AlertCircle size={14} className="mr-1 flex-shrink-0" /> {lupaPasswordError}
                      </p>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <button 
                        type="button" 
                        onClick={() => { setShowLupaPassword(false); }} 
                        className="px-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                      >
                        Batal
                      </button>
                      <button 
                        type="submit" 
                        className="px-4 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer"
                      >
                        Lanjutkan
                      </button>
                    </div>
                  </form>
                )}

                {lupaStep === 2 && otpTargetEmployee && (
                  <div className="space-y-5 text-left">
                    <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-xs flex gap-2">
                      <AlertCircle size={18} className="flex-shrink-0 mt-0.5 text-blue-600" />
                      <div>
                        Sistem mendeteksi NIP tersebut didaftarkan atas nama <strong className="uppercase">{otpTargetEmployee.name}</strong>.
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs text-slate-500">
                        Kode konfirmasi OTP berupa 6-digit angka akan dikirim ke nomor WhatsApp berikut:
                      </p>
                      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-center font-bold text-slate-800 text-lg font-mono tracking-wider">
                        {maskPhoneNumber(otpTargetEmployee.noHandphone)}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="button" 
                        onClick={() => setLupaStep(1)} 
                        className="flex-1 py-2.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                      >
                        Kembali
                      </button>
                      <button 
                        type="button" 
                        onClick={handleKirimOtpWhatsApp}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-xl flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <MessageSquare size={14} /> Kirim OTP ke WA
                      </button>
                    </div>
                  </div>
                )}

                {lupaStep === 3 && otpTargetEmployee && (
                  <form onSubmit={handleLupaStep3} className="space-y-4 text-left">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Kode OTP telah disimulasikan melalui WhatsApp. Harap salin atau masukkan kode verifikasi OTP 6-digit angka tersebut di bawah ini:
                    </p>
                    
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 p-2.5 rounded-lg text-[10px] leading-relaxed mb-1">
                      <span className="font-bold">Info Simulasi:</span> Periksa pop-up banner WhatsApp di pojok kanan atas layar Anda untuk melihat kode OTP simulasi secara cepat.
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider text-center">Masukkan 6 Digit OTP</label>
                      <input 
                        type="text" 
                        maxLength={6}
                        required 
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="______"
                        value={enteredOtp}
                        onChange={e => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full p-3 border border-slate-300 rounded-xl text-center font-mono text-xl tracking-widest font-bold focus:ring-2 focus:ring-blue-500 bg-slate-50"
                      />
                    </div>

                    {otpError && (
                      <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2 rounded">
                        <AlertCircle size={14} className="mr-1 flex-shrink-0" /> {otpError}
                      </p>
                    )}

                    <div className="flex gap-2 pt-2">
                      <button 
                        type="button" 
                        onClick={handleKirimOtpWhatsApp} 
                        className="flex-1 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
                      >
                        Kirim Ulang OTP
                      </button>
                      <button 
                        type="submit" 
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm cursor-pointer"
                      >
                        Verifikasi OTP
                      </button>
                    </div>
                  </form>
                )}

                {lupaStep === 4 && (
                  <form onSubmit={handleLupaStep4} className="space-y-4 text-left">
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Kode OTP Berhasil diverifikasi! Silakan tentukan kata sandi baru Anda (Wajib minimal 6 digit berupa angka).
                    </p>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Kata Sandi Baru (Hanya Angka)</label>
                      <input 
                        type="password" 
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Buat minimal 6 digit angka"
                        value={lupaPasswordForm.password}
                        onChange={e => setLupaPasswordForm({ ...lupaPasswordForm, password: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Konfirmasi Kata Sandi Baru</label>
                      <input 
                        type="password" 
                        required
                        inputMode="numeric"
                        pattern="[0-9]*"
                        placeholder="Ketik ulang kata sandi baru"
                        value={lupaPasswordForm.confirmPassword}
                        onChange={e => setLupaPasswordForm({ ...lupaPasswordForm, confirmPassword: e.target.value.replace(/[^0-9]/g, '') })}
                        className="w-full p-3 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50 font-mono tracking-widest text-center"
                      />
                    </div>

                    {lupaPasswordError && (
                      <p className="text-xs text-red-500 font-medium flex items-center bg-red-50 p-2.5 rounded-lg">
                        <AlertCircle size={14} className="mr-1.5 flex-shrink-0" /> {lupaPasswordError}
                      </p>
                    )}

                    <button 
                      type="submit" 
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-semibold text-xs transition-all shadow-md shadow-blue-200 flex items-center justify-center cursor-pointer"
                    >
                      Simpan & Masuk ke Aplikasi
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }


  // Tab views (Pengajuan, Approval, Pegawai, Parameter, Laporan, Statistik, Simulator)
  // ... (Sesuai dengan implementasi fungsional penuh di berkas utama)