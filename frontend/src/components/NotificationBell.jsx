/**
 * SasyaVahini — Real-Time Notification Bell & Drawer
 *
 * Fetches notifications, displays unread badge, allows marking as read,
 * and alerts farmers to 30-minute buyer produce requests.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, Clock, ExternalLink, ShieldAlert, CheckCircle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function NotificationBell({ className = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get('/notifications');
      if (Array.isArray(data?.data)) {
        setNotifications(data.data);
      } else if (Array.isArray(data)) {
        setNotifications(data);
      }
    } catch (_err) {
      // Ignore background notification fetch errors
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (_err) {
      // Ignore error
    }
  };

  const handleMarkAllRead = async () => {
    setLoading(true);
    try {
      await api.put('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (_err) {
      // Ignore error
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.proposalId || notif.type === 'PROPOSAL_CREATED' || notif.type === 'ORDER_UPDATE') {
      navigate('/farmer/dashboard');
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'PROPOSAL_CREATED':
        return <Clock className="w-4 h-4 text-amber-500" />;
      case 'PROPOSAL_ACCEPTED':
      case 'ORDER_CONFIRMED':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'PROPOSAL_EXPIRED':
        return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      default:
        return <Package className="w-4 h-4 text-sky-500" />;
    }
  };

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return '';
    const diffMs = Date.now() - new Date(timestamp).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('notifications.justNow', 'Just now');
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        aria-label={t('notifications.title', 'Notifications')}
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black text-white bg-rose-500 rounded-full border-2 border-white animate-pulse shadow-sm">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Flyout */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50/80 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                {t('notifications.title', 'Notifications')}
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-emerald-100 text-emerald-800">
                  {unreadCount} {t('notifications.new', 'new')}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={loading}
                className="text-[11px] font-semibold text-emerald-700 hover:underline flex items-center gap-1"
              >
                <CheckCheck size={13} />
                <span>{t('notifications.markAllRead', 'Mark all as read')}</span>
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                {t('notifications.noNotifications', 'No notifications at this time.')}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3.5 flex gap-3 items-start transition-colors cursor-pointer hover:bg-slate-50 ${
                    !n.isRead ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-white border border-slate-200 shadow-xs shrink-0">
                    {getIconForType(n.type)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs ${!n.isRead ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2">
                      {n.message || n.body}
                    </p>
                    {n.type === 'PROPOSAL_CREATED' && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 mt-1">
                        <Clock size={10} />
                        <span>30-min window active</span>
                      </span>
                    )}
                  </div>
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={(e) => handleMarkAsRead(n.id, e)}
                      title={t('notifications.markRead', 'Mark as read')}
                      className="text-slate-300 hover:text-emerald-600 p-1"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 block" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
