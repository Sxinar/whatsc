import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './components/Login';
import ChatList from './components/ChatList';
import ChatWindow from './components/ChatWindow';
import ServerList from './components/ServerList';
import ServerChat from './components/ServerChat';
import Profile from './components/Profile';
import './App.css';

interface Session {
  user: {
    id: string;
  };
}

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [selectedChat, setSelectedChat] = useState<{ chatId: string; otherUserId: string } | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<{ channelId: string; channelName: string } | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [view, setView] = useState<'direct' | 'server'>('direct');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session as Session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session as Session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!session) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="w-16 bg-gray-900 flex flex-col items-center py-4 space-y-4">
        <button
          onClick={() => {
            setView('direct');
            setSelectedChannel(null);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            view === 'direct' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <span className="text-white text-xl">💬</span>
        </button>
        <button
          onClick={() => {
            setView('server');
            setSelectedChat(null);
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center ${
            view === 'server' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
          }`}
        >
          <span className="text-white text-xl">🌐</span>
        </button>
      </div>
      <div className="flex-1 flex">
        {view === 'direct' ? (
          <>
            <ChatList
              userId={session.user.id}
              onChatSelect={(chatId, otherUserId) => {
                setSelectedChat({ chatId, otherUserId });
                setShowProfile(false);
              }}
            />
            {selectedChat ? (
              <ChatWindow
                chatId={selectedChat.chatId}
                userId={session.user.id}
                otherUserId={selectedChat.otherUserId}
              />
            ) : showProfile ? (
              <Profile />
            ) : (
              <div className="w-3/4 flex items-center justify-center">
                <p className="text-gray-500">Sohbet seçin veya yeni bir sohbet başlatın</p>
              </div>
            )}
          </>
        ) : (
          <>
            <ServerList
              userId={session.user.id}
              onChannelSelect={(channelId: string, channelName: string) => {
                setSelectedChannel({ channelId, channelName });
              }}
            />
            {selectedChannel && (
              <ServerChat
                channelId={selectedChannel.channelId}
                channelName={selectedChannel.channelName}
                userId={session.user.id}
              />
            )}
          </>
        )}
      </div>
      {view === 'direct' && (
        <button
          onClick={() => {
            setShowProfile(!showProfile);
            setSelectedChat(null);
          }}
          className="fixed top-4 right-4 bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600"
        >
          {showProfile ? 'Sohbetler' : 'Profil'}
        </button>
      )}
    </div>
  );
}

export default App;
