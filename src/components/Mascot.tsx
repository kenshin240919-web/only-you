// 사이트 캐릭터: 사주 이루리라의 말 캐릭터에 선글라스·마이크를 더한 가수. 이름은 따로 붙이지 않는다.
// live를 켜면 몸을 살짝 흔들고 음표가 떠오른다(동작 줄이기 설정이면 멈춘다).
export default function Mascot({ size = 200, live = false, className = "" }: { size?: number; live?: boolean; className?: string }) {
  return (
    <svg
      className={`mascot ${live ? "mascot-live" : ""} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 240 240"
      role="img"
      aria-label="선글라스를 끼고 마이크로 노래하는 말 캐릭터"
    >
      <g className="mascot-body" transform="translate(20 22)">
        <path d="M70 58 60 14c-1-6 6-9 10-4l22 34Z" fill="#F1C089" />
        <path d="M130 58l10-44c1-6-6-9-10-4l-22 34Z" fill="#F1C089" />
        <path d="M70 50 65 24l14 18Z M130 50l5-26-14 18Z" fill="#F7B9A8" />
        <path d="M100 36c38 0 52 30 50 64-2 24-10 38-12 50H62c-2-12-10-26-12-50-2-34 12-64 50-64Z" fill="#F1C089" />
        <path d="M60 120c-14-20-14-56 4-74 10-10 22-12 30-10-14 6-26 24-30 46-2 14-2 26-4 38Z" fill="#7A4A2A" opacity=".9" />
        <path d="M86 40c4-12 20-16 28-6 8-6 20 0 16 10-8-2-12 4-12 12-6-6-14-6-18 2-2-8-8-12-14-12 0-2 0-4 0-6Z" fill="#7A4A2A" />
        <ellipse cx="100" cy="156" rx="46" ry="34" fill="#FCE3C8" />
        <ellipse cx="82" cy="146" rx="5" ry="7" fill="#C98C68" transform="rotate(-12 82 146)" />
        <ellipse cx="118" cy="146" rx="5" ry="7" fill="#C98C68" transform="rotate(12 118 146)" />
        <ellipse className="mascot-mouth" cx="98" cy="170" rx="13" ry="12" fill="#6B2E25" />
        <path d="M89 176q9-6 18 0q-3 6-9 6t-9-6Z" fill="#F08A8A" />
        <ellipse cx="62" cy="124" rx="9" ry="6" fill="#FF9EA8" opacity=".55" />
        <ellipse cx="138" cy="124" rx="9" ry="6" fill="#FF9EA8" opacity=".55" />
        <path d="M52 92h96" stroke="#2B1D14" strokeWidth="5" strokeLinecap="round" />
        <rect x="54" y="84" width="40" height="28" rx="12" fill="#2B1D14" />
        <rect x="106" y="84" width="40" height="28" rx="12" fill="#2B1D14" />
        <path d="M94 92q6-5 12 0" stroke="#2B1D14" strokeWidth="5" fill="none" />
        <path d="M62 90h10M60 96h6M114 90h10M112 96h6" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".75" />
        <path d="M160 196 138 172" stroke="#3B3B46" strokeWidth="9" strokeLinecap="round" />
        <circle cx="132" cy="165" r="12" fill="#8E95A3" stroke="#5E6472" strokeWidth="2" />
        <path d="M124 161h16M122 166h20M124 171h16M128 155v20M132 153v24M136 155v20" stroke="#5E6472" strokeWidth="1.3" />
        <ellipse cx="160" cy="194" rx="14" ry="11" fill="#F1C089" />
        <path d="M152 188v6M158 186v7M164 187v6" stroke="#C99A62" strokeWidth="2" strokeLinecap="round" />
      </g>
      <g fill="#FF8A73">
        <path className="mascot-note n1" d="M196 40v26a7 7 0 1 1-4-6.3V36l18-5v22a7 7 0 1 1-4-6.3V40Z" />
        <path className="mascot-note n2" d="M30 70v18a6 6 0 1 1-3.5-5.4V66l3.5-1Z" opacity=".8" />
        <path className="mascot-note n3" d="M206 120v16a5.5 5.5 0 1 1-3-4.9V117l3-1Z" opacity=".7" />
      </g>
    </svg>
  );
}
