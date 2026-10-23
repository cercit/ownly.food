import React from 'react';

export const ConceptStrip: React.FC = () => {
  return (
    <div className="w-full bg-[#111D35] text-[#FFFFFF] text-[11px] sm:text-xs py-2 px-4 text-center font-semibold tracking-wider flex items-center justify-center gap-2 select-none border-b border-white/10 shadow-xs">
      <span className="w-2 h-2 rounded-full bg-[#F50062] animate-pulse"></span>
      <span className="uppercase text-[10px] sm:text-[11px] font-bold">
        Concept Prototype by Sameer Mittimani · Ownly-Inspired · Not an official Rapido product
      </span>
    </div>
  );
};
