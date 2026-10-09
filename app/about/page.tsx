import React from 'react'
import Navbar from '@/components/Navbar'
import AboutHero from '@/components/about/AboutHero'
import Footer from '@/components/Footer'

const page = () => {
  return (
    <div>
        <Navbar/>
      <AboutHero/>
      <Footer/>
    </div>
  )
}

export default page