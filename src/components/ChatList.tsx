import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

interface ChatUser {
  id: string;
  email: string;
}

interface ChatData {
  id: string;
  user1: ChatUser;
  user2: ChatUser;
  messages: {
    content: string;
    created_at: string;
  }[];
}

interface Chat {
  id: string;
  user1_id: string;
  user2_id: string;
  other_user: {
    id: string;
    email: string;
  };
  last_message?: string;
  last_message_time?: string;
}

const ChatList: React.FC<{ userId: string; onChatSelect: (chatId: string, otherUserId: string) => void }> = ({ 
  userId, 
  onChatSelect 
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchChats();
    const subscription = supabase
      .channel('chats')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, fetchChats)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const fetchChats = async () => {
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          user1:user1_id(id, email),
          user2:user2_id(id, email),
          messages(
            content,
            created_at
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching chats:', error);
        return;
      }

      if (data) {
        const formattedChats = (data as unknown as ChatData[]).map(chat => ({
          id: chat.id,
          user1_id: chat.user1.id,
          user2_id: chat.user2.id,
          other_user: chat.user1.id === userId ? chat.user2 : chat.user1,
          last_message: chat.messages[0]?.content,
          last_message_time: chat.messages[0]?.created_at
        }));

        setChats(formattedChats);
      }
    } catch (error: any) {
      console.error('Error:', error.message);
    }
  };

  const createNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Kullanıcıyı e-posta ile bul
      const { data: users, error: userError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', newChatEmail)
        .single();

      if (userError || !users) {
        throw new Error('Kullanıcı bulunamadı');
      }

      // Mevcut sohbeti kontrol et
      const { data: existingChat } = await supabase
        .from('chats')
        .select('*')
        .or(`and(user1_id.eq.${userId},user2_id.eq.${users.id}),and(user1_id.eq.${users.id},user2_id.eq.${userId})`)
        .single();

      if (existingChat) {
        throw new Error('Bu kullanıcı ile zaten bir sohbetiniz var');
      }

      // Yeni sohbet oluştur
      const { error: chatError } = await supabase
        .from('chats')
        .insert([
          {
            user1_id: userId,
            user2_id: users.id,
          },
        ]);

      if (chatError) throw chatError;

      setNewChatEmail('');
      setShowNewChat(false);
      fetchChats();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredChats = chats.filter(chat =>
    chat.other_user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white w-1/4 border-r flex flex-col">
      <div className="p-4 bg-gray-100 border-b">
        <h2 className="text-xl font-semibold mb-4">Sohbetler</h2>
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            placeholder="Sohbet ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowNewChat(true)}
            className="bg-blue-500 text-white p-2 rounded-lg hover:bg-blue-600"
          >
            Yeni
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {showNewChat && (
          <form onSubmit={createNewChat} className="mb-4">
            <input
              type="email"
              placeholder="Kullanıcı e-postası"
              value={newChatEmail}
              onChange={(e) => setNewChatEmail(e.target.value)}
              className="w-full p-2 border rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="flex space-x-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 disabled:opacity-50"
              >
                {loading ? 'Oluşturuluyor...' : 'Sohbet Başlat'}
              </button>
              <button
                type="button"
                onClick={() => setShowNewChat(false)}
                className="flex-1 bg-gray-500 text-white p-2 rounded-lg hover:bg-gray-600"
              >
                İptal
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="overflow-y-auto flex-1">
        {loading && !showNewChat ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center text-gray-500 p-4">
            {searchTerm ? 'Sohbet bulunamadı' : 'Henüz sohbet yok'}
          </div>
        ) : (
          filteredChats.map(chat => (
            <div
              key={chat.id}
              onClick={() => onChatSelect(chat.id, chat.user1_id === userId ? chat.user2_id : chat.user1_id)}
              className="p-4 border-b hover:bg-gray-50 cursor-pointer transition-colors"
            >
              <div className="font-medium">{chat.other_user.email}</div>
              {chat.last_message && (
                <div className="flex justify-between items-center mt-1">
                  <p className="text-sm text-gray-500 truncate">{chat.last_message}</p>
                  {chat.last_message_time && (
                    <span className="text-xs text-gray-400">
                      {new Date(chat.last_message_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ChatList; 