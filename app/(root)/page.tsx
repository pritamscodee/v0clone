import ProjectForm from '@/module/home/components/project-form'
import Image from 'next/image'

const Page = () => {
  return (
    <div className='relative z-10 flex items-start justify-center w-full px-4 py-8'>
      <div className='max-w-5xl w-full'>
        <section className='flex flex-col items-center text-center gap-8'>

          <div className='flex flex-col items-center'>
            <Image
              width={100}
              height={100}
              alt='Logo'
              src={'/logo.svg'}
              className='dark:invert block'
            />
          </div>

          <h1 className='text-2xl md:text-5xl font-bold text-center text-foreground'>
            Build Something with 💓
          </h1>

          <p className='text-lg md:text-xl text-center text-foreground/70'>
            Create apps and websites by chatting with AI
          </p>

          <div className='max-w-3xl w-full'>
            <ProjectForm />
          </div>

        </section>
      </div>
    </div>
  )
}

export default Page
