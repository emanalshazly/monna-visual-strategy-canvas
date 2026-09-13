import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock Web Speech API
const speechRecognitionMock = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  abort: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  continuous: false,
  interimResults: false,
  lang: 'en-US',
}));

Object.defineProperty(globalThis, 'SpeechRecognition', { configurable: true, value: speechRecognitionMock });
Object.defineProperty(globalThis, 'webkitSpeechRecognition', { configurable: true, value: speechRecognitionMock });

// Mock AudioContext
global.AudioContext = vi.fn().mockImplementation(() => ({
  createAnalyser: vi.fn(() => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    getByteTimeDomainData: vi.fn(),
    connect: vi.fn(),
  })),
  createMediaStreamSource: vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  })),
  close: vi.fn(),
}));

// Mock MediaDevices API
Object.defineProperty(global.navigator, 'mediaDevices', { configurable: true, value: {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [
      {
        stop: vi.fn(),
        kind: 'audio',
        enabled: true,
      },
    ],
  }),
} as unknown as MediaDevices });

// Mock html-to-image
vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,mock'),
  toJpeg: vi.fn().mockResolvedValue('data:image/jpeg;base64,mock'),
  toSvg: vi.fn().mockResolvedValue('data:image/svg+xml;base64,mock'),
}));

// Suppress console errors in tests (optional)
global.console = {
  ...console,
  error: vi.fn(),
  warn: vi.fn(),
};
