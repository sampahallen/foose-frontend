import blueLogo from '../../assets/foose-logo-blue.png'
import { withBasePath } from '../../utils/navigation'

export function Footer() {
  const brand = blueLogo
  const groups = [
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

  return (
    <footer className="footer mx-auto mt-12 flex w-full max-w-[1280px] flex-col gap-8 border-t border-foose-border px-4 py-10 text-sm text-foose-muted sm:gap-10 md:flex-row md:items-start md:justify-between md:px-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foose-text [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-foose-text [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_a]:text-sm [&_a]:leading-6 [&_a]:text-foose-muted">
      <div className="footer-brand flex max-w-sm shrink-0 flex-col gap-2.5">
        <img className="footer-logo h-auto w-16 sm:w-20 md:w-24" src={brand} alt="" />
        <p>Ghana&apos;s second-hand fashion hub. Curated, authenticated, delivered.</p>
      </div>
      <div className="footer-links flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:justify-between md:flex-1 md:flex-nowrap md:justify-end md:gap-10 lg:gap-14">
        {groups.map((group) => (
          <nav className="flex min-w-[9rem] flex-col gap-1" key={group.title}>
            <h4>{group.title}</h4>
            {group.links.map(([label, href]) => (
              <a href={withBasePath(href)} key={label}>
                {label}
              </a>
            ))}
          </nav>
        ))}
      </div>
    </footer>
  )
}
