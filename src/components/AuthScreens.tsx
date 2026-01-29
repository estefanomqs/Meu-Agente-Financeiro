import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ArrowRight, Loader2, AlertCircle, Shield, CreditCard, Calendar, Check, Lock } from 'lucide-react';

export const AuthScreens: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Marketing Carousel State
  const [activeSlide, setActiveSlide] = useState(0);

  const { login, register } = useAuth();

  const slides = [
    {
      id: 1,
      icon: <Shield className="w-12 h-12 text-emerald-400" />,
      title: "Seus dados, suas regras.",
      text: "Zero compartilhamento. Armazenamento local criptografado para sua total privacidade."
    },
    {
      id: 2,
      icon: <CreditCard className="w-12 h-12 text-indigo-400" />,
      title: "Controle Total.",
      text: "Fatura real vs. Imaginária. Saiba a diferença e domine seus cartões de crédito."
    },
    {
      id: 3,
      icon: <Calendar className="w-12 h-12 text-pink-400" />,
      title: "Visão de Futuro.",
      text: "Planeje meses à frente, não apenas hoje. Previsibilidade financeira de verdade."
    }
  ];

  // Auto-play Carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(prev => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error("Nome é obrigatório.");
        await register(name, email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') setError('E-mail ou senha incorretos.');
      else if (err.code === 'auth/email-already-in-use') setError('Este e-mail já está em uso.');
      else if (err.code === 'auth/weak-password') setError('A senha deve ter pelo menos 6 caracteres.');
      else setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background text-zinc-100 overflow-hidden">

      {/* LEFT SIDE: MARKETING SHOWCASE (Desktop Only) */}
      <div className="hidden lg:flex w-1/2 bg-zinc-950 relative overflow-hidden flex-col justify-between p-12 border-r border-white/5">

        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight">Zenith Finance</span>
        </div>

        {/* Carousel Content */}
        <div className="relative z-10 max-w-lg">
          <div className="h-64 relative"> {/* Fixed height to prevent layout jump */}
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`absolute top-0 left-0 w-full transition-all duration-700 transform ${index === activeSlide
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-8 pointer-events-none'
                  }`}
              >
                <div className="mb-6 inline-flex p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                  {slide.icon}
                </div>
                <h2 className="text-4xl font-bold mb-4 leading-tight">{slide.title}</h2>
                <p className="text-lg text-zinc-400 leading-relaxed">{slide.text}</p>
              </div>
            ))}
          </div>

          {/* Indicators */}
          <div className="flex gap-2 mt-8">
            {slides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveSlide(idx)}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === activeSlide ? 'w-8 bg-primary' : 'w-2 bg-zinc-800 hover:bg-zinc-700'
                  }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-sm text-zinc-600">
          © 2026 Zenith Inc. All rights reserved.
        </div>
      </div>

      {/* RIGHT SIDE: FORM (Mobile & Desktop) */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative">

        {/* Mobile Background Glow (Top) */}
        <div className="lg:hidden absolute top-0 left-0 right-0 h-64 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none"></div>

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile Logo (Centered) */}
          <div className="lg:hidden text-center mb-10">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary/20">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold">Zenith Finance</h1>
          </div>

          {/* Glass Card */}
          <div className="bg-surface/50 backdrop-blur-xl border border-zinc-800 rounded-3xl p-8 lg:p-10 shadow-2xl">

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLogin ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="text-zinc-400 text-sm">
                {isLogin
                  ? 'Digite suas credenciais para acessar o painel.'
                  : 'Comece sua jornada para a liberdade financeira.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {!isLogin && (
                <div className="space-y-1.5 animate-in slide-in-from-top-2 fade-in duration-300">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Nome</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: João Silva"
                      className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 pl-11 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      required={!isLogin}
                    />
                    <Check className="w-5 h-5 text-zinc-600 absolute left-3.5 top-4" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">E-mail</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="seu@email.com"
                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 pl-11 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                  <div className="absolute left-3.5 top-4 text-zinc-600">@</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider ml-1">Senha</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    className="w-full bg-zinc-900/50 border border-zinc-700 rounded-xl p-4 pl-11 text-white placeholder-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                  <Lock className="w-4 h-4 text-zinc-600 absolute left-3.5 top-4" />
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-3 animate-in shake">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                disabled={loading}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 hover:shadow-primary/30 disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>
                    {isLogin ? 'Entrar na Conta' : 'Começar Agora'}
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); }}
                className="text-sm text-zinc-400 hover:text-white transition-colors"
              >
                {isLogin ? (
                  <>Novo por aqui? <span className="text-primary font-bold hover:underline">Crie uma conta</span></>
                ) : (
                  <>Já é membro? <span className="text-primary font-bold hover:underline">Faça login</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};