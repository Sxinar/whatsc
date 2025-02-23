import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  content: string;
  created_at: string;
  user: {
    id: string;
    email: string;
  };
}

const ServerChat: React.FC<{ channelId: string; userId: string; channelName: string }> = ({
  channelId,
  userId,
  channelName,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkUserSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate('/login');
      }
    };

    checkUserSession();
    fetchMessages();
    scrollToBottom();

    const subscription = supabase
      .channel(`server_messages_${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'server_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          if (payload.new) {
            addNewMessage(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [channelId, navigate]);

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

      const formattedMessages: Message[] = (data || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        created_at: msg.created_at,
        user: {
          // profiles dizisi geliyorsa ilk elemanı kullanıyoruz
          id: msg.profiles?.[0]?.id || 'unknown',
          email: msg.profiles?.[0]?.email?.split('@')[0] || 'Bilinmeyen Kullanıcı',
        },
      }));

      setMessages(formattedMessages);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const addNewMessage = async (newMsg: any) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const email = session?.user?.email ? session.user.email.split('@')[0] : 'Bilinmeyen Kullanıcı';

    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: newMsg.id,
        content: newMsg.content,
        created_at: newMsg.created_at,
        user: {
          id: newMsg.user_id,
          email: email,
        },
      },
    ]);
    scrollToBottom();
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase.from('server_messages').insert([
        {
          channel_id: channelId,
          user_id: userId,
          content: newMessage.trim(),
        },
      ]);

      if (error) throw error;
      setNewMessage('');
    } catch (error: any) {
      setError(error.message);
      console.error('Error sending message:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.user.id === userId ? 'justify-end' : 'justify-start'}`}
            >
              <div className="max-w-[70%]">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-xs text-gray-500">
                    {message.user.email} •{' '}
                    {new Date(message.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
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
