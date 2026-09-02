'use client'

import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { PenTool, Calendar, Lightbulb, Heart, Settings, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface WelcomeGuideProps {
  onDismiss: () => void
}

export function WelcomeGuide({ onDismiss }: WelcomeGuideProps) {
  const steps = [
    {
      title: 'Create your first sermon',
      description: 'Start drafting your message',
      icon: PenTool,
      href: '/sermons/new',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Set up your calendar',
      description: 'Plan your ministry schedule',
      icon: Calendar,
      href: '/calendar',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Capture an idea',
      description: 'Jot down inspiration',
      icon: Lightbulb,
      href: '/ideas',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Add a prayer request',
      description: 'Care for your congregation',
      icon: Heart,
      href: '/care',
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
    {
      title: 'Personalize your settings',
      description: 'Configure your preferences',
      icon: Settings,
      href: '/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    },
  ]

  return (
    <Card className="mb-8 border-none overflow-hidden shadow-lg bg-gradient-to-br from-white to-[#F8F5EE]">
      <div className="bg-gradient-to-r from-[#022d5c] to-[#061e38] p-8 text-white">
        <h2 className="text-3xl font-bold font-playfair mb-2">Welcome to The Shepherd's Desk! 🐑</h2>
        <p className="text-blue-100 text-lg">Let's get you set up in just a few steps</p>
      </div>
      
      <CardContent className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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
            variant="ghost" 
            onClick={onDismiss}
            className="text-gray-500 hover:text-[#022d5c]"
          >
            I'll explore on my own
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
