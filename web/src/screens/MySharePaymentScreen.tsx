import React, { useState, useEffect } from 'react';
import {
  getGroup,
  calculateShares,
  currentUser,
  GroupOrder
} from '../services/ownly-api.ts';
import { RazorpayModal } from '../components/RazorpayModal.tsx';

interface MySharePaymentScreenProps {
  groupId: string;
  onGoToTracking: (groupId: string) => void;
  onBackToCart: (groupId: string) => void;
}

export const MySharePaymentScreen: React.FC<MySharePaymentScreenProps> = ({
  groupId,
  onGoToTracking,
  onBackToCart
}) => {
  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const user = currentUser();

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      const g = await getGroup(groupId);
      setGroup(g);
    } catch (err) {
      console.error(err);
    }
  };

  if (!group) {
    return <div className="py-20 text-center text-sm text-[#576177]">Loading payment details...</div>;
  }

  const shares = calculateShares(group);
  const myShare = shares.find((s) => s.user_id === user?.id || s.user_email === user?.email);
  const isPaid = myShare?.payment_status === 'paid';
  const isFailed = myShare?.payment_status === 'failed';

  const handlePaymentSuccess = (ref: string, method: string) => {
    loadGroup();
    setToastType('success');
    setToastMessage(`Payment of ₹${myShare?.total_payable.toFixed(2)} recorded! Ref: ${ref} (${method})`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePaymentFailed = (errorMsg: string) => {
    loadGroup();
    setToastType('error');
    setToastMessage(errorMsg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6">
        <div>
          <button
            onClick={() => onBackToCart(groupId)}
            className="text-xs font-bold text-[#576177] hover:text-[#C40054] flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Back to Group Cart</span>
          </button>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C40054] bg-[#FFE3ED] px-3 py-1 rounded-full border border-[#F0D7E2]">
            Individual Settlement
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111D35] tracking-tight mt-1.5">
            My Share & Payment
          </h1>
          <p className="text-xs sm:text-sm text-[#576177] mt-0.5">
            {group.restaurant_name} • Room #{group.share_code}
          </p>
        </div>

        {toastMessage && (
          <div
            className={`p-3.5 rounded-2xl text-xs font-bold flex items-center gap-2 ${
              toastType === 'success'
                ? 'bg-[#E5F6ED] text-[#125F43] border border-[#16845A]/20'
                : 'bg-[#FFE7E9] text-[#A32234] border border-[#A32234]/20'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {toastType === 'success' ? 'check_circle' : 'error'}
            </span>
            <span>{toastMessage}</span>
          </div>
        )}

        {/* My Mathematical Share Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0D7E2]">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-[#576177] block font-bold">
                Host Chosen Split Rule
              </span>
              <span className="text-xs font-bold text-[#111D35]">
                {group.split_rule === 'itemised'
                  ? 'Pay for what you ordered'
                  : 'Split everything equally'}
              </span>
            </div>

            <span
              className={`text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 ${
                isPaid
                  ? 'bg-[#E5F6ED] text-[#125F43] border border-[#16845A]/20'
                  : isFailed
                  ? 'bg-[#FFE7E9] text-[#A32234] border border-[#A32234]/20'
                  : 'bg-[#FFF1D9] text-[#855000] border border-[#A65D00]/20'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {isPaid ? 'check_circle' : isFailed ? 'error' : 'schedule'}
              </span>
              <span>{isPaid ? 'Paid' : isFailed ? 'Declined' : 'Pending'}</span>
            </span>
          </div>

          {/* Breakdown Lines */}
          {myShare && (
            <div className="flex flex-col gap-2.5 text-xs">
              <div className="flex justify-between items-center text-[#576177]">
                <span>Your Personal Dishes</span>
                <span className="font-mono font-bold text-[#111D35]">
                  ₹{myShare.own_dishes_total.toFixed(2)}
                </span>
              </div>

              {myShare.items.length > 0 && (
                <div className="pl-3 py-1 flex flex-col gap-1 text-[11px] text-[#576177] border-l-2 border-[#F0D7E2]">
                  {myShare.items
                    .filter((it) => !it.is_shared)
                    .map((it) => (
                      <div key={it.id} className="flex justify-between">
                        <span>{it.quantity}× {it.item_name}</span>
                        <span className="font-mono">₹{it.price * it.quantity}</span>
                      </div>
                    ))}
                </div>
              )}

              <div className="flex justify-between items-center text-[#576177]">
                <span>Share of Shared Dishes (1/{group.members.length})</span>
                <span className="font-mono font-bold text-[#111D35]">
                  ₹{myShare.shared_dishes_share.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-between items-center text-[#576177]">
                <span>Share of Rapido Charges (1/{group.members.length})</span>
                <span className="font-mono font-bold text-[#111D35]">
                  ₹{myShare.charges_share.toFixed(2)}
                </span>
              </div>

              <div className="pt-3 border-t border-[#F0D7E2] flex items-center justify-between">
                <div>
                  <span className="text-sm font-extrabold text-[#111D35] block">Total Your Share</span>
                  <span className="text-[11px] text-[#576177]">
                    Exact mathematical share • Zero hidden marks
                  </span>
                </div>
                <span className="text-3xl font-black font-mono text-[#C40054]">
                  ₹{myShare.total_payable.toFixed(2)}
                </span>
              </div>
            </div>
          )}

          {/* Pay Button / Paid Status */}
          {isPaid ? (
            <div className="p-4 bg-[#E5F6ED] rounded-2xl flex items-center justify-between gap-3 text-xs text-[#125F43] border border-[#16845A]/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
                <div>
                  <span className="font-bold block">Share Settled!</span>
                  <span className="text-[11px] opacity-80">{myShare?.payment_method}</span>
                </div>
              </div>
              <button
                onClick={() => onGoToTracking(groupId)}
                className="py-1.5 px-3 rounded-full bg-[#125F43] text-white font-bold text-xs hover:bg-[#00522B]"
              >
                Track Order →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => setShowModal(true)}
                className="w-full h-13 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
                <span>
                  {isFailed
                    ? `Retry Payment (₹${myShare?.total_payable.toFixed(2)})`
                    : `Pay My Share (₹${myShare?.total_payable.toFixed(2)}) via Razorpay Demo`}
                </span>
              </button>
              <p className="text-[11px] text-center text-[#576177]">
                UPI Apps, QR Code, Cards, Netbanking & Cash settlements supported
              </p>
            </div>
          )}
        </div>

        {/* Group Repayment Roster (Paid vs Pending) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#111D35] flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-[#C40054]">groups</span>
              <span>Squad Settlement Tracker</span>
            </h3>
            <span className="text-xs font-bold text-[#576177]">
              {shares.filter((s) => s.payment_status === 'paid').length} of {shares.length} Settled
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {shares.map((s) => {
              const isMemberPaid = s.payment_status === 'paid';
              return (
                <div
                  key={s.user_id}
                  className="p-3 bg-[#FFF9FC] rounded-2xl flex items-center justify-between text-xs border border-[#F0D7E2]/50"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#111D35] text-white font-black text-xs flex items-center justify-center border border-[#F0D7E2]">
                      {s.user_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="font-bold text-[#111D35]">{s.user_name}</span>
                      <span className="text-[11px] text-[#576177] block font-mono">
                        ₹{s.total_payable.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      isMemberPaid
                        ? 'bg-[#E5F6ED] text-[#125F43] border border-[#16845A]/20'
                        : 'bg-[#FFF1D9] text-[#855000] border border-[#A65D00]/20'
                    }`}
                  >
                    {isMemberPaid ? 'Paid' : 'Pending'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Razorpay Demo Gateway Modal */}
      <RazorpayModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        groupId={groupId}
        amount={myShare?.total_payable || 0}
        restaurantName={group.restaurant_name}
        roomCode={group.share_code}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailed={handlePaymentFailed}
      />
    </div>
  );
};
