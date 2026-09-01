'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSignUp, setIsSignUp] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    try {
      const supabase = createClient()

      if (isSignUp) {
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
        })
        if (authError) throw authError
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
      <div className="space-y-2 flex flex-col items-center">
        <img 
          src="/logo.png" 
          alt="Shepherd's Desk" 
          className="h-44 w-auto"
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
            className="focus-visible:ring-[#082C50]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-gray-700">Password</Label>
          <div className="relative">
            <Input 
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="focus-visible:ring-[#082C50] pr-10"
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
          className="w-full bg-[#082C50] hover:bg-[#D0A348] text-white transition-colors"
          disabled={loading}
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Create Account' : 'Sign In')}
        </Button>
      </form>

      <p className="text-sm text-gray-500">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
          className="text-[#082C50] font-medium hover:text-[#D0A348] underline transition-colors"
        >
          {isSignUp ? 'Sign In' : 'Create Account'}
        </button>
      </p>
    </div>
  )
}
