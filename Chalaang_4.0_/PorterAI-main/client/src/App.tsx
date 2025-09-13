import React from 'react';
import VoiceInterface from './components/VoiceInterface';
import './App.css';

function App() {
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Porter AI Assistant</h1>
      </header>
      <VoiceInterface />
    </div>
  );
}

export default App;