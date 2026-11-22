/**
 * SasyaVahini — OTP Verification Modal
 *
 * Implements 6-digit verification code entry, 60s resend cooldown,
 * and 5-minute expiration countdown with multilingual support.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, Clock, RefreshCw, X, AlertCircle, CheckCircle } from 'lucide-react';
import api from '../services/api';

const TOTAL_COOLDOWN_SECONDS = 60;
const TOTAL_EXPIRY_SECONDS = 300; // 5 minutes

export default function OtpVerificationModal({
  isOpen,
  onClose,
  identifier,
  purpose = 'LOGIN',
  onVerified,
  title = null
}) {
  const { t } = useTranslation();
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(TOTAL_COOLDOWN_SECONDS);
  const [expirySeconds, setExpirySeconds] = useState(TOTAL_EXPIRY_SECONDS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);
  const inputRefs = useRef([]);

  // Reset timers whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setDigits(['', '', '', '', '', '']);
      setError('');
      setResendSuccess(false);
      setCooldown(TOTAL_COOLDOWN_SECONDS);
      setExpirySeconds(TOTAL_EXPIRY_SECONDS);

      // Focus first input box
      setTimeout(() => {
        if (inputRefs.current[0]) inputRefs.current[0].focus();
      }, 150);
    }
  }, [isOpen]);

  // 60-second resend cooldown timer
  useEffect(() => {
    if (!isOpen || cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, cooldown]);

  // 5-minute expiry countdown timer
  useEffect(() => {
    if (!isOpen || expirySeconds <= 0) return;
    const interval = setInterval(() => {
      setExpirySeconds((prev) => {
        if (prev <= 1) {
          setError(t('otp.expired', 'Verification code has expired. Please request a new one.'));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, expirySeconds]);

  if (!isOpen) return null;

  const handleDigitChange = (index, value) => {
    const val = value.slice(-1); // only single char
    if (val && !/^[0-9]$/.test(val)) return;

    const newDigits = [...digits];
    newDigits[index] = val;
    setDigits(newDigits);
    setError('');

    // Advance focus to next input
    if (val && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasteData[i] || '';
    }
    setDigits(newDigits);
    const nextIdx = Math.min(pasteData.length, 5);
    if (inputRefs.current[nextIdx]) inputRefs.current[nextIdx].focus();
  };

  const code = digits.join('');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (code.length < 6) {
      setError(t('otp.enterAllDigits', 'Please enter the complete 6-digit code.'));
      return;
    }
    if (expirySeconds <= 0) {
      setError(t('otp.codeExpired', 'Code has expired. Please click Resend Code.'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data } = await api.post('/auth/otp/verify', {
        identifier,
        code,
        purpose
      });

      if (data?.data?.verified || data?.success) {
        if (onVerified) onVerified(data.data);
        onClose();
      } else {
        setError(data?.message || t('otp.verificationFailed', 'Verification failed'));
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t('otp.invalidCode', 'Invalid verification code'));
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || loading) return;
    setLoading(true);
    setError('');
    setResendSuccess(false);

    try {
      await api.post('/auth/otp/request', {
        identifier,
        purpose
      });
      setCooldown(TOTAL_COOLDOWN_SECONDS);
      setExpirySeconds(TOTAL_EXPIRY_SECONDS);
      setDigits(['', '', '', '', '', '']);
      setResendSuccess(true);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
      setTimeout(() => setResendSuccess(false), 4000);
    } catch (err) {
      setError(err?.response?.data?.message || err.message || t('otp.resendFailed', 'Failed to resend code'));
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const maskedIdentifier = identifier
    ? identifier.includes('@')
      ? identifier.replace(/(.{2})(.*)(@.*)/, '$1***$3')
      : identifier.slice(0, 4) + '****' + identifier.slice(-2)
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative border border-slate-100 space-y-5">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="text-center space-y-1.5 pt-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2 shadow-inner">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {title || t('otp.verifyTitle', 'Verify Security Code')}
          </h3>
          <p className="text-xs text-slate-500">
            {t('otp.codeSentTo', 'A 6-digit verification code was sent to')} <strong className="text-slate-700">{maskedIdentifier}</strong>
          </p>
        </div>

        {/* Feedback Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {resendSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle size={16} className="shrink-0" />
            <span>{t('otp.codeResent', 'A new verification code has been dispatched!')}</span>
          </div>
        )}

        {/* 6-Digit Inputs */}
        <div className="flex justify-center gap-2 sm:gap-3 py-1" onPaste={handlePaste}>
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-11 h-12 text-center text-xl font-bold rounded-xl border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-slate-800 bg-slate-50 focus:bg-white"
            />
          ))}
        </div>

        {/* Countdown & Expiry Stats */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-1">
            <Clock size={13} className={expirySeconds < 60 ? 'text-rose-500 animate-pulse' : 'text-slate-400'} />
            <span className={expirySeconds < 60 ? 'text-rose-600 font-semibold' : ''}>
              {t('otp.expiresIn', 'Expires in')}: {formatTime(expirySeconds)}
            </span>
          </div>

          <div>
            {cooldown > 0 ? (
              <span className="text-slate-400">
                {t('otp.resendIn', 'Resend in')} {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-emerald-700 font-semibold hover:underline flex items-center gap-1"
              >
                <RefreshCw size={12} />
                <span>{t('otp.resendCode', 'Resend Code')}</span>
              </button>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleVerify}
            disabled={loading || code.length < 6 || expirySeconds <= 0}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            {loading ? t('common.loading', 'Verifying...') : t('otp.verifyButton', 'Verify & Confirm')}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-xs text-slate-500 hover:text-slate-700 font-medium"
          >
            {t('common.cancel', 'Cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
