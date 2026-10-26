import React, { useState } from 'react';
import { X, Users, Copy, Check, Mail, UserPlus, ShieldCheck, Link2 } from 'lucide-react';
import { useVehicles } from '../context/VehicleContext';
import { useAuth } from '../context/AuthContext';

interface ShareVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareVehicleModal: React.FC<ShareVehicleModalProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const {
    activeVehicle,
    shareVehicleWithEmail,
    removeShareEmail,
    joinVehicleByShareCode,
  } = useVehicles();

  const [partnerEmail, setPartnerEmail] = useState('');
  const [copied, setCopied] = useState(false);
  const [submittingEmail, setSubmittingEmail] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen || !activeVehicle) return null;

  const isOwner = activeVehicle.ownerId === user?.uid;
  const shareCode = activeVehicle.shareCode || 'AC-SHARE';

  const handleCopyCode = () => {
    navigator.clipboard.writeText(shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partnerEmail.trim()) return;

    try {
      setSubmittingEmail(true);
      await shareVehicleWithEmail(activeVehicle.id, partnerEmail.trim());
      setPartnerEmail('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingEmail(false);
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
    } catch {
      setJoinMessage({ text: 'Falha ao conectar via código.', isError: true });
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full sm:max-w-md bg-white border border-slate-200 rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Compartilhar Veículo</h3>
              <p className="text-[11px] text-slate-500">Sincronização com cônjuge e família</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4">
          {/* Active Car pill */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">{activeVehicle.name}</p>
              <p className="text-[11px] text-slate-500">{activeVehicle.plate} • {activeVehicle.brand} {activeVehicle.model}</p>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
              isOwner ? 'bg-orange-100 text-orange-800' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {isOwner ? 'Proprietário' : 'Compartilhado'}
            </span>
          </div>

          {/* Section 1: Share Code */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Link2 className="w-3.5 h-3.5 text-orange-600" />
                Código de Compartilhamento
              </label>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3">
              <div>
                <span className="text-lg font-black font-mono tracking-widest text-slate-900 select-all">
                  {shareCode}
                </span>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Informe este código para que outra pessoa conecte a este veículo.
                </p>
              </div>

              <button
                onClick={handleCopyCode}
                className="py-1.5 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Section 2: Invite by email */}
          {isOwner && (
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                Convidar por E-mail (ex: Esposa / Marido)
              </label>

              <form onSubmit={handleAddEmail} className="flex gap-2">
                <input
                  type="email"
                  value={partnerEmail}
                  onChange={(e) => setPartnerEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-orange-500 bg-slate-50/50"
                />
                <button
                  type="submit"
                  disabled={submittingEmail || !partnerEmail.trim()}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Convidar
                </button>
              </form>

              {/* Members list */}
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Membros com Acesso:
                </p>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{activeVehicle.ownerEmail || 'Proprietário'}</span>
                  <span className="text-[10px] font-bold text-orange-700">Dono</span>
                </div>

                {activeVehicle.sharedWithEmails && activeVehicle.sharedWithEmails.length > 0 ? (
                  activeVehicle.sharedWithEmails.map((email, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <span className="font-medium text-slate-700 truncate max-w-[200px]">{email}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-500">Compartilhado</span>
                        <button
                          onClick={() => removeShareEmail(activeVehicle.id, email)}
                          className="text-slate-400 hover:text-rose-600 text-xs px-1"
                          title="Remover acesso"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Nenhum familiar adicionado ainda.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Section 3: Connect to someone else's car */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5">
            <label className="text-[11px] font-semibold text-slate-700">
              Conectar a outro carro com código?
            </label>
            <form onSubmit={handleJoinCode} className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Ex: AC-7K9A"
                maxLength={8}
                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-slate-900 uppercase tracking-wider focus:outline-none focus:border-orange-500 bg-slate-50/50"
              />
              <button
                type="submit"
                disabled={joining || !joinCode.trim()}
                className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors disabled:opacity-50"
              >
                {joining ? 'Conectando...' : 'Entrar'}
              </button>
            </form>

            {joinMessage && (
              <div
                className={`p-2.5 rounded-lg text-xs font-medium ${
                  joinMessage.isError
                    ? 'bg-rose-50 text-rose-800 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                }`}
              >
                {joinMessage.text}
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] flex items-start gap-2">
            <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-orange-600" />
            <span>
              Atualizações de abastecimento e revisões são sincronizadas em tempo real entre os dois aparelhos via Firebase.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
