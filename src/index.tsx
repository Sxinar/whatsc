import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Router'ı ekliyoruz
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter> {/* App bileşeninin etrafını sarıyoruz */}
      <App />
    </BrowserRouter>
  </React.StrictMode>
);

// Performans ölçümü için raporlamak istiyorsanız, bir fonksiyon geçebilirsiniz
// Örneğin: reportWebVitals(console.log) gibi
reportWebVitals();
