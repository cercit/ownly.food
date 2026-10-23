import React, { useState, useEffect } from 'react';
import { myGroupOrders, PastGroupOrder } from '../services/ownly-api.ts';

interface OrderHistoryScreenProps {
  onReorderWithGroup: (restaurantName: string, memberNames: string[]) => void;
  onGoToExplore: () => void;
}

export const OrderHistoryScreen: React.FC<OrderHistoryScreenProps> = ({
  onReorderWithGroup,
  onGoToExplore
}) => {
  const [orders, setOrders] = useState<PastGroupOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReceipt, setActiveReceipt] = useState<PastGroupOrder | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    const list = await myGroupOrders();
    setOrders(list);
    setLoading(false);
  };

  const handleReorder = (order: PastGroupOrder) => {
    setToastMessage(`Starting new group room for ${order.restaurant_name} with ${order.member_names.length} teammates!`);
    setTimeout(() => {
      setToastMessage(null);
      onReorderWithGroup(order.restaurant_name, order.member_names);
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12 animate-in fade-in duration-200">
      <div className="flex flex-col gap-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C40054] bg-[#FFE3ED] px-3 py-1 rounded-full border border-[#F0D7E2]">
            Group Ledgers & Feasts
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111D35] tracking-tight mt-1.5">
            Order History & Group Sessions
          </h1>
          <p className="text-xs sm:text-sm text-[#576177] mt-0.5">
            Review past settlements, view itemized receipts, and re-invite the same Chennai squad with 1-tap.
          </p>
        </div>

        {toastMessage && (
          <div className="p-3.5 rounded-2xl bg-[#111D35] text-white text-xs font-bold flex items-center gap-2 shadow-md">
            <span className="material-symbols-outlined text-[18px] text-[#F50062]">celebration</span>
            <span>{toastMessage}</span>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-xs text-[#576177]">Loading order history...</div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center bg-white rounded-3xl border border-[#F0D7E2] p-8">
            <span className="material-symbols-outlined text-[36px] text-[#576177] mb-2">history</span>
            <p className="text-sm font-bold text-[#111D35]">No past group orders yet</p>
            <p className="text-xs text-[#576177] mt-1 mb-4">Start your first group order from a Chennai kitchen!</p>
            <button
              onClick={onGoToExplore}
              className="py-2.5 px-6 rounded-full bg-[#C40054] text-xs font-bold text-white hover:bg-[#A80047]"
            >
              Explore Restaurants
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between pb-3 border-b border-[#F0D7E2] text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#111D35]">{order.date}</span>
                    <span className="text-[#576177]">•</span>
                    <span className="text-[#125F43] font-bold flex items-center gap-1 bg-[#E5F6ED] px-2 py-0.5 rounded-full border border-[#16845A]/20">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Delivered
                    </span>
                  </div>

                  <span className="font-mono text-xs font-bold text-[#C40054] bg-[#FFE3ED] border border-[#F0D7E2] px-2.5 py-0.5 rounded-full">
                    #{order.share_code}
                  </span>
                </div>

                {/* Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-extrabold text-[#111D35]">{order.restaurant_name}</h3>
                    <p className="text-xs text-[#576177]">{order.restaurant_area}, Chennai</p>
                    <p className="text-xs text-[#111D35] font-medium mt-1">{order.items_summary}</p>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[11px] text-[#576177] block uppercase tracking-wider font-semibold">Your Share</span>
                    <span className="text-xl font-black font-mono text-[#111D35]">
                      ₹{order.my_share.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-[#125F43] font-bold block mt-0.5">
                      Paid via Rapido Checkout ✓
                    </span>
                  </div>
                </div>

                {/* Squad Members */}
                <div className="p-3 bg-[#FFF9FC] rounded-2xl flex items-center justify-between text-xs text-[#576177] border border-[#F0D7E2]/50">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-[#C40054]">groups</span>
                    <span>
                      {order.member_names.length} Members ({order.member_names.join(', ')})
                    </span>
                  </div>
                  <span className="font-bold text-[#111D35] font-mono">
                    Total ₹{order.total_amount}
                  </span>
                </div>

                {/* Actions: Reorder & View Receipt */}
                <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
                  <button
                    onClick={() => handleReorder(order)}
                    className="w-full sm:flex-1 h-11 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">replay</span>
                    <span>Order again with this group</span>
                  </button>

                  <button
                    onClick={() => setActiveReceipt(order)}
                    className="w-full sm:w-auto h-11 px-5 rounded-full bg-white hover:bg-[#FFF1F6] border border-[#F0D7E2] text-[#111D35] font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px] text-[#C40054]">receipt_long</span>
                    <span>View Itemized Receipt</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Itemized Receipt Modal */}
      {activeReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#F0D7E2] flex flex-col gap-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#F0D7E2]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C40054] bg-[#FFE3ED] px-2 py-0.5 rounded-full">
                  Official Settlement Receipt
                </span>
                <h3 className="text-base font-extrabold text-[#111D35] mt-1">
                  {activeReceipt.restaurant_name} • #{activeReceipt.share_code}
                </h3>
                <span className="text-xs text-[#576177]">{activeReceipt.date} • Chennai</span>
              </div>

              <button
                onClick={() => setActiveReceipt(null)}
                className="w-8 h-8 rounded-full bg-[#FFF9FC] border border-[#F0D7E2] text-[#111D35] flex items-center justify-center hover:bg-[#FFF1F6]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="p-3.5 bg-[#FFF9FC] rounded-2xl flex flex-col gap-2 text-xs border border-[#F0D7E2]/60">
              <div className="flex justify-between text-[#576177]">
                <span>Total Food Items</span>
                <span className="font-mono font-bold text-[#111D35]">
                  ₹{(activeReceipt.total_amount - 96).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-[#576177]">
                <span>Rapido Delivery Fee</span>
                <span className="font-mono">₹40.00</span>
              </div>
              <div className="flex justify-between text-[#576177]">
                <span>Restaurant Packaging</span>
                <span className="font-mono">₹20.00</span>
              </div>
              <div className="flex justify-between text-[#576177]">
                <span>GST & Taxes</span>
                <span className="font-mono">₹36.00</span>
              </div>

              <div className="pt-2 border-t border-[#F0D7E2] flex justify-between font-extrabold text-sm text-[#111D35]">
                <span>Grand Total Settled</span>
                <span className="font-mono">₹{activeReceipt.total_amount.toFixed(2)}</span>
              </div>
            </div>

            <div className="p-3.5 bg-[#E5F6ED] rounded-2xl text-xs text-[#125F43] flex items-center justify-between border border-[#16845A]/20">
              <div>
                <span className="font-bold block">Your Share Settled</span>
                <span className="text-[11px] opacity-80">Paid via UPI • Zero discrepancies</span>
              </div>
              <span className="text-base font-black font-mono">₹{activeReceipt.my_share.toFixed(2)}</span>
            </div>

            <button
              onClick={() => setActiveReceipt(null)}
              className="w-full py-2.5 rounded-full bg-[#111D35] text-white text-xs font-bold hover:bg-black"
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
