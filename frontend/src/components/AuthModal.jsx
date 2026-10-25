import React from 'react';
import LoginPage from './LoginPage';

/**
 * AuthModal wrapper that renders the full-screen split login page
 * maintaining full backwards compatibility with existing props (isOpen, onClose, isStandalone).
 */
export default function AuthModal({ isOpen = true, onClose, isStandalone = false }) {
  if (!isStandalone && !isOpen) return null;
  return <LoginPage isOpen={true} onClose={isStandalone ? undefined : onClose} embedded={false} />;
}
