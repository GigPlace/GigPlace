import Navbar from '@/components/Navbar'
import HeroSection from '@/components/home/HeroSection'
import PlatformStats from '@/components/PlatformStats'
import PlatformValue from '@/components/home/PlatformValue'
import HowItWorks from '@/components/home/HowItWorks'
import PopularCategories from '@/components/home/PopularCategories'
import FeaturedGigs from '@/components/home/FeaturedGigs'
import WhyGigPlace from '@/components/home/WhyGigPlace'
import FinalCTA from '@/components/home/FinalCTA'
import Footer from '@/components/Footer'
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
        <FinalCTA/>
        {/* <PlatformStats/> */}
        <Footer/>
    </div>
  )
}

export default page