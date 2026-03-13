# Interview AI - AI-Powered Interview Practice Platform

A full-featured interview practice application with real-time voice conversation, CV-based questions, and comprehensive interview analytics.

## Features

### Core Features
- **Real-Time Voice Conversation**: Use your microphone to speak naturally during interviews, and hear AI responses through text-to-speech
- **CV Upload & Processing**: Upload your resume (TXT format) to get personalized interview questions
- **AI-Powered Interviewer**: Advanced AI asks follow-up questions, evaluates responses, and provides feedback
- **Interview History**: Store and review all your past interviews with full transcripts
- **Analytics Dashboard**: Track your progress with metrics like duration trends and message counts

### Technical Features
- Built with Next.js 16 and React 19
- Real-time streaming responses using Vercel AI SDK
- Web Speech API for voice input/output
- LocalStorage for persistent user data
- Recharts for analytics visualization
- Responsive design with Tailwind CSS

## Getting Started

### Installation

1. Clone or download the project
2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Starting an Interview
1. Click "Start Interview" on the home page
2. Optionally upload your CV first for personalized questions
3. Click "Begin Interview"
4. Use the microphone button to start speaking or type your responses
5. Listen to the AI's responses (audio will play automatically)

### Managing Your CV
1. Go to "Manage CV" tab
2. Upload a TXT file with your resume content
3. The AI will use this information to ask relevant questions

### Viewing Analytics
1. Go to "Analytics" tab to see:
   - Total interview count
   - Average session duration
   - Messages per interview
   - Duration trends over time
   - Message count comparisons

### Interview History
1. View all past interviews in the "Interview History" tab
2. Click on any session to see:
   - Full conversation transcript
   - Session duration and timestamp
   - Message count

## Technology Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **AI**: Vercel AI SDK 6 with OpenAI GPT-4o-mini
- **Voice**: Web Speech API (SpeechRecognition + SpeechSynthesis)
- **Database**: Browser LocalStorage
- **Charts**: Recharts
- **UI**: shadcn/ui components, Tailwind CSS
- **Icons**: Lucide React

## Project Structure

```
/app
  /api/interview          - Interview streaming endpoint
  /settings              - Settings and data management page
  layout.tsx             - Root layout with metadata
  page.tsx               - Home page with tabs

/components
  interview-session.tsx  - Main interview interface with voice
  cv-upload.tsx         - CV file upload component
  history.tsx           - Interview history viewer
  analytics.tsx         - Analytics dashboard
  /ui                   - shadcn UI components

/lib
  types.ts              - TypeScript interfaces
  storage.ts            - LocalStorage utilities
  voice.ts              - Web Speech API utilities
  utils.ts              - General utilities
```

## Browser Compatibility

- Chrome/Chromium (Full support)
- Firefox (Full support)
- Safari (Full support for voice with webkit prefix)
- Edge (Full support)

**Note**: Web Speech API requires a modern browser. Voice recognition and synthesis may vary by browser.

## Key Features Explained

### Voice I/O
- **Speech Recognition**: Click "Start Listening" to record your voice. The app converts speech to text automatically.
- **Text-to-Speech**: The AI's responses are automatically spoken aloud using your browser's speech synthesis capabilities.

### CV Processing
- Upload your resume as a text file
- The AI uses your CV content to generate relevant interview questions
- Your CV is stored locally in your browser

### Interview Tracking
- Every interview is automatically saved with:
  - Full conversation transcript
  - Session duration
  - Timestamp
  - Associated CV (if used)
- Review past interviews anytime to track improvement

### Analytics
- Visual charts showing interview duration trends
- Message count analysis
- Performance metrics across all interviews

## Limitations & Notes

- Text file processing for CVs (convert PDF/DOCX to TXT for best results)
- Voice features require a modern browser with Web Speech API support
- All data is stored locally in the browser (no cloud backup)
- Interviews are limited to chat-based responses (no video)

## Future Enhancements

Potential features for future versions:
- PDF/DOCX file processing
- Interview feedback and scoring
- Question randomization
- Difficulty levels
- Export interview transcripts
- User accounts with cloud sync
- Mock specific job positions
- Video recording of sessions

## Privacy

All data is stored locally in your browser using LocalStorage. No interview data is sent to external servers except for the AI API calls to generate responses.

## Support

For issues or questions, check your browser console for error messages and ensure:
1. You have a modern browser with Web Speech API support
2. Your microphone permissions are granted
3. You have a stable internet connection (for AI responses)

## License

This project is created with v0.app and uses open-source libraries.
