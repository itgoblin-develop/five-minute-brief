import svgPaths from "./svg-6wj11uz8vu";

function Group1() {
  return (
    <div className="absolute inset-[5.93%_25.78%_5.91%_7.21%]" data-name="Group">
      <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 16.0834 21.1602">
        <g id="Group">
          <path d={svgPaths.p28c50330} fill="var(--fill-0, #3667FB)" id="Vector" />
          <path d={svgPaths.p1cdf9580} fill="var(--fill-0, #3667FB)" id="Vector_2" />
        </g>
      </svg>
    </div>
  );
}

function Group() {
  return (
    <div className="absolute contents inset-[5.93%_25.78%_5.91%_7.21%]" data-name="Group">
      <Group1 />
    </div>
  );
}

export default function Ico() {
  return (
    <div className="relative size-full" data-name="ico">
      <Group />
      <div className="absolute inset-[31.63%_5.46%_33.36%_77.04%]" data-name="Vector">
        <svg className="block size-full" fill="none" preserveAspectRatio="none" viewBox="0 0 4.20076 8.40152">
          <path d={svgPaths.p2d38cf00} fill="var(--fill-0, #3667FB)" id="Vector" />
        </svg>
      </div>
    </div>
  );
}