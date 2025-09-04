import React, { useState, useRef } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

// Extend window interface for speech recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface VoiceInputProps {
  onVoiceCommand: (command: string) => void;
  placeholder?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onVoiceCommand, 
  placeholder = "Tap to speak..." 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  const { toast } = useToast();

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: "Voice input not supported",
        description: "Your browser doesn't support voice input. Please use keyboard input instead.",
        variant: "destructive"
      });
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      const current = event.resultIndex;
      const transcript = event.results[current][0].transcript;
      setTranscript(transcript);
      
      if (event.results[current].isFinal) {
        onVoiceCommand(transcript);
        setTranscript('');
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      toast({
        title: "Voice input error",
        description: "There was an issue with voice recognition. Please try again.",
        variant: "destructive"
      });
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant={isListening ? "destructive" : "secondary"}
        size="lg"
        onClick={isListening ? stopListening : startListening}
        className="min-w-[140px] h-12"
        aria-label={isListening ? "Stop voice input" : "Start voice input"}
      >
        {isListening ? <MicOff className="h-5 w-5 mr-2" /> : <Mic className="h-5 w-5 mr-2" />}
        {isListening ? 'Stop' : 'Voice Input'}
      </Button>
      
      {transcript && (
        <div className="bg-muted p-2 rounded-md text-sm min-w-[200px]">
          <span className="text-muted-foreground">Listening: </span>
          <span className="font-medium">{transcript}</span>
        </div>
      )}
    </div>
  );
};