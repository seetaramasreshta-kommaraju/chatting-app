import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocs, orderBy, getDoc, doc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
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
    // Listen to conversations where the current user is a member
    const q = query(
      collection(db, 'conversations'),
      where('members', 'array-contains', session.uid)
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const convos = await Promise.all(snapshot.docs.map(async (d) => {
        const data = d.data();
        let displayName = data.name || 'Group Chat';
        
        if (data.type === 'direct') {
          const otherUserId = data.members.find((id: string) => id !== session.uid);
          if (otherUserId) {
            const profileSnap = await getDoc(doc(db, 'profiles', otherUserId));
            if (profileSnap.exists()) {
              displayName = profileSnap.data().display_name;
            } else {
              displayName = 'Unknown User';
            }
          }
        }
        
        return {
          id: d.id,
          ...data,
          displayName,
          updated_at: data.updated_at?.toDate() || new Date()
        };
      }));
      
      convos.sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
      setConversations(convos);
    });

    return () => unsubscribe();
  }, [session.uid]);

  const handleSearch = async (queryStr: string) => {
    setSearchQuery(queryStr);
    if (queryStr.length < 3) {
      setSearchResults([]);
      return;
    }

    // In Firestore, a simple prefix search requires this:
    const q = query(
      collection(db, 'profiles'),
      where('username', '>=', queryStr.toLowerCase()),
      where('username', '<=', queryStr.toLowerCase() + '\uf8ff')
    );

    try {
      const snapshot = await getDocs(q);
      const results = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(u => u.id !== session.uid);
      setSearchResults(results);
    } catch (error) {
      console.error(error);
    }
  };

  const startChat = async (targetUserId: string) => {
    // Check if direct chat already exists
    const existingConv = conversations.find(c => 
      c.type === 'direct' && c.members.includes(targetUserId)
    );

    if (existingConv) {
      setActiveChat(existingConv.id);
      setShowNewChat(false);
      setSearchQuery('');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'conversations'), {
        type: 'direct',
        members: [session.uid, targetUserId],
        created_by: session.uid,
        updated_at: serverTimestamp()
      });
      
      setActiveChat(docRef.id);
      setShowNewChat(false);
      setSearchQuery('');
    } catch (error: any) {
      toast.error(`Failed to create chat: ${error.message}`);
    }
  };

  const createGroupChat = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;

    try {
      const memberIds = [session.uid, ...selectedUsers.map(u => u.id)];
      const docRef = await addDoc(collection(db, 'conversations'), {
        type: 'group',
        name: groupName,
        members: memberIds,
        created_by: session.uid,
        updated_at: serverTimestamp()
      });
      
      setActiveChat(docRef.id);
      setShowNewChat(false);
      setIsCreatingGroup(false);
      setSelectedUsers([]);
      setGroupName('');
      setSearchQuery('');
    } catch (error: any) {
      toast.error(`Failed to create group: ${error.message}`);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="w-80 sm:w-96 bg-white border-r border-surface-200 flex flex-col shadow-xl z-20">
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
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className={`font-bold truncate text-surface-900`}>
                          {conv.displayName}
                        </h4>
                        <span className={`text-xs font-semibold shrink-0 text-surface-400`}>
                          {conv.updated_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className={`text-sm truncate pr-4 text-surface-500`}>
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
