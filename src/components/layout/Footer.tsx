import blueLogo from '../../assets/foose-logo-blue.png'
import { withBasePath } from '../../utils/navigation'

export function Footer() {
  const brand = blueLogo;

  return (
    <footer className="footer mx-auto w-full max-w-[1280px] mt-12 grid gap-8 border-t border-foose-border px-4 py-10 text-sm text-foose-muted md:grid-cols-4 md:px-6 [&_h3]:text-base [&_h3]:font-bold [&_h3]:text-foose-text [&_h4]:text-base [&_h4]:font-bold [&_h4]:text-foose-text [&_p]:text-sm [&_p]:leading-6 [&_p]:text-foose-muted [&_a]:text-sm [&_a]:leading-6 [&_a]:text-foose-muted">
      <div className="footer-brand flex flex-col gap-2.5">
        <img className="footer-logo h-auto w-20 sm:w-24 md:w-28" src={brand} alt="" />
        <p>Ghana&apos;s second-hand fashion hub. Curated, authenticated, delivered.</p>
      </div>
      {[
        ['Marketplace', ['Browse All', 'Fresh Drops', 'DigiShops', 'Bale Wholesale']],
        ['Community', ['Events', 'Sellers Hub', 'Style Guide', 'Forum']],
        ['Support', ['Help Center', 'Verification', 'Shipping', 'Returns']],
      ].map(([title, links]) => (
        <nav key={title as string}>
          <h4>{title}</h4>
          {(links as string[]).map((link) => (
            <a href={withBasePath('/browse')} key={link}>
              {link}
            </a>
          ))}
        </nav>
      ))}
    </footer>
  )
}
