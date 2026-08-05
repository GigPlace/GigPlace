import Navbar from '@/components/Navbar'
import HeroSection from '@/components/HeroSection'
import PlatformStats from '@/components/PlatformStats'
import React from 'react'

const page = () => {
  return (
    <div>
        <Navbar/>
        <HeroSection/>
        <PlatformStats/>
    </div>
  )
}

export default page