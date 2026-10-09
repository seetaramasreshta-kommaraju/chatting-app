import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, LogOut, Users, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function Sidebar({ session, currentUser, activeChat, setActiveChat }: any) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<any[]>([]);

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
        conversation_id, last_read_at,
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
        
        // Check for unread
        conv.hasUnread = new Date(conv.updated_at) > new Date(d.last_read_at);
        
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
    // Check if direct chat already exists
    const existingConv = conversations.find(c => 
      c.type === 'direct' && 
      c.conversation_members?.some((m: any) => m.profiles.id === targetUserId)
    );

    if (existingConv) {
      setActiveChat(existingConv.id);
      setShowNewChat(false);
      setSearchQuery('');
      return;
    }

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
      setActiveChat(convData.id);
      setShowNewChat(false);
      setSearchQuery('');
      setIsCreatingGroup(false);
      setSelectedUsers([]);
      setGroupName('');
      fetchConversations();
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .insert({ type: 'group', name: groupName, created_by: session.user.id })
      .select()
      .single();

    if (convError) {
      toast.error(`Failed to create group: ${convError.message}`);
      return;
    }

    if (convData) {
      const members = [
        { conversation_id: convData.id, user_id: session.user.id, role: 'admin' },
        ...selectedUsers.map(u => ({ conversation_id: convData.id, user_id: u.id, role: 'member' }))
      ];

      const { error: memberError } = await supabase.from('conversation_members').insert(members);
      
      if (memberError) {
        toast.error('Failed to add members to group');
        return;
      }
      
      setActiveChat(convData.id);
      setShowNewChat(false);
      setIsCreatingGroup(false);
      setSelectedUsers([]);
      setGroupName('');
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
              <h4 className="font-bold text-surface-900">{isCreatingGroup ? 'Create Group Chat' : 'Start a Conversation'}</h4>
              <button onClick={() => {
                setShowNewChat(false);
                setIsCreatingGroup(false);
                setSelectedUsers([]);
                setGroupName('');
              }} className="text-sm font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1 rounded-lg transition-colors">Cancel</button>
            </div>
            
            <div className="flex gap-2 mb-4">
              <button 
                onClick={() => setIsCreatingGroup(false)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${!isCreatingGroup ? 'bg-brand-100 text-brand-700' : 'bg-surface-50 text-surface-500 hover:bg-surface-100'}`}
              >
                Direct
              </button>
              <button 
                onClick={() => setIsCreatingGroup(true)}
                className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${isCreatingGroup ? 'bg-brand-100 text-brand-700' : 'bg-surface-50 text-surface-500 hover:bg-surface-100'}`}
              >
                Group
              </button>
            </div>

            {isCreatingGroup && (
              <div className="mb-4">
                <input 
                  type="text" 
                  placeholder="Group Name" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full bg-surface-50 border border-surface-200 rounded-xl py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 mb-2 font-medium"
                />
                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {selectedUsers.map(u => (
                      <span key={u.id} className="inline-flex items-center gap-1 bg-brand-50 text-brand-700 px-2 py-1 rounded-md text-xs font-semibold">
                        {u.display_name}
                        <button onClick={() => setSelectedUsers(current => current.filter(user => user.id !== u.id))} className="text-brand-400 hover:text-brand-700">&times;</button>
                      </span>
                    ))}
                  </div>
                )}
                <button 
                  onClick={createGroupChat}
                  disabled={!groupName.trim() || selectedUsers.length === 0}
                  className="w-full bg-brand-600 text-white font-semibold py-2 rounded-xl disabled:bg-surface-200 disabled:text-surface-400 transition-colors"
                >
                  Create Group
                </button>
              </div>
            )}

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
              {searchResults.map(user => {
                const isSelected = selectedUsers.some(u => u.id === user.id);
                return (
                  <div 
                    key={user.id} 
                    onClick={() => {
                      if (isCreatingGroup) {
                        if (isSelected) {
                          setSelectedUsers(current => current.filter(u => u.id !== user.id));
                        } else {
                          setSelectedUsers(current => [...current, user]);
                        }
                      } else {
                        startChat(user.id);
                      }
                    }}
                    className={`flex items-center justify-between gap-4 p-3 rounded-xl cursor-pointer transition-colors group ${isSelected ? 'bg-brand-50 border border-brand-100' : 'hover:bg-surface-50 border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-surface-200 to-surface-300 flex items-center justify-center text-surface-600 font-bold transition-colors">
                        {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <div>
                        <p className="font-bold text-surface-900">{user.display_name}</p>
                        <p className="text-xs font-medium text-surface-500">@{user.username}</p>
                      </div>
                    </div>
                    {isCreatingGroup && (
                      <div className={`w-5 h-5 rounded border flex items-center justify-center ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'border-surface-300'}`}>
                        {isSelected && <span className="text-xs">✓</span>}
                      </div>
                    )}
                  </div>
                );
              })}
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
                        <h4 className={`font-bold truncate ${conv.hasUnread ? 'text-brand-600' : 'text-surface-900'}`}>
                          {conv.displayName}
                        </h4>
                        <span className={`text-xs font-semibold shrink-0 ${conv.hasUnread ? 'text-brand-600' : 'text-surface-400'}`}>
                          {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-sm truncate pr-4 ${conv.hasUnread ? 'text-surface-900 font-semibold' : 'text-surface-500'}`}>
                        {conv.hasUnread ? 'New messages' : 'Tap to view messages'}
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
