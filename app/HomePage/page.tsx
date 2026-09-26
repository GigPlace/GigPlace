import Navbar from '@/components/Navbar'
import HeroSection from '@/components/home/HeroSection'
import PlatformStats from '@/components/PlatformStats'
import PlatformValue from '@/components/home/PlatformValue'
import HowItWorks from '@/components/home/HowItWorks'
import PopularCategories from '@/components/home/PopularCategories'
import FeaturedGigs from '@/components/home/FeaturedGigs'
import WhyGigPlace from '@/components/home/WhyGigPlace'
import React from 'react'

const page = () => {
  return (
    <div>
        <Navbar/>
        <HeroSection/>
        <PlatformValue/>
        <HowItWorks/>
        <PopularCategories/>
        <FeaturedGigs/>
        <WhyGigPlace/>
        {/* <PlatformStats/> */}
    </div>
  )
}

export default page