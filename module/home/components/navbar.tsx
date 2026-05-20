'use client'

import { useAuth, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import { Button } from '@/components/ui/button'

const Navbar = () => {
  const { isSignedIn } = useAuth()

  return (
    <div className='flex items-center gap-3'>
      {isSignedIn ? (
        <UserButton />
      ) : (
        <>
          <SignInButton mode='modal'>
            <Button variant='ghost' size='sm'>
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode='modal'>
            <Button size='sm'>
              Sign Up
            </Button>
          </SignUpButton>
        </>
      )}
    </div>
  )
}

export default Navbar
