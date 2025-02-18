import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Profile: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSignOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4">Profil Ayarları</h2>
        {message && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}
        <button
          onClick={handleSignOut}
          disabled={loading}
          className="w-full bg-red-500 text-white p-2 rounded hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? 'Çıkış yapılıyor...' : 'Çıkış Yap'}
        </button>
      </div>
    </div>
  );
};

export default Profile; 