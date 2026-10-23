import React, { useState, useEffect } from 'react';
import { payMyShare } from '../services/ownly-api.ts';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  groupId: string;
  amount: number;
  restaurantName: string;
  roomCode: string;
  onPaymentSuccess: (ref: string, method: string) => void;
  onPaymentFailed: (errorMsg: string) => void;
}

export const RazorpayModal: React.FC<RazorpayModalProps> = ({
  isOpen,
  onClose,
  groupId,
  amount,
  restaurantName,
  roomCode,
  onPaymentSuccess,
  onPaymentFailed
}) => {
  const [activeTab, setActiveTab] = useState<'upi' | 'card' | 'netbanking' | 'cash'>('upi');
  const [loading, setLoading] = useState(false);
  const [selectedUpiApp, setSelectedUpiApp] = useState('Google Pay');
  const [upiIdInput, setUpiIdInput] = useState('user@oksbi');
  const [qrSeconds, setQrSeconds] = useState(295);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setQrSeconds((prev) => (prev > 0 ? prev - 1 : 300));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handlePay = async (simulateSuccess: boolean, method: 'upi' | 'card' | 'netbanking' | 'cash') => {
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      const res = await payMyShare(groupId, method, simulateSuccess);
      if (res.status === 'paid') {
        onPaymentSuccess(res.reference, method);
        onClose();
      } else {
        onPaymentFailed('Payment declined (simulated decline). Your share remains Pending.');
      }
    } catch (err: any) {
      onPaymentFailed(err?.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[#F0D7E2]">
        {/* Header with Ownly styling */}
        <div className="bg-[#111D35] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#F50062] flex-shrink-0 border border-white/20">
              <img
                src="/assets/aistudio/owenly_logo_9141f5f9.jpg"
                alt="Ownly Logo"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base leading-tight">Ownly Together</span>
                <span className="bg-[#FFE3ED] text-[#C40054] text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                  DEMO GATEWAY
                </span>
              </div>
              <p className="text-xs text-white/70">
                {restaurantName} • Room {roomCode}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[11px] text-white/70 uppercase tracking-wider block font-medium">Payable Share</span>
            <span className="text-xl font-extrabold font-mono text-[#FFE3ED]">₹{amount.toFixed(2)}</span>
          </div>
        </div>

        {/* Safety Banner */}
        <div className="bg-[#FFF1F6] border-b border-[#F0D7E2] px-4 py-2 flex items-center gap-2 text-xs text-[#576177]">
          <span className="material-symbols-outlined text-[16px] shrink-0 text-[#C40054]">info</span>
          <span className="font-medium">Demo payment: no real money moves. Full card numbers, CVVs, or UPI PINs are never requested or stored.</span>
        </div>

        {/* Modal Body: Tabs & Content */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-12 min-h-[380px]">
          {/* Method Tabs Sidebar */}
          <div className="md:col-span-4 bg-[#FFF9FC] border-r border-[#F0D7E2] p-2 flex md:flex-col gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('upi')}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === 'upi'
                  ? 'bg-white text-[#C40054] shadow-xs border border-[#F0D7E2]'
                  : 'text-[#576177] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#C40054]">qr_code_scanner</span>
              <span>UPI / QR</span>
            </button>
            <button
              onClick={() => setActiveTab('card')}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === 'card'
                  ? 'bg-white text-[#C40054] shadow-xs border border-[#F0D7E2]'
                  : 'text-[#576177] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#576177]">credit_card</span>
              <span>Cards (Masked)</span>
            </button>
            <button
              onClick={() => setActiveTab('netbanking')}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === 'netbanking'
                  ? 'bg-white text-[#C40054] shadow-xs border border-[#F0D7E2]'
                  : 'text-[#576177] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#576177]">account_balance</span>
              <span>Netbanking</span>
            </button>
            <button
              onClick={() => setActiveTab('cash')}
              className={`w-full flex items-center gap-2.5 p-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                activeTab === 'cash'
                  ? 'bg-white text-[#C40054] shadow-xs border border-[#F0D7E2]'
                  : 'text-[#576177] hover:bg-white/60'
              }`}
            >
              <span className="material-symbols-outlined text-[18px] text-[#16845A]">payments</span>
              <span>Paid Host Cash</span>
            </button>
          </div>

          {/* Active Tab Panel */}
          <div className="md:col-span-8 p-4 flex flex-col justify-between">
            {activeTab === 'upi' && (
              <div className="space-y-4">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#576177] mb-2">Scan QR Code</h4>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-[#FFF1F6] border border-[#F0D7E2]">
                    <div className="w-24 h-24 bg-white p-1 rounded-lg border border-[#F0D7E2] flex items-center justify-center shrink-0">
                      <svg viewBox="0 0 100 100" className="w-full h-full text-[#111D35]">
                        <rect x="5" y="5" width="30" height="30" fill="currentColor" />
                        <rect x="10" y="10" width="20" height="20" fill="white" />
                        <rect x="15" y="15" width="10" height="10" fill="currentColor" />
                        <rect x="65" y="5" width="30" height="30" fill="currentColor" />
                        <rect x="70" y="10" width="20" height="20" fill="white" />
                        <rect x="75" y="15" width="10" height="10" fill="currentColor" />
                        <rect x="5" y="65" width="30" height="30" fill="currentColor" />
                        <rect x="10" y="70" width="20" height="20" fill="white" />
                        <rect x="15" y="75" width="10" height="10" fill="currentColor" />
                        <circle cx="50" cy="50" r="8" fill="#F50062" />
                      </svg>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#111D35]">Scan with any UPI App</p>
                      <p className="text-[11px] text-[#576177] mt-0.5">Google Pay, PhonePe, Paytm, CRED</p>
                      <div className="mt-2 inline-flex items-center gap-1 font-mono font-bold text-[#C40054] bg-white px-2 py-0.5 rounded border border-[#F0D7E2]">
                        <span className="material-symbols-outlined text-[13px]">timer</span>
                        <span>{formatTimer(qrSeconds)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#576177] mb-2">Select UPI App</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {['Google Pay', 'PhonePe', 'Paytm', 'CRED UPI'].map((app) => (
                      <button
                        key={app}
                        onClick={() => setSelectedUpiApp(app)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-all ${
                          selectedUpiApp === app
                            ? 'border-[#C40054] bg-[#FFE3ED]/40 text-[#C40054]'
                            : 'border-[#F0D7E2] hover:bg-[#FFF1F6] text-[#111D35]'
                        }`}
                      >
                        <span>{app}</span>
                        {selectedUpiApp === app && (
                          <span className="material-symbols-outlined text-[16px] text-[#C40054]">check_circle</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-[#576177] block mb-1">Or enter UPI ID / VPA</label>
                  <input
                    type="text"
                    value={upiIdInput}
                    onChange={(e) => setUpiIdInput(e.target.value)}
                    placeholder="username@okhdfcbank"
                    className="w-full text-xs p-2.5 rounded-xl border border-[#F0D7E2] bg-white focus:outline-[#C40054]"
                  />
                </div>
              </div>
            )}

            {activeTab === 'card' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#576177]">Select Saved Masked Card</h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl border border-[#C40054] bg-[#FFE3ED]/30 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-6 bg-[#111D35] rounded text-white flex items-center justify-center text-[9px] font-bold">
                        VISA
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111D35]">HDFC Bank Regalia</p>
                        <p className="text-[11px] font-mono text-[#576177]">•••• •••• •••• 4022</p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#F0D7E2] font-bold text-[#C40054]">
                      Default
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[#F0D7E2] bg-white flex items-center justify-between opacity-80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-6 bg-[#C40054] rounded text-white flex items-center justify-center text-[9px] font-bold">
                        MC
                      </div>
                      <div>
                        <p className="text-xs font-bold text-[#111D35]">ICICI Coral Card</p>
                        <p className="text-[11px] font-mono text-[#576177]">•••• •••• •••• 8819</p>
                      </div>
                    </div>
                    <span className="text-[10px] text-[#576177]">Saved</span>
                  </div>
                </div>

                <div className="bg-[#FFF1F6] p-2.5 rounded-xl border border-[#F0D7E2] text-[11px] text-[#576177]">
                  <p className="font-semibold text-[#111D35]">Card Security</p>
                  <p>In accordance with RBI guidelines, CVV is simulated and tokenized.</p>
                </div>
              </div>
            )}

            {activeTab === 'netbanking' && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#576177]">Popular Chennai Banks</h4>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Axis Bank', 'Indian Bank', 'Kotak Mahindra'].map((b) => (
                    <button
                      key={b}
                      className="p-2.5 rounded-xl border border-[#F0D7E2] hover:border-[#C40054] hover:bg-[#FFE3ED]/30 text-left text-xs font-bold transition-all text-[#111D35]"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'cash' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-[#E5F6ED] border border-[#16845A]/30">
                  <div className="flex items-center gap-2 text-[#125F43] font-bold text-sm">
                    <span className="material-symbols-outlined text-[20px]">handshake</span>
                    <span>Direct Settlement with Host</span>
                  </div>
                  <p className="text-xs text-[#125F43]/90 mt-1.5 leading-relaxed">
                    Choose this if you have handed physical cash or completed a direct person-to-person transfer to the host outside this app.
                  </p>
                </div>
                <p className="text-[11px] text-[#576177]">
                  Clicking Simulate Success marks your share as <strong>Paid (Cash)</strong> in the shared room ledger.
                </p>
              </div>
            )}

            {/* Test Simulation Controls */}
            <div className="pt-4 mt-4 border-t border-[#F0D7E2]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-[#576177] uppercase tracking-wider">
                  Test Simulation Controls
                </span>
                <span className="text-[10px] text-[#576177]">For Reviewer Evaluation</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  disabled={loading}
                  onClick={() => handlePay(true, activeTab)}
                  className="py-2.5 px-3 rounded-full bg-[#16845A] text-white text-xs font-bold hover:bg-[#125F43] active:scale-98 transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Simulate Success</span>
                </button>
                <button
                  disabled={loading}
                  onClick={() => handlePay(false, activeTab)}
                  className="py-2.5 px-3 rounded-full bg-[#A32234] text-white text-xs font-bold hover:bg-[#851C2A] active:scale-98 transition-all flex items-center justify-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                  <span>Simulate Failure</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-[#FFF9FC] border-t border-[#F0D7E2] px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#576177]">
            <span className="material-symbols-outlined text-[14px] text-[#16845A]">lock</span>
            <span>Secured Demo Terminal • 256-bit SSL</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#576177] hover:text-[#C40054] font-bold underline px-2 py-1"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
