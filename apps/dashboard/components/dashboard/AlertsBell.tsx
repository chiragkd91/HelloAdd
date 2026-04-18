export function AlertsBell() {
  return (
    <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-warm-light text-small font-bold text-plum">
      🔔
      <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-bold leading-none text-white">
        3
      </span>
    </span>
  );
}
