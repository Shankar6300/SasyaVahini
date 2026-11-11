import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Package, Truck, CreditCard, ShieldCheck, X } from 'lucide-react';

const INITIAL_NOTIFICATIONS = [
  {
    id: 'notif_1',
    type: 'REQUEST',
    title: 'New Farmer Pickup Request',
    message: 'Farmer Ramesh Kulkarni requested 1,500 kg Tomato aggregation at Manchar Hub (Destination: Hadapsar APMC). Estimated Freight: ₹2,840.',
    time: '10 min ago',
    unread: true,
  },
  {
    id: 'notif_2',
    type: 'TRIP',
    title: 'Trip In Transit & On Schedule',
    message: 'Shipment SV-SHP-2026-0001 passed Chakan Corridor. Current cold-chain temp 13.8°C (Optimal). ETA to Hadapsar: 42 min.',
    time: '35 min ago',
    unread: true,
  },
  {
    id: 'notif_3',
    type: 'PAYMENT',
    title: 'Freight Payout Credited',
    message: '₹2,840 freight settlement for Completed Trip SV-SHP-2026-0000 credited to your verified bank account (UTR-20261110-884920).',
    time: '2 hours ago',
    unread: true,
  },
  {
    id: 'notif_4',
    type: 'COMPLIANCE',
    title: 'DoCA Statutory Verification Passed',
    message: 'Vehicle MH-14-AZ-7434 and RC/Commercial Insurance verified by DoCA Compliance Officer. RTO status active.',
    time: 'Yesterday',
    unread: false,
  },
];

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS);
  const [filter, setFilter] = useState('ALL');
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter((n) => n.unread).length;

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const markItemRead = (id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)));
  };

  const removeItem = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const filtered = filter === 'ALL'
    ? notifications
    : notifications.filter((n) => n.type === filter);

  const getIcon = (type) => {
    switch (type) {
      case 'REQUEST':
        return <Package size={16} className="text-emerald-600" />;
      case 'TRIP':
        return <Truck size={16} className="text-purple-600" />;
      case 'PAYMENT':
        return <CreditCard size={16} className="text-blue-600" />;
      case 'COMPLIANCE':
        return <ShieldCheck size={16} className="text-teal-600" />;
      default:
        return <Bell size={16} className="text-gray-600" />;
    }
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none"
        aria-label="Notifications"
        title="View requests and updates"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-[9999] overflow-hidden">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={17} className="text-emerald-400" />
              <h3 className="text-sm font-bold">Requests & Alerts</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-emerald-300 hover:text-emerald-100 font-semibold"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 bg-slate-50 border-b border-slate-200 text-xs overflow-x-auto">
            {['ALL', 'REQUEST', 'TRIP', 'PAYMENT'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  filter === tab
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'REQUEST' ? '🌾 Requests' : tab === 'TRIP' ? '🚚 Trips' : '💳 Payments'}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">
                No notifications in this category.
              </div>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => markItemRead(item.id)}
                  className={`p-3 text-xs transition cursor-pointer flex items-start gap-2.5 ${
                    item.unread ? 'bg-emerald-50/40 hover:bg-emerald-50/70' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="p-1.5 rounded-lg bg-slate-100 shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`font-bold truncate ${item.unread ? 'text-slate-900' : 'text-slate-700'}`}>
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">{item.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item.id);
                    }}
                    className="text-slate-300 hover:text-slate-500 p-1 shrink-0"
                    title="Dismiss"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

