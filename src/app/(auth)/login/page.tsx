'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-8 text-gray-500">Loading...</div>}>
      <LoginContent />
    </Suspense>
  )
}

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const refCode = searchParams.get('ref')

  // If arriving via referral link, default to sign up mode
  useEffect(() => {
    if (refCode) setIsSignUp(true)
  }, [refCode])

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address.')
      return
    }
    setLoading(true)
    setError(null)
    setMessage(null)
    
    try {
      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://theshepherdsdesk.app/auth/callback',
      })
      if (resetError) throw resetError
      setMessage('Check your email for a reset link')
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()

      if (isSignUp) {
        const { data: signUpData, error: authError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (authError) throw authError

        // Track the referral signup
        if (refCode && signUpData.user) {
          try {
            await fetch('/api/referrals', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                referralCode: refCode,
                email: email,
                userId: signUpData.user.id
              })
            })
          } catch (refErr) {
            console.error('Referral tracking error:', refErr)
          }
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (authError) throw authError
      }

      router.push('/')
      router.refresh()
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 text-center">
      {refCode && (
        <div className="bg-[#D0A348]/10 border border-[#D0A348]/30 rounded-lg p-4 text-sm text-[#022d5c]">
          🎁 <strong>You've been invited!</strong> Create your free account to get started.
        </div>
      )}

      <div className="space-y-2 flex flex-col items-center">
        <img 
          src="/logo-clean.png" 
          alt="The Shepherd's Desk" 
          className="h-28 w-auto object-contain"
        />
        <p className="text-sm text-gray-500 italic">
          From Monday&apos;s ministry to Sunday&apos;s message.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-gray-700">Email Address</Label>
          <Input 
            id="email"
            type="email" 
            placeholder="pastor@church.com" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="focus-visible:ring-[#022d5c]"
          />
        </div>

        {isForgotPassword ? (
          <div className="space-y-4">
            <Button 
              type="button"
              onClick={handleResetPassword}
              className="w-full bg-[#022d5c] hover:bg-[#D0A348] text-white transition-colors"
              disabled={loading}
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            {message && <p className="text-sm text-green-600">{message}</p>}
            <button
              type="button"
              onClick={() => { setIsForgotPassword(false); setError(null); setMessage(null); }}
              className="w-full text-sm text-[#022d5c] hover:text-[#D0A348] underline transition-colors mt-2"
            >
              Back to Sign In
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="password" className="text-gray-700">Password</Label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={() => { setIsForgotPassword(true); setError(null); setMessage(null); }}
                    className="text-xs text-[#022d5c] hover:text-[#D0A348] underline transition-colors"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input 
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  minLength={6}
                  className="focus-visible:ring-[#022d5c] pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            {error && <p className="text-sm text-red-600">{error}</p>}
            
            <Button 
              type="submit" 
              className="w-full bg-[#022d5c] hover:bg-[#D0A348] text-white transition-colors"
              disabled={loading}
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
          </>
        )}
      </form>

      <p className="text-sm text-gray-500">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
          className="text-[#022d5c] font-medium hover:text-[#D0A348] underline transition-colors"
        >
          {isSignUp ? 'Sign In' : 'Create Account'}
        </button>
      </p>
    </div>
  )
}
