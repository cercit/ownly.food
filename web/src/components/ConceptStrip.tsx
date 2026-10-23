export const CONCEPT_TEXT = 'Concept prototype by Sameer Mittimani. Not an official Rapido product.';

export function ConceptStrip() {
  return (
    <div data-testid="concept-strip" className="w-full bg-[#111D35] text-white text-[11px] sm:text-xs py-2 px-4 text-center font-semibold select-none">
      {CONCEPT_TEXT}
    </div>
  );
}
