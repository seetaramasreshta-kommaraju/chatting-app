import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Send, Paperclip, Search, Phone, Video, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChatArea({ chatId, session }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatDetails, setChatDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchChatDetails();
    fetchMessages();

    const channel = supabase
      .channel(`chat_${chatId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `conversation_id=eq.${chatId}`
      }, payload => {
        setMessages(current => [...current, payload.new]);
        scrollToBottom();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const fetchChatDetails = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', chatId)
      .single();
    if (data) setChatDetails(data);
  };

  const fetchMessages = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('messages')
      .select('*, profiles(display_name, avatar_url)')
      .eq('conversation_id', chatId)
      .order('created_at', { ascending: true });
    
    if (data) {
      setMessages(data);
      scrollToBottom();
    }
    setLoading(false);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempMessage = newMessage;
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      conversation_id: chatId,
      sender_id: session.user.id,
      content: tempMessage,
      type: 'text'
    });
    
    if (error) {
      toast.error(error.message || 'Failed to send message');
      console.error(error);
      return;
    }
    
    await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', chatId);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-[#f4f6ff]/50">
        <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin"></div>
        <p className="mt-4 text-surface-500 font-medium animate-pulse">Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fafbfc] relative">
      
      {/* Decorative background for chat */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03] pointer-events-none"></div>

      {/* Header */}
      <div className="h-[72px] px-6 bg-white/80 backdrop-blur-md flex items-center justify-between border-b border-surface-200 z-10 sticky top-0 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-surface-200 to-surface-300 flex items-center justify-center text-surface-700 font-bold text-lg shadow-sm">
            {chatDetails?.name?.charAt(0) || 'C'}
          </div>
          <div>
            <h3 className="font-bold text-surface-900 text-lg tracking-tight leading-tight">{chatDetails?.name || 'Chat'}</h3>
            <p className="text-xs font-semibold text-brand-500">Active now</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-surface-500">
          <button className="p-2.5 hover:bg-surface-100 hover:text-brand-600 rounded-xl transition-all hidden sm:block"><Phone size={20} /></button>
          <button className="p-2.5 hover:bg-surface-100 hover:text-brand-600 rounded-xl transition-all hidden sm:block"><Video size={20} /></button>
          <div className="w-px h-6 bg-surface-200 mx-1 hidden sm:block"></div>
          <button className="p-2.5 hover:bg-surface-100 hover:text-brand-600 rounded-xl transition-all"><Search size={20} /></button>
          <button className="p-2.5 hover:bg-surface-100 hover:text-brand-600 rounded-xl transition-all"><Info size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 chat-scroll space-y-6 z-0">
        
        <div className="text-center my-6">
          <span className="bg-surface-200/50 text-surface-600 text-[11px] font-bold tracking-wider px-3 py-1 rounded-full uppercase">
            Today
          </span>
        </div>

        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === session.user.id;
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in group`}>
              <div className="flex flex-col max-w-[75%] sm:max-w-[60%]">
                <div 
                  className={`relative p-3.5 px-4 shadow-sm ${
                    isMine 
                      ? 'bg-gradient-to-br from-brand-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white text-surface-900 rounded-2xl rounded-tl-sm border border-surface-100'
                  }`}
                >
                  {!isMine && chatDetails?.type === 'group' && (
                    <p className="text-xs font-bold text-brand-600 mb-1">{msg.profiles?.display_name || 'Unknown'}</p>
                  )}
                  <p className="text-[15px] leading-relaxed">{msg.content}</p>
                </div>
                
                <div className={`text-[11px] font-semibold mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMine ? 'text-right text-surface-400' : 'text-left text-surface-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Composer */}
      <div className="p-4 bg-white border-t border-surface-200 z-10 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
        <form onSubmit={sendMessage} className="flex items-end gap-2 bg-surface-50 p-1.5 rounded-2xl border border-surface-200 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
          <button type="button" className="p-3 text-surface-400 hover:text-brand-500 rounded-xl hover:bg-white transition-colors shrink-0">
            <Paperclip size={22} strokeWidth={2} />
          </button>
          
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 py-3 px-2 text-[15px] text-surface-900 resize-none font-medium placeholder:text-surface-400"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
          />
          
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:bg-surface-300 disabled:text-surface-500 transition-all shrink-0 shadow-md shadow-brand-500/20 disabled:shadow-none mb-0.5 mr-0.5"
          >
            <Send size={20} className="ml-0.5" strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}
