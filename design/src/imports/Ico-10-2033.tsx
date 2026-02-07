import svgPaths from "./svg-gwscefxovg";

function A() {
  return (
    <div className="absolute h-[17.556px] left-[3.6px] top-[3.18px] w-[16.79px]" data-name="a">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.79 17.5563">
        <g clipPath="url(#clip0_10_2037)" id="a">
          <path d={svgPaths.pd3ea5f0} fill="var(--fill-0, #D5E2FF)" id="Vector" />
          <g id="Group">
            <path d={svgPaths.p2a71e70} fill="var(--fill-0, #3667FB)" id="Vector_2" />
            <path d={svgPaths.p25de7380} fill="var(--fill-0, #3667FB)" id="Vector_3" />
            <path d={svgPaths.p29e0b300} fill="var(--fill-0, #3667FB)" id="Vector_4" />
          </g>
        </g>
        <defs>
          <clipPath id="clip0_10_2037">
            <rect fill="white" height="17.5563" width="16.79" />
          </clipPath>
        </defs>
      </svg>
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