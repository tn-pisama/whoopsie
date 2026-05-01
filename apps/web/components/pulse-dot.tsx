export function PulseDot({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative inline-flex h-2.5 w-2.5 ${className}`}
      aria-hidden="true"
    >
      <span className="absolute inline-flex h-full w-full animate-[whoopsie-ping_1.6s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-coral opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-coral" />
      <style>{`
        @keyframes whoopsie-ping {
          0%   { transform: scale(1);   opacity: 0.75; }
          75%  { transform: scale(2.6); opacity: 0;    }
          100% { transform: scale(2.6); opacity: 0;    }
        }
      `}</style>
    </span>
  );
}
