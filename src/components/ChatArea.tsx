import { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Send, Image as ImageIcon, Paperclip, Phone, Video, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function ChatArea({ session, chatId }: any) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setFetchError(null);
    setMessages([]);

    const q = query(
      collection(db, 'messages'),
      where('conversation_id', '==', chatId),
      orderBy('created_at', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoading(false);
      scrollToBottom();
    }, (error) => {
      console.error('Failed to fetch messages:', error);
      setFetchError(error.message);
      setLoading(false);
    });

    // Update conversation timestamp
    const convRef = doc(db, 'conversations', chatId);
    updateDoc(convRef, { updated_at: serverTimestamp() }).catch(console.error);

    return () => unsubscribe();
  }, [chatId]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const tempMessage = newMessage;
    setNewMessage('');

    try {
      await addDoc(collection(db, 'messages'), {
        conversation_id: chatId,
        sender_id: session.uid,
        content: tempMessage,
        type: 'text',
        created_at: serverTimestamp()
      });
      
      scrollToBottom();
    } catch (error: any) {
      toast.error(error.message || 'Failed to send message');
      console.error(error);
    }
  };

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-surface-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div></div>;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none z-0"></div>
      
      {/* Header */}
      <div className="h-[72px] px-6 border-b border-surface-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-brand-100 to-indigo-100 flex items-center justify-center text-brand-600 font-bold text-lg border-2 border-white shadow-sm">
             C
          </div>
          <div>
            <h3 className="font-bold text-surface-900 tracking-tight">Chat</h3>
            <p className="text-xs font-semibold text-brand-500">Active now</p>
          </div>
        </div>
        
        <div className="flex items-center gap-1.5 text-surface-500">
          <button className="p-2.5 hover:bg-surface-100 hover:text-brand-600 rounded-full transition-colors"><Phone size={20} /></button>
          <button className="p-2.5 hover:bg-surface-100 hover:text-brand-600 rounded-full transition-colors"><Video size={20} /></button>
          <div className="w-px h-6 bg-surface-200 mx-1"></div>
          <button className="p-2.5 hover:bg-surface-100 hover:text-brand-600 rounded-full transition-colors"><Info size={20} /></button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 chat-scroll space-y-6 z-0">
        
        {fetchError && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center font-medium text-sm border border-red-100 shadow-sm mx-4 my-2">
            Failed to load messages: {fetchError}
          </div>
        )}
        
        {messages.map((msg, idx) => {
          const isMine = msg.sender_id === session.uid;
          
          return (
            <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              <div className={`flex max-w-[70%] ${isMine ? 'flex-row-reverse' : 'flex-row'} items-end gap-2`}>
                {!isMine && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-surface-200 to-surface-300 flex items-center justify-center text-surface-600 font-bold text-xs shrink-0 shadow-sm mb-5">
                    U
                  </div>
                )}
                
                <div className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`relative p-3.5 px-4 shadow-sm ${
                      isMine 
                        ? 'bg-gradient-to-br from-brand-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-surface-900 rounded-2xl rounded-tl-sm border border-surface-100'
                    }`}
                  >
                    <p className="text-[15px] leading-relaxed break-words">{msg.content}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} className="h-4" />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-surface-100 z-10">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative flex items-end gap-2 bg-surface-50 border border-surface-200 p-2 rounded-2xl focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all shadow-sm">
          <button type="button" className="p-2.5 text-surface-400 hover:text-brand-500 hover:bg-brand-50 rounded-xl transition-colors shrink-0">
            <Paperclip size={20} />
          </button>
          
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(e);
              }
            }}
            placeholder="Type a message..."
            className="flex-1 max-h-32 min-h-[44px] bg-transparent border-0 focus:ring-0 resize-none py-2.5 px-2 text-[15px] text-surface-900 placeholder:text-surface-400"
            rows={1}
          />

          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="p-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 disabled:opacity-50 disabled:bg-surface-800 transition-all shrink-0 shadow-md shadow-brand-500/20"
          >
            <Send size={20} className={newMessage.trim() ? 'translate-x-0.5 -translate-y-0.5' : ''} />
          </button>
        </form>
      </div>
    </div>
  );
}
