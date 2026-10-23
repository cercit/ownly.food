import React, { useState, useEffect } from 'react';
import {
  getGroup,
  watchGroup,
  getMenu,
  addItem,
  removeItem,
  lockGroup,
  leaveGroup,
  cancelGroup,
  calculateShares,
  currentUser,
  GroupOrder,
  MenuItem
} from '../services/ownly-api.ts';

interface SharedCartScreenProps {
  groupId: string;
  onProceedToCheckout: (groupId: string) => void;
  onGoToPayMyShare: (groupId: string) => void;
  onGoToTracking: (groupId: string) => void;
  onOrderCancelled: () => void;
}

export const SharedCartScreen: React.FC<SharedCartScreenProps> = ({
  groupId,
  onProceedToCheckout,
  onGoToPayMyShare,
  onGoToTracking,
  onOrderCancelled
}) => {
  const [group, setGroup] = useState<GroupOrder | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add Item Dialog / Customization
  const [selectedMenuItem, setSelectedMenuItem] = useState<MenuItem | null>(null);
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [isShared, setIsShared] = useState<boolean>(false);
  const [addingLoading, setAddingLoading] = useState<boolean>(false);

  // Cut-off timer state
  const [timeLeftString, setTimeLeftString] = useState<string>('18m 30s');

  const user = currentUser();

  useEffect(() => {
    loadGroup();
    const stopWatch = watchGroup(groupId, (updated) => {
      setGroup({ ...updated });
    });
    return () => stopWatch();
  }, [groupId]);

  useEffect(() => {
    if (!group?.cutoff_time) return;
    const interval = setInterval(() => {
      const diff = new Date(group.cutoff_time).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeftString('Order window closed');
      } else {
        const m = Math.floor(diff / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        setTimeLeftString(`${m}m ${s < 10 ? '0' : ''}${s}s`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [group?.cutoff_time]);

  const loadGroup = async () => {
    setLoading(true);
    try {
      const g = await getGroup(groupId);
      setGroup(g);
      const m = await getMenu(g.restaurant_id);
      setMenu(m);
    } catch (err: any) {
      setError(err?.message || 'Failed to load group order');
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async () => {
    if (!selectedMenuItem) return;
    setAddingLoading(true);
    try {
      await addItem(groupId, selectedMenuItem.id, itemQty, itemNotes, isShared);
      setSelectedMenuItem(null);
      setItemNotes('');
      setIsShared(false);
      setItemQty(1);
    } catch (err: any) {
      setError(err?.message || 'Failed to add item');
    } finally {
      setAddingLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      await removeItem(groupId, itemId);
    } catch (err: any) {
      setError(err?.message || 'Failed to remove item');
    }
  };

  const handleLockOrder = async () => {
    try {
      await lockGroup(groupId);
      onProceedToCheckout(groupId);
    } catch (err: any) {
      setError(err?.message || 'Failed to lock order');
    }
  };

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this group order for all members?')) {
      return;
    }
    try {
      await cancelGroup(groupId);
      onOrderCancelled();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel order');
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Leave this group order and remove your items?')) {
      return;
    }
    try {
      await leaveGroup(groupId);
      onOrderCancelled();
    } catch (err: any) {
      setError(err?.message || 'Failed to leave group');
    }
  };

  if (loading || !group) {
    return <div className="py-20 text-center text-sm text-[#576177]">Loading shared cart...</div>;
  }

  const isHost = group.host_id === user?.id || group.host_email === user?.email;
  const isLocked = group.status === 'locked' || group.status === 'placed' || group.status === 'delivered';
  const shares = calculateShares(group);
  const myShare = shares.find((s) => s.user_id === user?.id || s.user_email === user?.email);

  // Group items by member
  const membersWithItems = group.members.map((member) => ({
    ...member,
    items: group.items.filter((i) => i.user_id === member.user_id),
    share: shares.find((s) => s.user_id === member.user_id)
  }));

  const totalFoodValue = group.items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
      {/* Top Session Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <img
              src={group.restaurant_image}
              alt={group.restaurant_name}
              className="w-16 h-16 rounded-2xl object-cover shrink-0 border border-[#F0D7E2]"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold text-[#111D35] tracking-tight">
                  {group.restaurant_name}
                </h1>
                <span className="font-mono text-xs font-black bg-[#FFE3ED] text-[#C40054] px-2.5 py-0.5 rounded-full border border-[#F0D7E2]">
                  {group.share_code}
                </span>
                {isLocked && (
                  <span className="text-xs font-bold bg-[#FFE7E9] text-[#A32234] px-2.5 py-0.5 rounded-full flex items-center gap-1 border border-[#A32234]/20">
                    <span className="material-symbols-outlined text-[14px]">lock</span>
                    Locked
                  </span>
                )}
              </div>

              <p className="text-xs text-[#576177] mt-1">
                Delivering to {group.delivery_address.label} ({group.delivery_address.area}, Chennai) • Host: {group.host_name} {isHost && '(You)'}
              </p>

              {/* Chosen Split Rule Display */}
              <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-[#FFF1F6] text-[#111D35] text-xs font-bold border border-[#F0D7E2]">
                <span className="material-symbols-outlined text-[15px] text-[#C40054]">splitscreen</span>
                <span>
                  Host Split Rule:{' '}
                  <strong className="text-[#C40054]">
                    {group.split_rule === 'itemised'
                      ? 'Pay for what you ordered'
                      : 'Split everything equally'}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* Right Metrics: Timer & Member Count */}
          <div className="flex items-center gap-3">
            <div className="bg-[#FFE3ED] px-4 py-2 rounded-2xl flex flex-col items-center border border-[#F0D7E2]">
              <span className="text-[10px] uppercase font-extrabold text-[#C40054]">Cut-Off</span>
              <span className="text-sm font-black text-[#111D35] font-mono">{timeLeftString}</span>
            </div>

            <div className="bg-[#FFF9FC] border border-[#F0D7E2] px-4 py-2 rounded-2xl flex flex-col items-center">
              <span className="text-[10px] uppercase font-bold text-[#576177]">Squad</span>
              <span className="text-sm font-black text-[#111D35] font-mono">
                {group.members.length} / 12
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3.5 rounded-2xl bg-[#FFE7E9] border border-[#A32234]/20 text-[#A32234] text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Two-Column Desktop Layout: Cart Roster (Left) + Menu (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: SHARED CART ROSTER */}
        <div className="lg:col-span-7 flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C40054] text-[22px]">shopping_cart</span>
              <h2 className="text-lg font-bold text-[#111D35]">Group Roster & Cart</h2>
            </div>
            <span className="text-xs text-[#576177] font-semibold">{group.items.length} items added</span>
          </div>

          {/* Members List with Items */}
          <div className="flex flex-col gap-4">
            {membersWithItems.map((m) => {
              const isMe = m.user_id === user?.id || m.user_email === user?.email;
              return (
                <div
                  key={m.user_id}
                  className="bg-white rounded-3xl p-5 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-3"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-[#F0D7E2]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#111D35] text-white font-black text-xs flex items-center justify-center border border-[#F0D7E2]">
                        {m.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-[#111D35]">
                            {m.user_name} {isMe && '(You)'}
                          </span>
                          {m.is_host && (
                            <span className="bg-[#FFE3ED] text-[#C40054] text-[10px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                              Host
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[#576177] font-medium">{m.status}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      {group.status === 'placed' || group.status === 'delivered' ? (
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                            m.payment_status === 'paid'
                              ? 'bg-[#E5F6ED] text-[#125F43] border border-[#16845A]/20'
                              : 'bg-[#FFF1D9] text-[#855000] border border-[#A65D00]/20'
                          }`}
                        >
                          {m.payment_status === 'paid' ? 'Paid ✓' : 'Pending ◷'}
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-[#111D35] font-mono">
                          {m.items.length} items
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dishes Added by this Member */}
                  {m.items.length === 0 ? (
                    <div className="py-2 text-xs text-[#576177] italic">No dishes added yet...</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {m.items.map((item) => (
                        <div
                          key={item.id}
                          className="bg-[#FFF9FC] rounded-2xl p-3 flex items-start justify-between gap-3 border border-[#F0D7E2]/60"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs sm:text-sm text-[#111D35]">
                                {item.quantity}× {item.item_name}
                              </span>
                              {item.is_shared && (
                                <span className="bg-[#FFE3ED] text-[#C40054] text-[10px] font-extrabold px-2 py-0.2 rounded-full">
                                  Shared with Group
                                </span>
                              )}
                            </div>
                            {item.notes && (
                              <p className="text-[11px] text-[#576177] italic mt-0.5">
                                "{item.notes}"
                              </p>
                            )}
                            <div className="text-xs font-extrabold text-[#C40054] font-mono mt-1">
                              ₹{item.price * item.quantity}
                            </div>
                          </div>

                          {!isLocked && (isMe || isHost) && (
                            <button
                              onClick={() => handleRemoveItem(item.id)}
                              className="text-[#A32234] text-xs hover:underline px-2 py-1 font-semibold"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Running Subtotal & Charges Overview */}
          <div className="bg-white rounded-3xl p-5 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-xs text-[#576177]">
              <span>Food Subtotal ({group.items.length} items)</span>
              <span className="font-bold text-[#111D35] font-mono text-sm">₹{totalFoodValue}</span>
            </div>

            <div className="pt-2 border-t border-[#F0D7E2] flex items-center justify-between text-xs text-[#576177]">
              <span>Rapido Delivery + Packaging + Taxes</span>
              <span>Split equally across {group.members.length} members at checkout</span>
            </div>

            {myShare && (
              <div className="mt-2 p-4 bg-[#FFF1F6] rounded-2xl flex items-center justify-between border border-[#F0D7E2]">
                <div>
                  <span className="text-[11px] font-extrabold text-[#C40054] uppercase tracking-wider block">
                    Your Share Estimate
                  </span>
                  <span className="text-xs text-[#576177]">
                    {group.split_rule === 'itemised' ? 'Own food + 1/N shared + 1/N charges' : 'Total ÷ N users'}
                  </span>
                </div>
                <span className="text-xl font-black font-mono text-[#111D35]">
                  ₹{myShare.total_payable.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Action Button Bar */}
          <div className="flex flex-col gap-2.5">
            {isHost ? (
              <>
                {!isLocked ? (
                  <button
                    onClick={handleLockOrder}
                    className="w-full h-13 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    <span>Lock Cart & Proceed to Checkout</span>
                  </button>
                ) : (
                  <button
                    onClick={() => onProceedToCheckout(groupId)}
                    className="w-full h-13 rounded-full bg-[#C40054] hover:bg-[#A80047] text-white font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-[0_9px_24px_rgba(196,0,84,0.22)]"
                  >
                    <span>View Host Checkout</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                )}

                <button
                  onClick={handleCancelOrder}
                  className="w-full py-2.5 rounded-full text-xs text-[#A32234] hover:bg-[#FFE7E9] font-bold transition-colors"
                >
                  Cancel Group Order
                </button>
              </>
            ) : (
              <>
                {group.status === 'placed' || group.status === 'delivered' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onGoToPayMyShare(groupId)}
                      className="flex-1 h-12 rounded-full bg-[#C40054] hover:bg-[#A80047] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-[0_9px_24px_rgba(196,0,84,0.22)] cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">payments</span>
                      <span>Pay My Share</span>
                    </button>
                    <button
                      onClick={() => onGoToTracking(groupId)}
                      className="flex-1 h-12 rounded-full bg-[#111D35] hover:bg-black text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">moped</span>
                      <span>Track Order</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={handleLeave}
                    className="w-full py-2.5 rounded-full text-xs text-[#A32234] hover:bg-[#FFE7E9] font-bold transition-colors"
                  >
                    Leave Group Order
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RESTAURANT MENU */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-[#111D35]">Add Dishes from Menu</h3>
            <span className="text-xs text-[#576177] font-semibold">{menu.length} items</span>
          </div>

          {isLocked ? (
            <div className="p-6 bg-white rounded-3xl border border-[#F0D7E2] text-center text-xs text-[#576177]">
              <span className="material-symbols-outlined text-[28px] text-[#A32234] block mb-1">lock</span>
              Order is locked by the host. No additional dishes can be added.
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-5 border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] flex flex-col gap-4">
              <div className="divide-y divide-[#F0D7E2]">
                {menu.map((dish) => (
                  <div key={dish.id} className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3 h-3 rounded-xs border flex items-center justify-center shrink-0 ${
                            dish.is_veg ? 'border-[#16845A]' : 'border-[#A32234]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              dish.is_veg ? 'bg-[#16845A]' : 'bg-[#A32234]'
                            }`}
                          ></span>
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[#111D35] truncate">{dish.name}</h4>
                      </div>
                      <p className="text-[11px] text-[#576177] line-clamp-1 mt-0.5">{dish.description}</p>
                      <div className="text-xs font-extrabold text-[#C40054] font-mono mt-1">₹{dish.price}</div>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedMenuItem(dish);
                        setItemQty(1);
                        setItemNotes('');
                        setIsShared(false);
                      }}
                      className="py-1.5 px-3 rounded-full bg-[#FFF1F6] hover:bg-[#FFE3ED] border border-[#F0D7E2] text-[#C40054] text-xs font-bold shrink-0 transition-colors cursor-pointer"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Item Customization Modal */}
      {selectedMenuItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-[#F0D7E2] flex flex-col gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#125F43] bg-[#E5F6ED] px-2 py-0.5 rounded">
                  {selectedMenuItem.category}
                </span>
                <h3 className="text-base font-bold text-[#111D35] mt-1">{selectedMenuItem.name}</h3>
                <span className="text-sm font-extrabold text-[#C40054] font-mono">₹{selectedMenuItem.price} each</span>
              </div>
              <button
                onClick={() => setSelectedMenuItem(null)}
                className="w-8 h-8 rounded-full bg-[#FFF9FC] border border-[#F0D7E2] text-[#111D35] flex items-center justify-center hover:bg-[#FFF1F6]"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between p-3.5 bg-[#FFF9FC] rounded-2xl border border-[#F0D7E2]">
              <span className="text-xs font-bold text-[#111D35]">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setItemQty(Math.max(1, itemQty - 1))}
                  className="w-7 h-7 rounded-full bg-white border border-[#F0D7E2] flex items-center justify-center font-bold text-sm text-[#111D35]"
                >
                  -
                </button>
                <span className="font-bold text-sm text-[#111D35] font-mono">{itemQty}</span>
                <button
                  type="button"
                  onClick={() => setItemQty(itemQty + 1)}
                  className="w-7 h-7 rounded-full bg-white border border-[#F0D7E2] flex items-center justify-center font-bold text-sm text-[#111D35]"
                >
                  +
                </button>
              </div>
            </div>

            {/* Custom Notes */}
            <div>
              <label className="text-xs font-bold text-[#111D35] block mb-1">
                Custom Kitchen Note (optional)
              </label>
              <input
                type="text"
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
                placeholder='e.g. "less spicy", "no onion", "extra salan"'
                className="w-full h-10 px-3.5 bg-[#FFF9FC] border border-[#F0D7E2] rounded-xl text-xs font-medium text-[#111D35] focus:outline-none focus:border-[#C40054]"
              />
            </div>

            {/* Shared Dish Toggle */}
            <label className="p-3.5 bg-[#FFF1F6] rounded-2xl flex items-center justify-between cursor-pointer border border-[#F0D7E2]">
              <div>
                <span className="text-xs font-bold text-[#111D35] block">Mark as Shared Starter / Platter</span>
                <span className="text-[11px] text-[#576177]">Cost will be split equally among all {group.members.length} members</span>
              </div>
              <input
                type="checkbox"
                checked={isShared}
                onChange={(e) => setIsShared(e.target.checked)}
                className="w-4 h-4 accent-[#C40054]"
              />
            </label>

            <button
              onClick={handleAddItem}
              disabled={addingLoading}
              className="w-full h-12 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 font-bold text-xs text-white shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center justify-center gap-1.5 cursor-pointer mt-1"
            >
              <span>Add to Group Cart (₹{selectedMenuItem.price * itemQty})</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
