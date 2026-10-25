import React from 'react';
import LoginPage from './LoginPage';

/**
 * AuthModal wrapper that renders the full-screen split login page
 * maintaining full backwards compatibility with existing props (isOpen, onClose).
 */
export default function AuthModal({ isOpen, onClose }) {
  if (!isOpen) return null;
  return <LoginPage isOpen={isOpen} onClose={onClose} />;
}
