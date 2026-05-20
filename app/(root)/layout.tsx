import { ReactNode } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Navbar from '@/module/home/components/navbar'



export default async function layout({ children }: { children: ReactNode }) {
  return (
    <main className='flex flex-col min-h-screen relative overflow-x-hidden'>
      <nav className="p-4 bg-transparent fixed top-0 left-0 right-0 z-50 transition-all 
    duration-200 border-b border-transparent
    ">
        <div className="max-w-5xl mx-auto w-full flex justify-between items-center">
          <Link href={'/'} className='flex items-center gap-2'>
            <Image src={"/logo.svg"} alt="itsalogo" width={32} height={32} style={{ width: 32, height: "auto" }} className="dark:invert" />
          </Link>
          <Navbar />
        </div>
      </nav>
      <div
        className='fixed inset-0 -z-0 h-full w-full bg-background dark:bg-[radial-gradient(#393e4a_1px,transparent_1px)] bg-[radial-gradient(#dadde2_1px,transparent_1px)] [background-size:16px_16px]'
      />
      <div className='flex-1 w-full mt-20'>
        {children}
      </div>
    </main>
  )
}
