import { MdArrowUpward } from 'react-icons/md'
import whiteLogo from '../../assets/foose-logo-white.png'
import { withBasePath } from '../../utils/navigation'

const FOOTER_GROUPS = [
  {
    links: [
      ['Browse All', '/browse'],
      ['Fresh Drops', '/fresh-drops'],
      ['DigiShops', '/digishops'],
      ['Bale Wholesale', '/bales'],
    ],
    title: 'Marketplace',
  },
  {
    links: [
      ['Events', '/community?tab=events'],
      ['Sellers Hub', '/open-shop'],
      ['Style Guide', '/community?tab=finspo'],
      ['Forum', '/community'],
    ],
    title: 'Community',
  },
  {
    links: [
      ['Help Center', '/inbox?support=true'],
      ['Verification', '/kyc'],
      ['Shipping', '/checkout'],
      ['Returns', '/orders/history'],
    ],
    title: 'Support',
  },
]

function scrollToTop() {
  window.scrollTo({ behavior: 'smooth', top: 0 })
}

export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-16 overflow-hidden border-t-0 bg-[radial-gradient(circle_at_85%_0%,rgb(55_77_204_/_28%),transparent_38%),linear-gradient(130deg,#101735,#151f52_70%,#1d2d78)] text-sm text-white/70">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 pb-[calc(2.5rem+var(--foose-bottom-nav-inset))] pt-10 sm:gap-12 sm:px-5 sm:pt-12 md:px-6 lg:max-w-[1440px] lg:gap-[72px] lg:px-9 lg:pt-[76px] lg:pb-8">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-[72px]">
          <div className="flex max-w-sm flex-col gap-3 lg:max-w-[330px] lg:gap-[18px]">
            <img alt="Foose" className="h-auto w-28 sm:w-[120px] lg:w-[132px]" src={whiteLogo} />
            <p className="text-sm leading-[1.8] text-white/65 lg:text-[15px]">Ghana&apos;s second-hand fashion hub. Curated, authenticated, delivered.</p>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-10 lg:flex lg:gap-[clamp(30px,5vw,84px)]">
            {FOOTER_GROUPS.map((group) => (
              <nav className="flex min-w-0 flex-col gap-3.5 lg:min-w-[132px] lg:gap-[22px]" key={group.title}>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.17em] text-white">{group.title}</h4>
                <ul className="flex flex-col gap-2.5 lg:gap-[15px]">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <a
                        className="text-sm text-white/70 underline-offset-4 transition hover:text-white hover:underline"
                        href={withBasePath(href)}
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-4 border-t border-white/20 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/50">&copy; {year} Foose. All rights reserved.</p>
          <button
            className="inline-flex items-center gap-2.5 self-start rounded-full border border-white/25 px-4 py-2.5 text-xs font-semibold text-white transition hover:border-white hover:bg-white/10 hover:text-white sm:self-auto"
            onClick={scrollToTop}
            type="button"
          >
            Back to top
            <MdArrowUpward aria-hidden className="text-sm" />
          </button>
        </div>
      </div>
    </footer>
  )
}
