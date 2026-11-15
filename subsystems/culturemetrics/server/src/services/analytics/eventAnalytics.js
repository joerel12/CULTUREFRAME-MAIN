'use strict';

const { fetchEvents } = require('./dataProvider');

async function getEventMetrics(params = {}) {
  const { events, _dataMode } = await fetchEvents(params);

  const totalRegistrations = events.reduce((s, e) => s + (e.totalRegistrations || 0), 0);
  const totalCancelled = events.reduce((s, e) => s + (e.cancelledRegistrations || 0), 0);
  const confirmedAttendance = events.reduce((s, e) => s + (e.confirmedAttendance || 0), 0);
  const hasAttendanceData = events.some((e) => e.confirmedAttendance !== null);

  const byEvent = [...events]
    .sort((a, b) => (b.totalRegistrations || 0) - (a.totalRegistrations || 0))
    .map((e) => ({
      eventId: e.id,
      name: e.name,
      startDate: e.startDate,
      status: e.status,
      totalRegistrations: e.totalRegistrations,
      cancelledRegistrations: e.cancelledRegistrations,
      confirmedAttendance: e.confirmedAttendance,
      attendanceNote: e.confirmedAttendance === null
        ? 'Attendance data not available from CultureFrame'
        : null,
    }));

  const upcoming = events.filter((e) => e.status === 'upcoming');

  return {
    _dataMode,
    totalEvents: events.length,
    upcomingEvents: upcoming.length,
    totalRegistrations,
    totalCancelledRegistrations: totalCancelled,
    confirmedAttendance: hasAttendanceData ? confirmedAttendance : null,
    hasAttendanceData,
    attendanceNote: hasAttendanceData
      ? null
      : 'CultureFrame does not currently provide check-in or attendance data. Registration counts are displayed instead.',
    byEvent,
    upcomingSummary: upcoming.map((e) => ({
      name: e.name,
      startDate: e.startDate,
      totalRegistrations: e.totalRegistrations,
    })),
  };
}

module.exports = { getEventMetrics };
