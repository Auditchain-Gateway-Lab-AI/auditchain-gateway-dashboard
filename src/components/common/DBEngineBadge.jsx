import React from 'react';

function DBEngineBadge({ engine }) {
  const normalizeEngine = (e) => {
    if (!e) return 'unknown';
    const lower = e.toLowerCase().trim();
    if (lower.includes('postgresql') || lower.includes('postgres')) return 'postgres';
    if (lower.includes('mongodb') || lower.includes('mongo')) return 'mongodb';
    if (lower.includes('mysql') || lower.includes('mariadb')) return 'mysql';
    if (lower.includes('oracle')) return 'oracle';
    return 'unknown';
  };

  const normalized = normalizeEngine(engine);

  let iconSvg = null;
  let label = 'Unknown';
  let badgeClass = 'ac-db-engine-badge--unknown';

  if (normalized === 'postgres') {
    label = 'Postgres';
    badgeClass = 'ac-db-engine-badge--postgres';
    iconSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ac-db-engine-badge__icon">
        <path d="M4 12v-2a8 8 0 0 1 16 0v2"></path>
        <path d="M12 12v8a2 2 0 0 1-4 0v-4"></path>
        <path d="M8 12h8"></path>
      </svg>
    );
  } else if (normalized === 'mongodb') {
    label = 'MongoDB';
    badgeClass = 'ac-db-engine-badge--mongodb';
    iconSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ac-db-engine-badge__icon">
        <path d="M12 2c-2.8 3.1-4.2 6.1-4.2 9 0 4.2 2.8 7.8 4.2 9 1.4-1.2 4.2-4.8 4.2-9 0-2.9-1.4-5.9-4.2-9z"></path>
        <path d="M12 8v12"></path>
      </svg>
    );
  } else if (normalized === 'mysql') {
    label = 'MySQL';
    badgeClass = 'ac-db-engine-badge--mysql';
    iconSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ac-db-engine-badge__icon">
        <path d="M2 12s3-4 10-4 10 4 10 4"></path>
        <path d="M12 16s-2 4-10 4"></path>
        <path d="M12 16s2 4 10 4"></path>
      </svg>
    );
  } else if (normalized === 'oracle') {
    label = 'Oracle';
    badgeClass = 'ac-db-engine-badge--oracle';
    iconSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="ac-db-engine-badge__icon">
        <rect x="3" y="7" width="18" height="10" rx="5"></rect>
        <path d="M8 12h8"></path>
      </svg>
    );
  } else {
    iconSvg = (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ac-db-engine-badge__icon">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
      </svg>
    );
  }

  return (
    <div className={`ac-db-engine-badge ${badgeClass}`} title={engine || 'Unknown'}>
      {iconSvg}
      <span className="ac-db-engine-badge__label">{label}</span>
    </div>
  );
}

export { DBEngineBadge };
export default DBEngineBadge;
