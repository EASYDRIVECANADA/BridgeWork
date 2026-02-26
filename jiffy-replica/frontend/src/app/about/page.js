'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Lightbulb } from 'lucide-react';

export default function AboutPage() {
  const teamMembers = [
    {
      name: 'Paul Arlin',
      title: 'Chief Marketplace Officer',
      subtitle: 'Co-Founder',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400'
    },
    {
      name: 'Milanie Bano',
      title: 'Mobile Developer',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=400'
    },
    {
      name: 'Caroline Beaudoin',
      title: 'Customer Experience',
      image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400'
    },
    {
      name: 'Rosita Beck',
      title: 'Head of Customer Experience',
      image: 'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?q=80&w=400'
    },
    {
      name: 'Rush Benazir',
      title: 'Mobile Developer',
      image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400'
    },
    {
      name: 'Amanda Beret',
      title: 'Senior Marketing Manager',
      image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=400'
    },
    {
      name: 'Sonia Boisvert',
      title: 'Marketing Advisor',
      image: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?q=80&w=400'
    },
    {
      name: 'Michael Choi',
      title: 'Chief Technology Officer',
      image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?q=80&w=400'
    },
    {
      name: 'Hector Clare',
      title: 'Web Developer',
      image: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?q=80&w=400'
    }
  ];

  const pressQuotes = [
    {
      logo: 'THE GLOBE AND MAIL',
      quote: 'Customers like the prospect of being connected instantly with the services they need, and paying for jobs with a flow of jobs and fast payment, with minimal fuss.'
    },
    {
      logo: 'HUFFINGTON POST',
      quote: 'The app spares appraisal trips, negotiations and the base costs many charge just to show up.'
    },
    {
      logo: 'TORONTO LIFE',
      quote: 'Whatever the crisis yes, putting together IKEA furniture counts), a highly rated handyperson can be there in an hour to solve it.'
    }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - Our Vision */}
      <section className="relative h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?q=80&w=2000"
            alt="Team photo"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">Our Vision</h1>
          <p className="text-xl md:text-2xl max-w-3xl mx-auto">
            Home maintenance should be quick, easy and booked with a few taps.
          </p>
        </div>
      </section>

      {/* Vision Statement Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Text Content */}
            <div className="space-y-6">
              <p className="text-gray-700 leading-relaxed">
                We believe that for small jobs around the house, homeowners would prefer to instantly book a great pro at a pre-determined rate, rather than scour dozens of reviews, obtain multiple quotes and schedule around a specific company's availability. Our goal is to create a marketplace where both homeowners and home service professionals benefit tremendously.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                For homeowners, our platform provides a seamless booking experience, easy-to-understand pricing, responsive customer service and an additional guarantee on all work.
              </p>
              
              <p className="text-gray-700 leading-relaxed">
                For home service professionals, BridgeWork sends firm jobs and takes care of payment, invoicing, and customer service. Are you an amazing pro, or know of one?{' '}
                <Link href="/become-pro" className="text-[#2D7FE6] hover:underline">
                  Apply here and we'll be in touch!
                </Link>
              </p>
            </div>

            {/* Right - Cartoon Character */}
            <div className="flex justify-center">
              <Image
                src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=500"
                alt="BridgeWork Pro Character"
                width={400}
                height={500}
                className="w-full max-w-md"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Our Team Section */}
      <section className="py-20 bg-gray-100">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-4xl md:text-5xl font-bold text-center mb-16 text-[#2D7FE6]">
            OUR TEAM
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 md:gap-12">
            {teamMembers.map((member, index) => (
              <div key={index} className="flex flex-col items-center text-center">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden bg-gray-200 mb-4">
                  <Image
                    src={member.image}
                    alt={member.name}
                    width={160}
                    height={160}
                    className="w-full h-full object-cover"
                  />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{member.name}</h3>
                <p className="text-sm text-gray-600">{member.title}</p>
                {member.subtitle && (
                  <p className="text-xs text-gray-500">{member.subtitle}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="py-20 bg-[#3a3a3a] text-white">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-center gap-4 mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">OUR STORY</h2>
            <Lightbulb className="w-12 h-12 text-white" />
          </div>

          <h3 className="text-2xl md:text-3xl text-center mb-8 font-light">
            We needed a light fixture installed, sounds simple... Right?
          </h3>

          <div className="space-y-6 text-gray-300 leading-relaxed">
            <p>
              We asked for referrals and searched online for an electrician; we read dozens of reviews, called around, left messages, and managed to speak to two companies. The first wasn't interested in the small job, and the second wasn't available for a week. We wanted the fixture installed that afternoon - was that too much to ask?
            </p>

            <p>
              As new homeowners, we found the process of booking trades incredibly outdated and inefficient. We were sure there were electricians nearby, happy to come by for the small job, but had no way to find them (we even considered flagging one down on the street). This frustrating experience inspired us to create a dispatching app that instantly connects homeowners with nearby, available trades...and we called it BridgeWork.
            </p>
          </div>
        </div>
      </section>

      {/* Press Quotes Section */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {pressQuotes.map((press, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
                <div className="mb-6 h-12 flex items-center justify-center">
                  <div className="text-xs font-bold text-gray-400 tracking-wider">
                    {press.logo}
                  </div>
                </div>
                
                <div className="relative">
                  <span className="text-[#2D7FE6] text-5xl absolute -top-4 -left-2">"</span>
                  <p className="text-gray-700 text-sm leading-relaxed pl-6">
                    {press.quote}
                  </p>
                  <span className="text-[#2D7FE6] text-5xl absolute -bottom-8 right-0">"</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* App Download Section */}
      <section className="py-20 bg-[#4a4a4a]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left - Phone Mockups */}
            <div className="flex justify-center gap-8">
              <div className="relative">
                <Image
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=300"
                  alt="App Screenshot 1"
                  width={200}
                  height={400}
                  className="rounded-3xl shadow-2xl"
                />
              </div>
              <div className="relative mt-12">
                <Image
                  src="https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=300"
                  alt="App Screenshot 2"
                  width={200}
                  height={400}
                  className="rounded-3xl shadow-2xl"
                />
              </div>
            </div>

            {/* Right - Download Info */}
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-white mb-4">
                Download the app<br />on Apple or Android:
              </h2>
              
              <div className="flex gap-6 justify-center md:justify-start mb-8">
                <Link href="#" className="hover:opacity-80 transition-opacity">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                    </svg>
                  </div>
                </Link>
                <Link href="#" className="hover:opacity-80 transition-opacity">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z"/>
                    </svg>
                  </div>
                </Link>
              </div>

              <div className="flex justify-center md:justify-start">
                <Image
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=300"
                  alt="BridgeWork Character"
                  width={200}
                  height={250}
                  className="w-48"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
