import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isLogin) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
          email, 
          password 
        });
        
        if (authError) throw authError;

        // Profili kontrol et ve yoksa oluştur
        if (authData.user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (profileError) {
            const { error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: authData.user.id,
                  email: authData.user.email
                }
              ]);

            if (insertError) {
              console.error('Profil oluşturma hatası:', insertError);
            }
          }
        }
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({ 
          email, 
          password 
        });
        
        if (authError) throw authError;
        
        if (authData.user) {
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: authData.user.id,
                email: authData.user.email
              }
            ]);

          if (insertError) {
            console.error('Profil oluşturma hatası:', insertError);
          }
        }

        setMessage('Kayıt başarılı! Email adresinize gönderilen onay linkine tıklayın.');
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-96">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? 'WhatsApp Clone - Giriş' : 'WhatsApp Clone - Kayıt'}
        </h2>
        
        {message && (
          <div className={`p-3 rounded mb-4 ${
            message.includes('başarılı') 
              ? 'bg-green-100 text-green-700 border border-green-400'
              : 'bg-red-100 text-red-700 border border-red-400'
          }`}>
            {message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {loading ? 'İşlem yapılıyor...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
            }}
            className="text-blue-500 hover:text-blue-600"
          >
            {isLogin ? 'Hesabınız yok mu? Kayıt olun' : 'Zaten hesabınız var mı? Giriş yapın'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login; 