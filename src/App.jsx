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

// --- SAFE ENV RETRIEVER HELPER (Resolves ES2015 compile-time warnings for import.meta) ---
const getEnvValue = (key) => {
  try {
    const metaEnv = new Function("return import.meta.env")();
    if (metaEnv && typeof metaEnv === 'object') {
      return metaEnv[key] || "";
    }
  } catch (e) {
    // Abaikan jika tidak berjalan di lingkungan Vite/ESM
  }
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env[key] || "";
    }
  } catch (e) {
    // Abaikan jika tidak berjalan di lingkungan Node.js/CommonJS
  }
  return "";
};

// --- INITIALIZE FIREBASE SYSTEM (Dual Compatibility: Canvas Sandbox & Local/Production Environment) ---
const firebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config
  ? JSON.parse(__firebase_config)
  : {
      apiKey: getEnvValue('VITE_FIREBASE_API_KEY'),
      authDomain: getEnvValue('VITE_FIREBASE_AUTH_DOMAIN'),
      projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID'),
      storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: getEnvValue('VITE_FIREBASE_MESSAGING_SENDER_ID'),
      appId: getEnvValue('VITE_FIREBASE_APP_ID')
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : (getEnvValue('VITE_APP_ID') || 'default-app-id');

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
  const [loading, setLoading] = useState(true);
  
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
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Gagal Autentikasi Firebase:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
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
    }, (e) => console.error("Error memuat Pegawai:", e));

    // Listener Data Lembur
    const reqRef = collection(db, 'artifacts', appId, 'public', 'data', 'requests');
    const unsubReq = onSnapshot(reqRef, (snap) => {
      setRequests(snap.docs.map(d => d.data()));
    }, (e) => console.error("Error memuat Lembur:", e));

    // Listener Parameter
    const paramRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'params');
    const unsubParam = onSnapshot(paramRef, (snap) => {
      if (snap.exists()) {
        setParams(snap.data());
      } else {
        runWithRetry(() => setDoc(paramRef, { maxPerDay: 10, maxPerMonth: 40 }));
      }
    }, (e) => console.error("Error memuat Parameter:", e));

    return () => { unsubEmp(); unsubReq(); unsubParam(); };
  }, [user]);

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
                    {emp.nip} - {emp.name} ({emp.role.toUpperCase()})
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
                  onClick={() => setShowPassword(!showPassword)}
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
                        onClick={() => setShowLupaPassword(false)} 
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

  // --- SUBVIEW 1: PENGAJUAN VIEW ---
  const PengajuanView = () => {
    const [formData, setFormData] = useState({ date: '', startTime: '', endTime: '', reason: '' });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [imageUploadingId, setImageUploadingId] = useState(null);
    const [myStatusFilter, setMyStatusFilter] = useState('all');

    // Calendar navigation state
    const [calendarDate, setCalendarDate] = useState(() => {
      return new Date(2026, 5, 1);
    });

    const calculateDuration = (start, end) => {
      if (!start || !end) return 0;
      const [startHour, startMin] = start.split(':').map(Number);
      const [endHour, endMin] = end.split(':').map(Number);
      
      let startTotalMinutes = (startHour * 60) + startMin;
      let endTotalMinutes = (endHour * 60) + endMin;
      
      let diffMinutes = endTotalMinutes - startTotalMinutes;
      if (diffMinutes < 0) {
        diffMinutes += (24 * 60); 
      }
      
      return diffMinutes / 60;
    };

    const selectedMonth = formData.date ? formData.date.substring(0, 7) : new Date(2026, 5, 2).toISOString().substring(0, 7);
    const currentMonthRequests = requests.filter(r => r.nip === currentUser.nip && r.date.startsWith(selectedMonth));
    
    const processedHours = currentMonthRequests
      .filter(r => r.status === 'Approved' || r.status === 'Registered')
      .reduce((sum, r) => sum + r.duration, 0);

    const pendingHours = currentMonthRequests
      .filter(r => r.status === 'Pending')
      .reduce((sum, r) => sum + r.duration, 0);

    const remainingQuota = params.maxPerMonth - processedHours - pendingHours;

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError('');
      setSuccess('');

      const duration = calculateDuration(formData.startTime, formData.endTime);
      
      if (duration <= 0) {
        setError('Waktu mulai harus berbeda dengan waktu selesai.');
        return;
      }

      // Validasi duplikasi tanggal aktif
      const isDuplicateDate = requests.some(r => 
        r.nip === currentUser.nip && 
        r.date === formData.date && 
        r.status !== 'Reject' && 
        r.status !== 'Rejected'
      );

      if (isDuplicateDate) {
        const [year, month, day] = formData.date.split('-');
        setError(`Gagal mengajukan! Anda sudah memiliki pengajuan lembur aktif pada tanggal ${parseInt(day, 10)}/${parseInt(month, 10)}/${year}. Silakan pilih tanggal lain.`);
        return;
      }

      if (duration > params.maxPerDay) {
        setError(`Durasi lembur (${duration.toFixed(1)} jam) melebihi batas maksimal harian (${params.maxPerDay} jam).`);
        return;
      }

      const projectedTotal = processedHours + pendingHours + duration;
      if (projectedTotal > params.maxPerMonth) {
        setError(`Gagal mengajukan! Total akumulasi lembur Anda bulan ini akan menjadi ${projectedTotal.toFixed(1)} jam, melebihi kuota bulanan (${params.maxPerMonth} jam). Sisa kuota Anda: ${Math.max(0, remainingQuota).toFixed(1)} jam.`);
        return;
      }

      const id = Date.now().toString();
      const newRequest = {
        id,
        nip: currentUser.nip,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        duration: duration,
        reason: formData.reason,
        status: 'Pending',
        atasan: currentUser.atasan || ''
      };

      try {
        await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', id), newRequest));
        setSuccess('Pengajuan lembur berhasil disimpan.');
        setFormData({ date: '', startTime: '', endTime: '', reason: '' });
      } catch (err) {
        setError('Gagal menyimpan pengajuan ke cloud.');
      }
    };

    const handleCameraUpload = (e, requestId) => {
      const file = e.target.files[0];
      if (!file) return;

      setImageUploadingId(requestId);

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = async () => {
          try {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            const scaleSize = MAX_WIDTH / img.width;
            canvas.width = MAX_WIDTH;
            canvas.height = img.height * scaleSize;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

            const reqRef = doc(db, 'artifacts', appId, 'public', 'data', 'requests', requestId);
            const req = requests.find(r => r.id === requestId);
            if (req) {
              await runWithRetry(() => setDoc(reqRef, { ...req, imageUrl: compressedBase64 }));
              setDialog({ type: 'alert', title: 'Berhasil', message: 'Foto bukti lembur berhasil disimpan.' });
            }
          } catch (err) {
            console.error(err);
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal memproses gambar bukti.' });
          } finally {
            setImageUploadingId(null);
          }
        };
      };
    };

    const myRequests = requests.filter(r => r.nip === currentUser.nip).sort((a,b) => b.id - a.id);
    
    const filteredMyRequests = useMemo(() => {
      if (myStatusFilter === 'all') return myRequests;
      return myRequests.filter(r => r.status.toLowerCase() === myStatusFilter.toLowerCase());
    }, [myRequests, myStatusFilter]);

    // Calendar Day Mapping Generator
    const calendarDays = useMemo(() => {
      const year = calendarDate.getFullYear();
      const month = calendarDate.getMonth();
      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      
      const dayArray = [];
      // Empty spots before the first day
      for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
        dayArray.push(null);
      }
      for (let d = 1; d <= daysInMonth; d++) {
        dayArray.push(new Date(year, month, d));
      }
      return dayArray;
    }, [calendarDate]);

    const changeCalendarMonth = (val) => {
      setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + val, 1));
    };

    const getDayOvertimeStatus = (dateObj) => {
      if (!dateObj) return null;
      const formattedDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
      const found = myRequests.find(r => r.date === formattedDate);
      return found ? found.status : null;
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Form Card */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Form Pengajuan Lembur Baru</h2>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center text-sm"><AlertCircle size={18} className="mr-2 flex-shrink-0" /> {error}</div>}
            {success && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center text-sm"><Check size={18} className="mr-2 flex-shrink-0" /> {success}</div>}
            
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tanggal</label>
                <input type="date" required value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Alasan Lembur</label>
                <input type="text" required placeholder="Contoh: Rekonsiliasi bulanan" value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Kerja Mulai (24 Jam)</label>
                <input type="time" required value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
                
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 text-slate-600 font-medium">
                  <div className="flex justify-between items-center">
                    <span>Lembur Bulan Ini (Registered/Approved):</span>
                    <span className="font-semibold text-blue-600">{processedHours.toFixed(1)} Jam</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Sedang Diproses (Pending):</span>
                    <span className="font-semibold text-amber-600">{pendingHours.toFixed(1)} Jam</span>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                    <span>Sisa Kuota Lembur Bulan Ini:</span>
                    <span className={`font-bold ${remainingQuota <= 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {Math.max(0, remainingQuota).toFixed(1)} Jam
                    </span>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Waktu Selesai (24 Jam)</label>
                <input type="time" required value={formData.endTime} onChange={e => setFormData({...formData, endTime: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm" />
              </div>
              <div className="md:col-span-2 flex justify-end mt-2">
                <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium text-sm transition-all shadow-sm shadow-blue-200 cursor-pointer flex items-center gap-1.5">
                  <Plus size={16} /> Ajukan Lembur
                </button>
              </div>
            </form>
          </div>

          {/* Visual Activity Calendar Card */}
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar size={16} className="text-blue-600" /> Kalender Aktivitas Lembur
              </h3>
              <div className="flex items-center gap-1">
                <button onClick={() => changeCalendarMonth(-1)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-semibold text-slate-700 min-w-[70px] text-center uppercase">
                  {calendarDate.toLocaleString('id-ID', { month: 'short', year: 'numeric' })}
                </span>
                <button onClick={() => changeCalendarMonth(1)} className="p-1 text-slate-500 hover:bg-slate-100 rounded-lg cursor-pointer">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 mb-2 border-b pb-1.5">
              <span>S</span><span>S</span><span>R</span><span>K</span><span>J</span><span>S</span><span>M</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, idx) => {
                if (!day) return <div key={`empty-${idx}`} className="aspect-square"></div>;
                const status = getDayOvertimeStatus(day);
                let bgStyle = "hover:bg-slate-50 text-slate-800";
                if (status === 'Approved') bgStyle = "bg-green-500 text-white font-bold";
                else if (status === 'Pending') bgStyle = "bg-yellow-400 text-slate-900 font-bold animate-pulse";
                else if (status === 'Registered') bgStyle = "bg-indigo-500 text-white font-bold";
                else if (status === 'Reject' || status === 'Rejected') bgStyle = "bg-red-500 text-white font-bold";

                return (
                  <div 
                    key={`day-${idx}`} 
                    title={status ? `${day.getDate()} - Status: ${status}` : `${day.getDate()}`}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${bgStyle}`}
                  >
                    {day.getDate()}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-yellow-400 rounded-full inline-block"></span>
                <span>Pending (Tahap 1)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full inline-block"></span>
                <span>Registered (Tahap 2)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full inline-block"></span>
                <span>Approved (Selesai)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full inline-block"></span>
                <span>Ditolak / Reject</span>
              </div>
            </div>
          </div>

        </div>

        {/* Overtime History List */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
            <h2 className="text-lg font-semibold text-slate-800">Riwayat Pengajuan Saya</h2>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SlidersHorizontal size={14} className="text-slate-400 flex-shrink-0" />
              <select 
                value={myStatusFilter}
                onChange={e => setMyStatusFilter(e.target.value)}
                className="p-1.5 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-slate-50 bg-white cursor-pointer w-full sm:w-auto"
              >
                <option value="all">Saring Status: Semua</option>
                <option value="pending">Pending</option>
                <option value="registered">Registered</option>
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
                  <th className="p-3 font-medium">Durasi (Jam)</th>
                  <th className="p-3 font-medium">Alasan</th>
                  <th className="p-3 font-medium">Status & Bukti Foto</th>
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
                      <td className="p-3 font-medium">{req.duration.toFixed(1)}</td>
                      <td className="p-3 max-w-[200px] truncate" title={req.reason}>{req.reason}</td>
                      <td className="p-3">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium self-start ${
                            req.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                            (req.status === 'Reject' || req.status === 'Rejected') ? 'bg-red-100 text-red-700' :
                            req.status === 'Registered' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {req.status}
                          </span>
                          
                          {req.status === 'Registered' && (
                            <div className="flex items-center gap-2">
                              {imageUploadingId === req.id ? (
                                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                                  <Loader2 size={14} className="animate-spin" />
                                  <span>Mengunggah...</span>
                                </div>
                              ) : req.imageUrl ? (
                                <div className="flex items-center gap-2">
                                  <div className="relative group">
                                    <img 
                                      src={req.imageUrl} 
                                      alt="Bukti Lembur" 
                                      onClick={() => setDialog({ type: 'lightbox', title: `Bukti Foto Lembur (${req.date})`, imageUrl: req.imageUrl })}
                                      className="w-10 h-10 object-cover rounded-lg border border-slate-200 cursor-zoom-in hover:opacity-85 transition-all shadow-sm"
                                    />
                                  </div>
                                  
                                  <label 
                                    htmlFor={`reupload-${req.id}`}
                                    className="p-1 text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition-colors border border-blue-100 flex items-center justify-center cursor-pointer"
                                    title="Unggah Ulang Bukti"
                                  >
                                    <Camera size={14} />
                                  </label>
                                </div>
                              ) : (
                                <label 
                                  htmlFor={`upload-${req.id}`}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold cursor-pointer border border-blue-200 transition-all shadow-sm"
                                >
                                  <Camera size={13} />
                                  <span>Ambil Foto Bukti</span>
                                </label>
                              )}
                              
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                id={req.imageUrl ? `reupload-${req.id}` : `upload-${req.id}`}
                                onChange={(e) => handleCameraUpload(e, req.id)}
                                className="hidden" 
                              />
                            </div>
                          )}
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

  // --- SUBVIEW 2: APPROVAL VIEW ---
  const ApprovalView = () => {
    const activeRequests = requests.filter(r => {
      const isMyBawahan = r.atasan === currentUser.nip || currentUser.role === 'admin' || currentUser.role === 'manager';
      if (!isMyBawahan) return false;

      const isPhase1 = r.status === 'Pending';
      const isPhase2 = r.status === 'Registered' && r.imageUrl;
      return isPhase1 || isPhase2;
    });

    const handleAction = async (id, action) => {
      const req = requests.find(r => r.id === id);
      if (req) {
        try {
          await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', id.toString()), { ...req, status: action }));
        } catch (err) {
          setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal merubah status persetujuan.' });
        }
      }
    };

    const triggerVerifyModal = (req) => {
      setDialog({
        type: 'verify',
        title: 'Verifikasi Bukti Lembur',
        request: req,
        onApprove: async () => {
          try {
            await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id.toString()), { ...req, status: 'Approved' }));
          } catch(err) {
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal melakukan verifikasi akhir.' });
          }
        },
        onReject: async () => {
          try {
            await runWithRetry(() => setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id.toString()), { ...req, status: 'Reject' }));
          } catch(err) {
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Gagal menolak data bukti.' });
          }
        }
      });
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 animate-in fade-in duration-150">
        <h2 className="text-lg font-semibold text-slate-800 mb-4">Menunggu Persetujuan Anda</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm border-b">
                <th className="p-3 font-medium">Nama Pegawai</th>
                <th className="p-3 font-medium">Tanggal</th>
                <th className="p-3 font-medium">Waktu (Durasi)</th>
                <th className="p-3 font-medium">Alasan</th>
                <th className="p-3 font-medium">Tahap Approval</th>
                <th className="p-3 font-medium text-center">Aksi / Verifikasi</th>
              </tr>
            </thead>
            <tbody>
              {activeRequests.length === 0 ? (
                <tr><td colSpan="6" className="p-4 text-center text-slate-500 text-sm">Tidak ada pengajuan yang perlu disetujui.</td></tr>
              ) : (
                activeRequests.map(req => (
                  <tr key={req.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                    <td className="p-3 font-medium text-slate-800 whitespace-nowrap">{getEmployeeName(req.nip)}</td>
                    <td className="p-3 whitespace-nowrap">{req.date}</td>
                    <td className="p-3 whitespace-nowrap">{req.startTime} - {req.endTime} <span className="text-slate-400">({req.duration.toFixed(1)}j)</span></td>
                    <td className="p-3 max-w-xs truncate" title={req.reason}>{req.reason}</td>
                    <td className="p-3 whitespace-nowrap">
                      {req.status === 'Pending' ? (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold">
                          Tahap 1: Pengajuan
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-xs font-semibold">
                          Tahap 2: Bukti Foto
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {req.status === 'Pending' ? (
                        <div className="flex justify-center gap-2">
                          <button onClick={() => handleAction(req.id, 'Registered')} className="p-1.5 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded transition-colors cursor-pointer" title="Daftarkan (Registered)">
                            <Check size={16} />
                          </button>
                          <button onClick={() => handleAction(req.id, 'Reject')} className="p-1.5 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded transition-colors cursor-pointer" title="Tolak">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => triggerVerifyModal(req)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
                        >
                          Verifikasi
                        </button>
                      )}
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

  // --- SUBVIEW 3: PEGAWAI VIEW ---
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
      setEditForm({
        ...emp,
        noHandphone: emp.noHandphone || ''
      });
      setIsEditing(true);
    };

    const handleDelete = (nip) => {
      setDialog({
        type: 'confirm',
        title: 'Hapus Pegawai',
        message: 'Yakin ingin menghapus data pegawai ini secara permanen?',
        isDanger: true,
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
        type: 'confirm',
        title: 'Hapus Semua Data',
        message: 'PERINGATAN: Apakah Anda yakin ingin menghapus SEMUA data pegawai saat ini? (Kecuali Administrator).',
        isDanger: true,
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
            if (nK && niK) {
              employeeMap[String(r[nK]).trim().toLowerCase()] = String(r[niK]).trim();
            }
          }
          
          for (const row of rows) {
            const keys = Object.keys(row);
            
            const nipKey = keys.find(k => k.trim().toLowerCase() === 'nip' || k.trim().toLowerCase() === 'nik');
            const nameKey = keys.find(k => {
              const kClean = k.trim().toLowerCase();
              return kClean === 'full name' || kClean === 'nama' || kClean.includes('name');
            });
            const posKey = keys.find(k => k.trim().toLowerCase() === 'position' || k.trim().toLowerCase() === 'jabatan' || k.trim().toLowerCase().includes('position'));
            const phoneKey = keys.find(k => k.trim().toLowerCase() === 'no handphone' || k.trim().toLowerCase().includes('handphone') || k.trim().toLowerCase().includes('hp'));
            const atasanKey = keys.find(k => k.trim().toLowerCase().includes('atasan'));
            
            const roleKey = keys.find(k => {
              const kClean = k.trim().toLowerCase();
              return kClean === 'role' || kClean === 'status' || kClean === 'hak akses' || kClean.includes('status') || kClean.includes('role');
            });

            if (nipKey && nameKey) {
              dataFound = true; 
              
              const nip = String(row[nipKey] || '').trim();
              const name = String(row[nameKey] || '').trim();
              const position = posKey ? String(row[posKey] || '').trim() : '';
              const noHandphone = phoneKey ? String(row[phoneKey] || '').trim() : '';
              let atasanRaw = atasanKey ? String(row[atasanKey] || '').trim() : '';
              
              if (atasanRaw && isNaN(atasanRaw)) {
                const mappedNip = employeeMap[atasanRaw.toLowerCase()];
                if (mappedNip) {
                  atasanRaw = mappedNip;
                }
              }
              
              if (nip && name && nip !== 'undefined' && nip !== 'admin' && !employees.some(emp => emp.nip === nip)) {
                let role = 'maker';
                const importedRole = roleKey ? String(row[roleKey] || '').trim().toLowerCase() : '';
                
                if (importedRole) {
                  if (importedRole.includes('admin')) {
                    role = 'admin';
                  } else if (importedRole.includes('manager')) {
                    role = 'manager';
                  } else if (importedRole.includes('approval') || importedRole.includes('approver') || importedRole.includes('atasan')) {
                    role = 'approval';
                  } else if (importedRole.includes('maker') || importedRole.includes('staff') || importedRole.includes('karyawan') || importedRole.includes('biasa')) {
                    role = 'maker';
                  } else {
                    const lowerPos = position.toLowerCase();
                    if (lowerPos.includes('branch manager')) {
                      role = 'admin'; 
                    } else if (lowerPos.includes('manager') || lowerPos.includes('dbm')) {
                      role = 'approval';
                    }
                  }
                } else {
                  const lowerPos = position.toLowerCase();
                  if (lowerPos.includes('branch manager')) {
                    role = 'admin'; 
                  } else if (lowerPos.includes('manager') || lowerPos.includes('dbm')) {
                    role = 'approval';
                  }
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

    // Filter employees with search state and role
    const filteredEmployees = useMemo(() => {
      return employees.filter(emp => {
        const query = searchTerm.toLowerCase();
        const matchesSearch = emp.name.toLowerCase().includes(query) || 
                              emp.nip.toLowerCase().includes(query) || 
                              (emp.position && emp.position.toLowerCase().includes(query));
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
              <button type="button" onClick={handleDeleteAll} className="flex-1 sm:flex-none bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center cursor-pointer">
                <Trash2 size={16} className="mr-2"/> Hapus Semua
              </button>
              
              <input type="file" id="fileUpload" accept=".csv, .xls, .xlsx" onChange={handleImportFile} className="hidden" />
              <label htmlFor="fileUpload" className="flex-1 sm:flex-none cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center cursor-pointer">
                <Upload size={16} className="mr-2"/> Import CSV/Excel
              </label>
            </div>
          </div>
          
          {importSuccess && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center"><Check size={18} className="mr-2" /> {importSuccess}</div>}
          
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">NIP</label>
              <input type="text" required value={editForm.nip} disabled={isEditing && employees.some(e=>e.nip === editForm.nip)} onChange={e => setEditForm({...editForm, nip: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
              <input type="text" required value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jabatan (Position)</label>
              <input type="text" required value={editForm.position} onChange={e => setEditForm({...editForm, position: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">No Handphone</label>
              <input type="text" placeholder="Contoh: 0852xxxx" value={editForm.noHandphone} onChange={e => setEditForm({...editForm, noHandphone: e.target.value})} className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white" />
            </div>
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
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors w-full flex items-center justify-center cursor-pointer">
                {isEditing ? <><Check size={16} className="mr-2"/> Simpan</> : <><Plus size={16} className="mr-2"/> Tambah</>}
              </button>
              {isEditing && (
                <button type="button" onClick={() => {setIsEditing(false); setEditForm({ nip: '', name: '', position: '', noHandphone: '', role: 'maker', atasan: '' })}} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer">
                  Batal
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3.5 text-slate-400" />
            <input 
              type="text"
              placeholder="Cari Pegawai berdasarkan Nama, NIP atau Jabatan..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 p-2.5 border border-slate-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <select 
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="p-2.5 px-4 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white cursor-pointer"
            >
              <option value="all">Saring Role: Semua</option>
              <option value="admin">ADMIN</option>
              <option value="manager">MANAGER</option>
              <option value="approval">APPROVAL</option>
              <option value="maker">MAKER</option>
            </select>
          </div>
        </div>

        {/* Data Table */}
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
                        <button onClick={() => handleEdit(emp)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer" title="Edit">
                          <Edit size={16} />
                        </button>
                        {emp.nip !== 'admin' && (
                          <button onClick={() => handleDelete(emp.nip)} className="p-1.5 text-red-600 hover:bg-red-50 rounded cursor-pointer" title="Hapus">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                      <td className="p-3">{emp.nip}</td>
                      <td className="p-3 font-medium text-slate-800">{emp.name}</td>
                      <td className="p-3 text-slate-500 truncate max-w-[200px]" title={emp.position}>{emp.position}</td>
                      <td className="p-3 text-slate-500">{emp.noHandphone || '-'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          emp.role === 'admin' ? 'bg-purple-100 text-purple-700' : 
                          emp.role === 'manager' ? 'bg-indigo-100 text-indigo-700' :
                          emp.role === 'approval' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {emp.role.toUpperCase()}
                        </span>
                      </td>
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

  // --- SUBVIEW 4: PARAMETER VIEW ---
  const ParameterView = () => {
    const [localParams, setLocalParams] = useState(params);
    const [saved, setSaved] = useState(false);

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

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 max-w-lg mx-auto">
        <h2 className="text-lg font-semibold text-slate-800 mb-6 flex items-center"><Settings size={20} className="mr-2" /> Pengaturan Parameter Lembur</h2>
        
        {saved && <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-center"><Check size={16} className="mr-2" /> Parameter berhasil disimpan permanen.</div>}
        
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Lembur per Hari (Jam)</label>
            <input 
              type="number" 
              step="0.5" 
              required 
              value={localParams.maxPerDay === '' || Number.isNaN(localParams.maxPerDay) ? '' : localParams.maxPerDay} 
              onChange={e => setLocalParams({...localParams, maxPerDay: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-sm" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Maksimal Lembur per Bulan (Jam)</label>
            <input 
              type="number" 
              step="1" 
              required 
              value={localParams.maxPerMonth === '' || Number.isNaN(localParams.maxPerMonth) ? '' : localParams.maxPerMonth} 
              onChange={e => setLocalParams({...localParams, maxPerMonth: e.target.value === '' ? '' : parseFloat(e.target.value)})} 
              className="w-full p-2 border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-sm" 
            />
          </div>
          <div className="pt-4">
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors cursor-pointer text-sm shadow-sm">
              Simpan Parameter
            </button>
          </div>
        </form>
      </div>
    );
  };

  // --- SUBVIEW 5: LAPORAN VIEW ---
  const LaporanView = () => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date(2026, 5, 2);
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedAtasan, setSelectedAtasan] = useState('all');
    const [selectedPegawai, setSelectedPegawai] = useState('all');

    const accessibleAtasan = useMemo(() => {
      const allAtasan = employees.filter(e => e.role === 'approval' || e.role === 'manager' || e.role === 'admin');
      if (currentUser.role === 'admin') {
        return allAtasan;
      }
      if (currentUser.role === 'manager') {
        return allAtasan.filter(e => e.atasan === currentUser.nip);
      }
      return [];
    }, [employees, currentUser]);

    const accessiblePegawai = useMemo(() => {
      if (currentUser.role === 'admin') {
        if (selectedAtasan === 'all') {
          return employees;
        } else {
          return employees.filter(e => e.atasan === selectedAtasan);
        }
      }
      if (currentUser.role === 'manager') {
        if (selectedAtasan === 'all') {
          const downlinerAtasanNips = accessibleAtasan.map(a => a.nip);
          return employees.filter(e => e.atasan === currentUser.nip || downlinerAtasanNips.includes(e.atasan));
        } else {
          return employees.filter(e => e.atasan === selectedAtasan);
        }
      }
      if (currentUser.role === 'approval') {
        return employees.filter(e => e.nip === currentUser.nip || e.atasan === currentUser.nip);
      }
      return [currentUser];
    }, [employees, currentUser, selectedAtasan, accessibleAtasan]);

    useEffect(() => {
      if (selectedPegawai !== 'all' && !accessiblePegawai.some(e => e.nip === selectedPegawai)) {
        setSelectedPegawai('all');
      }
    }, [accessiblePegawai, selectedPegawai]);

    const filteredRequests = useMemo(() => {
      const allowedNips = accessiblePegawai.map(p => p.nip);
      let list = requests.filter(r => allowedNips.includes(r.nip));
      
      if (selectedMonth) {
        list = list.filter(r => r.date.startsWith(selectedMonth));
      }
      if (selectedPegawai !== 'all') {
        list = list.filter(r => r.nip === selectedPegawai);
      }
      if (selectedAtasan !== 'all' && selectedPegawai === 'all') {
        list = list.filter(r => r.atasan === selectedAtasan);
      }
      return list;
    }, [requests, accessiblePegawai, selectedPegawai, selectedAtasan, selectedMonth]);

    const groupedData = useMemo(() => {
      const groups = {};
      filteredRequests.forEach(req => {
        if (!groups[req.nip]) {
          groups[req.nip] = {
            nip: req.nip,
            name: getEmployeeName(req.nip),
            requests: []
          };
        }
        groups[req.nip].requests.push(req);
      });
      return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredRequests, employees]);

    const getFormattedMonthYear = (monthStr) => {
      if (!monthStr) return 'MMM YYYY';
      const [year, month] = monthStr.split('-');
      const months = ['JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI', 'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'];
      const monthIdx = parseInt(month, 10) - 1;
      return `${months[monthIdx] || 'MMM'} ${year}`;
    };

    const getFormattedDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${parseInt(month, 10)}/${parseInt(day, 10)}/${year}`;
    };

    const handleTriggerPrint = () => {
      try {
        setIsPrintMode(true);
        setTimeout(() => {
          window.print();
        }, 300);
      } catch (err) {
        console.error(err);
      }
    };

    // --- NEW: EXPORT TO EXCEL SYSTEM ---
    const handleExportExcel = () => {
      if (!window.XLSX) {
        setDialog({
          type: 'alert',
          title: 'Sistem Belum Siap',
          message: 'Library XLSX belum termuat sepenuhnya. Mohon coba sesaat lagi.'
        });
        return;
      }

      if (filteredRequests.length === 0) {
        setDialog({
          type: 'alert',
          title: 'Data Kosong',
          message: 'Tidak ada data lembur pada filter saat ini untuk diekspor.'
        });
        return;
      }

      const rawExportData = filteredRequests.map(r => ({
        NIP: r.nip,
        Nama: getEmployeeName(r.nip),
        Tanggal: r.date,
        'Waktu Kerja': `${r.startTime} - ${r.endTime}`,
        'Durasi (Jam)': r.duration,
        'Alasan Lembur': r.reason,
        Status: r.status,
        Atasan: getEmployeeName(r.atasan) || '-'
      }));

      const worksheet = window.XLSX.utils.json_to_sheet(rawExportData);
      const workbook = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(workbook, worksheet, "Rincian Lembur");
      
      // Auto-fit Column Widths
      const maxLens = {};
      rawExportData.forEach(row => {
        Object.keys(row).forEach(key => {
          const cellVal = String(row[key] || '');
          maxLens[key] = Math.max(maxLens[key] || 10, cellVal.length);
        });
      });
      worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));

      window.XLSX.writeFile(workbook, `Laporan_Lembur_BTN_Mamuju_${selectedMonth}.xlsx`);
    };

    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 print-full-width">
        <style>{`
          @media print {
            aside, header, nav, .no-print, button, select, input {
              display: none !important;
            }
            body, .main-content {
              background: white !important;
              color: black !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            .print-full-width {
              width: 100% !important;
              max-width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
            }
            .print-table {
              border: 1.5px solid #000 !important;
              border-collapse: collapse !important;
              width: 100% !important;
            }
            .print-table th, .print-table td {
              border: 1px solid #000 !important;
              padding: 8px 10px !important;
              font-size: 11px !important;
              color: #000 !important;
            }
            .print-header-section {
              display: block !important;
            }
            .print-page-block {
              page-break-inside: avoid !important;
              page-break-after: always !important;
              break-after: page !important;
            }
          }
          .print-header-section {
            display: none;
          }
        `}</style>

        <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4 no-print">
          <h2 className="text-lg font-semibold text-slate-800">Laporan Lembur</h2>
          
          <div className="flex flex-col sm:flex-row flex-wrap gap-3 w-full xl:w-auto">
            <input 
              type="month" 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(e.target.value)} 
              className="p-2 border border-slate-300 rounded-lg text-sm bg-white" 
            />

            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <select 
                value={selectedAtasan} 
                onChange={e => {
                  setSelectedAtasan(e.target.value);
                  setSelectedPegawai('all');
                }} 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[180px] cursor-pointer"
              >
                <option value="all">-- Semua Atasan --</option>
                {accessibleAtasan.map(emp => (
                  <option key={emp.nip} value={emp.nip}>{emp.name}</option>
                ))}
              </select>
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'approval') && (
              <select 
                value={selectedPegawai} 
                onChange={e => setSelectedPegawai(e.target.value)} 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[180px] cursor-pointer"
              >
                <option value="all">-- Semua Pegawai --</option>
                {accessiblePegawai.map(emp => (
                  <option key={emp.nip} value={emp.nip}>{emp.name}</option>
                ))}
              </select>
            )}

            <div className="flex gap-2 w-full sm:w-auto justify-end">
              <button 
                onClick={handleExportExcel}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-sm justify-center cursor-pointer flex-1 sm:flex-none"
              >
                <Download size={16} className="mr-2" /> Excel
              </button>
              
              <button 
                onClick={handleTriggerPrint}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center shadow-sm justify-center cursor-pointer flex-1 sm:flex-none"
              >
                <Printer size={16} className="mr-2" /> Cetak
              </button>
            </div>
          </div>
        </div>

        {groupedData.length === 0 ? (
          <div className="text-center py-10 text-slate-400 no-print font-medium">Tidak ada data lembur terfilter.</div>
        ) : (
          <div className="space-y-12 no-print">
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
                      <div className="flex">
                        <span className="w-16 font-bold text-slate-500">NAMA</span>
                        <span className="font-bold uppercase text-slate-800">: {group.name}</span>
                      </div>
                      <div className="flex">
                        <span className="w-16 font-bold text-slate-500">NIP</span>
                        <span className="font-bold uppercase text-slate-800">: {group.nip}</span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 text-xs border-b">
                          <th className="p-3 font-medium">Tanggal</th>
                          <th className="p-3 font-medium">Waktu Kerja</th>
                          <th className="p-3 font-medium">Durasi</th>
                          <th className="p-3 font-medium">Alasan Lembur</th>
                          <th className="p-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.requests.map(req => (
                          <tr key={req.id} className="border-b border-slate-100 text-sm hover:bg-slate-50">
                            <td className="p-3 whitespace-nowrap">{getFormattedDate(req.date)}</td>
                            <td className="p-3 whitespace-nowrap">{req.startTime} - {req.endTime}</td>
                            <td className="p-3 font-semibold whitespace-nowrap">{req.duration.toFixed(1)} j</td>
                            <td className="p-3 text-slate-600">{req.reason}</td>
                            <td className="p-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                                  req.status === 'Approved' ? 'bg-green-100 text-green-700' : 
                                  (req.status === 'Reject' || req.status === 'Rejected') ? 'bg-red-100 text-red-700' :
                                  req.status === 'Registered' ? 'bg-indigo-100 text-indigo-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                  {req.status}
                                </span>
                                {req.imageUrl && (
                                  <img 
                                    src={req.imageUrl} 
                                    alt="Bukti" 
                                    onClick={() => setDialog({ type: 'lightbox', title: `Pratinjau Bukti (${group.name})`, imageUrl: req.imageUrl })}
                                    className="w-8 h-8 object-cover rounded-lg border border-slate-200 cursor-zoom-in shadow-xs hover:opacity-85"
                                  />
                                )}
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

        {isPrintMode && (
          <div className="fixed inset-0 bg-white z-[999] overflow-y-auto p-8 flex flex-col no-print animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-900 text-white p-4 rounded-xl mb-8 gap-4 shadow-lg">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-yellow-400" size={24} />
                <div className="text-left">
                  <p className="font-semibold text-sm">Modus Pratinjau Cetak Aktif</p>
                  <p className="text-xs text-slate-400">Gunakan pintasan keyboard untuk mencetak kertas jika dialog browser terblokir.</p>
                </div>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => {
                    try { window.print(); } catch(e) {}
                  }}
                  className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Printer size={14} /> Cetak (Ctrl+P / Cmd+P)
                </button>
                <button 
                  onClick={() => setIsPrintMode(false)}
                  className="flex-1 sm:flex-none bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Kembali ke Aplikasi
                </button>
              </div>
            </div>

            <div className="max-w-4xl mx-auto w-full bg-white p-8 border border-slate-300 shadow-md rounded-sm text-black flex-1 text-left">
              {groupedData.map((group, index) => {
                const approvedTotal = group.requests.filter(r => r.status === 'Approved' || r.status === 'Registered').reduce((sum, r) => sum + r.duration, 0);
                const rejectTotal = group.requests.filter(r => r.status === 'Reject' || r.status === 'Rejected').reduce((sum, r) => sum + r.duration, 0);

                return (
                  <div key={group.nip} className={`print-page-block font-sans ${index > 0 ? 'page-break mt-12 pt-12 border-t border-dashed border-slate-300 print:border-none print:mt-0 print:pt-0' : ''}`}>
                    <div className="font-sans text-black mb-6">
                      <div className="font-bold text-xs tracking-wide">PT. BANK TABUNGAN NEGARA (PERSERO) TBK</div>
                      <div className="font-bold text-xs tracking-wide">KANTOR CABANG MAMUJU</div>
                      <div className="my-5"></div>
                      <div className="font-bold text-sm tracking-wide">LAPORAN RINCIAN LEMBUR</div>
                      <div className="font-bold text-xs">BULAN : {getFormattedMonthYear(selectedMonth)}</div>
                      
                      <div className="mt-4 text-xs space-y-1.5 font-sans">
                        <div className="flex">
                          <span className="w-16 font-bold">NAMA</span>
                          <span className="font-semibold uppercase">: {group.name}</span>
                        </div>
                        <div className="flex">
                          <span className="w-16 font-bold">NIP</span>
                          <span className="font-semibold uppercase">: {group.nip}</span>
                        </div>
                      </div>
                    </div>

                    <table className="w-full text-left border-collapse border border-black text-xs mb-8">
                      <thead>
                        <tr className="bg-slate-100 border-b border-black font-semibold text-black">
                          <th className="p-2 border border-black text-center">Tanggal</th>
                          <th className="p-2 border border-black text-center">Waktu Kerja</th>
                          <th className="p-2 border border-black text-center">Durasi</th>
                          <th className="p-2 border border-black text-center">Alasan Lembur</th>
                          <th className="p-2 border border-black text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.requests.map(req => (
                          <tr key={req.id} className="border-b border-black">
                            <td className="p-2 border border-black text-center">{getFormattedDate(req.date)}</td>
                            <td className="p-2 border border-black text-center">{req.startTime} - {req.endTime}</td>
                            <td className="p-2 border border-black text-center font-semibold">{req.duration.toFixed(1)} j</td>
                            <td className="p-2 border border-black">{req.reason}</td>
                            <td className="p-2 border border-black text-center font-medium">{req.status}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold border border-black">
                          <td colSpan="5" className="p-3 text-left border border-black">
                            <div className="space-y-1">
                              <div>Approved: {approvedTotal.toFixed(1)} jam</div>
                              <div>Reject: {rejectTotal.toFixed(1)} jam</div>
                            </div>
                          </td>
                        </tr>
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

  // --- SUBVIEW 6: STATISTIK VIEW ---
  const StatistikView = () => {
    const [selectedMonth, setSelectedMonth] = useState(() => {
      const now = new Date(2026, 5, 2);
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [selectedAtasan, setSelectedAtasan] = useState('all');
    const [selectedPegawai, setSelectedPegawai] = useState('all');

    const accessibleAtasan = useMemo(() => {
      const allAtasan = employees.filter(e => e.role === 'approval' || e.role === 'manager' || e.role === 'admin');
      if (currentUser.role === 'admin') {
        return allAtasan;
      }
      if (currentUser.role === 'manager') {
        return allAtasan.filter(e => e.atasan === currentUser.nip);
      }
      return [];
    }, [employees, currentUser]);

    const accessiblePegawai = useMemo(() => {
      if (currentUser.role === 'admin') {
        if (selectedAtasan === 'all') {
          return employees;
        } else {
          return employees.filter(e => e.atasan === selectedAtasan);
        }
      }
      if (currentUser.role === 'manager') {
        if (selectedAtasan === 'all') {
          const downlinerAtasanNips = accessibleAtasan.map(a => a.nip);
          return employees.filter(e => e.atasan === currentUser.nip || downlinerAtasanNips.includes(e.atasan));
        } else {
          return employees.filter(e => e.atasan === selectedAtasan);
        }
      }
      if (currentUser.role === 'approval') {
        return employees.filter(e => e.nip === currentUser.nip || e.atasan === currentUser.nip);
      }
      return [currentUser];
    }, [employees, currentUser, selectedAtasan, accessibleAtasan]);

    useEffect(() => {
      if (selectedPegawai !== 'all' && !accessiblePegawai.some(e => e.nip === selectedPegawai)) {
        setSelectedPegawai('all');
      }
    }, [accessiblePegawai, selectedPegawai]);

    // Summary Card Metrics Generator
    const metrics = useMemo(() => {
      let filtered = requests.filter(r => 
        (r.status === 'Approved' || r.status === 'Registered') && 
        r.date.startsWith(selectedMonth)
      );

      const allowedNips = accessiblePegawai.map(p => p.nip);
      filtered = filtered.filter(r => allowedNips.includes(r.nip));
      
      if (selectedPegawai !== 'all') {
        filtered = filtered.filter(r => r.nip === selectedPegawai);
      }
      if (selectedAtasan !== 'all' && selectedPegawai === 'all') {
        filtered = filtered.filter(r => r.atasan === selectedAtasan);
      }

      const totalJam = filtered.reduce((sum, r) => sum + r.duration, 0);
      const uniqueEmps = new Set(filtered.map(r => r.nip)).size;
      const averageJam = uniqueEmps > 0 ? totalJam / uniqueEmps : 0;

      return {
        totalJam,
        totalPegawai: uniqueEmps,
        averageJam,
        frekuensi: filtered.length
      };
    }, [requests, selectedMonth, selectedPegawai, selectedAtasan, accessiblePegawai]);

    const statsData = useMemo(() => {
      let filtered = requests.filter(r => 
        (r.status === 'Approved' || r.status === 'Registered') && 
        r.date.startsWith(selectedMonth)
      );

      const allowedNips = accessiblePegawai.map(p => p.nip);
      filtered = filtered.filter(r => allowedNips.includes(r.nip));
      
      if (selectedPegawai !== 'all') {
        filtered = filtered.filter(r => r.nip === selectedPegawai);
      }
      if (selectedAtasan !== 'all' && selectedPegawai === 'all') {
        filtered = filtered.filter(r => r.atasan === selectedAtasan);
      }

      const aggregate = {};
      filtered.forEach(req => {
        if (!aggregate[req.nip]) {
          aggregate[req.nip] = { nip: req.nip, name: getEmployeeName(req.nip), totalJam: 0, count: 0 };
        }
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
            
            {(currentUser.role === 'admin' || currentUser.role === 'manager') && (
              <select 
                value={selectedAtasan} 
                onChange={e => {
                  setSelectedAtasan(e.target.value);
                  setSelectedPegawai('all');
                }} 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[160px] cursor-pointer"
              >
                <option value="all">-- Semua Atasan --</option>
                {accessibleAtasan.map(emp => (
                  <option key={emp.nip} value={emp.nip}>{emp.name}</option>
                ))}
              </select>
            )}

            {(currentUser.role === 'admin' || currentUser.role === 'manager' || currentUser.role === 'approval') && (
              <select 
                value={selectedPegawai} 
                onChange={e => setSelectedPegawai(e.target.value)} 
                className="p-2 border border-slate-300 rounded-lg text-sm bg-white min-w-[160px] cursor-pointer"
              >
                <option value="all">-- Semua Pegawai --</option>
                {accessiblePegawai.map(emp => (
                  <option key={emp.nip} value={emp.nip}>{emp.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* TOP LEVEL INTERACTIVE METRIC CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 p-5 rounded-2xl text-white shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Total Jam Lembur</p>
            <p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.totalJam.toFixed(1)} <span className="text-sm font-normal">Jam</span></p>
          </div>
          <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 p-5 rounded-2xl text-white shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Pegawai Terlibat</p>
            <p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.totalPegawai} <span className="text-sm font-normal">Karyawan</span></p>
          </div>
          <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 p-5 rounded-2xl text-white shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Rerata Jam Kerja</p>
            <p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.averageJam.toFixed(1)} <span className="text-sm font-normal">Jam/Peg</span></p>
          </div>
          <div className="bg-gradient-to-br from-purple-600 to-purple-700 p-5 rounded-2xl text-white shadow-md">
            <p className="text-[10px] font-semibold uppercase tracking-wider opacity-85">Total Frekuensi</p>
            <p className="text-2xl md:text-3xl font-extrabold mt-1">{metrics.frekuensi} <span className="text-sm font-normal">Sesi</span></p>
          </div>
        </div>

        {/* Chart Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          {statsData.length === 0 ? (
             <div className="text-center text-slate-500 py-8 text-sm">Tidak ada data lembur yang terekam pada periode ini.</div>
          ) : (
            <div className="space-y-6">
              {statsData.map(stat => (
                <div key={stat.nip}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-semibold text-slate-800">{stat.name} <span className="text-slate-400 font-normal text-xs">({stat.nip})</span></span>
                    <span className="font-semibold text-blue-600">{stat.totalJam.toFixed(1)} Jam <span className="text-slate-400 font-normal text-xs ml-1">/ {params.maxPerMonth} jam</span></span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3.5 overflow-hidden shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${stat.totalJam > params.maxPerMonth ? 'bg-red-500' : 'bg-gradient-to-r from-blue-500 to-blue-600'}`} 
                      style={{ width: `${Math.min((stat.totalJam / maxHoursChart) * 100, 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Total frekuensi lembur: {stat.count} kali</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- SUBVIEW 7: SIMULATOR DATA ---
  const SimulatorView = () => {
    const activeEmployees = employees.filter(e => e.nip !== 'admin');

    const handleGenerateDummy = async () => {
      if (activeEmployees.length === 0) {
        setDialog({ 
          type: 'alert', 
          title: 'Pegawai Kosong', 
          message: 'Silakan impor data pegawai terlebih dahulu sebelum membuat data simulasi lembur.' 
        });
        return;
      }

      setGenerating(true);
      try {
        const dummyRequests = [];
        const targetApprovedHours = 40;

        activeEmployees.forEach(emp => {
          const availableDays = Array.from({ length: 30 }, (_, i) => i + 1);
          for (let i = availableDays.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [availableDays[i], availableDays[j]] = [availableDays[j], availableDays[i]];
          }

          let dayIndex = 0;

          // 1. GENERATE DATA APPROVED (Tepat 40 Jam Kumulatif)
          let approvedTotal = 0;
          while (approvedTotal < targetApprovedHours && dayIndex < 20) {
            const remaining = targetApprovedHours - approvedTotal;
            let duration = Math.floor(Math.random() * 4) + 2; 
            if (duration > remaining) {
              duration = remaining;
            }

            const dayNum = availableDays[dayIndex++];
            const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
            const dateStr = `2026-06-${dayStr}`;

            const startHour = 17;
            const endHourVal = startHour + Math.floor(duration);
            const endMinVal = (duration % 1) * 60;
            const endHourStr = `${endHourVal < 10 ? '0' + endHourVal : endHourVal}:${endMinVal === 0 ? '00' : '30'}`;
            
            const id = `dummy-approved-${emp.nip}-${dayStr}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            dummyRequests.push({
              id,
              nip: emp.nip,
              date: dateStr,
              startTime: "17:00",
              endTime: endHourStr,
              duration: duration,
              reason: "Penyelesaian laporan kerja triwulanan dan rekonsiliasi data bulanan (Simulasi Approved)",
              status: 'Approved',
              atasan: emp.atasan || '',
              isDummy: true
            });

            approvedTotal += duration;
          }

          // 2. GENERATE DATA REJECT (Acak 2 s/d 3 entri, sekitar 6 s/d 15 jam total)
          const numReject = Math.floor(Math.random() * 2) + 2; 
          for (let r = 0; r < numReject; r++) {
            if (dayIndex >= 30) break;
            
            const duration = Math.floor(Math.random() * 4) + 2; 
            const dayNum = availableDays[dayIndex++];
            const dayStr = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
            const dateStr = `2026-06-${dayStr}`;

            const startHour = 17;
            const endHourVal = startHour + Math.floor(duration);
            const endMinVal = (duration % 1) * 60;
            const endHourStr = `${endHourVal < 10 ? '0' + endHourVal : endHourVal}:${endMinVal === 0 ? '00' : '30'}`;

            const id = `dummy-reject-${emp.nip}-${dayStr}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

            dummyRequests.push({
              id,
              nip: emp.nip,
              date: dateStr,
              startTime: "17:00",
              endTime: endHourStr,
              duration: duration,
              reason: "Dokumen absensi harian tidak sesuai / Lampiran foto bukti tidak valid (Simulasi Reject)",
              status: 'Reject',
              atasan: emp.atasan || '',
              isDummy: true
            });
          }
        });

        let batch = writeBatch(db);
        let count = 0;

        for (let i = 0; i < dummyRequests.length; i++) {
          const req = dummyRequests[i];
          const ref = doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id);
          batch.set(ref, req);
          count++;

          if (count === 400) {
            await runWithRetry(() => batch.commit());
            batch = writeBatch(db);
            count = 0;
          }
        }
        
        if (count > 0) {
          await runWithRetry(() => batch.commit());
        }

        setDialog({ 
          type: 'alert', 
          title: 'Simulasi Sukses', 
          message: `Berhasil membuat data acak untuk ${activeEmployees.length} pegawai: Masing-masing tepat 40 jam status 'Approved' dan tambahan data dengan status 'Reject' di bulan Juni 2026.` 
        });
      } catch (err) {
        console.error(err);
        setDialog({ type: 'alert', title: 'Kesalahan', message: 'Terjadi kesalahan sistem saat menyimpan data simulasi.' });
      } finally {
        setGenerating(false);
      }
    };

    const handleClearDummy = () => {
      const dummyCount = requests.filter(r => r.isDummy === true).length;
      if (dummyCount === 0) {
        setDialog({ 
          type: 'alert', 
          title: 'Tidak Ada Data', 
          message: 'Tidak ada data lembur simulator (dummy) yang tersimpan di dalam database cloud saat ini.' 
        });
        return;
      }

      setDialog({
        type: 'confirm',
        title: 'Hapus Data Simulator',
        message: `Apakah Anda yakin ingin menghapus seluruh ${dummyCount} data lembur simulator (isDummy: true) dari database secara permanen?`,
        isDanger: true,
        onConfirm: async () => {
          setGenerating(true);
          try {
            const dummies = requests.filter(r => r.isDummy === true);
            let batch = writeBatch(db);
            let count = 0;

            for (let i = 0; i < dummies.length; i++) {
              const req = dummies[i];
              const ref = doc(db, 'artifacts', appId, 'public', 'data', 'requests', req.id);
              batch.delete(ref);
              count++;

              if (count === 400) {
                await runWithRetry(() => batch.commit());
                batch = writeBatch(db);
                count = 0;
              }
            }

            if (count > 0) {
              await runWithRetry(() => batch.commit());
            }

            setDialog({ 
              type: 'alert', 
              title: 'Berhasil Dihapus', 
              message: `Sebanyak ${dummies.length} data lembur simulator telah dibersihkan secara permanen.` 
            });
          } catch (err) {
            console.error(err);
            setDialog({ type: 'alert', title: 'Kesalahan', message: 'Sistem gagal membersihkan data lembur simulator.' });
          } finally {
            setGenerating(false);
          }
        }
      });
    };

    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <Database size={24} />
            </div>
            <div className="text-left">
              <h2 className="text-lg font-semibold text-slate-800">Pusat Kendali Simulator Data</h2>
              <p className="text-xs text-slate-500">Gunakan menu ini untuk mempermudah pengujian alur kerja, cetak laporan, dan statistik visual.</p>
            </div>
          </div>

          <div className="space-y-6 border-t pt-5">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-bold text-slate-800">Submenu 1: Generate Data Lembur</h3>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md">
                  Membuat data lembur acak untuk <strong>{activeEmployees.length} pegawai aktif</strong> pada bulan <strong>Juni 2026</strong>. 
                  Masing-masing pegawai akan memperoleh total akumulasi lembur tepat <strong>40 jam Approved</strong> dan tambahan data dengan status <strong>Reject</strong> pada hari berbeda secara acak.
                </p>
              </div>
              <button
                onClick={handleGenerateDummy}
                disabled={generating}
                className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Generate Data
              </button>
            </div>

            <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1 text-left">
                <h3 className="text-sm font-bold text-red-800">Submenu 2: Bersihkan Data Simulator</h3>
                <p className="text-xs text-red-700 leading-relaxed max-w-md">
                  Menghapus seluruh catatan lembur dummy simulator yang berada dalam database permanen secara instan. Data lembur asli pegawai tidak akan tersentuh.
                </p>
              </div>
              <button
                onClick={handleClearDummy}
                disabled={generating}
                className="w-full md:w-auto bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer whitespace-nowrap"
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Hapus Simulator
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER CONTAINER UTAMA ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col md:flex-row pb-16 md:pb-0 relative animate-in fade-in duration-200">
      
      {/* NOTIFIKASI TOAST DENGAN KODE OTP WHATSAPP DI DESKTOP */}
      {whatsappToast.show && (
        <div className="fixed top-4 right-4 z-[999] max-w-sm w-full bg-slate-800 text-white p-4 rounded-xl shadow-2xl border-l-4 border-green-500 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300 no-print">
          <div className="p-2 bg-green-900 rounded-lg text-green-400">
            <MessageSquare size={20} />
          </div>
          <div className="flex-1 text-left">
            <p className="text-xs font-bold text-green-400 flex justify-between">
              <span>Simulasi WhatsApp Gateway</span>
              <button onClick={() => setWhatsappToast({ show: false, message: '', otp: '' })} className="text-slate-400 hover:text-white">
                <X size={12} />
              </button>
            </p>
            <p className="text-xs mt-1 text-slate-200 font-medium leading-relaxed">{whatsappToast.message}</p>
            <div className="mt-2 bg-slate-950 p-1.5 px-3 rounded text-center font-mono text-sm tracking-widest font-bold text-yellow-400">
              OTP: {whatsappToast.otp}
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 flex-shrink-0 h-screen sticky top-0 shadow-xl z-20 no-print">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <img 
            src="Bank_BTN_logo.png" 
            alt="BTN Logo" 
            className="h-8 w-auto object-contain bg-white p-1 rounded" 
            onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} 
          />
          <div className="text-left">
            <h1 className="text-xl font-bold text-white flex items-center">
              O-Time
            </h1>
            <p className="text-xs text-slate-400">KC Mamuju</p>
          </div>
        </div>
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto">
          {navItems.filter(item => item.roles.includes(currentUser.role)).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center p-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={18} className="mr-3" />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center p-3 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut size={18} className="mr-3" />
            Keluar Akun
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* TOP BAR */}
        <header className="bg-white border-b border-slate-200 p-4 px-4 md:px-6 flex flex-col sm:flex-row justify-between items-center shadow-sm z-10 sticky top-0 gap-3 no-print">
          <div className="flex justify-between w-full md:w-auto items-center">
            <h1 className="md:hidden text-lg font-bold text-slate-800 flex items-center gap-2">
              <img 
                src="Bank_BTN_logo.png" 
                alt="BTN Logo" 
                className="h-6 w-auto object-contain" 
                onError={(e) => { e.target.src = BTN_LOGO_FALLBACK; }} 
              />
              <span>O-Time</span>
            </h1>
            <h2 className="hidden md:block text-lg font-semibold text-slate-800 capitalize">
              {navItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 flex flex-row items-center">
              <span className="text-slate-400 font-normal mr-2 hidden sm:inline">User Aktif:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[150px]">{currentUser.name}</span>
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full ml-2">
                {currentUser.role.toUpperCase()}
              </span>
            </div>
          </div>
        </header>

        {/* CONTENT VIEW AREA */}
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

      {/* BOTTOM NAVIGATION (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-between items-center px-1 py-2 z-30 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] overflow-x-auto no-print">
        {navItems.filter(item => item.roles.includes(currentUser.role)).map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg text-[10px] font-medium transition-colors cursor-pointer ${
              activeTab === item.id 
                ? 'text-blue-600' 
                : 'text-slate-500'
            }`}
          >
            <item.icon size={22} className={`mb-1 ${activeTab === item.id ? 'opacity-100' : 'opacity-70'}`} />
            <span className="truncate w-full text-center leading-tight">
              {item.label.split(' ')[0]}
            </span>
          </button>
        ))}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center justify-center p-2 min-w-[60px] flex-1 rounded-lg text-[10px] font-medium text-red-500 cursor-pointer"
        >
          <LogOut size={22} className="mb-1 opacity-75" />
          <span className="truncate w-full text-center leading-tight">Keluar</span>
        </button>
      </nav>

      {/* POPUP DIALOG CONTEXT (No window.alert/confirm) */}
      {dialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900 bg-opacity-60 p-4 backdrop-blur-sm no-print">
          <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 w-full ${dialog.type === 'lightbox' || dialog.type === 'verify' ? 'max-w-lg' : 'max-w-sm'}`}>
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
              ) : dialog.type === 'verify' ? (
                <div className="flex flex-col text-left">
                  <h3 className="text-lg font-bold text-slate-800 mb-3">{dialog.title}</h3>
                  <div className="w-full bg-slate-100 border rounded-xl overflow-hidden flex items-center justify-center p-2 mb-4 max-h-[35vh]">
                    <img src={dialog.request.imageUrl} alt="Foto Bukti Lembur" className="max-h-[32vh] object-contain rounded-lg" />
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-5 text-sm space-y-2">
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
                    <div className="flex flex-col pt-1 border-t border-slate-200 mt-1">
                      <span className="text-slate-500 font-medium">Alasan Lembur:</span>
                      <span className="font-medium text-slate-800 mt-0.5">{dialog.request.reason}</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setDialog(null)} className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
                      Batal
                    </button>
                    <button 
                      onClick={() => { dialog.onReject(); setDialog(null); }} 
                      className="px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <X size={15} /> Reject
                    </button>
                    <button 
                      onClick={() => { dialog.onApprove(); setDialog(null); }} 
                      className="px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Check size={15} /> Approved
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
      )}
    </div>
  );
}
