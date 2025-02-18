import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    email: string;
  };
}

interface DatabaseUser {
  id: string;
  email: string;
}

interface DatabaseMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: DatabaseUser;
}

interface SupabaseMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user: DatabaseUser[];
}

const ServerChat: React.FC<{
  channelId: string;
  userId: string;
  channelName: string;
}> = ({ channelId, userId, channelName }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    scrollToBottom();

    const subscription = supabase
      .channel('server_messages')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'server_messages', filter: `channel_id=eq.${channelId}` },
        fetchMessages
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('server_messages')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles!inner (
            id,
            email
          )
        `)
        .eq('channel_id', channelId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map(msg => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        user: {
          id: msg.profiles.id,
          email: msg.profiles.email
        }
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Önce kanalın var olduğunu kontrol edelim
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

      if (channelError) {
        throw new Error('Kanal bulunamadı. Mesaj gönderilemedi.');
      }

      // Kullanıcı profilini kontrol et ve yoksa oluştur
      const { data: userProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        // Profil yoksa oluştur
        const { data: authUser, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          throw new Error('Kullanıcı bilgileri alınamadı.');
        }

        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: userId,
              email: authUser.user.email
            }
          ]);

        if (insertError) {
          throw new Error('Profil oluşturulamadı.');
        }
      }

      const { error } = await supabase
        .from('server_messages')
        .insert([
          {
            channel_id: channelId,
            user_id: userId,
            content: newMessage.trim()
          }
        ]);

      if (error) throw error;
      setNewMessage('');
      scrollToBottom();
    } catch (error: any) {
      setError(error.message);
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">#{channelName}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && messages.length === 0 ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.user.id === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[70%]">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs text-gray-500">
                    {message.user.email} • {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div
                  className={`p-3 rounded-lg ${
                    message.user.id === userId
                      ? 'bg-green-500 text-white ml-auto'
                      : 'bg-white text-gray-800 border border-gray-200'
                  }`}
                >
                  {message.content}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-4 border-t">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`#${channelName} kanalına mesaj gönder...`}
            className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
          >
            Gönder
          </button>
        </div>
      </form>

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ServerChat; 