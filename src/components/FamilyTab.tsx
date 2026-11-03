import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Mail,
  UserPlus,
  ShieldCheck,
  Link2,
  AlertCircle,
  CheckCircle2,
  Share2,
  Car,
  Sparkles,
  Zap,
  BellRing,
  Trash2,
  LogOut,
} from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { useAuth } from '../context/AuthContext';
import { formatFriendlyError } from '../lib/firebase';

interface FamilyTabProps {
  onOpenNewVehicle?: () => void;
}

export const FamilyTab: React.FC<FamilyTabProps> = ({ onOpenNewVehicle }) => {
  const { user } = useAuth();
  const {
    activeVehicle,
    vehicles,
    shareVehicleWithEmail,
    removeShareEmail,
    joinVehicleByShareCode,
    leaveVehicle,
  } = useVehicles();

  const [partnerEmail, setPartnerEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [removingEmail, setRemovingEmail] = useState<string | null>(null);

  const isOwner = activeVehicle ? activeVehicle.ownerId === user?.uid : false;
  const shareCode = activeVehicle?.shareCode || '';

  const handleCopyCode = () => {
    if (!shareCode) return;
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareWhatsApp = () => {
    if (!activeVehicle || !shareCode) return;
    const text = `Olá! Conecte-se ao nosso veículo ${activeVehicle.name} (${activeVehicle.plate}) no AutoCheck usando o código de compartilhamento: *${shareCode}*`;
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVehicle) return;
    setEmailStatus(null);
    const clean = partnerEmail.trim().toLowerCase();
    if (!clean) return;

    if (clean === user?.email?.toLowerCase()) {
      setEmailStatus({ type: 'error', message: 'Você já é o proprietário deste veículo.' });
      return;
    }

    if (activeVehicle.sharedWithEmails?.map((e) => e.toLowerCase()).includes(clean)) {
      setEmailStatus({ type: 'error', message: 'Este e-mail já possui acesso ao veículo.' });
      return;
    }

    try {
      setSubmittingEmail(true);
      await shareVehicleWithEmail(activeVehicle.id, clean);
      setPartnerEmail('');
      setEmailStatus({ type: 'success', message: `Acesso liberado com sucesso para ${clean}!` });
    } catch (err: unknown) {
      setEmailStatus({ type: 'error', message: formatFriendlyError(err) });
    } finally {
      setSubmittingEmail(false);
    }
  };

  const handleRemoveEmail = async (emailToRemove: string) => {
    if (!activeVehicle) return;
    try {
      setRemovingEmail(emailToRemove);
      await removeShareEmail(activeVehicle.id, emailToRemove);
    } catch (err: unknown) {
      setEmailStatus({ type: 'error', message: formatFriendlyError(err) });
    } finally {
      setRemovingEmail(null);
    }
  };

  const handleJoinCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;

    try {
      setJoining(true);
      setJoinMessage(null);
      const res = await joinVehicleByShareCode(joinCode.trim());
      setJoinMessage({ text: res.message, isError: !res.success });
      if (res.success) {
        setJoinCode('');
      }
    } catch (err: unknown) {
      setJoinMessage({ text: formatFriendlyError(err), isError: true });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in duration-200">
      {/* Tab Top Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-orange-600" />
            Compartilhamento Familiar
          </h2>
          <p className="text-xs text-slate-500">
            Acompanhe gastos e revisões em tempo real com seu cônjuge
          </p>
        </div>
      </div>

      {/* Active Vehicle Card or Prompt to Select/Create */}
      {activeVehicle ? (
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
                <Car className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-900">{activeVehicle.name}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isOwner
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    {isOwner ? 'Seu Veículo' : 'Compartilhado com você'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeVehicle.brand} {activeVehicle.model} • <span className="font-mono font-medium">{activeVehicle.plate}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Km Atual: <strong className="text-slate-800">{activeVehicle.currentMileage.toLocaleString('pt-BR')} km</strong></span>
            <span>Ano: <strong className="text-slate-800">{activeVehicle.year}</strong></span>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-3">
          <Car className="w-8 h-8 text-slate-400 mx-auto" />
          <div>
            <h4 className="text-sm font-bold text-slate-800">Nenhum veículo ativo</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Cadastre seu primeiro veículo ou conecte-se ao carro da sua família pelo código abaixo.
            </p>
          </div>
          {onOpenNewVehicle && (
            <button
              onClick={onOpenNewVehicle}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-colors"
            >
              Cadastrar Veículo
            </button>
          )}
        </div>
      )}

      {/* Share Section for the Active Vehicle */}
      {activeVehicle && (
        <>
          {/* Card 1: Share Code */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                  <Link2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Código de Acesso Rápido</h4>
                  <p className="text-[11px] text-slate-500">Basta passar este código para seu parceiro(a)</p>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xl font-black font-mono tracking-widest text-slate-900 select-all">
                  {shareCode || '---'}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Qualquer pessoa com sua conta logada pode entrar usando este código de 6 caracteres.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex-1 sm:flex-none py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-2xs"
                  title="Enviar pelo WhatsApp"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Invite by Email (Only owner can manage) */}
          {isOwner && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Convidar por E-mail</h4>
                  <p className="text-[11px] text-slate-500">Adicione o e-mail da sua esposa ou familiar</p>
                </div>
              </div>

              {emailStatus && (
                <div
                  className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                    emailStatus.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                  }`}
                >
                  {emailStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
                  )}
                  <span>{emailStatus.message}</span>
                </div>
              )}

              <form onSubmit={handleAddEmail} className="flex gap-2">
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="exemplo: esposa@gmail.com"
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 bg-slate-50/50"
                />
                <button
                  type="submit"
                  disabled={submittingEmail || !partnerEmail.trim()}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {submittingEmail ? 'Adicionando...' : 'Liberar'}
                </button>
              </form>

              {/* Members List */}
              <div className="space-y-2 pt-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Membros com acesso a este veículo
                </p>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-orange-600" />
                    <span className="font-medium text-slate-800">{activeVehicle.ownerEmail || user?.email || 'Proprietário'}</span>
                  </div>
                  <span className="text-[10px] font-bold text-orange-700 bg-orange-100/70 px-2 py-0.5 rounded-md">
                    Proprietário
                  </span>
                </div>

                {activeVehicle.sharedWithEmails && activeVehicle.sharedWithEmails.length > 0 ? (
                  activeVehicle.sharedWithEmails.map((email, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-medium text-slate-700 truncate max-w-[200px]">{email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                          Compartilhado
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          disabled={removingEmail === email}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remover acesso"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic px-1">
                    Nenhum familiar adicionado ainda. Insira o e-mail acima ou envie o código de acesso.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Card: Leave Shared Vehicle (for non-owners) */}
          {!isOwner && (
            <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Deixar este veículo</h4>
                  <p className="text-[11px] text-slate-500">
                    Remova seu acesso ao carro compartilhado <strong>{activeVehicle.name}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = window.confirm(`Deseja realmente sair do veículo ${activeVehicle.name}?`);
                    if (ok) {
                      await leaveVehicle(activeVehicle.id);
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sair do Carro
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Card 3: Connect to Another Vehicle using Code */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Entrar em outro carro</h4>
            <p className="text-[11px] text-slate-500">Seu cônjuge gerou um código? Digite aqui para conectar</p>
          </div>
        </div>

        <form onSubmit={handleJoinCode} className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Ex: AC-9K42"
            maxLength={10}
            className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 uppercase tracking-wider focus:outline-none focus:border-orange-500 bg-slate-50/50"
          />
          <button
            type="submit"
            disabled={joining || !joinCode.trim()}
            className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
          >
            {joining ? 'Conectando...' : 'Conectar'}
          </button>
        </form>

        {joinMessage && (
          <div
            className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
              joinMessage.isError
                ? 'bg-rose-50 text-rose-800 border border-rose-200'
                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
            }`}
          >
            {joinMessage.isError ? (
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            )}
            <span>{joinMessage.text}</span>
          </div>
        )}
      </div>

      {/* Benefits Informative Card */}
      <div className="p-4 rounded-2xl bg-slate-100/70 border border-slate-200 text-xs text-slate-600 space-y-2.5">
        <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          Como funciona a sincronização em tempo real?
        </div>
        <div className="space-y-2 text-[11px] text-slate-600">
          <div className="flex items-start gap-2">
            <Zap className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Abastecimentos ao vivo:</strong> Quando um dos dois abastece e registra a km e litros, o outro recebe na mesma hora o cálculo da média de consumo.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <BellRing className="w-3.5 h-3.5 text-orange-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Revisões e alertas compartilhados:</strong> A contagem regressiva para a próxima troca de óleo ou revisão é mantida em sincronia entre os dois aparelhos.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
