import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { Bell, X, CheckCheck, Clock, ShoppingBag, Truck, Info, Sparkles } from 'lucide-react';

const FarmerNotificationsModal = ({ isOpen, onClose, onNotificationsRead }) => {
  const { t } = useTranslation();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      setNotifications(Array.isArray(res.data?.data) ? res.data.data : (Array.isArray(res.data) ? res.data : []));
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (onNotificationsRead) {
        onNotificationsRead();
      }
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'ORDER':
        return <ShoppingBag className="w-4 h-4 text-emerald-600" />;
      case 'LOGISTICS':
        return <Truck className="w-4 h-4 text-blue-600" />;
      case 'DEMAND':
        return <Sparkles className="w-4 h-4 text-amber-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  const filtered = notifications.filter(n => {
    if (filter === 'ALL') return true;
    if (filter === 'UNREAD') return !n.isRead;
    return n.type === filter;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[85vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07875B] flex items-center justify-center border border-emerald-200">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">{t('farmer.notificationsTitle', 'Platform Notifications')}</h3>
              <p className="text-xs text-slate-500">{t('farmer.notificationsSubtitle', 'Real-time alerts on allocations, orders, and market events')}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 text-xs">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {['ALL', 'UNREAD', 'ORDER', 'DEMAND', 'LOGISTICS'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                  filter === tab
                    ? 'bg-[#07875B] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab === 'ALL' ? t('common.all', 'ALL') : tab === 'UNREAD' ? t('farmer.unread', 'UNREAD') : tab}
              </button>
            ))}
          </div>

          <button
            onClick={handleMarkAllRead}
            className="text-xs font-bold text-[#07875B] hover:text-[#056b48] flex items-center gap-1 flex-shrink-0"
          >
            <CheckCheck className="w-4 h-4" /> {t('farmer.markAllRead', 'Mark all read')}
          </button>
        </div>

        {/* Notification list */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">{t('common.loading', 'Loading notifications...')}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">{t('farmer.noNotifications', 'No notifications in this category.')}</div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className={`p-3.5 rounded-2xl border transition-colors flex items-start gap-3 text-xs ${
                  item.isRead ? 'bg-slate-50/60 border-slate-100' : 'bg-emerald-50/40 border-emerald-200 shadow-sm'
                }`}
              >
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-xs">
                  {getIcon(item.type)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-900">{item.title}</h5>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">{item.message}</p>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};

export default FarmerNotificationsModal;
