import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export const AuthScreens: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

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
      else setError('Ocorreu um erro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-zinc-100">
      <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-8 duration-500">
        
        {/* Logo Area */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl mx-auto mb-6 shadow-xl shadow-primary/20 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Zenith Finance</h1>
          <p className="text-zinc-500">Controle financeiro inteligente para famílias.</p>
        </div>

        {/* Form Card */}
        <div className="bg-surface border border-zinc-800 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-center">
            {isLogin ? 'Acessar sua conta' : 'Criar nova conta'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label className="block text-xs text-zinc-500 mb-1 ml-1">Nome</label>
                <input
                  type="text"
                  placeholder="Seu nome"
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            )}
            
            <div>
              <label className="block text-xs text-zinc-500 mb-1 ml-1">E-mail</label>
              <input
                type="email"
                placeholder="seu@email.com"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1 ml-1">Senha</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-white focus:border-primary focus:outline-none transition-colors"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" /> {error}
              </div>
            )}

            <button
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <>
                  {isLogin ? 'Entrar' : 'Criar Conta'} <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <button 
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              {isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};