'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter, useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Loader, Send, Copy, Check } from 'lucide-react'
import Link from 'next/link'

interface Message {
  id: string
  content: string
  role: 'USER' | 'ASSISTANT'
  type: 'RESULT' | 'ERROR'
  createdAt: string
  fragments?: {
    id: string
    sandboxUrl: string
    title: string
    files: any
  }
}

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export default function ProjectPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const params = useParams()
  const projectId = params?.id as string
  const [project, setProject] = useState<Project | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [sandboxUrl, setSandboxUrl] = useState<string | null>(null)
  const [buildStatus, setBuildStatus] = useState<string>('idle')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (isSignedIn && projectId) {
      fetchProjectDetails()
    }
  }, [isSignedIn, projectId])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}`)
      if (response.ok) {
        const data = await response.json()
        setProject(data.project)
        setMessages(data.messages)
        
        // Get sandbox URL from the last message with fragments
        const lastMessageWithFragment = data.messages.find((m: Message) => m.fragments?.sandboxUrl)
        if (lastMessageWithFragment?.fragments) {
          setSandboxUrl(lastMessageWithFragment.fragments.sandboxUrl)
        }
      } else if (response.status === 404) {
        router.push('/dashboard')
      }
    } catch (error) {
      console.error('Error fetching project:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    const userMessage = input
    setInput('')
    setSending(true)
    setBuildStatus('building')

    // Add user message to UI immediately
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      content: userMessage,
      role: 'USER',
      type: 'RESULT',
      createdAt: new Date().toISOString()
    }])

    try {
      const response = await fetch(`/api/projects/${projectId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userMessage }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Add assistant message
        setMessages(prev => [...prev, {
          id: data.id,
          content: data.content,
          role: 'ASSISTANT',
          type: data.type,
          createdAt: data.createdAt,
          fragments: data.fragments
        }])

        // Update sandbox URL if available
        if (data.fragments?.sandboxUrl) {
          setSandboxUrl(data.fragments.sandboxUrl)
        }
      }
      setBuildStatus('completed')
    } catch (error) {
      console.error('Error sending message:', error)
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: 'Failed to process your request. Please try again.',
        role: 'ASSISTANT',
        type: 'ERROR',
        createdAt: new Date().toISOString()
      }])
      setBuildStatus('error')
    } finally {
      setSending(false)
    }
  }

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  if (!isLoaded) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' />
      </div>
    )
  }

  if (!isSignedIn) {
    return null
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <Loader className='animate-spin' />
      </div>
    )
  }

  if (!project) {
    return (
      <div className='flex items-center justify-center h-screen flex-col gap-4'>
        <p className='text-foreground/70'>Project not found</p>
        <Link href='/dashboard'>
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className='flex h-[calc(100vh-80px)] relative z-10'>
      {/* Chat Section */}
      <div className='flex-1 flex flex-col border-r border-border'>
        <div className='p-4 border-b border-border'>
          <div className='flex items-center justify-between'>
            <div>
              <h1 className='text-2xl font-bold text-foreground'>{project.name}</h1>
              <p className='text-sm text-foreground/60'>Created {new Date(project.createdAt).toLocaleDateString()}</p>
            </div>
            <Link href='/dashboard'>
              <Button variant='outline'>Back</Button>
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className='flex-1 overflow-y-auto p-4 space-y-4'>
          {messages.length === 0 ? (
            <div className='flex items-center justify-center h-full text-foreground/50'>
              <p>No messages yet. Start by describing what you want to build!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'USER' ? 'justify-end' : 'justify-start'}`}
              >
                <Card className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-2 ${
                  message.role === 'USER'
                    ? 'bg-primary text-primary-foreground'
                    : message.type === 'ERROR'
                    ? 'bg-destructive/10 border-destructive/50'
                    : 'bg-muted'
                }`}>
                  <p className='text-sm whitespace-pre-wrap break-words'>{message.content}</p>
                  <p className='text-xs opacity-70 mt-1'>
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                </Card>
              </div>
            ))
          )}
          {sending && (
            <div className='flex justify-start'>
              <Card className='bg-muted px-4 py-2'>
                <div className='flex gap-2 items-center'>
                  <Loader className='w-4 h-4 animate-spin' />
                  <span className='text-sm'>{buildStatus === 'building' ? 'Building...' : 'Processing...'}</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className='p-4 border-t border-border'>
          <form onSubmit={handleSendMessage} className='flex gap-2'>
            <Input
              placeholder='Describe what you want to build...'
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={sending}
              className='flex-1'
            />
            <Button
              type='submit'
              disabled={sending || !input.trim()}
              size='icon'
            >
              {sending ? <Loader className='w-4 h-4 animate-spin' /> : <Send className='w-4 h-4' />}
            </Button>
          </form>
        </div>
      </div>

      {/* Preview Section */}
      <div className='hidden lg:flex flex-col w-1/2 border-l border-border'>
        <div className='p-4 border-b border-border'>
          <h2 className='font-semibold text-foreground'>Live Preview</h2>
        </div>
        <div className='flex-1 relative'>
          {sandboxUrl ? (
            <>
              <iframe
                src={sandboxUrl}
                className='w-full h-full border-none'
                title='Sandbox Preview'
              />
              <div className='absolute top-2 right-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => copyToClipboard(sandboxUrl, 'sandbox')}
                  className='gap-2'
                >
                  {copied === 'sandbox' ? (
                    <>
                      <Check className='w-4 h-4' />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className='w-4 h-4' />
                      Copy URL
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <div className='flex items-center justify-center h-full text-foreground/50'>
              <p>No preview available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
