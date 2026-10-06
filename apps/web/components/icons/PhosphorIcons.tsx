import * as React from 'react';

export interface PhosphorIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  color?: string;
  className?: string;
}

function BasePhosphorIcon({
  size = 16,
  weight = 'regular',
  color = 'currentColor',
  className = '',
  children,
  ...props
}: PhosphorIconProps & { children: React.ReactNode }) {
  const strokeWidth = weight === 'bold' ? 24 : weight === 'light' ? 12 : 16;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill={weight === 'fill' ? color : 'none'}
      stroke={weight === 'fill' ? 'none' : color}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      className={`shrink-0 inline-block align-middle ${className}`}
      {...props}
    >
      {children}
    </svg>
  );
}

export function MagnifyingGlass(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="112" cy="112" r="80" />
      <line x1="168.5" y1="168.5" x2="224" y2="224" />
    </BasePhosphorIcon>
  );
}

export function CaretDown(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="208 96 128 176 48 96" />
    </BasePhosphorIcon>
  );
}

export function CaretUp(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="48 160 128 80 208 160" />
    </BasePhosphorIcon>
  );
}

export function CaretRight(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="96 48 176 128 96 208" />
    </BasePhosphorIcon>
  );
}

export function ArrowRight(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="40" y1="128" x2="216" y2="128" />
      <polyline points="144 56 216 128 144 200" />
    </BasePhosphorIcon>
  );
}

export function ArrowLeft(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="216" y1="128" x2="40" y2="128" />
      <polyline points="112 56 40 128 112 200" />
    </BasePhosphorIcon>
  );
}

export function Check(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="216 72 104 184 48 128" />
    </BasePhosphorIcon>
  );
}

export function X(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="200" y1="56" x2="56" y2="200" />
      <line x1="200" y1="200" x2="56" y2="56" />
    </BasePhosphorIcon>
  );
}

export function Plus(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="40" y1="128" x2="216" y2="128" />
      <line x1="128" y1="40" x2="128" y2="216" />
    </BasePhosphorIcon>
  );
}

export function Buildings(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="32" y="48" width="112" height="168" />
      <path d="M144,88h80V216H144" />
      <line x1="68" y1="84" x2="76" y2="84" />
      <line x1="100" y1="84" x2="108" y2="84" />
      <line x1="68" y1="120" x2="76" y2="120" />
      <line x1="100" y1="120" x2="108" y2="120" />
      <line x1="68" y1="156" x2="76" y2="156" />
      <line x1="100" y1="156" x2="108" y2="156" />
      <line x1="180" y1="120" x2="188" y2="120" />
      <line x1="180" y1="156" x2="188" y2="156" />
    </BasePhosphorIcon>
  );
}

export function House(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M216,116V208a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V116L128,40Z" />
      <polyline points="152 216 152 152 104 152 104 216" />
    </BasePhosphorIcon>
  );
}

export function ChartLineUp(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="224 80 144 160 96 112 32 176" />
      <polyline points="168 80 224 80 224 136" />
    </BasePhosphorIcon>
  );
}

export function CurrencyDollar(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="128" y1="24" x2="128" y2="232" />
      <path d="M184,88a40,40,0,0,0-40-40H112a40,40,0,0,0,0,80h32a40,40,0,0,1,0,80H96a40,40,0,0,1-40-40" />
    </BasePhosphorIcon>
  );
}

export function FileText(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M200,224H56a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h96l56,56V216A8,8,0,0,1,200,224Z" />
      <polyline points="152 32 152 88 208 88" />
      <line x1="96" y1="136" x2="160" y2="136" />
      <line x1="96" y1="168" x2="160" y2="168" />
    </BasePhosphorIcon>
  );
}

export function Folder(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M216,208H40a8,8,0,0,1-8-8V64a8,8,0,0,1,8-8H93.3a8,8,0,0,1,5.7,2.3L128,88h88a8,8,0,0,1,8,8V200A8,8,0,0,1,216,208Z" />
    </BasePhosphorIcon>
  );
}

export function Gear(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="128" r="40" />
      <path d="M128,24V48m0,160v24M24,128H48m160,0h24m-33.9-74.1L181,70.9M75,177.1,57.9,194.1M198.1,194.1,181,177.1M75,70.9,57.9,53.9" />
    </BasePhosphorIcon>
  );
}

export function User(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="96" r="48" />
      <path d="M32,216a96,96,0,0,1,192,0" />
    </BasePhosphorIcon>
  );
}

export function Users(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="96" cy="96" r="40" />
      <path d="M24,208a72,72,0,0,1,144,0" />
      <circle cx="176" cy="80" r="32" />
      <path d="M168,144a64,64,0,0,1,64,64" />
    </BasePhosphorIcon>
  );
}

export function Funnel(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polygon points="216 40 40 40 104 128 104 208 152 184 152 128 216 40" />
    </BasePhosphorIcon>
  );
}

export function Bell(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M200,168H56a8,8,0,0,1-6.9-12L64,128V96a64,64,0,0,1,128,0v32l14.9,28A8,8,0,0,1,200,168Z" />
      <path d="M104,168a24,24,0,0,0,48,0" />
    </BasePhosphorIcon>
  );
}

export function Sliders(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="40" y1="64" x2="216" y2="64" />
      <line x1="40" y1="128" x2="216" y2="128" />
      <line x1="40" y1="192" x2="216" y2="192" />
      <circle cx="88" cy="64" r="16" />
      <circle cx="168" cy="128" r="16" />
      <circle cx="104" cy="192" r="16" />
    </BasePhosphorIcon>
  );
}

export function Handshake(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M128,144l40-40a24,24,0,0,0-33.9-33.9L104,100" />
      <path d="M88,104,58.1,74.1a24,24,0,0,0-33.9,33.9L64,148" />
      <path d="M96,168l32,32a24,24,0,0,0,33.9-33.9L128,132" />
      <path d="M152,120l39.9,39.9a24,24,0,0,0,33.9-33.9L192,92" />
    </BasePhosphorIcon>
  );
}

export function Calendar(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="40" y="40" width="176" height="176" rx="8" />
      <line x1="176" y1="24" x2="176" y2="56" />
      <line x1="80" y1="24" x2="80" y2="56" />
      <line x1="40" y1="88" x2="216" y2="88" />
    </BasePhosphorIcon>
  );
}

export function Sparkle(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M128,24l24,72,72,24-72,24-24,72-24-72L32,120l72-24Z" />
    </BasePhosphorIcon>
  );
}

export function ChatCircle(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M128,24A104,104,0,0,0,24,128c0,21.5,6.5,41.5,17.7,58.2L32,224l40.4-9.3A103.5,103.5,0,0,0,128,232a104,104,0,0,0,0-208Z" />
    </BasePhosphorIcon>
  );
}

export function WarningCircle(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="128" r="96" />
      <line x1="128" y1="80" x2="128" y2="136" />
      <circle cx="128" cy="168" r="10" fill="currentColor" />
    </BasePhosphorIcon>
  );
}

export function ArrowSquareOut(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="216 104 216 40 152 40" />
      <line x1="128" y1="128" x2="216" y2="40" />
      <path d="M184,136v64a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V80a8,8,0,0,1,8-8h64" />
    </BasePhosphorIcon>
  );
}

export function MapPin(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="104" r="32" />
      <path d="M208,104c0,72-80,128-80,128S48,176,48,104a80,80,0,0,1,160,0Z" />
    </BasePhosphorIcon>
  );
}

export function Lock(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="40" y="88" width="176" height="128" rx="8" />
      <path d="M92,88V52a36,36,0,0,1,72,0V88" />
      <circle cx="128" cy="152" r="12" />
    </BasePhosphorIcon>
  );
}

export function DownloadSimple(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M56,224H200" />
      <polyline points="80 136 128 184 176 136" />
      <line x1="128" y1="40" x2="128" y2="184" />
    </BasePhosphorIcon>
  );
}

export function Table(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="32" y="48" width="192" height="160" rx="8" />
      <line x1="32" y1="104" x2="224" y2="104" />
      <line x1="32" y1="160" x2="224" y2="160" />
      <line x1="96" y1="48" x2="96" y2="208" />
    </BasePhosphorIcon>
  );
}

export function Storefront(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M224,96l-16-64H48L32,96V208a8,8,0,0,0,8,8H216a8,8,0,0,0,8-8Z" />
      <line x1="32" y1="96" x2="224" y2="96" />
      <path d="M160,216V144H96v72" />
    </BasePhosphorIcon>
  );
}

export function ShieldCheck(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M208,40H48A16,16,0,0,0,32,56v56c0,70.5,58.8,111.4,92.5,126.3a8,8,0,0,0,7,0C165.2,223.4,224,182.5,224,112V56A16,16,0,0,0,208,40Z" />
      <polyline points="88 128 116 156 168 104" />
    </BasePhosphorIcon>
  );
}

export function List(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="40" y1="128" x2="216" y2="128" />
      <line x1="40" y1="64" x2="216" y2="64" />
      <line x1="40" y1="192" x2="216" y2="192" />
    </BasePhosphorIcon>
  );
}

export function SignOut(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="174 86 216 128 174 170" />
      <line x1="104" y1="128" x2="216" y2="128" />
      <path d="M104,216H48a8,8,0,0,1-8-8V48a8,8,0,0,1,8-8h56" />
    </BasePhosphorIcon>
  );
}

export function SquaresFour(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="48" y="48" width="64" height="64" />
      <rect x="144" y="48" width="64" height="64" />
      <rect x="48" y="144" width="64" height="64" />
      <rect x="144" y="144" width="64" height="64" />
    </BasePhosphorIcon>
  );
}

export function Robot(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="40" y="72" width="176" height="128" rx="8" />
      <line x1="128" y1="24" x2="128" y2="72" />
      <circle cx="128" cy="24" r="8" />
      <circle cx="88" cy="120" r="12" />
      <circle cx="168" cy="120" r="12" />
      <line x1="88" y1="160" x2="168" y2="160" />
    </BasePhosphorIcon>
  );
}

export function PaperPlaneRight(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polygon points="224 128 32 32 64 128 32 224 224 128" />
      <line x1="64" y1="128" x2="224" y2="128" />
    </BasePhosphorIcon>
  );
}

export function PhoneCall(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M152,80a40,40,0,0,1,40,40" />
      <path d="M152,48a72,72,0,0,1,72,72" />
      <path d="M92.5,124.9a121.2,121.2,0,0,0,38.6,38.6l19.1-19.1a16.1,16.1,0,0,1,16.3-3.9,89.5,89.5,0,0,0,28,4.4,16,16,0,0,1,16,16V196a16,16,0,0,1-16,16A168,168,0,0,1,28,44,16,16,0,0,1,44,28H79.1a16,16,0,0,1,16,16,89.5,89.5,0,0,0,4.4,28,16.1,16.1,0,0,1-3.9,16.3Z" />
    </BasePhosphorIcon>
  );
}

export function EnvelopeSimple(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M32,56H224a8,8,0,0,1,8,8V192a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V64A8,8,0,0,1,32,56Z" />
      <polyline points="224 56 128 144 32 56" />
    </BasePhosphorIcon>
  );
}

export function Calculator(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="40" y="32" width="176" height="192" rx="8" />
      <rect x="64" y="56" width="128" height="40" />
      <circle cx="80" cy="136" r="8" />
      <circle cx="128" cy="136" r="8" />
      <circle cx="176" cy="136" r="8" />
      <circle cx="80" cy="184" r="8" />
      <circle cx="128" cy="184" r="8" />
      <circle cx="176" cy="184" r="8" />
    </BasePhosphorIcon>
  );
}

export function ArrowsClockwise(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="176 80 224 80 224 32" />
      <path d="M208,128A80,80,0,1,1,184.6,71.4L224,80" />
    </BasePhosphorIcon>
  );
}

export function TreeStructure(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="96" y="32" width="64" height="48" rx="8" />
      <rect x="32" y="160" width="56" height="48" rx="8" />
      <rect x="100" y="160" width="56" height="48" rx="8" />
      <rect x="168" y="160" width="56" height="48" rx="8" />
      <line x1="128" y1="80" x2="128" y2="128" />
      <line x1="60" y1="128" x2="196" y2="128" />
      <line x1="60" y1="128" x2="60" y2="160" />
      <line x1="128" y1="128" x2="128" y2="160" />
      <line x1="196" y1="128" x2="196" y2="160" />
    </BasePhosphorIcon>
  );
}

export function CaretLeft(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="160 208 80 128 160 48" />
    </BasePhosphorIcon>
  );
}

export function CheckCircle(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="128" r="96" />
      <polyline points="172 104 113.3 160 84 132" />
    </BasePhosphorIcon>
  );
}

export function Clock(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="128" r="96" />
      <polyline points="128 72 128 128 168 128" />
    </BasePhosphorIcon>
  );
}

export function ListChecks(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="128" y1="128" x2="216" y2="128" />
      <line x1="128" y1="64" x2="216" y2="64" />
      <line x1="128" y1="192" x2="216" y2="192" />
      <polyline points="40 64 56 80 88 48" />
      <polyline points="40 128 56 144 88 112" />
      <polyline points="40 192 56 208 88 176" />
    </BasePhosphorIcon>
  );
}

export function UserPlus(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="104" cy="96" r="40" />
      <path d="M32,208a72,72,0,0,1,144,0" />
      <line x1="200" y1="120" x2="248" y2="120" />
      <line x1="224" y1="96" x2="224" y2="144" />
    </BasePhosphorIcon>
  );
}

export function CreditCard(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="24" y="56" width="208" height="144" rx="8" />
      <line x1="24" y1="96" x2="232" y2="96" />
      <line x1="168" y1="160" x2="200" y2="160" />
    </BasePhosphorIcon>
  );
}

export function Tag(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M42.34,142.34l72,72a16,16,0,0,0,22.63,0l96-96A16,16,0,0,0,237.66,107l-48-48A16,16,0,0,0,178.34,54.34l-96,96A16,16,0,0,0,77.66,173l48,48" />
      <circle cx="180" cy="76" r="12" />
    </BasePhosphorIcon>
  );
}

export function ChartBar(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="224" y1="208" x2="32" y2="208" />
      <polyline points="200 208 200 64 152 64 152 208" />
      <polyline points="104 208 104 112 56 112 56 208" />
    </BasePhosphorIcon>
  );
}

export function PencilSimple(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M92.7,216H48a8,8,0,0,1-8-8V163.3a7.9,7.9,0,0,1,2.3-5.6l120-120a8,8,0,0,1,11.4,0l44.6,44.7a8,8,0,0,1,0,11.3l-120,120A8.4,8.4,0,0,1,92.7,216Z" />
      <line x1="136" y1="64" x2="192" y2="120" />
    </BasePhosphorIcon>
  );
}

export function CircleNotch(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M168,40a96,96,0,1,1-80,0" />
    </BasePhosphorIcon>
  );
}

export function Info(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="128" r="96" />
      <line x1="128" y1="120" x2="128" y2="168" />
      <circle cx="128" cy="88" r="10" fill="currentColor" />
    </BasePhosphorIcon>
  );
}

export function RocketLaunch(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M128,40A104,104,0,0,1,216,128c0,24-16,40-32,48l-16-16-24,24-16-16L80,216c-8,16-24,32-48,32A104,104,0,0,1,128,40Z" />
      <circle cx="140" cy="116" r="16" />
      <path d="M80,176l-48,48" />
    </BasePhosphorIcon>
  );
}

export function Scales(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="128" y1="40" x2="128" y2="216" />
      <line x1="88" y1="216" x2="168" y2="216" />
      <line x1="40" y1="80" x2="216" y2="80" />
      <polygon points="16 152 64 152 40 80 16 152" />
      <polygon points="192 152 240 152 216 80 192 152" />
    </BasePhosphorIcon>
  );
}

export function Receipt(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M40,216l24-16,24,16,24-16,24,16,24-16,24,16,24-16,24,16V40H40Z" />
      <line x1="80" y1="88" x2="176" y2="88" />
      <line x1="80" y1="128" x2="176" y2="128" />
      <line x1="80" y1="168" x2="144" y2="168" />
    </BasePhosphorIcon>
  );
}

export function Key(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="92" cy="164" r="52" />
      <path d="M128.8,127.2,216,40h32v32H224V96H200v24l-36,36" />
      <circle cx="92" cy="164" r="16" />
    </BasePhosphorIcon>
  );
}

export function Bank(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polygon points="128 32 24 88 232 88 128 32" />
      <line x1="40" y1="216" x2="216" y2="216" />
      <line x1="56" y1="88" x2="56" y2="216" />
      <line x1="104" y1="88" x2="104" y2="216" />
      <line x1="152" y1="88" x2="152" y2="216" />
      <line x1="200" y1="88" x2="200" y2="216" />
    </BasePhosphorIcon>
  );
}

export function Coin(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <circle cx="128" cy="128" r="96" />
      <path d="M128,80v96" />
      <path d="M148,104a20,20,0,0,0-20-20H116a20,20,0,0,0,0,40h24a20,20,0,0,1,0,40H108a20,20,0,0,1-20-20" />
    </BasePhosphorIcon>
  );
}

export function ChartPieSlice(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M128,128,206.6,50.7A104,104,0,1,0,128,232V128Z" />
      <path d="M144,112h88A96,96,0,0,0,144,24V112Z" />
    </BasePhosphorIcon>
  );
}

export function CalendarCheck(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="40" y="40" width="176" height="176" rx="8" />
      <line x1="176" y1="24" x2="176" y2="56" />
      <line x1="80" y1="24" x2="80" y2="56" />
      <line x1="40" y1="88" x2="216" y2="88" />
      <polyline points="96 152 120 176 160 136" />
    </BasePhosphorIcon>
  );
}

export function FileLock(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M152,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16h72" />
      <polyline points="152 32 152 88 208 88" />
      <path d="M208,88v48" />
      <rect x="144" y="168" width="80" height="56" rx="4" />
      <path d="M164,168V152a20,20,0,0,1,40,0v16" />
    </BasePhosphorIcon>
  );
}

export function FolderSimplePlus(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M216,72H130.7L104,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V88A16,16,0,0,0,216,72Z" />
      <line x1="128" y1="120" x2="128" y2="168" />
      <line x1="104" y1="144" x2="152" y2="144" />
    </BasePhosphorIcon>
  );
}

export function Vault(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="32" y="40" width="192" height="176" rx="8" />
      <circle cx="128" cy="128" r="40" />
      <line x1="128" y1="88" x2="128" y2="96" />
      <line x1="128" y1="160" x2="128" y2="168" />
      <line x1="88" y1="128" x2="96" y2="128" />
      <line x1="160" y1="128" x2="168" y2="128" />
    </BasePhosphorIcon>
  );
}

export function ArrowsLeftRight(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <polyline points="80 112 40 80 80 48" />
      <line x1="40" y1="80" x2="216" y2="80" />
      <polyline points="176 144 216 176 176 208" />
      <line x1="216" y1="176" x2="40" y2="176" />
    </BasePhosphorIcon>
  );
}

export function SlidersHorizontal(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="40" y1="88" x2="80" y2="88" />
      <line x1="112" y1="88" x2="216" y2="88" />
      <circle cx="96" cy="88" r="16" />
      <line x1="40" y1="168" x2="144" y2="168" />
      <line x1="176" y1="168" x2="216" y2="168" />
      <circle cx="160" cy="168" r="16" />
    </BasePhosphorIcon>
  );
}

export function Building(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <rect x="40" y="32" width="176" height="192" rx="4" />
      <line x1="24" y1="224" x2="232" y2="224" />
      <rect x="80" y="64" width="32" height="32" />
      <rect x="144" y="64" width="32" height="32" />
      <rect x="80" y="128" width="32" height="32" />
      <rect x="144" y="128" width="32" height="32" />
    </BasePhosphorIcon>
  );
}

export function FileCheck(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <path d="M200,224H56a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h96l56,56V216A8,8,0,0,1,200,224Z" />
      <polyline points="152 32 152 88 208 88" />
      <polyline points="88 152 112 176 160 128" />
    </BasePhosphorIcon>
  );
}

export function Trash(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="216" y1="56" x2="40" y2="56" />
      <line x1="104" y1="104" x2="104" y2="168" />
      <line x1="152" y1="104" x2="152" y2="168" />
      <path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56" />
      <path d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56" />
    </BasePhosphorIcon>
  );
}

export function TrashSimple(props: PhosphorIconProps) {
  return (
    <BasePhosphorIcon {...props}>
      <line x1="216" y1="56" x2="40" y2="56" />
      <path d="M200,56V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V56" />
      <path d="M168,56V40a16,16,0,0,0-16-16H104A16,16,0,0,0,88,40V56" />
    </BasePhosphorIcon>
  );
}


