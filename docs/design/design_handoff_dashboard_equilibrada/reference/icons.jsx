// Lightweight stroke icons — geometric, minimal
const Icon = ({ children, size = 18, stroke = 1.6, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth={stroke}
       strokeLinecap="round" strokeLinejoin="round" {...rest}>
    {children}
  </svg>
);

const IconGrid = (p) => <Icon {...p}><rect x="3" y="3" width="7" height="7" rx="1.2"/><rect x="14" y="3" width="7" height="7" rx="1.2"/><rect x="3" y="14" width="7" height="7" rx="1.2"/><rect x="14" y="14" width="7" height="7" rx="1.2"/></Icon>;
const IconBuilding = (p) => <Icon {...p}><rect x="4" y="3" width="16" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M10 21v-3h4v3"/></Icon>;
const IconUsers = (p) => <Icon {...p}><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.4 2.7-6 6-6s6 2.6 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M21 19c0-2.5-1.7-4.5-4-4.9"/></Icon>;
const IconTicket = (p) => <Icon {...p}><path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4z"/><path d="M9 7v10" strokeDasharray="2 2"/></Icon>;
const IconModule = (p) => <Icon {...p}><rect x="3" y="3" width="8" height="8" rx="1.2"/><rect x="13" y="3" width="8" height="8" rx="1.2"/><rect x="3" y="13" width="8" height="8" rx="1.2"/><rect x="13" y="13" width="8" height="8" rx="1.2"/></Icon>;
const IconSubmodule = (p) => <Icon {...p}><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></Icon>;
const IconKey = (p) => <Icon {...p}><circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l3 3"/></Icon>;
const IconShield = (p) => <Icon {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6z"/></Icon>;
const IconShieldCheck = (p) => <Icon {...p}><path d="M12 3l8 3v6c0 4.5-3.4 8.4-8 9-4.6-.6-8-4.5-8-9V6z"/><path d="M9 12l2.2 2.2L15 10.5"/></Icon>;
const IconLogout = (p) => <Icon {...p}><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l-5-5 5-5M5 12h11"/></Icon>;
const IconSearch = (p) => <Icon {...p}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></Icon>;
const IconBell = (p) => <Icon {...p}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2H4.5z"/><path d="M10 21h4"/></Icon>;
const IconArrow = (p) => <Icon {...p}><path d="M5 12h14M13 6l6 6-6 6"/></Icon>;
const IconArrowUp = (p) => <Icon {...p}><path d="M7 17L17 7M9 7h8v8"/></Icon>;
const IconPlus = (p) => <Icon {...p}><path d="M12 5v14M5 12h14"/></Icon>;
const IconChevron = (p) => <Icon {...p}><path d="M9 6l6 6-6 6"/></Icon>;
const IconDot = (p) => <Icon {...p}><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none"/></Icon>;
const IconPaw = (p) => <Icon {...p}><circle cx="6" cy="9" r="1.8"/><circle cx="10" cy="6" r="1.8"/><circle cx="14" cy="6" r="1.8"/><circle cx="18" cy="9" r="1.8"/><path d="M8 16c0-2.5 1.8-4.5 4-4.5s4 2 4 4.5c0 2-1.8 3.5-4 3.5s-4-1.5-4-3.5z"/></Icon>;
const IconActivity = (p) => <Icon {...p}><path d="M3 12h4l3-8 4 16 3-8h4"/></Icon>;
const IconClock = (p) => <Icon {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Icon>;
const IconSparkle = (p) => <Icon {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></Icon>;

Object.assign(window, {
  Icon, IconGrid, IconBuilding, IconUsers, IconTicket, IconModule,
  IconSubmodule, IconKey, IconShield, IconShieldCheck, IconLogout,
  IconSearch, IconBell, IconArrow, IconArrowUp, IconPlus, IconChevron,
  IconDot, IconPaw, IconActivity, IconClock, IconSparkle
});
