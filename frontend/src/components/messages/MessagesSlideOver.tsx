import React, { useState, useEffect } from 'react';
import { fetchMessages, sendMessage, searchUsersForMessaging, markMessageAsRead } from '@/services/api';
import type { Message, UserProfile } from '@/services/api';
import { X, Send, UserSearch, Search, CheckCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function MessagesSlideOver({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'compose'>('inbox');
  
  // Compose state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messageContent, setMessageContent] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    }
  }, [isOpen]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.length >= 1) {
        searchUsersForMessaging(searchQuery).then(setSearchResults).catch(console.error);
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const loadMessages = async () => {
    setLoading(true);
    try {
      const data = await fetchMessages();
      setMessages(data);
      // Mark received unread messages as read
      for (const msg of data) {
        if (!msg.is_read && msg.receiver_id === user?.id) {
          await markMessageAsRead(msg.id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (otherUser: UserProfile) => {
    setSelectedUser(otherUser);
    setMessageContent('');
    setActiveTab('compose');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !messageContent.trim()) return;
    
    setSending(true);
    try {
      await sendMessage(selectedUser.id, messageContent);
      setMessageContent('');
      setSelectedUser(null);
      setSearchQuery('');
      setActiveTab('inbox');
      await loadMessages();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Slide-over panel */}
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Messages</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex border-b border-slate-200">
          <button 
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'inbox' ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('inbox')}
          >
            Inbox
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-bold ${activeTab === 'compose' ? 'border-b-2 border-blue-600 text-blue-700 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
            onClick={() => setActiveTab('compose')}
          >
            Compose
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {activeTab === 'inbox' ? (
            <div className="p-4 space-y-4">
              {loading ? (
                <div className="text-center text-sm text-slate-500 mt-10">Loading messages...</div>
              ) : messages.length === 0 ? (
                <div className="text-center text-sm text-slate-500 mt-10 flex flex-col items-center">
                  <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                    <UserSearch className="w-5 h-5 text-slate-400" />
                  </div>
                  No messages yet.
                </div>
              ) : (
                messages.map(msg => {
                  const isReceived = msg.receiver_id === user?.id;
                  const otherUser = isReceived ? msg.sender : msg.receiver;
                  return (
                    <div key={msg.id} className={`p-4 rounded-xl shadow-sm border ${isReceived ? 'bg-white border-blue-100' : 'bg-slate-50 border-slate-200'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            {isReceived ? 'From' : 'To'}:
                          </span>
                          <span className="ml-1 text-sm font-bold text-slate-800">{otherUser?.full_name || 'Unknown'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                      
                      {!isReceived && (
                        <div className="mt-2 flex justify-end">
                          {msg.is_read ? (
                            <span className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><CheckCheck className="w-3 h-3" /> Read</span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">Delivered</span>
                          )}
                        </div>
                      )}
                      {isReceived && otherUser && (
                        <div className="mt-2 flex justify-end">
                          <button 
                            onClick={() => handleReply(otherUser)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          ) : (
            <div className="p-4 flex flex-col h-full">
              {!selectedUser ? (
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Search name or email..." 
                      className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 shadow-sm"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    {searchResults.map(u => (
                      <div key={u.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm flex justify-between items-center hover:border-blue-300 cursor-pointer" onClick={() => setSelectedUser(u)}>
                        <div>
                          <p className="font-bold text-sm text-slate-800">{u.full_name}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                        <span className="text-[10px] px-2 py-1 bg-slate-100 rounded-md font-bold text-slate-600 uppercase">{u.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSend} className="flex flex-col h-full">
                  <div className="mb-4 flex items-center justify-between p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <div className="text-sm">
                      <span className="text-slate-500">To: </span>
                      <span className="font-bold text-slate-800">{selectedUser.full_name}</span>
                    </div>
                    <button type="button" onClick={() => setSelectedUser(null)} className="text-xs font-bold text-blue-600 hover:underline">Change</button>
                  </div>
                  
                  <textarea 
                    className="flex-1 border border-slate-300 rounded-xl p-3 text-sm outline-none focus:border-blue-500 resize-none shadow-sm mb-4"
                    placeholder="Write your message here..."
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    required
                  />
                  
                  <button type="submit" disabled={sending} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50">
                    <Send className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
