import { ICONS, type IconKey } from './iconMap';

export type SidebarItem = {
  key: IconKey;
  label: string;
  href: string;
};

export const SIDEBAR: SidebarItem[] = [
  { key: 'phone',      label: 'Calls',       href: '/calls' },
  { key: 'msgs',       label: 'Messages',    href: '/messages' },
  { key: 'calendar',   label: 'Calendar',    href: '/calendar' },
  { key: 'phonebook',  label: 'Contacts',    href: '/contacts' },
  { key: 'gallery',    label: 'Media',       href: '/media' },
  { key: 'settings',   label: 'Settings',    href: '/settings' },
];

export { ICONS };
