'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mic, PenTool, Calendar, Heart, Settings, ChevronRight, X } from 'lucide-react'
import Link from 'next/link'

interface WelcomeGuideProps {
  onDismiss: () => void
}

export function WelcomeGuide({ onDismiss }: WelcomeGuideProps) {
  const steps = [
    {
      title: 'Record or upload a sermon',
      description: 'Auto-transcribe & build an outline',
      icon: Mic,
      href: '/sermons?record=1',
      color: 'text-amber-700',
      bgColor: 'bg-amber-100',
    },
    {
      title: 'Write a new sermon',
      description: 'Start drafting your message',
      icon: PenTool,
      href: '/sermons/new',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Add a prayer or care request',
      description: 'Care for your congregation',
      icon: Heart,
      href: '/care',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'View your ministry calendar',
      description: 'Optional external sync available',
      icon: Calendar,
      href: '/calendar',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Personalize your settings',
      description: 'Set church name & phone alerts',
      icon: Settings,
      href: '/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ]

  return (
    <Card className="mb-6 border-none overflow-hidden shadow-lg bg-gradient-to-br from-white to-[#F8F5EE]">
      <div className="bg-gradient-to-r from-[#022d5c] to-[#061e38] p-6 sm:p-8 text-white flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-playfair mb-1.5">Welcome to The Shepherd&apos;s Desk! 🐑</h2>
          <p className="text-blue-100 text-sm sm:text-base">
            Pick anything below to begin, or tap <strong className="text-[#D0A348]">✨ Assistant</strong> at the top of any screen to speak what you need.
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-blue-200 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
          title="Dismiss welcome guide"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      <CardContent className="p-6 sm:p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {steps.map((step, i) => (
            <Link key={i} href={step.href}>
              <div className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-[#D0A348] hover:shadow-md transition-all bg-white group cursor-pointer h-full">
                <div className={`p-3 rounded-lg ${step.bgColor} ${step.color} shrink-0`}>
                  <step.icon className="w-6 h-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#022d5c] group-hover:text-[#D0A348] transition-colors">{step.title}</h3>
                  <p className="text-sm text-gray-500 truncate">{step.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-[#D0A348] shrink-0" />
              </div>
            </Link>
          ))}
        </div>
        
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            onClick={onDismiss}
            className="text-gray-600 hover:text-[#022d5c] border-gray-200"
          >
            Skip setup &amp; explore on my own
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
