import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

interface ServerData {
  server: {
    id: string;
    name: string;
    description: string;
    server_image: string;
    is_private: boolean;
    invite_code: string;
    owner_id: string;
    server_members: {
      count: number;
    }[];
  };
}

interface Server {
  id: string;
  name: string;
  description: string;
  server_image: string;
  is_private: boolean;
  invite_code: string;
  owner_id: string;
  _count: {
    members: number;
  };
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice';
  description: string;
}

interface ServerListProps {
  userId: string;
  onChannelSelect: (channelId: string, channelName: string) => void;
}

const ServerList: React.FC<ServerListProps> = ({ userId, onChannelSelect }) => {
  const [servers, setServers] = useState<Server[]>([]);
  const [selectedServer, setSelectedServer] = useState<Server | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showNewServer, setShowNewServer] = useState(false);
  const [showJoinServer, setShowJoinServer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Yeni sunucu form state'leri
  const [newServerName, setNewServerName] = useState('');
  const [newServerDesc, setNewServerDesc] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchServers();
    const subscription = supabase
      .channel('servers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'servers' }, fetchServers)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const fetchServers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('server_members')
        .select(`
          server:servers!server_id(
            id,
            name,
            description,
            server_image,
            is_private,
            invite_code,
            owner_id,
            server_members!server_id(count)
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;

      if (data) {
        const formattedServers = (data as unknown as ServerData[]).map(item => ({
          id: item.server.id,
          name: item.server.name,
          description: item.server.description,
          server_image: item.server.server_image,
          is_private: item.server.is_private,
          invite_code: item.server.invite_code,
          owner_id: item.server.owner_id,
          _count: {
            members: item.server.server_members[0].count
          }
        }));

        setServers(formattedServers);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchChannels = async (serverId: string) => {
    try {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('server_id', serverId)
        .order('created_at');

      if (error) throw error;
      setChannels(data);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const createServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Sunucu oluştur
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .insert([
          {
            name: newServerName.trim(),
            description: newServerDesc.trim(),
            owner_id: userId,
            is_private: isPrivate
          }
        ])
        .select()
        .single();

      if (serverError) throw serverError;

      if (!server) {
        throw new Error('Sunucu oluşturulamadı');
      }

      // Sahibi üye olarak ekle
      const { error: memberError } = await supabase
        .from('server_members')
        .insert([
          {
            server_id: server.id,
            user_id: userId,
            role: 'owner'
          }
        ]);

      if (memberError) throw memberError;

      // Varsayılan kanalları oluştur
      const { error: channelError } = await supabase
        .from('channels')
        .insert([
          {
            server_id: server.id,
            name: 'genel',
            description: 'Genel sohbet kanalı',
            type: 'text'
          }
        ]);

      if (channelError) throw channelError;

      setShowNewServer(false);
      setNewServerName('');
      setNewServerDesc('');
      await fetchServers();
    } catch (error: any) {
      console.error('Error creating server:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const joinServer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Sunucuyu bul
      const { data: server, error: serverError } = await supabase
        .from('servers')
        .select('*')
        .eq('invite_code', inviteCode)
        .single();

      if (serverError) throw new Error('Geçersiz davet kodu');

      // Üyeliği kontrol et
      const { data: existingMember, error: memberCheckError } = await supabase
        .from('server_members')
        .select('*')
        .eq('server_id', server.id)
        .eq('user_id', userId)
        .single();

      if (existingMember) throw new Error('Zaten bu sunucunun üyesisiniz');

      // Üye olarak ekle
      const { error: joinError } = await supabase
        .from('server_members')
        .insert([
          {
            server_id: server.id,
            user_id: userId,
            role: 'member'
          }
        ]);

      if (joinError) throw joinError;

      setShowJoinServer(false);
      setInviteCode('');
      fetchServers();
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sunucu Listesi */}
      <div className="w-20 bg-gray-900 p-3 flex flex-col items-center space-y-4">
        {servers.map(server => (
          <div
            key={server.id}
            onClick={() => {
              setSelectedServer(server);
              fetchChannels(server.id);
            }}
            className={`w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center cursor-pointer hover:bg-blue-600 transition-colors ${
              selectedServer?.id === server.id ? 'bg-blue-600' : ''
            }`}
          >
            {server.server_image ? (
              <img
                src={server.server_image}
                alt={server.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-white font-bold">
                {server.name.substring(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        ))}

        <button
          onClick={() => setShowNewServer(true)}
          className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center cursor-pointer hover:bg-green-700 transition-colors"
        >
          <span className="text-white text-2xl">+</span>
        </button>

        <button
          onClick={() => setShowJoinServer(true)}
          className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center cursor-pointer hover:bg-blue-700 transition-colors"
        >
          <span className="text-white text-2xl">→</span>
        </button>
      </div>

      {/* Kanal Listesi */}
      {selectedServer && (
        <div className="w-64 bg-gray-800 text-white">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-xl font-bold">{selectedServer.name}</h2>
            <p className="text-sm text-gray-400">{selectedServer.description}</p>
            {selectedServer.owner_id === userId && (
              <div className="mt-2 text-xs bg-gray-700 p-2 rounded">
                Davet Kodu: {selectedServer.invite_code}
              </div>
            )}
          </div>
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">KANALLAR</h3>
            {channels.map(channel => (
              <div
                key={channel.id}
                onClick={() => onChannelSelect(channel.id, channel.name)}
                className="flex items-center space-x-2 p-2 hover:bg-gray-700 rounded cursor-pointer"
              >
                <span className="text-gray-400">#</span>
                <span>{channel.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Yeni Sunucu Modal */}
      {showNewServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-4">Yeni Sunucu Oluştur</h2>
            <form onSubmit={createServer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sunucu Adı</label>
                  <input
                    type="text"
                    value={newServerName}
                    onChange={(e) => setNewServerName(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Açıklama</label>
                  <textarea
                    value={newServerDesc}
                    onChange={(e) => setNewServerDesc(e.target.value)}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="mr-2"
                  />
                  <label className="text-sm text-gray-700">Özel Sunucu</label>
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                  >
                    {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowNewServer(false)}
                    className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Sunucuya Katıl Modal */}
      {showJoinServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-2xl font-bold mb-4">Sunucuya Katıl</h2>
            <form onSubmit={joinServer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Davet Kodu</label>
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    className="w-full p-2 border rounded"
                    required
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-500 text-white p-2 rounded hover:bg-blue-600"
                  >
                    {loading ? 'Katılınıyor...' : 'Katıl'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowJoinServer(false)}
                    className="flex-1 bg-gray-500 text-white p-2 rounded hover:bg-gray-600"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default ServerList; 