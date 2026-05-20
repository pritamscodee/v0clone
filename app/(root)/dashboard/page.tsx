'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Loader } from 'lucide-react'

interface Project {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

export default function DashboardPage() {
  const { isSignedIn, isLoaded } = useAuth()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/')
    }
  }, [isLoaded, isSignedIn, router])

  useEffect(() => {
    if (isSignedIn) {
      fetchProjects()
    }
  }, [isSignedIn])

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects')
      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projectId: string) => {
    try {
      setDeleting(projectId)
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        setProjects(projects.filter(p => p.id !== projectId))
      }
    } catch (error) {
      console.error('Error deleting project:', error)
    } finally {
      setDeleting(null)
    }
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

  return (
    <div className='relative z-10 flex items-start justify-center w-full px-4 py-8'>
      <div className='max-w-5xl w-full'>
        <div className='mb-8'>
          <h1 className='text-4xl font-bold text-foreground mb-2'>Your Projects</h1>
          <p className='text-foreground/70'>Manage and view your AI-generated projects</p>
        </div>

        {loading ? (
          <div className='flex items-center justify-center h-64'>
            <Loader className='animate-spin' />
          </div>
        ) : projects.length === 0 ? (
          <Card className='p-8 text-center'>
            <p className='text-foreground/70 mb-4'>No projects yet. Create one to get started!</p>
            <Link href='/'>
              <Button>Create Project</Button>
            </Link>
          </Card>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {projects.map((project) => (
              <Card key={project.id} className='p-4 flex flex-col justify-between hover:border-foreground/50 transition-colors'>
                <div>
                  <h3 className='font-semibold text-foreground truncate'>{project.name}</h3>
                  <p className='text-sm text-foreground/60 mt-1'>
                    Created {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className='flex gap-2 mt-4'>
                  <Link href={`/projects/${project.id}`} className='flex-1'>
                    <Button variant='outline' className='w-full'>View</Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant='destructive' size='sm'>Delete</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogTitle>Delete Project</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete &quot;{project.name}&quot;? This action cannot be undone.
                      </AlertDialogDescription>
                      <div className='flex gap-2 justify-end'>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(project.id)}
                          disabled={deleting === project.id}
                          className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        >
                          {deleting === project.id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </div>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
