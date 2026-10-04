function svgProps(size: number) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 16 16',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };
}

export function IconPlus() {
  return (
    <svg {...svgProps(14)}>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function IconPencil() {
  return (
    <svg {...svgProps(13)}>
      <path d="M11.3 2.7a1.5 1.5 0 0 1 2.1 2.1L6 12.2l-2.8.7.7-2.8z" />
    </svg>
  );
}

export function IconCopy() {
  return (
    <svg {...svgProps(13)}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M10.5 3.5v-1A1.5 1.5 0 0 0 9 1H3.5A1.5 1.5 0 0 0 2 2.5V8a1.5 1.5 0 0 0 1.5 1.5h1" />
    </svg>
  );
}

export function IconTrash() {
  return (
    <svg {...svgProps(13)}>
      <path d="M2.5 4h11M6 4V2.8A.8.8 0 0 1 6.8 2h2.4a.8.8 0 0 1 .8.8V4M4 4l.6 8.3a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9L12 4" />
    </svg>
  );
}

export function IconChevron() {
  return (
    <svg {...svgProps(12)}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  );
}

export function IconCaret() {
  return (
    <svg {...svgProps(10)}>
      <path d="M3.5 6 8 10.5 12.5 6" />
    </svg>
  );
}

export function IconSearch() {
  return (
    <svg {...svgProps(14)}>
      <circle cx="7" cy="7" r="4.5" />
      <path d="m10.5 10.5 3.5 3.5" />
    </svg>
  );
}

export function IconSun() {
  return (
    <svg {...svgProps(15)}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1" />
    </svg>
  );
}

export function IconMoon() {
  return (
    <svg {...svgProps(15)}>
      <path d="M13.5 9.7A5.7 5.7 0 0 1 6.3 2.5a5.7 5.7 0 1 0 7.2 7.2z" />
    </svg>
  );
}

export function IconMenu() {
  return (
    <svg {...svgProps(15)}>
      <path d="M2.5 4h11M2.5 8h11M2.5 12h11" />
    </svg>
  );
}

export function IconUpload() {
  return (
    <svg {...svgProps(14)}>
      <path d="M8 10.5v-8M5 5.5 8 2.5l3 3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

export function IconDownload() {
  return (
    <svg {...svgProps(14)}>
      <path d="M8 2.5v8M5 7.5l3 3 3-3M2.5 10.5v2a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2" />
    </svg>
  );
}

export function IconX() {
  return (
    <svg {...svgProps(13)}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}
