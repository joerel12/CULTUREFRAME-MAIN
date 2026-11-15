import React from 'react';
import { FlaskConical, Wifi, Database } from 'lucide-react';

export default function DataModeBadge({ mode }) {
  if (mode === 'mock') {
    return (
      <span className="badge-mock">
        <FlaskConical size={11} />
        DEMO DATA
      </span>
    );
  }
  if (mode === 'live') {
    return (
      <span className="badge-live">
        <Wifi size={11} />
        LIVE
      </span>
    );
  }
  if (mode === 'snapshot') {
    return (
      <span className="badge-snapshot">
        <Database size={11} />
        SNAPSHOT
      </span>
    );
  }
  return null;
}
