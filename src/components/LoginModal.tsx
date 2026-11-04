import React, { useState } from 'react';
import { Mail, Lock, User, ArrowRight, Loader2, AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AutoCheckLogo } from './AutoCheckLogo';

export const LoginModal: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [authError, setAuthError] = useState<{ message: string; isDomainError?: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      setSubmitting(true);
      await signInWithGoogle();
    } catch (err: unknown) {
      console.warn('Erro login Google:', err);
      const errStr = err instanceof Error ? err.message : String(err);
      const errCode = typeof err === 'object' && err !== null && 'code' in err ? String((err as any).code) : '';

      if (errStr.includes('auth/unauthorized-domain') || errCode === 'auth/unauthorized-domain') {
        setAuthError({
          message:
            'O domínio personalizado (autocheck.megaronperin.com.br) ainda não está liberado na lista de Domínios Autorizados do Firebase Authentication.',
          isDomainError: true,
        });
      } else if (errStr.includes('auth/popup-blocked') || errCode === 'auth/popup-blocked') {
        setAuthError({
          message: 'O navegador bloqueou a janela pop-up de login do Google. Permita pop-ups para este site.',
        });
      } else if (errStr.includes('auth/popup-closed-by-user') || errCode === 'auth/popup-closed-by-user') {
        setAuthError({
          message: 'A janela de autenticação do Google foi fechada antes da confirmação.',
        });
      } else {
        setAuthError({
          message: 'Não foi possível autenticar com o Google. Tente novamente ou entre com e-mail e senha.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!email.trim() || !password.trim()) {
      setAuthError({ message: 'Preencha seu e-mail e senha.' });
      return;
    }

    if (password.length < 6) {
      setAuthError({ message: 'A senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    try {
      setSubmitting(true);
      if (mode === 'register') {
        if (!name.trim()) {
          setAuthError({ message: 'Informe seu nome para o cadastro.' });
          setSubmitting(false);
          return;
        }
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setAuthError({ message: 'E-mail ou senha incorretos.' });
      } else if (msg.includes('email-already-in-use')) {
        setAuthError({ message: 'Este e-mail já está cadastrado. Alterne para a aba Entrar.' });
      } else if (msg.includes('invalid-email')) {
        setAuthError({ message: 'Formato de e-mail inválido.' });
      } else {
        setAuthError({ message: 'Ocorreu um erro ao processar. Verifique os dados e tente novamente.' });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07080a] flex flex-col justify-center items-center px-4 py-8 sm:px-6 relative overflow-hidden text-slate-100">
      {/* Subtle ambient orange glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm space-y-6 relative z-10 animate-in fade-in duration-200">
        {/* Brand & Large Logo */}
        <div className="text-center py-2">
          <AutoCheckLogo variant="vertical" theme="dark" size="xl" showSubtitle={true} />
        </div>

        {/* Auth Card */}
        <div className="bg-[#0f1118] rounded-2xl border border-slate-800/90 shadow-2xl p-6 sm:p-7 space-y-5">
          {/* Prominent Error Notice */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs font-medium space-y-2">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                <span>{authError.message}</span>
              </div>

              {authError.isDomainError && (
                <div className="pt-2 border-t border-rose-900/60 text-[11px] text-rose-300 space-y-1.5">
                  <p>
                    <strong>Como liberar:</strong> No Firebase Console, acesse <em>Authentication &gt; Settings &gt; Authorized domains</em> e adicione <code className="bg-rose-900/60 px-1 py-0.5 rounded text-white font-mono">autocheck.megaronperin.com.br</code>.
                  </p>
                  <p className="text-rose-400">
                    💡 Dica: Você também pode criar sua conta e entrar usando <strong>E-mail e Senha</strong> logo abaixo!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Google Sign-in */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={submitting || loading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2.5 transition-colors shadow-2xs disabled:opacity-60"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continuar com Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-slate-800 w-full" />
            <span className="bg-[#0f1118] px-2.5 text-[11px] text-slate-400 font-medium uppercase tracking-wider absolute">
              ou com e-mail
            </span>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setAuthError(null);
              }}
              className={`py-1.5 rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-slate-800 text-white shadow-2xs font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setAuthError(null);
              }}
              className={`py-1.5 rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-slate-800 text-white shadow-2xs font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Criar Conta
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Seu Nome
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Carlos Silva"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 bg-slate-950 transition-colors"
                  />
                  <User className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                E-mail
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 bg-slate-950 transition-colors"
                />
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Senha
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-orange-500 bg-slate-950 transition-colors"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || loading}
              className="w-full py-2.5 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs disabled:opacity-50 mt-1 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <span>{mode === 'login' ? 'Acessar Conta' : 'Criar Minha Conta'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Clean footer note */}
          <p className="text-[10px] text-center text-slate-400">
            Acesso seguro com sincronização em nuvem e backup automático.
          </p>
        </div>
      </div>
    </div>
  );
};
