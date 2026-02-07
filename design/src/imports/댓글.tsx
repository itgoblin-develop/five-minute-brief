import svgPaths from "./svg-20qogzvp8d";

function Frame1() {
  return (
    <div className="relative size-[19.556px]" data-name="Frame">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 19.5556 19.5556">
        <g id="Frame">
          <path d={svgPaths.p827da00} fill="var(--fill-0, white)" id="Vector" />
        </g>
      </svg>
    </div>
  );
}

function BtnDefault() {
  return (
    <div className="bg-[#101010] content-stretch flex items-center justify-center overflow-clip px-[12.8px] relative rounded-[640px] shrink-0 size-[32px]" data-name="btn/default">
      <div className="flex items-center justify-center relative shrink-0 size-[19.556px]" style={{ "--transform-inner-width": "1200", "--transform-inner-height": "21.59375" } as React.CSSProperties}>
        <div className="flex-none rotate-90">
          <Frame1 />
        </div>
      </div>
    </div>
  );
}

function Frame() {
  return (
    <div className="bg-[#f8f8f8] h-[44px] relative rounded-[1000px] shrink-0 w-[351px]" data-name="Frame">
      <div className="content-stretch flex items-center justify-between overflow-clip pl-[16px] pr-[8px] py-[12px] relative rounded-[inherit] size-full">
        <p className="font-['Noto_Sans_KR:Regular',sans-serif] leading-[1.5] not-italic relative shrink-0 text-[#bbb] text-[14px]">새 댓글 입력</p>
        <BtnDefault />
      </div>
      <div aria-hidden="true" className="absolute border border-[#f3f3f3] border-solid inset-0 pointer-events-none rounded-[1000px]" />
    </div>
  );
}

function Frame2() {
  return (
    <div className="content-stretch flex flex-col gap-[8px] items-start justify-center relative shrink-0 w-full">
      <p className="font-['Noto_Sans_KR:Medium',sans-serif] font-['Noto_Sans_KR:SemiBold',sans-serif] leading-[0] not-italic relative shrink-0 text-[#222] text-[0px] text-[13px]">
        <span className="leading-[1.5]">{`댓글 `}</span>
        <span className="leading-[1.5] text-[#5e5e5e]">0</span>
      </p>
      <Frame />
    </div>
  );
}

export default function Component() {
  return (
    <div className="bg-white content-stretch flex flex-col items-start px-[12px] py-[16px] relative size-full" data-name="댓글">
      <Frame2 />
    </div>
  );
}