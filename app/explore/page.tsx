import React from 'react'
import Navbar from '@/components/Navbar'
import ExploreGigHero from '@/components/explore/ExploreGigHero'
import Footer from '@/components/Footer'

const page = () => {
  return (
    <div>
        <Navbar/>
        <ExploreGigHero/>
        <Footer/>
    </div>
  )
}

export default page