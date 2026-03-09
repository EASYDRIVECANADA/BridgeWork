'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, Award } from 'lucide-react';

export default function HomeownerProtectionPage() {
  const [openAccordion, setOpenAccordion] = useState(null);

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const accordionItems = [
    { title: '1. About our Homeowner Protection Promise' },
    { title: '2. Eligibility Requirements' },
    { title: '3. Filing and Processing a Claim' },
    { title: '4. Remedying Your Eligible Claim' },
    { title: '5. Waiver and Release' },
    { title: '6. Recourse from Home Service Professional' },
    { title: '7. Amendments' },
    { title: '8. Termination' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with House Image */}
      <section className="relative">
        {/* House Image - No overlay */}
        <div className="relative h-[200px] w-full">
          <Image
            src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?q=80&w=2000"
            alt="Houses"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Yellow Badge Icon - Overlapping */}
        <div className="absolute left-1/2 transform -translate-x-1/2 top-[150px] z-20">
          <div className="w-24 h-24 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
            <Award className="w-12 h-12 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Content Section - White Background */}
        <div className="bg-white pt-16 pb-12">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
              Homeowner Protection Promise
            </h1>
            
            <p className="text-sm text-gray-700 leading-7 mb-4">
              We stand by the work provided by pre-screened Home Service Professionals that Homeowners contract with through our platform and we strive to create the best possible experience for Homeowners. We understand, however, that unexpected things can happen and while BridgeWork is not a party to the contract between any Homeowner/service recipient and any Home Service Professional, we want to ensure your BridgeWork experience keeps you coming back.
            </p>
            
            <p className="text-sm text-gray-700 leading-7">
              At BridgeWork, we stand behind every job with our <strong>Homeowner Protection Promise</strong>, so you can be confident you're getting a high level of service every time.
            </p>
          </div>
        </div>
      </section>

      {/* Overview Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white border-2 border-gray-300 rounded-lg p-8 shadow-sm">
            <p className="text-center text-gray-800 font-semibold mb-8">
              Here's an overview of the Homeowner Protection Promise. You can find the full details further below.
            </p>

            {/* Item 1 */}
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">1</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Top Quality Professionals</h3>
                  <p className="text-sm text-gray-700 leading-relaxed mb-2">
                    We bring on top quality Home Service Professionals and maintain a pre-screening process consisting of background checks, reference calls and multiple training sessions to ensure new Home Service Professionals on our platform are delivering the best possible service from the start.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Prior to joining BridgeWork, our team will ensure that new Home Service Professionals have valid credentials (licences etc.) for their trades where required and have sufficient and valid insurance for the services they're providing.
                  </p>
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div className="mb-8">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">2</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">We stand behind your job</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    If you're not reasonably satisfied with the work completed and can't work it out with the applicable Home Service Professional, we are there to help. If you submit a Claim and if it meets our Eligibility Requirements (see the rules below), we will take appropriate action(s) to fix the situation.
                  </p>
                </div>
              </div>
            </div>

            {/* Item 3 */}
            <div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center">
                    <span className="text-white font-bold text-sm">3</span>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-3">Ongoing Support</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Along the way, we will provide prompt support from our Help Desk. Our team of customer support experts will always be there to support you and resolve any issues with work booked through the BridgeWork platform. We pride ourselves on quick response times. If you have an issue, let us know and you will hear back quickly.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Details Section */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Homeowner Protection Promise - The Details
          </h2>

          {/* Important Note Box */}
          <div className="bg-white border-2 border-gray-300 rounded-lg p-8 mb-8 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Important Note</h3>
            <div className="text-sm text-gray-700 leading-relaxed space-y-3">
              <p>
                This Homeowner Protection Promise sets out our policies and practices in assisting Homeowners but remains subject to the limits and exclusions provided in our General Terms of Service and in no way changes or expands the role of our Service as a platform to connect Requesting Users with Home Service Professionals. We do not provide Home Service Professionals or the services they provide. <strong>The BridgeWork Homeowner Protection Promise does not create any contractual relationship or liability for BridgeWork in connection with a Requesting User's agreement with a Home Service Professional.</strong> Filing a Claim under the BridgeWork Homeowner Protection Promise in no way restricts your ability to seek a recourse directly from the Home Service Professional with whom you contracted for the job.
              </p>
              <p className="text-xs italic text-gray-600">
                Capitalized terms used but not defined herein have the meanings given in the General Terms of Service.
              </p>
            </div>
          </div>

          {/* Accordion Items */}
          <div className="space-y-4">
            {accordionItems.map((item, index) => (
              <div key={index} className="border-b border-gray-300">
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="text-base font-semibold text-gray-900">{item.title}</span>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-600 transition-transform ${
                      openAccordion === index ? 'transform rotate-180' : ''
                    }`}
                  />
                </button>
                {openAccordion === index && (
                  <div className="pb-4 px-4">
                    <p className="text-sm text-gray-700">
                      Content for {item.title} would go here.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer Section */}
      <section className="py-8 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-gray-700">
            If you have any questions about the BridgeWork Homeowner Protection Promise, you may email us at{' '}
            <a href="mailto:info@BridgeWork.com" className="text-[#0E7480] hover:underline">
              info@BridgeWork.com
            </a>
            .
          </p>
          <p className="text-xs text-gray-600 mt-2">
            Last updated date: <strong>November 2025</strong>
          </p>
        </div>
      </section>
    </div>
  );
}
