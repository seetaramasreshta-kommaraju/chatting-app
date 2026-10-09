import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, LogOut, Users, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Sidebar({ session, currentUser, activeChat, setActiveChat }: any) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    fetchConversations();
    
    const channel = supabase
      .channel('public:messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, _payload => {
         fetchConversations();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchConversations = async () => {
    const { data, error } = await supabase
      .from('conversation_members')
      .select(`
        conversation_id,
        conversations (
          id, type, name, updated_at,
          conversation_members (
            profiles (id, display_name, avatar_url, username)
          )
        )
      `)
      .eq('user_id', session.user.id);

    if (!error && data) {
      const formatted = data.map((d: any) => {
        const conv = d.conversations;
        if (conv.type === 'direct') {
          const other = conv.conversation_members.find((m: any) => m.profiles.id !== session.user.id);
          conv.displayName = other ? other.profiles.display_name : 'User';
        } else {
          conv.displayName = conv.name || 'Group Chat';
        }
        return conv;
      });
      // Sort in javascript since we couldn't order by joined_at easily with inner joins
      setConversations(formatted);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', session.user.id)
      .limit(10);

    if (!error && data) {
      setSearchResults(data);
    }
  };

  const startChat = async (targetUserId: string) => {
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'direct', created_by: session.user.id })
      .select()
      .single();

    if (convError) {
      toast.error(`Failed to create conversation: ${convError.message}`);
      console.error(convError);
      return;
    }

    if (convData) {
      const { error: memberError } = await supabase.from('conversation_members').insert([
        { conversation_id: convData.id, user_id: session.user.id, role: 'admin' },
        { conversation_id: convData.id, user_id: targetUserId, role: 'member' }
      ]);
      
      if (memberError) {
        toast.error('Failed to add members to conversation');
        console.error(memberError);
        return;
      }
      
      setActiveChat(convData.id);
      setShowNewChat(false);
      setSearchQuery('');
      fetchConversations();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="w-80 sm:w-96 bg-white border-r border-surface-200 flex flex-col shadow-xl z-20">
      {/* Header Profile Section */}
      <div className="p-5 border-b border-surface-100 flex justify-between items-center bg-gradient-to-r from-brand-50 to-white">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-md shadow-brand-500/30">
            {currentUser?.display_name ? currentUser.display_name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h3 className="font-bold text-surface-900 tracking-tight">{currentUser?.display_name}</h3>
            <p className="text-xs font-medium text-brand-600">@{currentUser?.username}</p>
          </div>
        </div>
        <div className="flex gap-1 text-surface-500">
          <button onClick={() => setShowNewChat(true)} className="p-2.5 hover:bg-brand-100 hover:text-brand-600 rounded-xl transition-all" title="New Chat">
            <Plus size={20} strokeWidth={2.5} />
          </button>
          <button onClick={handleLogout} className="p-2.5 hover:bg-red-50 hover:text-red-500 rounded-xl transition-all" title="Logout">
            <LogOut size={20} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Global Search */}
      <div className="p-4 border-b border-surface-100">
        <div className="relative group">
          <Search className="absolute left-3.5 top-3 text-surface-400 group-focus-within:text-brand-500 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search messages or users..." 
            className="w-full bg-surface-50 border border-surface-200 rounded-xl py-2.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all placeholder:text-surface-400 font-medium text-surface-900"
          />
        </div>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto chat-scroll bg-white">
        {showNewChat ? (
          <div className="p-4 animate-fade-in">
            <div className="flex justify-between items-center mb-5">
              <h4 className="font-bold text-surface-900">Start a Conversation</h4>
              <button onClick={() => setShowNewChat(false)} className="text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1 rounded-lg transition-colors">Cancel</button>
            </div>
            <div className="relative mb-4">
               <Search className="absolute left-3.5 top-2.5 text-surface-400" size={18} />
               <input 
                 type="text" 
                 placeholder="Search by username (min 3 chars)..." 
                 value={searchQuery}
                 onChange={(e) => handleSearch(e.target.value)}
                 className="w-full bg-surface-50 border border-surface-200 rounded-xl py-2 pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
               />
            </div>
            
            <div className="space-y-1">
              {searchResults.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => startChat(user.id)}
                  className="flex items-center gap-4 p-3 hover:bg-brand-50 rounded-xl cursor-pointer transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-surface-200 to-surface-300 flex items-center justify-center text-surface-600 font-bold group-hover:from-brand-200 group-hover:to-brand-300 group-hover:text-brand-700 transition-colors">
                    {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-surface-900">{user.display_name}</p>
                    <p className="text-xs font-medium text-surface-500">@{user.username}</p>
                  </div>
                </div>
              ))}
              {searchQuery.length > 2 && searchResults.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-3">
                     <Search className="text-surface-400" size={24} />
                  </div>
                  <p className="text-sm font-medium text-surface-500">No users found</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center mt-20 animate-fade-in">
                <div className="w-16 h-16 bg-brand-50 text-brand-500 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                   <MessageSquare size={32} strokeWidth={1.5} />
                </div>
                <h3 className="font-bold text-surface-900 text-lg mb-1">No chats yet</h3>
                <p className="text-sm text-surface-500 mb-6">Start a conversation with friends or create a group.</p>
                <button 
                  onClick={() => setShowNewChat(true)}
                  className="bg-brand-600 text-white font-semibold py-2.5 px-6 rounded-xl shadow-lg shadow-brand-500/30 hover:bg-brand-700 transition-all active:scale-95"
                >
                  Start Chatting
                </button>
              </div>
            ) : (
              <div className="pt-2">
                {conversations.map(conv => (
                  <div 
                    key={conv.id}
                    onClick={() => setActiveChat(conv.id)}
                    className={`flex items-center gap-4 px-4 py-3 mx-2 rounded-xl cursor-pointer transition-all ${
                      activeChat === conv.id 
                        ? 'bg-brand-50 border border-brand-100 shadow-sm' 
                        : 'hover:bg-surface-50 border border-transparent'
                    }`}
                  >
                    <div className="relative">
                       <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-surface-100 to-surface-200 flex items-center justify-center text-surface-600 font-bold text-lg overflow-hidden shrink-0">
                         {conv.type === 'group' ? <Users size={24} /> : (conv.displayName?.charAt(0) || 'U')}
                       </div>
                       {/* Online badge mockup */}
                       <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="font-bold text-surface-900 truncate">
                          {conv.displayName}
                        </h4>
                        <span className="text-xs font-semibold text-brand-500 shrink-0">
                          12:30 PM
                        </span>
                      </div>
                      <p className="text-sm text-surface-500 truncate pr-4">
                        Tap to view messages
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
