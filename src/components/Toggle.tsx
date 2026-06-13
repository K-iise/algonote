"use client";

interface Props {
  on: boolean;
  onChange: (v: boolean) => void;
  label: string;
}

/** 라벨이 달린 on/off 토글 스위치 */
export default function Toggle({ on, onChange, label }: Props) {
  return (
    <div
      className={`toggle ${on ? "on" : ""}`}
      role="switch"
      aria-checked={on}
      tabIndex={0}
      onClick={() => onChange(!on)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onChange(!on);
        }
      }}
    >
      <span className="track">
        <span className="knob" />
      </span>
      <span>{label}</span>
    </div>
  );
}
