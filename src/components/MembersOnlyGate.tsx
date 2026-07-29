import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getHomeSettings, HomeSettings, defaultHomeSettings } from "../lib/data";
import { Lock, ShieldCheck, UserCheck, ArrowRight, KeyRound } from "lucide-react";

export function MembersOnlyGate() {
  const [settings, setSettings] = useState<HomeSettings>(defaultHomeSettings);
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const checkAuthStatus = () => {
    const isAdmin = localStorage.getItem('admin_auth') === 'true';
    const isCustomer = !!localStorage.getItem('customer_token');
    setIsAuth(isAdmin || isCustomer);
  };

  const loadSettings = () => {
    getHomeSettings().then(s => setSettings(s));
  };

  useEffect(() => {
    loadSettings();
    checkAuthStatus();

    const handleSettingsChange = () => loadSettings();
    const handleAuthChange = () => checkAuthStatus();

    window.addEventListener('settings_change', handleSettingsChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('settings_change', handleSettingsChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, [location.pathname]);

  // Realtime live check for authenticated status
  const currentIsAdmin = localStorage.getItem('admin_auth') === 'true';
  const currentIsCustomer = !!localStorage.getItem('customer_token');
  const loggedIn = isAuth || currentIsAdmin || currentIsCustomer;

  // Bypass gate if membersOnly is false, or user/admin is logged in, or on admin / login page
  if (!settings.membersOnly || loggedIn || location.pathname.startsWith('/admin') || location.pathname === '/login') {
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      if (isRegister) {
        // Register Customer
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "register", email, password, name })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "회원가입 실패");
        localStorage.setItem("customer_token", data.token);
        localStorage.setItem("customer_email", data.user.email);
      } else {
        // Login Customer
        const res = await fetch("/api/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "login", email, password })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "로그인 정보가 일치하지 않습니다.");
        localStorage.setItem("customer_token", data.token);
        localStorage.setItem("customer_email", data.user.email);
      }

      window.dispatchEvent(new Event("storage"));
      checkAuthStatus();
    } catch (err: any) {
      setErrorMsg(err.message || "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8 animate-fade-in font-sans">
      <div className="bg-white border border-black/10 w-full max-w-md p-8 md:p-12 shadow-2xl relative">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center mb-6 shadow-lg">
            <Lock size={24} />
          </div>
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-cobalt mb-2 font-mono">
            SECURITY MEMBERS-ONLY ACCESS
          </span>
          <h2 className="text-2xl md:text-3xl font-bold uppercase tracking-tight text-ink mb-3 font-sans">
            회원전용 공개 커뮤니티
          </h2>
          <p className="text-xs md:text-sm font-serif italic text-ink/60 leading-relaxed">
            본 사이트는 회원전용으로 공개된 미학적 스튜디오 공간입니다. 본 사이트의 모든 컬렉션과 스토리를 감상하시려면 로그인해 주세요.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-ink/50 mb-1">
                Name (이름)
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="w-full border border-black/20 p-3 bg-transparent text-sm font-sans outline-none focus:border-cobalt transition-colors"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-ink/50 mb-1">
              Email Address (이메일 주소)
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="member@amph.studio"
              className="w-full border border-black/20 p-3 bg-transparent text-sm font-sans outline-none focus:border-cobalt transition-colors"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-ink/50 mb-1">
              Password (비밀번호)
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-black/20 p-3 bg-transparent text-sm font-sans outline-none focus:border-cobalt transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white p-4 text-xs font-bold uppercase tracking-widest hover:bg-cobalt transition-colors flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            {loading ? "처리중..." : isRegister ? "회원가입 후 입장" : "회원 로그인 입장"}
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-black/10 flex flex-col gap-3 text-center">
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg("");
            }}
            className="text-xs font-bold text-ink/70 hover:text-cobalt transition-colors uppercase tracking-wider"
          >
            {isRegister ? "이미 회원이신가요? 로그인하기" : "아직 회원이 아니신가요? 신규 회원가입"}
          </button>

          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="text-[10px] font-mono font-bold text-ink/40 hover:text-cobalt transition-colors flex items-center justify-center gap-1.5 uppercase mt-2"
          >
            <KeyRound size={12} />
            Admin Direct Entry / 관리자 전용 로그인
          </button>
        </div>
      </div>
    </div>
  );
}
