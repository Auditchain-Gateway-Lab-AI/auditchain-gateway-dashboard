import React from 'react';
import Icon from '../common/Icon';
import { formatTimestamp } from '../../utils/formatters';

const MOCK_WEB_USERS = [
  {
    id: 'web-u-001',
    name: 'dr. Andika Pratama',
    username: 'andika.pratama',
    role: 'Dokter',
    department: 'Poliklinik Umum',
    status: 'online',
    sessionId: 'SIMRS-WEB-94A1',
    ipAddress: '10.18.2.14',
    device: 'Chrome on Windows',
    lastLoginAt: '2026-08-11T08:12:44.000+07:00',
    lastActivityAt: '2026-08-11T13:42:18.000+07:00',
    activityCount: 42
  },
  {
    id: 'web-u-002',
    name: 'Siti Rahmawati',
    username: 'siti.rahmawati',
    role: 'Petugas RM',
    department: 'Rekam Medis',
    status: 'online',
    sessionId: 'SIMRS-WEB-73B2',
    ipAddress: '10.18.4.22',
    device: 'Edge on Windows',
    lastLoginAt: '2026-08-11T09:03:11.000+07:00',
    lastActivityAt: '2026-08-11T13:39:50.000+07:00',
    activityCount: 31
  },
  {
    id: 'web-u-003',
    name: 'Nadia Putri',
    username: 'nadia.putri',
    role: 'Perawat',
    department: 'Rawat Jalan',
    status: 'online',
    sessionId: 'SIMRS-WEB-28D5',
    ipAddress: '10.18.6.31',
    device: 'Chrome on Android',
    lastLoginAt: '2026-08-11T10:22:03.000+07:00',
    lastActivityAt: '2026-08-11T13:33:09.000+07:00',
    activityCount: 24
  },
  {
    id: 'web-u-004',
    name: 'Budi Santoso',
    username: 'budi.santoso',
    role: 'Kasir',
    department: 'Administrasi',
    status: 'idle',
    sessionId: 'SIMRS-WEB-51C8',
    ipAddress: '10.18.3.17',
    device: 'Firefox on Windows',
    lastLoginAt: '2026-08-11T07:55:28.000+07:00',
    lastActivityAt: '2026-08-11T12:18:41.000+07:00',
    activityCount: 19
  },
  {
    id: 'web-u-005',
    name: 'Hendra Wijaya',
    username: 'hendra.wijaya',
    role: 'Admin SIMRS',
    department: 'IT Support',
    status: 'review',
    sessionId: 'SIMRS-WEB-67F9',
    ipAddress: '10.18.1.9',
    device: 'Chrome on Windows',
    lastLoginAt: '2026-08-11T11:14:39.000+07:00',
    lastActivityAt: '2026-08-11T13:20:12.000+07:00',
    activityCount: 13
  },
  {
    id: 'web-u-006',
    name: 'Maya Lestari',
    username: 'maya.lestari',
    role: 'Farmasi',
    department: 'Instalasi Farmasi',
    status: 'offline',
    sessionId: 'SIMRS-WEB-12K4',
    ipAddress: '10.18.5.25',
    device: 'Safari on iPad',
    lastLoginAt: '2026-08-11T06:44:10.000+07:00',
    lastActivityAt: '2026-08-11T09:58:16.000+07:00',
    activityCount: 8
  }
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Status' },
  { value: 'online', label: 'Online' },
  { value: 'idle', label: 'Idle' },
  { value: 'review', label: 'Review' },
  { value: 'offline', label: 'Offline' }
];

const getInitials = (name = '') => (
  String(name || 'U')
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .slice(0, 2)
    .toUpperCase()
);

const getStatusLabel = (status = '') => {
  const labels = {
    online: 'Online',
    idle: 'Idle',
    review: 'Review',
    offline: 'Offline'
  };
  return labels[status] || 'Detected';
};

function WebUsersView() {
  const [query, setQuery] = React.useState('');
  const [status, setStatus] = React.useState('ALL');

  const filteredUsers = React.useMemo(() => {
    const normalized = query.trim().toLowerCase();

    return MOCK_WEB_USERS.filter(user => {
      const matchStatus = status === 'ALL' || user.status === status;
      const matchQuery = !normalized || [
        user.name,
        user.username,
        user.role,
        user.department,
        user.sessionId,
        user.ipAddress,
        user.device
      ].some(value => String(value).toLowerCase().includes(normalized));

      return matchStatus && matchQuery;
    });
  }, [query, status]);

  const onlineCount = MOCK_WEB_USERS.filter(user => user.status === 'online').length;
  const reviewCount = MOCK_WEB_USERS.filter(user => user.status === 'review').length;
  const activeSessions = MOCK_WEB_USERS.filter(user => user.status !== 'offline').length;
  const totalActivity = MOCK_WEB_USERS.reduce((total, user) => total + user.activityCount, 0);

  return (
    <>
      <section className="ac-hero">
        <div className="ac-hero__pattern" />
        <div className="ac-hero__content">
          <div className="ac-hero__left">
            <span className="ac-page-kicker">Client Web Monitoring</span>
            <h1 className="ac-hero__title">Web Users</h1>
            <p className="ac-hero__subtitle">
              Monitor user sessions that sign in and operate inside the client web system.
            </p>
          </div>
        </div>
      </section>

      <section className="ac-web-users-metrics">
        <div className="ac-stat-card">
          <div className="ac-stat-card__icon ac-stat-card__icon--teal">
            <Icon name="user" size={25} />
          </div>
          <div>
            <div className="ac-stat-card__label">Online Users</div>
            <div className="ac-stat-card__value">{onlineCount}</div>
            <div className="ac-stat-card__sub ac-stat-card__sub--teal">Active right now</div>
          </div>
          <span className="ac-stat-card__meter ac-stat-card__meter--teal">Live</span>
        </div>
        <div className="ac-stat-card">
          <div className="ac-stat-card__icon ac-stat-card__icon--blue">
            <Icon name="lock" size={25} />
          </div>
          <div>
            <div className="ac-stat-card__label">Active Sessions</div>
            <div className="ac-stat-card__value">{activeSessions}</div>
            <div className="ac-stat-card__sub ac-stat-card__sub--blue">Signed-in sessions</div>
          </div>
          <span className="ac-stat-card__meter ac-stat-card__meter--blue">Session</span>
        </div>
        <div className="ac-stat-card">
          <div className="ac-stat-card__icon ac-stat-card__icon--amber">
            <Icon name="activity" size={25} />
          </div>
          <div>
            <div className="ac-stat-card__label">Web Activities</div>
            <div className="ac-stat-card__value">{totalActivity}</div>
            <div className="ac-stat-card__sub ac-stat-card__sub--amber">{reviewCount} session needs review</div>
          </div>
          <span className="ac-stat-card__meter ac-stat-card__meter--amber">Dummy</span>
        </div>
      </section>

      <section className="ac-card ac-web-users-card">
        <div className="ac-card__header ac-web-users-card__header">
          <div className="ac-card__header-left">
            <span className="ac-card__icon ac-card__icon--soft">
              <Icon name="user" size={18} />
            </span>
            <div>
              <span className="ac-card__title">Client Web User Sessions</span>
              <div className="ac-card__subtitle">Dummy data, ready to bind with backend session detection.</div>
            </div>
          </div>

          <div className="ac-web-users-toolbar">
            <div className="ac-search">
              <span className="ac-search__icon">
                <Icon name="search" size={15} />
              </span>
              <input
                type="text"
                className="ac-search__input"
                placeholder="Search user, role, session, IP..."
                value={query}
                onChange={event => setQuery(event.target.value)}
              />
            </div>
            <select
              className="ac-select ac-web-users-select"
              value={status}
              onChange={event => setStatus(event.target.value)}
            >
              {STATUS_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ac-detected-users-panel ac-web-users-strip">
          <div className="ac-detected-users-panel__header">
            <div className="ac-detected-users-panel__title">
              <span className="ac-card__icon ac-card__icon--soft">
                <Icon name="eye" size={17} />
              </span>
              <div>
                <strong>Currently Detected</strong>
                <span>Top active users from web sessions</span>
              </div>
            </div>
            <div className="ac-detected-users-panel__metrics">
              <span><strong>{filteredUsers.length}</strong>Shown</span>
              <span><strong>{onlineCount}</strong>Online</span>
              <span><strong>{reviewCount}</strong>Review</span>
            </div>
          </div>

          <div className="ac-detected-users-list">
            {filteredUsers.slice(0, 5).map(user => (
              <button
                type="button"
                key={user.id}
                className="ac-detected-user-card"
                onClick={() => setQuery(user.username)}
                title={`Focus ${user.name}`}
              >
                <span className={`ac-detected-user-avatar ac-detected-user-avatar--${user.status}`}>
                  {getInitials(user.name)}
                </span>
                <span className="ac-detected-user-card__body">
                  <strong>{user.name}</strong>
                  <small>{user.role} | {user.department}</small>
                  <span className="ac-detected-user-card__meta">{user.sessionId} | {user.ipAddress}</span>
                </span>
                <span className={`ac-detected-user-status ac-detected-user-status--${user.status}`}>
                  {getStatusLabel(user.status)}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="ac-table-wrap">
          <table className="ac-table ac-web-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Status</th>
                <th>Role</th>
                <th>Session</th>
                <th>IP / Device</th>
                <th>Last Login</th>
                <th>Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className="ac-empty">
                      <div className="ac-empty__icon">
                        <Icon name="inbox" size={30} />
                      </div>
                      <span style={{ fontWeight: '600', color: 'var(--color-on-surface)' }}>
                        No web users match the selected filter.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id}>
                    <td>
                      <div className="ac-detected-user-cell">
                        <span className={`ac-detected-user-avatar ac-detected-user-avatar--${user.status}`}>
                          {getInitials(user.name)}
                        </span>
                        <span className="ac-detected-user-cell__copy">
                          <strong>{user.name}</strong>
                          <small>@{user.username}</small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`ac-detected-user-status ac-detected-user-status--${user.status}`}>
                        {getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td>
                      <div className="ac-web-users-role">
                        <strong>{user.role}</strong>
                        <small>{user.department}</small>
                      </div>
                    </td>
                    <td className="ac-table__mono">{user.sessionId}</td>
                    <td>
                      <div className="ac-web-users-device">
                        <strong>{user.ipAddress}</strong>
                        <small>{user.device}</small>
                      </div>
                    </td>
                    <td className="ac-table__time">{formatTimestamp(user.lastLoginAt)}</td>
                    <td className="ac-table__time">{formatTimestamp(user.lastActivityAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const MemoizedWebUsersView = React.memo(WebUsersView);

export { WebUsersView };
export default MemoizedWebUsersView;
