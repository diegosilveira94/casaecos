// Line icons on a 24px grid, drawn with the text color (`currentColor`).

interface IconProps {
  children: React.ReactNode;
}

function Icon({ children }: IconProps): React.JSX.Element {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

export const CalendarIcon = (): React.JSX.Element => (
  <Icon>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 10h17M8 3v4M16 3v4" />
  </Icon>
);

export const PillIcon = (): React.JSX.Element => (
  <Icon>
    <rect x="2.6" y="8.2" width="18.8" height="7.6" rx="3.8" transform="rotate(-45 12 12)" />
    <path d="m8.6 8.6 6.8 6.8" />
  </Icon>
);

export const ChartIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 20h16M6.5 20V11M11 20V5M15.5 20v-6M20 20V9" />
  </Icon>
);

export const DollarIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M12 3v18M16.5 7.5c-.6-1.4-2.3-2.3-4.5-2.3-2.6 0-4.3 1.3-4.3 3.1 0 4.4 9 2.3 9 6.9 0 1.9-1.9 3.4-4.7 3.4-2.4 0-4.2-1-4.8-2.6" />
  </Icon>
);

export const GearIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 2.8v2.4M12 18.8v2.4M4.6 4.6l1.7 1.7M17.7 17.7l1.7 1.7M2.8 12h2.4M18.8 12h2.4M4.6 19.4l1.7-1.7M17.7 6.3l1.7-1.7" />
  </Icon>
);

export const HelpIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.3a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
  </Icon>
);

export const BuildingIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 21V4.5h10V21M14 9h6v12M2.5 21h19M7 8h1M10 8h1M7 11.5h1M10 11.5h1M7 15h1M10 15h1M17 12.5h.5M17 16h.5" />
  </Icon>
);

export const MenuIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 6.5h16M4 12h16M4 17.5h16" />
  </Icon>
);

export const BellIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15L6 16.5ZM10 20.5a2.2 2.2 0 0 0 4 0" />
  </Icon>
);

export const ChevronDownIcon = (): React.JSX.Element => (
  <Icon>
    <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
  </Icon>
);

export const ChevronLeftIcon = (): React.JSX.Element => (
  <Icon>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
);

export const ChevronRightIcon = (): React.JSX.Element => (
  <Icon>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);

export const FilterIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M4 5h16l-6.2 7.4V19l-3.6-1.8v-4.8L4 5Z" />
  </Icon>
);

export const UploadIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M4.5 14v4.5a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5V14" />
  </Icon>
);

export const PlusIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const ClockIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </Icon>
);

export const UserIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </Icon>
);

// Event types (event-tone.ts): one pictogram per tone.

export const StethoscopeIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M6 3.5v5a4 4 0 0 0 8 0v-5M6 3.5H4.5M14 3.5h1.5M10 12.5v2a4.5 4.5 0 0 0 9 0v-2" />
    <circle cx="19" cy="10.5" r="2" />
  </Icon>
);

export const SchoolBusIcon = (): React.JSX.Element => (
  <Icon>
    <rect x="4.5" y="3.5" width="15" height="14" rx="2.5" />
    <path d="M4.5 10.5h15M8 17.5V20M16 17.5V20M8 14h.01M16 14h.01" />
  </Icon>
);

export const BrainIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M12 5.5v13M12 5.5A3 3 0 0 0 6.6 4a3 3 0 0 0-2.5 4.2A3.2 3.2 0 0 0 5 14a3 3 0 0 0 3 4.5 3 3 0 0 0 4 0M12 5.5A3 3 0 0 1 17.4 4a3 3 0 0 1 2.5 4.2A3.2 3.2 0 0 1 19 14a3 3 0 0 1-3 4.5 3 3 0 0 1-4 0" />
  </Icon>
);

export const PeopleIcon = (): React.JSX.Element => (
  <Icon>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0M15.5 5.3a3 3 0 0 1 0 5.4M17 14a5.5 5.5 0 0 1 3.5 5" />
  </Icon>
);

export const ChatIcon = (): React.JSX.Element => (
  <Icon>
    <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 16h-8l-4.5 3.5V16H5a1.5 1.5 0 0 1-1.5-1.5v-8A1.5 1.5 0 0 1 5 5Z" />
  </Icon>
);
