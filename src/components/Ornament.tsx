export default function Ornament() {
  return (
    <div className="flex items-center justify-center gap-4 max-w-xs mx-auto my-6">
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
      <i className="not-italic text-gold text-xs tracking-[0.3em]">✦</i>
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
    </div>
  );
}