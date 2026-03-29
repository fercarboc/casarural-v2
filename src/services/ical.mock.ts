export const MOCK_FEEDS = [
  { id: '1', name: 'Booking.com', url: 'https://ical.booking.com/v1/export?t=...', lastSync: '2026-03-19T10:00:00Z', status: 'OK' },
  { id: '2', name: 'Airbnb', url: 'https://www.airbnb.com/calendar/ical/...', lastSync: '2026-03-19T09:45:00Z', status: 'OK' },
  { id: '3', name: 'Vrbo', url: 'https://www.vrbo.com/ical/...', lastSync: '2026-03-18T22:00:00Z', status: 'ERROR' },
];

export const icalMockService = {
  getFeeds: async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(MOCK_FEEDS), 500);
    });
  },
  syncFeeds: async () => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 2000);
    });
  }
};
