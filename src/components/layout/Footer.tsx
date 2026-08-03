import { MdArrowUpward } from 'react-icons/md'
import blueLogo from '../../assets/foose-logo-blue.png'
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
    <footer className="mt-16 border-t border-foose-border bg-foose-surface-low/60 text-sm text-foose-muted">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-10 px-4 pb-[calc(2.5rem+var(--foose-bottom-nav-inset))] pt-10 sm:gap-12 sm:px-5 sm:pt-12 md:px-6 lg:px-8 lg:pb-14 lg:pt-14">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div className="flex max-w-sm flex-col gap-3">
            <img alt="Foose" className="h-auto w-20 sm:w-24" src={blueLogo} />
            <p className="text-sm leading-6 text-foose-muted">Ghana&apos;s second-hand fashion hub. Curated, authenticated, delivered.</p>
          </div>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10 lg:flex lg:gap-16">
            {FOOTER_GROUPS.map((group) => (
              <nav className="flex min-w-0 flex-col gap-3.5 lg:min-w-[9rem]" key={group.title}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foose-text">{group.title}</h4>
                <ul className="flex flex-col gap-2.5">
                  {group.links.map(([label, href]) => (
                    <li key={label}>
                      <a
                        className="text-sm text-foose-muted underline-offset-4 transition hover:text-accent hover:underline"
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

        <div className="flex flex-col-reverse gap-4 border-t border-foose-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-foose-faint">&copy; {year} Foose. All rights reserved.</p>
          <button
            className="inline-flex items-center gap-1.5 self-start text-xs font-semibold text-foose-muted transition hover:text-accent sm:self-auto"
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
