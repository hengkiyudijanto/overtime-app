import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Me-mount komponen utama App ke dalam elemen HTML dengan id 'root'
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)