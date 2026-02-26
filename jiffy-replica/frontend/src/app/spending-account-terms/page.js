'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';

export default function SpendingAccountTermsPage() {
  const [selectedCountry, setSelectedCountry] = useState('Canada');
  const [openAccordion, setOpenAccordion] = useState(null);

  const toggleAccordion = (index) => {
    setOpenAccordion(openAccordion === index ? null : index);
  };

  const accordionSections = [
    {
      title: '1. About the BridgeWork+ Spending Account',
      content: `The BridgeWork+ Spending Account is designed to make life easier for homeowners when paying for Home Services. Homeowners receive an annual spending account equal to the amount required by the membership offer ("Coupon Amount") plus the value Goods and Services Tax or Harmonized Sales Tax ("Sales Tax") imposed on the Coupon Amount, that can be applied towards eligible Home Services, and all the benefits of the BridgeWork+ subscription, including $25 off every Home Service that is an Eligible Service (as defined below). Homeowners can use the Coupon Amount and applicable Sales Tax (together "Maximum Coupon Value") as payment for Home Services at a reduced rate in exchange for participation in the program. It is not a "gift certificate" as defined in the Consumer Protection Act, 2002 (Ontario) as no funds are issued in connection with the BridgeWork+ Spending Account. Instead, a coupon is issued to pay (in whole or in part) for an eligible Home Service (as described below in Section 3). Each year, the BridgeWork+ Spending Account resets meaning that the Coupon Amount and applicable Sales Tax (together "Maximum Coupon Value") for any unused portion thereof) does not rollover into subsequent Subscription years (as described below in Section 5).`
    },
    {
      title: '2. Application of BridgeWork+ SA Terms',
      content: `By subscribing for a BridgeWork+ Spending Account (the "Subscription"), you agree to these BridgeWork+ SA Terms as well as any other specific terms presented to you at the time of your enrollment.\n\nAny capitalized terms that are used in these BridgeWork+ SA Terms, but not defined, shall have the same meaning as set out in the General Terms. To the extent of any inconsistency between these BridgeWork+ SA Terms and the General Terms and Conditions, these BridgeWork+ SA Terms shall govern.`
    },
    {
      title: '3. Perks of the BridgeWork+ Spending Account',
      content: `Your Subscription entitles you to the following:\n\na. A spending account coupon ("Coupon") equal to the Maximum Coupon Value that can be applied to Home Services that are Eligible services; and\n\nb. The benefits of a BridgeWork+ subscription plan during the term of your Subscription, including $25 off every Home Service that is an Eligible Service ("Discount"), which will be governed by the BridgeWork+ Terms (together with Section 2(a) and (b), the "BridgeWork+ SA Benefits").\n\nDiscounts and Coupons may be redeemed against any Home Services performed by Home Service Professionals within the "Eligible Services"). BridgeWork reserves the right to add or remove to Eligible Services at its sole discretion. You may browse the Eligible Services by using the App.\n\nYour Coupon will be valid for a period of twelve months beginning from the date you start your Subscription ("Coupon Window"). Upon termination of a Coupon Window: (i) any remaining and unused Coupon value will become void; (ii) you will be granted a new Coupon; and (iii) a new Coupon Window will commence for a period of twelve months beginning from the date the previous Coupon Window terminated.\n\nYour instruction to redeem some or all of your Coupons by requesting an Eligible Service via the App constitutes your specific instruction to redeem said Coupon in the amount or amounts specified at the time of your instructions. Upon receiving said instruction, your Coupon value will be automatically applied towards the cost of an Eligible Service. Coupons are non-transferable and cannot be converted into currency. Coupons will be applied on the total cost due to the Home Service Professional providing the Eligible Services after all applicable taxes are calculated. For clarity, the Maximum Coupon Value is a gross amount that includes applicable Sales Tax. Coupons may be subject to a maximum redemption value per Eligible Service, which will be notified to Users before they redeem their Coupons.\n\n1. A reduction in the amount of the pre-tax cost of Eligible Services up to a maximum of the Coupon Amount; and\n2. A reduction of the Sales Tax calculated upon the pre-tax cost of said Eligible Services.\n\nIf the User is a GST/HST registrant with an active Canada Revenue Agency ("CRA") GST Number and the subscription used whether fully or partially in support of a commercial activity, the User may, in certain circumstances be eligible for a full or partial Input tax credit ("ITC").\n\nIf the User chooses to claim a full or part ITC related to the BridgeWork+ Spending Account, it is BridgeWork's position that the ITC may only be claimed on the Sales Tax collected on the User's Subscription payments - no ITC is available to the User upon the redemption of all or any portion of the Coupon. As Sales Tax and ITC issues are complex, you are encouraged that BridgeWork has advised you to seek your own independent tax advice in respect to the details, eligibility or quantity of any ITCs, whether related to User's Subscription payment(s) or the Coupon redemption that this User has claimed or can claim.\n\nEach Subscription shall be associated with one Premises only ("Spending Account Property"). For clarity, Coupons are only redeemable for Eligible Services at said Spending Account Property.`
    },
    {
      title: '4. Subscription Fees and Charges',
      content: `Users agree to pay all Subscription fees (inclusive of GST/HST) set out in the electronic or written order form at the time of registration, including any fees for renewal terms, as well as applicable taxes ("Fees"). Fees may be charged monthly or annually, as set out in the electronic or written order form at the time of registration for a Subscription. All Fees are non-refundable.\n\nBy providing credit card information to any of the BridgeWork Companies, the User thereby authorizes us to charge the credit card for all Fees incurred by the User in connection with the Subscription. You are responsible for keeping your credit card information up to date. If your credit card expires, is invalid, or is otherwise not able to be charged for Fees (or any reason, your Subscription may not be confirmed or renewed (as applicable). You must provide a valid credit card within such a ten (10) day time period, we will cancel the Subscription in accordance with Section 5 below.\n\nYour initial Subscription term will be for a period of twelve (12) months. If you do not cancel your Subscription prior to the start of the next billing cycle, on the day your initial Subscription term expires, your Subscription will renew for a term equal in length to your initial Subscription term. The relevant Fees will be charged to your credit card at the time of renewal in accordance with the then-current Fees.`
    },
    {
      title: '5. Cancellation',
      content: `Subscription cancellations may be made through the cancellation feature within the App. If you or BridgeWork cancel your Subscription (as applicable), you will be required to pay a buyout of: BridgeWork if the Coupon value you've redeemed during the current Coupon Window ("Redeemed Value") is higher than the Fees you have paid during the same Coupon Window ("Paid Fees"). For clarity, upon cancellation:\n\na. If the Redeemed Value is less than Paid Fees, you will not be required to pay a buyout fee. Upon cancellation, all unused and unredeemed Coupon value will expire automatically.\n\nb. If the Redeemed Value is more than the Paid Fees but less than the Fees for an annual Subscription ("Annual Fee"), you will be required to pay a buyout fee calculated as follows: Redeemed Value – Paid Fees. Upon cancellation, all unused and unredeemed Coupon value will expire automatically.\n\nc. If the Redeemed Value is more than the Paid Fees and the Annual Fee, you will be required to pay a buyout fee calculated as follows: Annual Fee – Paid Fees. Following cancellation, all unused and unredeemed Coupon value will expire automatically.\n\nFor Users wishing to cancel their Subscription, the total buyout fee will be calculated and shown to you when you use the cancellation feature within the App. If BridgeWork cancels a Subscription, we will invoice you the applicable buyout fee via the App. You may not redeem remaining and unredeemed Coupon value to pay a buyout fee. By providing credit card information to us in connection with a Subscription, you hereby authorize us to charge the credit card for any applicable buyout fee. You are responsible for keeping your credit card information up to date. If your credit card expires, you may not be able to enroll in your BridgeWork+ Spending Account. BridgeWork reserves the right to withhold a User Account from accessing all or part of the Service as per the General Terms until outstanding buyout fees are paid.\n\nUpon cancellation of your Subscription, your BridgeWork+ subscription will be automatically cancelled. You may choose to enroll for a new BridgeWork+ subscription, in accordance with the BridgeWork+ Terms.`
    },
    {
      title: '6. Changes to the BridgeWork+ Account',
      content: `The BridgeWork Companies reserve the right to modify or stop offering the BridgeWork+ Spending Account or change the BridgeWork+ SA Benefits, buyout fees or Fees at any time without notice. If we make material modifications to the BridgeWork+ SA Benefits, buyout fees or Fees, we will provide you with at least thirty (30) days' prior notice through the App or via email before such changes take effect. All such changes will be effective thirty (30) days following the date of the notice.`
    },
    {
      title: '7. Trial to the BridgeWork+ Account Benefits',
      content: `We may make available, at our sole discretion, a discounted trial for the BridgeWork+ Spending Account ("Trial"). The Trial may be for a part of or a modified version of the regular BridgeWork+ Spending Account, which will be made known to you when you commence the Trial. Unless otherwise specified at the time of Trial registration, the Trial shall last thirty (30) days. We may terminate the Trial at any time in our sole discretion and may accept or decline any Trial request.\n\nUpon expiration of the Trial, the User's BridgeWork+ Spending Account will move to a full Subscription and the User will be required to pay the then-current Fees unless the User cancels the Subscription by notifying us.`
    },
    {
      title: '8. Restrictions',
      content: `The BridgeWork Companies reserve the right to restrict Users from enrolling in a BridgeWork+ Spending Account after cancelling a previous Subscription or cancelling a previous BridgeWork+ subscription. BridgeWork Companies reserves the right to restrict Requesting Users from subscribing for more than one BridgeWork+ Spending Account for the same Spending Account Property.`
    },
    {
      title: '9. Changes to these Terms',
      content: `We reserve the right to modify these BridgeWork+ SA Terms at any time. If we make changes to these BridgeWork+ SA Terms, we will notify you by providing thirty (30) days' prior notice, either by posting a notice in the App or sending you an email, as appropriate. Any revisions to these BridgeWork+ SA Terms shall become effective thirty (30) days following posting of the notice and your decision to continue your Subscription thereafter shall constitute your acceptance of the revised BridgeWork+ SA Terms. If you do not agree to any of the revisions, then you remedy is to cancel your BridgeWork+ Spending Account as described above.`
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          BridgeWork+ Spending Account Terms & Conditions
        </h1>

        {/* Country Selector */}
        <div className="mb-8">
          <label className="block text-sm text-gray-700 mb-2">
            See terms and conditions for:
          </label>
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
          >
            <option value="Canada">Canada</option>
            <option value="USA">USA</option>
          </select>
        </div>

        {/* Introductory Text */}
        <div className="mb-8 text-sm text-gray-700 leading-7 space-y-4">
          <p>
            BridgeWork+ Spending Account is a subscription program available to Users (as defined in the General Terms and Conditions available at{' '}
            <Link href="/terms" className="text-[#2D7FE6] hover:underline">
              https://BridgeWork.com/terms_and_conditions
            </Link>
            ) with a User Account (as defined in the General Terms and Conditions) who are Homeowners (as defined in the General Terms and Conditions) in connection with the BridgeWork web platform and mobile application (collectively, the "App") for homeowners using the App ("you", "your", "User"). In addition to these Terms and Conditions (the "BridgeWork+ SA Terms"), your use of the BridgeWork+ Spending Account is governed by BridgeWork's standard Terms and Conditions available at{' '}
            <Link href="/terms" className="text-[#2D7FE6] hover:underline">
              https://BridgeWork.com/terms_and_conditions
            </Link>
            {' '}(the "General Terms") and the terms of the BridgeWork+ Terms and Conditions available at{' '}
            <Link href="/jiffy-terms" className="text-[#2D7FE6] hover:underline">
              https://BridgeWork.com/jiffy_plus_terms_and_conditions
            </Link>
            {' '}(the "BridgeWork+ Terms"), which apply in respect of the BridgeWork+ membership.
          </p>
        </div>

        <hr className="border-gray-300 mb-8" />

        {/* Accordion Sections */}
        <div className="space-y-0">
          {accordionSections.map((section, index) => (
            <div key={index} className="border-b border-gray-300">
              <button
                onClick={() => toggleAccordion(index)}
                className="w-full flex items-center justify-between py-4 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-base font-semibold text-gray-900 pr-4">
                  {section.title}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-gray-600 flex-shrink-0 transition-transform ${
                    openAccordion === index ? 'transform rotate-180' : ''
                  }`}
                />
              </button>
              {openAccordion === index && (
                <div className="pb-6 px-4">
                  <div className="text-sm text-gray-700 leading-7 whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footer Section */}
        <div className="mt-12 pt-8 border-t border-gray-300 text-center">
          <p className="text-sm text-gray-700 mb-4">
            If you have any questions about the BridgeWork+ Spending Account, please contact our Help Desk.
          </p>
          <p className="text-xs text-gray-600">
            Last updated date: <strong>November 2025</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
