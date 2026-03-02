export default function ITDokkaebiLogo() {
  return (
    <div className="flex items-center gap-1.5 h-full">
      <img
        src="/favicon.png"
        alt="IT 도깨비"
        className="h-full aspect-square object-contain"
      />
      <span className="font-bold text-[#3D61F1] whitespace-nowrap leading-none"
            style={{ fontSize: 'clamp(14px, 1.1em, 20px)' }}>
        IT 도깨비
      </span>
    </div>
  );
}
