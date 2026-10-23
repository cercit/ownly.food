import React, { useState, useEffect } from 'react';
import {
  listRestaurants,
  getMenu,
  Restaurant,
  MenuItem,
  CHENNAI_AREAS
} from '../services/ownly-api.ts';

interface ExploreScreenProps {
  onStartGroupOrder: (restaurantId: string) => void;
  onJoinRoom: () => void;
}

export const ExploreScreen: React.FC<ExploreScreenProps> = ({
  onStartGroupOrder,
  onJoinRoom
}) => {
  const [selectedArea, setSelectedArea] = useState<string>('All Areas');
  const [vegOnly, setVegOnly] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Menu preview modal state
  const [activeMenuRestaurant, setActiveMenuRestaurant] = useState<Restaurant | null>(null);
  const [activeMenuItems, setActiveMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState<boolean>(false);

  useEffect(() => {
    loadRestaurants();
  }, [selectedArea]);

  const loadRestaurants = async () => {
    setLoading(true);
    const list = await listRestaurants(selectedArea === 'All Areas' ? undefined : selectedArea);
    setRestaurants(list);
    setLoading(false);
  };

  const handleOpenMenu = async (restaurant: Restaurant) => {
    setActiveMenuRestaurant(restaurant);
    setMenuLoading(true);
    const items = await getMenu(restaurant.id);
    setActiveMenuItems(items);
    setMenuLoading(false);
  };

  const filteredRestaurants = restaurants.filter((r) => {
    if (vegOnly && !r.is_pure_veg) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.name.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.area.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-24 lg:pb-12">
      {/* Chennai Launch Hero Banner with Ownly brand tokens */}
      <div className="relative overflow-hidden brand-hero rounded-3xl p-6 sm:p-10 shadow-[0_6px_18px_rgba(17,29,53,0.06)] border border-[#F0D7E2] mb-8">
        <div className="max-w-3xl flex flex-col gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFE3ED] text-[#C40054] text-xs font-bold w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-[#F50062] animate-pulse"></span>
            <span>Group food ordering · Chennai concept</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111D35] tracking-tight leading-tight">
            <span className="text-[#C40054]">Order Together.</span><br />
            Pay Your Share. No More Chasing.
          </h1>

          <p className="text-base sm:text-lg text-[#576177] leading-relaxed max-w-2xl">
            One person starts the order. Friends join with a link, choose their own food and pay only their share.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-3">
            <button
              onClick={() => onStartGroupOrder('rest_sangeetha')}
              className="h-12 px-7 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white font-bold text-sm shadow-[0_9px_24px_rgba(196,0,84,0.22)] flex items-center gap-2 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">group_add</span>
              <span>Start a Group Order</span>
            </button>

            <button
              onClick={onJoinRoom}
              className="h-12 px-6 rounded-full bg-white hover:bg-[#FFF1F6] border border-[#F0D7E2] text-[#111D35] font-bold text-sm flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-[#C40054]">pin</span>
              <span>Join with 6-Digit Code</span>
            </button>
          </div>

          <div className="pt-2 text-xs text-[#576177] flex items-center gap-2">
            <span>✓ Up to 12 members per room</span>
            <span>•</span>
            <span>✓ Host chooses split rule</span>
            <span>•</span>
            <span>✓ Direct kitchen tariffs</span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Search, Veg Toggle, and Area Pills */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-[#576177] text-[20px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Sangeetha, Biryani, Mylapore..."
              className="w-full h-11 pl-10 pr-4 bg-white border border-[#F0D7E2] rounded-full text-xs sm:text-sm font-medium text-[#111D35] placeholder:text-[#576177] focus:outline-none focus:border-[#C40054] focus:ring-2 focus:ring-[#FFE3ED]"
            />
          </div>

          {/* Veg-Only Toggle */}
          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`h-11 px-4 rounded-full text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              vegOnly
                ? 'bg-[#E5F6ED] text-[#125F43] border-[#16845A]'
                : 'bg-white text-[#576177] border-[#F0D7E2] hover:border-[#C40054]'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded-xs border border-[#16845A] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#16845A]"></span>
            </span>
            <span>Pure Vegetarian Only</span>
          </button>
        </div>

        {/* Chennai Area Horizontal Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CHENNAI_AREAS.map((area) => (
            <button
              key={area}
              onClick={() => setSelectedArea(area)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                selectedArea === area
                  ? 'bg-[#C40054] text-white shadow-xs'
                  : 'bg-white text-[#576177] border border-[#F0D7E2] hover:text-[#111D35] hover:bg-[#FFF1F6]'
              }`}
            >
              {area}
            </button>
          ))}
        </div>
      </div>

      {/* Restaurant Cards Grid */}
      {loading ? (
        <div className="py-20 text-center text-sm text-[#576177]">Loading Chennai kitchens...</div>
      ) : filteredRestaurants.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-3xl border border-[#F0D7E2] p-8">
          <span className="material-symbols-outlined text-[36px] text-[#576177] mb-2">restaurant</span>
          <p className="text-sm font-bold text-[#111D35]">No restaurants found matching your filter</p>
          <p className="text-xs text-[#576177] mt-1">Try selecting "All Areas" or clear the search query.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRestaurants.map((restaurant) => (
            <div
              key={restaurant.id}
              className="bg-white rounded-2xl overflow-hidden border border-[#F0D7E2] shadow-[0_6px_18px_rgba(17,29,53,0.06)] hover:shadow-[0_10px_30px_rgba(17,29,53,0.1)] transition-all flex flex-col justify-between"
            >
              <div>
                {/* Photo Header */}
                <div className="relative h-44 w-full bg-[#FFF1F6] overflow-hidden">
                  <img
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-white/95 backdrop-blur-xs text-[#111D35] text-xs font-bold flex items-center gap-1 shadow-xs border border-[#F0D7E2]">
                      <span className="material-symbols-outlined text-[#FF922E] text-[14px]">star</span>
                      <span>{restaurant.rating}</span>
                      <span className="text-[#576177] font-normal text-[11px]">({restaurant.rating_count})</span>
                    </span>
                    {restaurant.is_pure_veg && (
                      <span className="px-2.5 py-1 rounded-full bg-[#E5F6ED] text-[#125F43] text-[10px] font-extrabold uppercase border border-[#16845A]/20">
                        Pure Veg
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-1 rounded-full bg-[#111D35]/85 backdrop-blur-xs text-white text-xs font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">timer</span>
                      <span>{restaurant.prep_time}</span>
                    </span>
                  </div>

                  <div className="absolute bottom-2 left-3 right-3">
                    <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#111D35]/80 backdrop-blur-xs text-white text-[11px] font-semibold">
                      {restaurant.area}
                    </span>
                  </div>
                </div>

                {/* Details */}
                <div className="p-4 flex flex-col gap-1.5">
                  <h3 className="font-extrabold text-base text-[#111D35] tracking-tight truncate">
                    {restaurant.name}
                  </h3>
                  <p className="text-xs text-[#576177] line-clamp-1">{restaurant.cuisine}</p>
                  <p className="text-[11px] text-[#576177]/80 line-clamp-1">{restaurant.address}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="p-4 pt-0 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleOpenMenu(restaurant)}
                  className="py-2.5 px-3 rounded-full bg-white hover:bg-[#FFF1F6] border border-[#F0D7E2] text-[#111D35] text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#C40054]">menu_book</span>
                  <span>View Menu</span>
                </button>

                <button
                  onClick={() => onStartGroupOrder(restaurant.id)}
                  className="py-2.5 px-3 rounded-full bg-[#C40054] hover:bg-[#A80047] active:scale-98 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">group_add</span>
                  <span>Start Group</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Menu Preview Modal */}
      {activeMenuRestaurant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-[#F0D7E2]">
            {/* Header */}
            <div className="p-5 border-b border-[#F0D7E2] flex items-center justify-between bg-[#FFF9FC]">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#C40054] bg-[#FFE3ED] px-2 py-0.5 rounded-full">
                  {activeMenuRestaurant.area} • Direct Kitchen Tariff
                </span>
                <h3 className="text-lg font-extrabold text-[#111D35] mt-1">{activeMenuRestaurant.name}</h3>
              </div>
              <button
                onClick={() => setActiveMenuRestaurant(null)}
                className="w-8 h-8 rounded-full bg-white border border-[#F0D7E2] text-[#111D35] flex items-center justify-center hover:bg-[#FFF1F6] transition-colors"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {/* Menu Items List */}
            <div className="flex-1 overflow-y-auto p-5 divide-y divide-[#F0D7E2]">
              {menuLoading ? (
                <div className="py-12 text-center text-xs text-[#576177]">Loading dishes...</div>
              ) : (
                activeMenuItems.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-start justify-between gap-3 first:pt-0 last:pb-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-3.5 h-3.5 rounded-xs border flex items-center justify-center shrink-0 ${
                            item.is_veg ? 'border-[#16845A]' : 'border-[#A32234]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.is_veg ? 'bg-[#16845A]' : 'bg-[#A32234]'
                            }`}
                          ></span>
                        </span>
                        <h4 className="text-sm font-bold text-[#111D35]">{item.name}</h4>
                      </div>
                      <p className="text-xs text-[#576177] mt-1 line-clamp-2">{item.description}</p>
                      <div className="mt-1 font-extrabold text-sm text-[#C40054] font-mono">₹{item.price}</div>
                    </div>

                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#F0D7E2]"
                      loading="lazy"
                    />
                  </div>
                ))
              )}
            </div>

            {/* Modal Bottom CTA */}
            <div className="p-4 bg-[#FFF9FC] border-t border-[#F0D7E2] flex items-center justify-between gap-3">
              <span className="text-xs text-[#576177] font-medium">Ready to order with your squad?</span>
              <button
                onClick={() => {
                  const rId = activeMenuRestaurant.id;
                  setActiveMenuRestaurant(null);
                  onStartGroupOrder(rId);
                }}
                className="py-2.5 px-6 rounded-full bg-[#C40054] hover:bg-[#A80047] font-bold text-xs text-white shadow-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span>Start Group Order</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
