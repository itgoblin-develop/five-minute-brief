import svgPaths from "./svg-lf2juik4z4";

function Group1() {
  return (
    <div className="absolute inset-[14.26%_30.19%_14.24%_15.46%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 13.0427 17.1606">
        <g id="Group">
          <path d={svgPaths.p2bd7bb00} fill="var(--fill-0, #3667FB)" id="Vector" />
          <path d={svgPaths.p3763da00} fill="var(--fill-0, #3667FB)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents inset-[14.26%_30.19%_14.24%_15.46%]" data-name="Group">
      <Group1 />
    </div>
  );
}

export default function Ico() {
  return (
    <div className="relative size-full" data-name="ico">
      <Group />
      <div className="absolute inset-[35.11%_13.71%_36.5%_72.1%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 3.40674 6.81349">
          <path d={svgPaths.p3c018000} fill="var(--fill-0, #3667FB)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}