import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, MessageSquare } from "lucide-react";

function Section({ emoji, title, children }) {
  return (
    <section className="mb-8">
      <h2 className="font-display text-ink text-2xl mb-3 flex items-center gap-2">
        <span>{emoji}</span> {title}
      </h2>
      <div className="font-body text-ink text-sm leading-relaxed flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}

export default function Help() {
  return (
    <div className="px-6 py-12 sm:px-10">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="flex items-center gap-1 text-xs font-bold font-body text-cream mb-6 w-fit"
        >
          <ArrowLeft size={14} /> Back to the board
        </Link>

        <div className="relative">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-[22px] h-[22px] rounded-full border border-black/15 shadow-pin z-10 bg-red" />
          <div className="p-6 sm:p-10 bg-cream border-2 border-ink shadow-card">
            <h1 className="font-display text-ink text-3xl mb-1">How to Use the Marketplace</h1>
            <p className="font-body text-inkSoft text-[13px] font-bold mb-8">
              Everything you need to sign up, buy, sell, and stay safe on the Quad.
            </p>

            <Section emoji="🔐" title="Sign In & Create Your Account">
              <ol className="list-decimal list-inside flex flex-col gap-1.5">
                <li>Open the marketplace and click <strong>Sign In</strong>.</li>
                <li>If you don't have an account, select <strong>Create Account / Sign Up</strong>.</li>
                <li>Enter your name, college email, and password.</li>
                <li>After signing up, check your email for the verification email.</li>
                <li>Click the verification link in the email to verify your account.</li>
                <li>
                  Can't find the verification email? Check your Spam/Junk folder — it's
                  sometimes filtered there.
                </li>
                <li>Once your email is verified, return to the marketplace and sign in.</li>
              </ol>
              <p className="p-3 bg-yellow/40 border border-ink">
                <strong>Important:</strong> Use your college email address when creating your
                account so that the marketplace remains limited to the student community.
              </p>
            </Section>

            <Section emoji="🛒" title="Buying an Item">
              <ol className="list-decimal list-inside flex flex-col gap-1.5">
                <li>Browse the listings or use the search bar to find what you need.</li>
                <li>Open a listing to check the price, description, condition, and seller details.</li>
                <li>If you're interested, contact the seller through the available chat option.</li>
                <li>Discuss the price, meeting location, and other details with the seller.</li>
                <li>Inspect the item before completing the transaction.</li>
                <li>Once the deal is completed, remember to update or report the listing if necessary.</li>
              </ol>
            </Section>

            <Section emoji="📦" title="Selling an Item">
              <ol className="list-decimal list-inside flex flex-col gap-1.5">
                <li>Click <strong>Create Listing</strong>.</li>
                <li>Add clear photos of your item.</li>
                <li>Enter an accurate title, price, category, condition, and description.</li>
                <li>Mention any defects or important details honestly.</li>
                <li>Publish your listing.</li>
                <li>Respond to interested buyers and remove the listing once the item is sold.</li>
              </ol>
            </Section>

            <Section emoji="💬" title="Communicating With Other Students">
              <ul className="list-disc list-inside flex flex-col gap-1.5">
                <li>Use the marketplace chat whenever possible.</li>
                <li>Be respectful and clear when communicating.</li>
                <li>Do not spam other users.</li>
                <li>Never share passwords, OTPs, or other sensitive account information.</li>
                <li>Avoid sharing unnecessary personal information.</li>
              </ul>
            </Section>

            <Section emoji="💰" title="Payments & Transactions">
              <p>
                The marketplace helps students find each other, but transactions are between
                the buyer and seller.
              </p>
              <ul className="list-disc list-inside flex flex-col gap-1.5">
                <li>Check the item before paying.</li>
                <li>Agree on the price beforehand.</li>
                <li>Be cautious about advance payments.</li>
                <li>Never share OTPs, passwords, or banking credentials.</li>
                <li>Keep proof of payment when appropriate.</li>
              </ul>
            </Section>

            <Section emoji="🔒" title="Stay Safe">
              <ul className="list-disc list-inside flex flex-col gap-1.5">
                <li>Meet in a safe, public location on campus.</li>
                <li>If possible, have a friend nearby when meeting someone you don't know.</li>
                <li>Verify the item before making payment.</li>
                <li>Be careful with deals that seem unusually good.</li>
                <li>Report suspicious users or listings to the marketplace administrators.</li>
              </ul>
            </Section>

            <Section emoji="🚫" title="Prohibited Listings">
              <p>
                Do not list items that are illegal, dangerous, stolen, or otherwise prohibited
                by college rules or applicable law. Listings that are misleading, fraudulent,
                offensive, or inappropriate may be removed.
              </p>
            </Section>

            <Section emoji="⚠️" title="Important">
              <p>
                The marketplace is a platform for students to connect. Always use your own
                judgment when buying or selling. If you notice a suspicious listing, scam,
                abusive behavior, or other violation, report it to the marketplace
                administrators.
              </p>
              <p className="font-bold">Buy smart. Sell honestly. Stay safe.</p>
            </Section>

            <div className="mt-2 pt-6 border-t-2 border-dashed border-corkDark flex items-center justify-between flex-wrap gap-3">
              <p className="font-body text-inkSoft text-sm">Still stuck, or found a bug?</p>
              <Link
                to="/feedback"
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold font-body bg-red text-cream border-2 border-ink shadow-pin"
              >
                <MessageSquare size={14} /> Send feedback
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
