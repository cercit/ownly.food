import React, { useState, useEffect } from 'react';
import {
  getGroup,
  placeGroup,
  cancelGroup,
  calculateShares,
  currentUser,
  GroupOrder
} from '../services/ownly-api.ts';

interface HostCheckoutScreenProps {
  groupId: string;
  onOrderPlaced: (groupId: string) => void;
  onCancel: () => void;
}

export const HostCheckoutScreen: React.FC<HostCheckoutScreenProps> = ({
  groupId,
  onOrderPlaced,
  onCancel
}) => {
  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [deliveryFee, setDeliveryFee] = useState<number>(40);
  const [packagingFee, setPackagingFee] = useState<number>(20);
  const [taxesFee, setTaxesFee] = useState<number>(36);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = currentUser();

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      const g = await getGroup(groupId);
      setGroup(g);
      if (g.rapido_charges) {
        setDeliveryFee(g.rapido_charges.delivery);
        setPackagingFee(g.rapido_charges.packaging);
        setTaxesFee(g.rapido_charges.taxes);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load group');
    }
  };

  if (!group) {
    return <div className="py-20 text-center text-sm text-[#576177]">Loading checkout...</div>;
  }

  // Create a synthetic preview of the group with the currently typed charges
  const previewGroup: GroupOrder = {
    ...group,
    rapido_charges: {
      delivery: deliveryFee,
      packaging: packagingFee,
      taxes: taxesFee
    }
  };

  const shares = calculateShares(previewGroup);
  const totalFood = group.items.reduce((sum, it) => sum + it.price * it.quantity, 0);
  const totalCharges = deliveryFee + packagingFee + taxesFee;
  const grandTotal = totalFood + totalCharges;
  const numMembers = Math.max(group.members.length, 1);

  const handlePlaceOrder = async () => {
    setError(null);
    setLoading(true);
    try {
      await placeGroup(groupId, deliveryFee, packagingFee, taxesFee);
      onOrderPlaced(groupId);
    } catch (err: any) {
      setError(err?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this group order? All member carts will be discarded.')) return;
    try {
      await cancelGroup(groupId);
      onCancel();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel order');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
      <div className="flex flex-col gap-6">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#C40054] bg-[#FFE3ED] px-3 py-1 rounded-full border border-[#F0D7E2]">
            Host Final Checkout
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#111D35] tracking-tight mt-1.5">
            Review Roster & Place Order
          </h1>
          <p className="text-xs sm:text-sm text-[#576177] mt-0.5">
            Cart is locked. Enter the Rapido charges below to calculate everyone's final split.
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-[#FFE7E9] border border-[#A32234]/20 text-[#A32234] text-xs font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Order Context Card */}
        <div className="bg-white rounded-3xl p-5 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={group.restaurant_image}
              alt={group.restaurant_name}
              className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-[#F0D7E2]"
            />
            <div>
              <h2 className="font-extrabold text-base text-[#111D35]">{group.restaurant_name}</h2>
              <p className="text-xs text-[#576177]">{group.restaurant_area} • Room {group.share_code}</p>
              <p className="text-xs text-[#111D35] font-semibold mt-0.5">
                Delivering to: {group.delivery_address.line1}, {group.delivery_address.area}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs text-[#576177] block font-medium">Squad Size</span>
            <span className="text-base font-black text-[#111D35]">{group.members.length} Members</span>
          </div>
        </div>

        {/* Rapido Charges Input Box (three plain lines) */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C40054] text-[20px]">two_wheeler</span>
              <h3 className="font-bold text-sm text-[#111D35]">Rapido Order Charges</h3>
            </div>
            <span className="text-xs text-[#576177]">Split equally across {numMembers} members</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Delivery */}
            <div className="p-3.5 bg-[#FFF9FC] rounded-2xl border border-[#F0D7E2]">
              <label className="text-xs font-bold text-[#111D35] block mb-1">Delivery Fee (₹)</label>
              <input
                type="number"
                min="0"
                value={deliveryFee}
                onChange={(e) => setDeliveryFee(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-10 px-3 bg-white border border-[#F0D7E2] rounded-xl text-sm font-extrabold text-[#111D35] font-mono focus:outline-none focus:border-[#C40054]"
              />
              <span className="text-[10px] text-[#576177] mt-1 block">
                ₹{(deliveryFee / numMembers).toFixed(2)} / person
              </span>
            </div>

            {/* Packaging */}
            <div className="p-3.5 bg-[#FFF9FC] rounded-2xl border border-[#F0D7E2]">
              <label className="text-xs font-bold text-[#111D35] block mb-1">Packaging (₹)</label>
              <input
                type="number"
                min="0"
                value={packagingFee}
                onChange={(e) => setPackagingFee(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-10 px-3 bg-white border border-[#F0D7E2] rounded-xl text-sm font-extrabold text-[#111D35] font-mono focus:outline-none focus:border-[#C40054]"
              />
              <span className="text-[10px] text-[#576177] mt-1 block">
                ₹{(packagingFee / numMembers).toFixed(2)} / person
              </span>
            </div>

            {/* Taxes */}
            <div className="p-3.5 bg-[#FFF9FC] rounded-2xl border border-[#F0D7E2]">
              <label className="text-xs font-bold text-[#111D35] block mb-1">Taxes / GST (₹)</label>
              <input
                type="number"
                min="0"
                value={taxesFee}
                onChange={(e) => setTaxesFee(Math.max(0, Number(e.target.value) || 0))}
                className="w-full h-10 px-3 bg-white border border-[#F0D7E2] rounded-xl text-sm font-extrabold text-[#111D35] font-mono focus:outline-none focus:border-[#C40054]"
              />
              <span className="text-[10px] text-[#576177] mt-1 block">
                ₹{(taxesFee / numMembers).toFixed(2)} / person
              </span>
            </div>
          </div>
        </div>

        {/* Itemized Share Table according to chosen Split Rule */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#111D35]">Individual Member Shares</h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#FFF1F6] text-[#C40054] border border-[#F0D7E2]">
              Rule: {group.split_rule === 'itemised' ? 'Pay for what you ordered' : 'Split everything equally'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#F0D7E2] text-[#576177]">
                  <th className="py-2.5 font-bold">Person</th>
                  <th className="py-2.5 font-bold text-right">Own Dishes</th>
                  <th className="py-2.5 font-bold text-right">Shared Dishes</th>
                  <th className="py-2.5 font-bold text-right">Charges (1/{numMembers})</th>
                  <th className="py-2.5 font-bold text-right text-[#111D35]">Total Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0D7E2]">
                {shares.map((s) => (
                  <tr key={s.user_id}>
                    <td className="py-3 font-semibold text-[#111D35] flex items-center gap-1.5">
                      <span>{s.user_name}</span>
                      {s.is_host && (
                        <span className="text-[9px] bg-[#FFE3ED] text-[#C40054] font-extrabold px-1.5 py-0.2 rounded uppercase">
                          Host
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right font-mono text-[#576177]">
                      ₹{s.own_dishes_total.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono text-[#576177]">
                      ₹{s.shared_dishes_share.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono text-[#576177]">
                      ₹{s.charges_share.toFixed(2)}
                    </td>
                    <td className="py-3 text-right font-mono font-black text-[#C40054] text-sm">
                      ₹{s.total_payable.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Grand Total Bar */}
          <div className="pt-3 border-t border-[#F0D7E2] flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-[#111D35] block">Grand Order Total</span>
              <span className="text-[11px] text-[#576177]">Food ₹{totalFood} + Rapido charges ₹{totalCharges}</span>
            </div>
            <span className="text-2xl font-black font-mono text-[#111D35]">
              ₹{grandTotal.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-3">
          <button
            onClick={handlePlaceOrder}
            disabled={loading}
            className="w-full h-14 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-base shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 cursor-pointer transition-all"
          >
            {loading ? (
              <span>Submitting order to kitchen...</span>
            ) : (
              <>
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                <span>Place Order with Rapido (₹{grandTotal.toFixed(2)})</span>
              </>
            )}
          </button>

          <button
            onClick={handleCancel}
            className="w-full py-2.5 rounded-full text-xs text-[#A32234] hover:bg-[#FFE7E9] font-bold transition-colors cursor-pointer"
          >
            Cancel Group Order
          </button>
        </div>
      </div>
    </div>
  );
};
