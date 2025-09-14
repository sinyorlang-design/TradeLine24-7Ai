/**
 * Canonical icon URL map (served from /public).
 * Keep this list minimal: only the icons we actually render.
 */
export const ICONS = {
  // Brand
  logo:       '/assets/brand/OFFICIAL_LOGO.svg',
  background: '/assets/brand/BACKGROUND_IMAGE1.svg',

  // Sidebar / dashboard tiles currently in use
  phone:      '/assets/brand/phone.png',       // Calls
  msgs:       '/assets/brand/msgs.png',        // Messages
  calendar:   '/assets/brand/calendar.png',    // Calendar
  phonebook:  '/assets/brand/phonebook.png',   // Contacts
  gallery:    '/assets/brand/gallery.png',     // Media
  settings:   '/assets/brand/settings.png',    // Settings
} as const;

export type IconKey = keyof typeof ICONS;
