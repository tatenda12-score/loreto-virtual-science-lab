import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { fetchUnreadMessageCount } from '@/services/api';
import MessagesSlideOver from './MessagesSlideOver';

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadCount();
    // Poll every 30 seconds
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadCount = async () => {
    try {
      const count = await fetchUnreadMessageCount();
      setUnreadCount(count);
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setUnreadCount(0); // Optimistic clear
  };

  return (
    <>
      <button 
        onClick={handleOpen}
        className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors bg-white border border-slate-200 shadow-sm"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center text-[9px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <MessagesSlideOver isOpen={isOpen} onClose={() => { setIsOpen(false); loadCount(); }} />
    </>
  );
}
