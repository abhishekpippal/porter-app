// src/pages/Assistant.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Box, Paper, Stack, Typography, IconButton, TextField, Alert,
  InputAdornment, Container, AlertTitle
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { handleApiError } from '../services/api';
import VoiceBar from '../Components/VoiceBar';

// Speech Recognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const synth = window.speechSynthesis;

// Types
type Role = "user" | "ai";
interface ChatMessage { role: Role; content: string; ts: number }
interface AiResponseBody {
  reply: string;
  action?: string;
  order?: any;
  orders?: any[];
  trackingId?: string;
  error?: string;
}

// API call helper
async function callServer(text: string): Promise<AiResponseBody> {
  const userId = localStorage.getItem("uid") || "demo-user";
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, userId }),
  });
  
  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
  }
  
  return response.json();
}

export default function Assistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognition = useRef<any>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!SpeechRecognition) {
      setError("Speech recognition is not supported in your browser.");
      return;
    }

    recognition.current = new SpeechRecognition();
    recognition.current.continuous = false;
    recognition.current.interimResults = false;
    recognition.current.lang = 'en-IN';

    recognition.current.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      handleChat(text);
    };

    recognition.current.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError("Failed to recognize speech. Please try again.");
      setListening(false);
    };

    recognition.current.onend = () => {
      setListening(false);
    };
  }, []);

  const speak = useCallback((text: string) => {
    if (synth) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-IN';
      synth.speak(utterance);
    }
  }, []);

  const appendMessage = useCallback((role: Role, content: string) => {
    setMessages(prev => [...prev, { role, content, ts: Date.now() }]);
  }, []);

  const handleChat = async (text: string) => {
    try {
      appendMessage("user", text);
      setError(null);
      setInput("");
      
      const response = await callServer(text);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      appendMessage("ai", response.reply);
      speak(response.reply);
    } catch (error) {
      console.error('Chat handler error:', error);
      const errorMessage = handleApiError(error);
      appendMessage("ai", errorMessage);
      setError(errorMessage);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startListening = useCallback(() => {
    if (recognition.current) {
      setError(null);
      setListening(true);
      recognition.current.start();
    } else {
      setError("Speech recognition is not supported in your browser.");
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognition.current) {
      recognition.current.stop();
      setListening(false);
    }
  }, []);

  return (
    <Box sx={{ bgcolor: "background.default" }}>
      <Container maxWidth="xl" sx={{ py: { xs: 6, md: 8 } }}>
        <Stack spacing={3}>
          {/* Title */}
          <Typography variant="h4" fontWeight={900}>Porter AI Assistant</Typography>
          
          {/* Error Alert */}
          {error && (
            <Alert 
              severity="error" 
              onClose={() => setError(null)} 
              sx={{ mb: 2 }}
              variant="filled"
            >
              <AlertTitle>Error</AlertTitle>
              {error}
              {error.includes('AI service') && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  This might be a temporary issue. You can try:
                  <ul>
                    <li>Waiting a few moments and trying again</li>
                    <li>Refreshing the page</li>
                    <li>Using text input instead of voice commands</li>
                  </ul>
                </Typography>
              )}
            </Alert>
          )}

          {/* Voice Bar */}
          <VoiceBar
            listening={listening}
            onStart={startListening}
            onStop={stopListening}
            hint="Click start and speak your request..."
          />

          {/* Chat Messages */}
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2,
              height: 480,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 2
            }}
          >
            {messages.map((msg) => (
              <Box
                key={msg.ts}
                sx={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 2,
                    bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                    color: msg.role === 'user' ? 'white' : 'text.primary'
                  }}
                >
                  <Typography>{msg.content}</Typography>
                </Paper>
              </Box>
            ))}
            <div ref={chatEndRef} />
          </Paper>

          {/* Input */}
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && input.trim() && handleChat(input)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      color="primary"
                      onClick={() => handleChat(input)}
                      disabled={!input.trim()}
                    >
                      <SendIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
