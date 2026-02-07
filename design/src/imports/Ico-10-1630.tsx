import svgPaths from "./svg-trud96tylt";

function A1() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[22.231px] left-[calc(50%+0.45px)] top-[calc(50%+0.12px)] w-[20.8px]" data-name="a">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 20.8 22.2308">
        <g clipPath="url(#clip0_10_1638)" id="a">
          <path d={svgPaths.p39e7bf40} fill="var(--fill-0, #3667FB)" id="Vector" />
          <path d={svgPaths.p18117400} fill="var(--fill-0, #D5E2FF)" id="Vector_2" />
        </g>
        <defs>
          <clipPath id="clip0_10_1638">
            <rect fill="white" height="22.2308" width="20.8" />
          </clipPath>
        </defs>
      </svg>
    </div>
  );
}

function A() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute h-[23.4px] left-[calc(50%-0.05px)] overflow-clip top-1/2 w-[23.825px]" data-name="a">
      <A1 />
    </div>
  );
}

export default function Ico() {
  return (
    <div className="relative size-full" data-name="ico">
      <A />
    </div>
  );
}